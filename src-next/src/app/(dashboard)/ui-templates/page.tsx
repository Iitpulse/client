"use client";

import * as React from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Copy,
  Star,
  StarOff,
  Palette,
  Layout,
  Type,
  Eye,
  Sparkles,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import api, { type TestUITemplate, type UITemplatePreset } from "@/lib/api";

export default function UITemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = React.useState<TestUITemplate[]>([]);
  const [presets, setPresets] = React.useState<UITemplatePreset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<TestUITemplate | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state for creating from preset
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");
  const [newTemplateName, setNewTemplateName] = React.useState("");
  const [newTemplateDescription, setNewTemplateDescription] = React.useState("");
  const [setAsDefault, setSetAsDefault] = React.useState(false);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, presetsRes] = await Promise.all([
        api.uiTemplates.getAllNoPagination(),
        api.uiTemplates.getPresets(),
      ]);
      setTemplates(templatesRes.data?.data || []);
      setPresets(presetsRes.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast({
        title: "Error",
        description: "Failed to load UI templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromPreset = async () => {
    if (!selectedPreset || !newTemplateName.trim()) return;

    setSaving(true);
    try {
      await api.uiTemplates.createFromPreset({
        presetKey: selectedPreset,
        name: newTemplateName,
        description: newTemplateDescription,
        isDefault: setAsDefault,
      });
      toast({
        title: "Success",
        description: `Template "${newTemplateName}" created successfully`,
      });
      await fetchData();
      setCreateDialogOpen(false);
      resetCreateForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedPreset("");
    setNewTemplateName("");
    setNewTemplateDescription("");
    setSetAsDefault(false);
  };

  const handleSetDefault = async (template: TestUITemplate) => {
    try {
      await api.uiTemplates.setDefault(template._id);
      toast({
        title: "Success",
        description: `"${template.name}" is now the default template`,
      });
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set default template",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (template: TestUITemplate) => {
    const newName = `${template.name} (Copy)`;
    try {
      await api.uiTemplates.duplicate(template._id, newName);
      toast({
        title: "Success",
        description: `Template duplicated as "${newName}"`,
      });
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (template: TestUITemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;
    await api.uiTemplates.delete(selectedTemplate._id);
    toast({
      title: "Success",
      description: `Template "${selectedTemplate.name}" deleted`,
    });
    await fetchData();
  };

  const handlePreview = (template: TestUITemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPresetPreview = (presetKey: string) => {
    const preset = presets.find((p) => p.key === presetKey);
    return preset;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-8 w-8" />
            UI Templates
          </h1>
          <p className="text-muted-foreground">
            Customize the visual appearance of tests for students
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="secondary">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Create your first UI template to customize test appearance"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template._id} className="overflow-hidden">
              {/* Color preview header */}
              <div
                className="h-20 relative"
                style={{
                  background: `linear-gradient(135deg, ${template.colorScheme.primary} 0%, ${template.colorScheme.secondary} 100%)`,
                }}
              >
                {template.isDefault && (
                  <Badge className="absolute top-2 right-2 bg-yellow-500 text-yellow-950">
                    <Star className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                )}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <div
                    className="w-6 h-6 rounded border-2 border-white/50"
                    style={{ backgroundColor: template.colorScheme.background }}
                    title="Background"
                  />
                  <div
                    className="w-6 h-6 rounded border-2 border-white/50"
                    style={{ backgroundColor: template.colorScheme.surface }}
                    title="Surface"
                  />
                  <div
                    className="w-6 h-6 rounded border-2 border-white/50"
                    style={{ backgroundColor: template.colorScheme.accent }}
                    title="Accent"
                  />
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.description && (
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span>{template.typography.fontFamily.split(",")[0]}</span>
                  <span className="text-xs">
                    ({template.typography.questionFontSize})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  <span>
                    {template.layout.questionPanelPosition} / {template.layout.navigationPosition}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.layout.showTimer && (
                    <Badge variant="outline" className="text-xs">Timer</Badge>
                  )}
                  {template.layout.showQuestionPalette && (
                    <Badge variant="outline" className="text-xs">Palette</Badge>
                  )}
                  {template.animations.enableTransitions && (
                    <Badge variant="outline" className="text-xs">Animations</Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePreview(template)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(template)}
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSetDefault(template)}
                    title={template.isDefault ? "Default template" : "Set as default"}
                    disabled={template.isDefault}
                  >
                    {template.isDefault ? (
                      <Star className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setEditDialogOpen(true);
                    }}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create from Preset Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Create UI Template
            </DialogTitle>
            <DialogDescription>
              Choose a preset theme and customize it for your tests
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select a Preset Theme</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {presets.map((preset) => (
                  <div
                    key={preset.key}
                    className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                      selectedPreset === preset.key
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedPreset(preset.key)}
                  >
                    <div
                      className="h-12"
                      style={{
                        background: `linear-gradient(135deg, ${preset.colorScheme.primary} 0%, ${preset.colorScheme.secondary} 100%)`,
                      }}
                    />
                    <div className="p-2">
                      <p className="font-medium text-sm">{preset.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPreset && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., My Custom Theme"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this template..."
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Set as Default</Label>
                    <p className="text-sm text-muted-foreground">
                      Use this template for all new tests
                    </p>
                  </div>
                  <Switch
                    checked={setAsDefault}
                    onCheckedChange={setSetAsDefault}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              resetCreateForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFromPreset}
              disabled={saving || !selectedPreset || !newTemplateName.trim()}
            >
              {saving ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <UITemplateEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        template={selectedTemplate}
        onSave={async () => {
          await fetchData();
          setEditDialogOpen(false);
        }}
      />

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              This is how the test interface will appear to students
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div
              className="rounded-lg overflow-hidden border"
              style={{
                backgroundColor: selectedTemplate.colorScheme.background,
                color: selectedTemplate.colorScheme.text,
                fontFamily: selectedTemplate.typography.fontFamily,
              }}
            >
              {/* Mock header */}
              <div
                className="p-4 flex items-center justify-between"
                style={{
                  backgroundColor: selectedTemplate.colorScheme.surface,
                  borderBottom: `1px solid ${selectedTemplate.colorScheme.border}`,
                }}
              >
                {selectedTemplate.branding.showLogo && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: selectedTemplate.colorScheme.primary }}
                    />
                    <span className="font-semibold">
                      {selectedTemplate.branding.instituteName || "Institute Name"}
                    </span>
                  </div>
                )}
                {selectedTemplate.layout.showTimer && (
                  <div
                    className="px-4 py-2 rounded"
                    style={{ backgroundColor: selectedTemplate.colorScheme.primary, color: "#fff" }}
                  >
                    02:45:30
                  </div>
                )}
              </div>

              {/* Mock question area */}
              <div className="p-6">
                <div
                  className="rounded-lg p-6 mb-4"
                  style={{
                    backgroundColor: selectedTemplate.colorScheme.surface,
                    border: `1px solid ${selectedTemplate.colorScheme.border}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Badge style={{ backgroundColor: selectedTemplate.colorScheme.primary }}>
                      Q.1
                    </Badge>
                    <span style={{ color: selectedTemplate.colorScheme.textSecondary }}>
                      Physics - Mechanics
                    </span>
                  </div>
                  <p className="text-lg mb-6">
                    A ball is thrown vertically upward with an initial velocity of 20 m/s.
                    What is the maximum height reached by the ball? (Take g = 10 m/s²)
                  </p>

                  <div className="space-y-3">
                    {["20 m", "40 m", "10 m", "5 m"].map((option, i) => (
                      <div
                        key={i}
                        className="p-3 rounded cursor-pointer flex items-center gap-3"
                        style={{
                          border: `1px solid ${i === 0 ? selectedTemplate.colorScheme.primary : selectedTemplate.colorScheme.border}`,
                          backgroundColor: i === 0 ? `${selectedTemplate.colorScheme.primary}10` : "transparent",
                          borderRadius: selectedTemplate.buttonStyles.borderRadius === "none" ? 0
                            : selectedTemplate.buttonStyles.borderRadius === "small" ? 4
                            : selectedTemplate.buttonStyles.borderRadius === "full" ? 9999 : 8,
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                          style={{
                            backgroundColor: i === 0 ? selectedTemplate.colorScheme.primary : "transparent",
                            color: i === 0 ? "#fff" : selectedTemplate.colorScheme.text,
                            border: `2px solid ${i === 0 ? selectedTemplate.colorScheme.primary : selectedTemplate.colorScheme.border}`,
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock navigation */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    style={{
                      borderColor: selectedTemplate.colorScheme.border,
                      color: selectedTemplate.colorScheme.text,
                    }}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      style={{
                        backgroundColor: selectedTemplate.colorScheme.warning,
                        color: "#fff",
                      }}
                    >
                      Mark for Review
                    </Button>
                    <Button
                      style={{
                        backgroundColor: selectedTemplate.colorScheme.success,
                        color: "#fff",
                      }}
                    >
                      Save & Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setSelectedTemplate(null);
        }}
        title="Delete UI Template"
        description="Are you sure you want to delete this template? Tests using this template will fall back to the default theme."
        itemName={selectedTemplate?.name}
        onConfirm={confirmDelete}
        requirePassword={true}
      />
    </div>
  );
}

// Separate component for edit dialog with full template editing
function UITemplateEditDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TestUITemplate | null;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("colors");

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [colorScheme, setColorScheme] = React.useState<TestUITemplate["colorScheme"] | null>(null);
  const [typography, setTypography] = React.useState<TestUITemplate["typography"] | null>(null);
  const [layout, setLayout] = React.useState<TestUITemplate["layout"] | null>(null);
  const [branding, setBranding] = React.useState<TestUITemplate["branding"] | null>(null);
  const [buttonStyles, setButtonStyles] = React.useState<TestUITemplate["buttonStyles"] | null>(null);
  const [animations, setAnimations] = React.useState<TestUITemplate["animations"] | null>(null);

  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setColorScheme({ ...template.colorScheme });
      setTypography({ ...template.typography });
      setLayout({ ...template.layout });
      setBranding({ ...template.branding });
      setButtonStyles({ ...template.buttonStyles });
      setAnimations({ ...template.animations });
    }
  }, [template]);

  const handleSave = async () => {
    if (!template || !colorScheme || !typography || !layout || !branding || !buttonStyles || !animations) return;

    setSaving(true);
    try {
      await api.uiTemplates.update({
        id: template._id,
        name,
        description,
        colorScheme,
        typography,
        layout,
        branding,
        buttonStyles,
        animations,
      });
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!template || !colorScheme || !typography || !layout || !branding || !buttonStyles || !animations) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Template
          </DialogTitle>
          <DialogDescription>
            Customize colors, typography, layout, and more
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="colors" className="flex-1">
                <Palette className="h-4 w-4 mr-2" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex-1">
                <Type className="h-4 w-4 mr-2" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="layout" className="flex-1">
                <Layout className="h-4 w-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Branding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(colorScheme).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={value}
                        onChange={(e) =>
                          setColorScheme({ ...colorScheme, [key]: e.target.value })
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={value}
                        onChange={(e) =>
                          setColorScheme({ ...colorScheme, [key]: e.target.value })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="typography" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={typography.fontFamily}
                  onValueChange={(v) => setTypography({ ...typography, fontFamily: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                    <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                    <SelectItem value="Poppins, sans-serif">Poppins</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Font Size</Label>
                  <Select
                    value={typography.questionFontSize}
                    onValueChange={(v) => setTypography({ ...typography, questionFontSize: v as "small" | "medium" | "large" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Option Font Size</Label>
                  <Select
                    value={typography.optionFontSize}
                    onValueChange={(v) => setTypography({ ...typography, optionFontSize: v as "small" | "medium" | "large" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Panel Position</Label>
                  <Select
                    value={layout.questionPanelPosition}
                    onValueChange={(v) => setLayout({ ...layout, questionPanelPosition: v as "left" | "center" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Navigation Position</Label>
                  <Select
                    value={layout.navigationPosition}
                    onValueChange={(v) => setLayout({ ...layout, navigationPosition: v as "top" | "bottom" | "right" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show Timer</Label>
                  <Switch
                    checked={layout.showTimer}
                    onCheckedChange={(v) => setLayout({ ...layout, showTimer: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Question Palette</Label>
                  <Switch
                    checked={layout.showQuestionPalette}
                    onCheckedChange={(v) => setLayout({ ...layout, showQuestionPalette: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Compact Mode</Label>
                  <Switch
                    checked={layout.compactMode}
                    onCheckedChange={(v) => setLayout({ ...layout, compactMode: v })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Button Border Radius</Label>
                  <Select
                    value={buttonStyles.borderRadius}
                    onValueChange={(v) => setButtonStyles({ ...buttonStyles, borderRadius: v as "none" | "small" | "medium" | "large" | "full" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="full">Full (Pill)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Button Style</Label>
                  <Select
                    value={buttonStyles.variant}
                    onValueChange={(v) => setButtonStyles({ ...buttonStyles, variant: v as "solid" | "outline" | "ghost" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Transitions</Label>
                  <Switch
                    checked={animations.enableTransitions}
                    onCheckedChange={(v) => setAnimations({ ...animations, enableTransitions: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Question Transition</Label>
                  <Select
                    value={animations.questionTransition}
                    onValueChange={(v) => setAnimations({ ...animations, questionTransition: v as "none" | "fade" | "slide" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>Show Logo</Label>
                <Switch
                  checked={branding.showLogo}
                  onCheckedChange={(v) => setBranding({ ...branding, showLogo: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={branding.logoUrl || ""}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label>Institute Name</Label>
                <Input
                  value={branding.instituteName || ""}
                  onChange={(e) => setBranding({ ...branding, instituteName: e.target.value })}
                  placeholder="Your Institute Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Header Text</Label>
                <Input
                  value={branding.headerText || ""}
                  onChange={(e) => setBranding({ ...branding, headerText: e.target.value })}
                  placeholder="Optional header text"
                />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Input
                  value={branding.footerText || ""}
                  onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                  placeholder="Optional footer text"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
