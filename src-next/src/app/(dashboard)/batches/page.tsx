"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Users,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { api } from "@/lib/api";
import { IBatch, IInstitute } from "@/types";

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

export default function BatchesPage() {
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [institutes, setInstitutes] = React.useState<IInstitute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<IBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = React.useState<IBatch | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    institute: "",
    medium: "english",
    promoCode: "",
  });

  const fetchBatches = React.useCallback(async () => {
    try {
      const response = await api.batches.getAll();
      setBatches(response.data?.data || response.data?.batches || []);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstitutes = React.useCallback(async () => {
    try {
      const response = await api.institutes.getAll();
      setInstitutes(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch institutes:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchBatches();
    fetchInstitutes();
  }, [fetchBatches, fetchInstitutes]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    // Validate required fields for create
    if (!editingBatch) {
      if (!formData.institute) {
        setError("Please select an institute");
        return;
      }
      if (!formData.medium) {
        setError("Please select a medium");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      if (editingBatch) {
        await api.batches.update(editingBatch._id, {
          name: formData.name,
          medium: formData.medium,
          ...(formData.promoCode && { promoCode: [formData.promoCode] }),
        });
      } else {
        await api.batches.create({
          name: formData.name,
          institute: formData.institute,
          medium: formData.medium,
          ...(formData.promoCode && { promoCode: [formData.promoCode] }),
        });
      }
      fetchBatches();
      setDialogOpen(false);
      setEditingBatch(null);
      setFormData({ name: "", institute: "", medium: "english", promoCode: "" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      setError(error.response?.data?.error?.message || error.response?.data?.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!batchToDelete) return;
    // The actual deletion - password verification is handled by the dialog
    await api.batches.delete(batchToDelete._id);
    fetchBatches();
    // Dialog handles closing itself on success
  };

  const openEditDialog = (batch: IBatch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      institute: typeof batch.institute === "object" ? batch.institute._id : batch.institute || "",
      medium: batch.medium || "english",
      promoCode: batch.promoCode?.[0] || "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBatch(null);
    setFormData({
      name: "",
      institute: "",
      medium: "english",
      promoCode: "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const columns: ColumnDef<IBatch>[] = [
    {
      accessorKey: "name",
      header: "Batch Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      id: "promoCode",
      header: "Promo Code",
      cell: ({ row }) => {
        const promoCodes = row.original.promoCode;
        if (!promoCodes || promoCodes.length === 0) return "-";
        const primaryCode = promoCodes[0];
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {primaryCode}
            </Badge>
            <CopyButton text={primaryCode} />
            {promoCodes.length > 1 && (
              <Badge variant="secondary" className="text-xs">
                +{promoCodes.length - 1} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "institute",
      header: "Institute",
      cell: ({ row }) => {
        const institute = row.original.institute;
        if (!institute) return "-";
        return typeof institute === "object" ? institute.name : institute;
      },
    },
    {
      accessorKey: "medium",
      header: "Medium",
      cell: ({ row }) => {
        const medium = row.original.medium;
        return medium ? (
          <Badge variant="secondary" className="capitalize">
            {medium}
          </Badge>
        ) : "-";
      },
    },
    {
      id: "members",
      header: "Students",
      cell: ({ row }) => {
        const memberCount = row.original.members?.length || 0;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {memberCount} student{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const batch = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setBatchToDelete(batch);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            Manage student batches and promo codes
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Batch
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-muted-foreground">Loading batches...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={batches}
          searchKey="name"
          searchPlaceholder="Search batches..."
          maxHeight="calc(100vh - 350px)"
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBatch ? "Edit Batch" : "Create Batch"}
            </DialogTitle>
            <DialogDescription>
              {editingBatch
                ? "Update the batch details"
                : "Create a new batch for students to join"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch Name *</Label>
              <Input
                id="batchName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter batch name"
              />
            </div>
            {!editingBatch && (
              <div className="space-y-2">
                <Label htmlFor="institute">Institute *</Label>
                <Select
                  value={formData.institute}
                  onValueChange={(value) => setFormData({ ...formData, institute: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select institute" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutes.map((inst) => (
                      <SelectItem key={inst._id} value={inst._id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="medium">Medium *</Label>
              <Select
                value={formData.medium}
                onValueChange={(value) => setFormData({ ...formData, medium: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promoCode">Custom Promo Code (optional)</Label>
              <Input
                id="promoCode"
                value={formData.promoCode}
                onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                placeholder="e.g., BATCH2024"
              />
              <p className="text-xs text-muted-foreground">
                A default promo code will be auto-generated if not provided
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? "Saving..." : editingBatch ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setBatchToDelete(null);
        }}
        title="Delete Batch"
        description="Are you sure you want to delete this batch? This action cannot be undone."
        itemName={batchToDelete?.name}
        onConfirm={handleDelete}
        requirePassword={true}
      />
    </div>
  );
}
