"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { api } from "@/lib/api";
import { IExam, ISubject, IPattern, ISection, ISubSection } from "@/types";

interface MarkingScheme {
  correct: number[];
  incorrect: number;
}

interface EditableSubSection {
  id: string;
  name: string;
  description: string;
  type: "single" | "multiple" | "integer" | "paragraph" | "matrix";
  paragraphType?: "single" | "multiple" | "integer";
  noOfQuestions: number;
  toBeAttempted: number;
  markingScheme: MarkingScheme;
}

interface EditableSection {
  id: string;
  name: string;
  subject: string;
  subSections: EditableSubSection[];
  isExpanded: boolean;
}

const patternSchema = z.object({
  name: z.string().min(1, "Pattern name is required"),
  exam: z.string().min(1, "Exam is required"),
  durationInMinutes: z.number().min(1, "Duration must be at least 1 minute"),
});

type PatternFormData = z.infer<typeof patternSchema>;

const DEFAULT_MARKING_SCHEME: MarkingScheme = {
  correct: [4],
  incorrect: -1,
};

const createSubSection = (): EditableSubSection => ({
  id: `subsection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "New Subsection",
  description: "",
  type: "single",
  noOfQuestions: 5,
  toBeAttempted: 5,
  markingScheme: { ...DEFAULT_MARKING_SCHEME },
});

const createSection = (index: number): EditableSection => ({
  id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: `Section ${index}`,
  subject: "",
  subSections: [],
  isExpanded: true,
});

export default function EditPatternPage() {
  const router = useRouter();
  const params = useParams();
  const patternId = params.patternId as string;
  const { toast } = useToast();

  const [pattern, setPattern] = React.useState<IPattern | null>(null);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [sections, setSections] = React.useState<EditableSection[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors: formErrors, isDirty: isFormDirty },
  } = useForm<PatternFormData>({
    resolver: zodResolver(patternSchema),
  });

  const watchedName = watch("name");
  const watchedDuration = watch("durationInMinutes");

  // Track if form has unsaved changes
  const [sectionsModified, setSectionsModified] = React.useState(false);
  const hasUnsavedChanges = isFormDirty || sectionsModified;

  const {
    showDialog,
    confirmNavigation,
    cancelNavigation,
    navigateWithCheck,
  } = useUnsavedChanges({
    isDirty: hasUnsavedChanges && !fetching,
    message: "You have unsaved changes to this pattern. Are you sure you want to leave?",
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [patternRes, examsRes, subjectsRes] = await Promise.all([
          api.patterns.getById(patternId),
          api.exams.getAll(),
          api.subjects.getAll(),
        ]);

        const patternData = patternRes.data?.pattern || patternRes.data?.data;
        setPattern(patternData);
        // API returns { success: true, data: [...] }
        setExams(examsRes.data?.data || examsRes.data?.exams || []);
        setSubjects(subjectsRes.data?.data || subjectsRes.data?.subjects || []);

        if (patternData) {
          const examId =
            typeof patternData.exam === "object"
              ? patternData.exam._id
              : patternData.exam;

          reset({
            name: patternData.name,
            exam: examId,
            durationInMinutes: patternData.durationInMinutes || 180,
          });

          // Convert sections to editable format
          const editableSections: EditableSection[] = patternData.sections.map(
            (section: ISection) => ({
              id: section.id,
              name: section.name,
              subject: section.subject || "",
              isExpanded: true,
              subSections: section.subSections.map((ss: ISubSection) => {
                // Handle marking scheme - could be array or single value
                let correctMarks: number[] = [4];
                if (ss.markingScheme?.correct) {
                  correctMarks = Array.isArray(ss.markingScheme.correct)
                    ? ss.markingScheme.correct
                    : [ss.markingScheme.correct];
                } else if (ss.marksPerQuestion) {
                  correctMarks = [ss.marksPerQuestion];
                }

                return {
                  id: ss.id,
                  name: ss.name,
                  description: ss.description || "",
                  type: ss.type || "single",
                  paragraphType: ss.paragraphType,
                  noOfQuestions: ss.noOfQuestions || ss.totalQuestions || 0,
                  toBeAttempted: ss.toBeAttempted || ss.noOfQuestions || 0,
                  markingScheme: {
                    correct: correctMarks,
                    incorrect: ss.markingScheme?.incorrect ?? -1,
                  },
                };
              }),
            })
          );
          setSections(editableSections);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [patternId, reset]);

  // Section management
  const addSection = () => {
    setSections([...sections, createSection(sections.length + 1)]);
    setSectionsModified(true);
  };

  const duplicateSection = (sectionId: string) => {
    const sectionToDuplicate = sections.find((s) => s.id === sectionId);
    if (!sectionToDuplicate) return;

    const duplicatedSection: EditableSection = {
      ...sectionToDuplicate,
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${sectionToDuplicate.name} (Copy)`,
      subSections: sectionToDuplicate.subSections.map((ss) => ({
        ...ss,
        id: `subsection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        markingScheme: { ...ss.markingScheme },
      })),
    };

    const index = sections.findIndex((s) => s.id === sectionId);
    const newSections = [...sections];
    newSections.splice(index + 1, 0, duplicatedSection);
    setSections(newSections);
    setSectionsModified(true);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
    setSectionsModified(true);
  };

  const updateSection = (
    sectionId: string,
    field: keyof EditableSection,
    value: unknown
  ) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s))
    );
    setSectionsModified(true);
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    );
  };

  // Subsection management
  const addSubSection = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, subSections: [...s.subSections, createSubSection()] }
          : s
      )
    );
    setSectionsModified(true);
  };

  const removeSubSection = (sectionId: string, subSectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subSections: s.subSections.filter((ss) => ss.id !== subSectionId),
            }
          : s
      )
    );
    setSectionsModified(true);
  };

  const updateSubSection = (
    sectionId: string,
    subSectionId: string,
    field: keyof EditableSubSection,
    value: unknown
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subSections: s.subSections.map((ss) =>
                ss.id === subSectionId ? { ...ss, [field]: value } : ss
              ),
            }
          : s
      )
    );
    setSectionsModified(true);
  };

  // Marking scheme management
  const updateMarkingScheme = (
    sectionId: string,
    subSectionId: string,
    field: "correct" | "incorrect",
    value: number | number[]
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              subSections: s.subSections.map((ss) =>
                ss.id === subSectionId
                  ? {
                      ...ss,
                      markingScheme: { ...ss.markingScheme, [field]: value },
                    }
                  : ss
              ),
            }
          : s
      )
    );
    setSectionsModified(true);
  };

  const addCorrectMark = (sectionId: string, subSectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const subSection = section?.subSections.find((ss) => ss.id === subSectionId);
    if (!subSection) return;

    const newCorrectMarks = [...subSection.markingScheme.correct, 1];
    updateMarkingScheme(sectionId, subSectionId, "correct", newCorrectMarks);
  };

  const removeCorrectMark = (
    sectionId: string,
    subSectionId: string,
    index: number
  ) => {
    const section = sections.find((s) => s.id === sectionId);
    const subSection = section?.subSections.find((ss) => ss.id === subSectionId);
    if (!subSection || subSection.markingScheme.correct.length <= 1) return;

    const newCorrectMarks = subSection.markingScheme.correct.filter(
      (_, i) => i !== index
    );
    updateMarkingScheme(sectionId, subSectionId, "correct", newCorrectMarks);
  };

  const updateCorrectMark = (
    sectionId: string,
    subSectionId: string,
    index: number,
    value: number
  ) => {
    const section = sections.find((s) => s.id === sectionId);
    const subSection = section?.subSections.find((ss) => ss.id === subSectionId);
    if (!subSection) return;

    const newCorrectMarks = [...subSection.markingScheme.correct];
    newCorrectMarks[index] = value;
    updateMarkingScheme(sectionId, subSectionId, "correct", newCorrectMarks);
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (sections.length === 0) {
      newErrors.sections = "At least one section is required";
    }

    sections.forEach((section, sIndex) => {
      if (!section.name.trim()) {
        newErrors[`section-${sIndex}-name`] = "Section name is required";
      }
      if (section.subSections.length === 0) {
        newErrors[`section-${sIndex}-subsections`] =
          "At least one subsection is required";
      }

      section.subSections.forEach((ss, ssIndex) => {
        if (!ss.name.trim()) {
          newErrors[`section-${sIndex}-subsection-${ssIndex}-name`] =
            "Subsection name is required";
        }
        if (ss.noOfQuestions < 1) {
          newErrors[`section-${sIndex}-subsection-${ssIndex}-questions`] =
            "At least 1 question required";
        }
        if (ss.toBeAttempted < 1) {
          newErrors[`section-${sIndex}-subsection-${ssIndex}-toBeAttempted`] =
            "At least 1 to be attempted";
        }
        if (ss.toBeAttempted > ss.noOfQuestions) {
          newErrors[`section-${sIndex}-subsection-${ssIndex}-toBeAttempted`] =
            "Cannot exceed total questions";
        }
        if (ss.type === "paragraph" && !ss.paragraphType) {
          newErrors[`section-${sIndex}-subsection-${ssIndex}-paragraphType`] =
            "Paragraph type is required";
        }
      });
    });

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      const errorMessages = Object.values(newErrors);
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: errorMessages[0] || "Please fix the errors in the form",
      });
    }
    return isValid;
  };

  const onSubmit = async (data: PatternFormData) => {
    if (!validateForm()) return;

    // Ensure durationInMinutes is a valid number
    const duration = typeof data.durationInMinutes === "number" ? data.durationInMinutes : parseInt(String(data.durationInMinutes), 10);
    if (!duration || isNaN(duration) || duration < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid duration (minimum 1 minute)",
      });
      return;
    }

    setLoading(true);
    try {
      const patternData = {
        id: patternId,
        name: data.name.trim(),
        exam: data.exam,
        durationInMinutes: duration,
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          subject: s.subject || undefined,
          subSections: s.subSections.map((ss) => ({
            id: ss.id,
            name: ss.name.trim(),
            description: ss.description?.trim() || undefined,
            type: ss.type,
            paragraphType: ss.type === "paragraph" ? ss.paragraphType : undefined,
            totalQuestions: Number(ss.noOfQuestions),
            toBeAttempted: Number(ss.toBeAttempted),
            markingScheme: {
              correct: ss.markingScheme.correct.map(Number),
              incorrect: Number(ss.markingScheme.incorrect),
            },
          })),
        })),
      };

      console.log("Updating pattern data:", JSON.stringify(patternData, null, 2));
      await api.patterns.update(patternData);
      toast({
        title: "Success",
        description: "Pattern updated successfully",
      });
      router.push("/patterns");
    } catch (error: unknown) {
      console.error("Failed to update pattern:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update pattern";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if subsection type needs multiple correct marks
  const needsMultipleCorrectMarks = (type: string) => {
    return ["multiple", "paragraph", "matrix"].includes(type);
  };

  if (fetching) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading pattern...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateWithCheck("/patterns")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Pattern</h1>
          <p className="text-muted-foreground">
            Update the pattern structure and marking scheme
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, (errors) => {
        const firstError = Object.values(errors)[0];
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: firstError?.message?.toString() || "Please fill in all required fields",
        });
      })} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update the pattern name, exam type, and duration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Pattern Name *</Label>
                <Input
                  id="name"
                  value={watchedName || ""}
                  onChange={(e) => setValue("name", e.target.value)}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">
                    {formErrors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationInMinutes">Duration (Minutes) *</Label>
                <Input
                  id="durationInMinutes"
                  type="number"
                  min={1}
                  value={watchedDuration || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setValue("durationInMinutes", value === "" ? 0 : parseInt(value, 10) || 0);
                  }}
                />
                {formErrors.durationInMinutes && (
                  <p className="text-sm text-destructive">
                    {formErrors.durationInMinutes.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam">Exam Type *</Label>
                <SearchableSelect
                  options={exams.map((exam) => ({
                    value: exam._id,
                    label: exam.name,
                  }))}
                  value={watch("exam")}
                  onValueChange={(value) => setValue("exam", value)}
                  placeholder="Select exam type"
                  searchPlaceholder="Search exams..."
                  emptyText="No exams found."
                />
                {formErrors.exam && (
                  <p className="text-sm text-destructive">
                    {formErrors.exam.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sections</CardTitle>
                <CardDescription>
                  Manage sections and subsections
                </CardDescription>
              </div>
              <Button type="button" onClick={addSection}>
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>
            {errors.sections && (
              <p className="text-sm text-destructive">{errors.sections}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No sections. Click &quot;Add Section&quot; to add one.
                </p>
              </div>
            ) : (
              sections.map((section, sectionIndex) => (
                <Collapsible
                  key={section.id}
                  open={section.isExpanded}
                  onOpenChange={() => toggleSectionExpanded(section.id)}
                >
                  <div className="rounded-lg border bg-muted/30">
                    {/* Section Header */}
                    <CollapsibleTrigger asChild>
                      <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {section.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {section.name || `Section ${sectionIndex + 1}`}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({section.subSections.length} subsections)
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateSection(section.id)}
                            title="Duplicate Section"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSection(section.id)}
                            title="Delete Section"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="space-y-4 border-t p-4">
                        {/* Section Fields */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Section Name *</Label>
                            <Input
                              value={section.name}
                              onChange={(e) =>
                                updateSection(section.id, "name", e.target.value)
                              }
                              placeholder="e.g., Physics"
                            />
                            {errors[`section-${sectionIndex}-name`] && (
                              <p className="text-sm text-destructive">
                                {errors[`section-${sectionIndex}-name`]}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Subject</Label>
                            <SearchableSelect
                              options={subjects.map((subject) => ({
                                value: subject._id,
                                label: subject.name,
                              }))}
                              value={section.subject}
                              onValueChange={(value) =>
                                updateSection(section.id, "subject", value)
                              }
                              placeholder="Select subject"
                              searchPlaceholder="Search subjects..."
                              emptyText="No subjects found."
                            />
                          </div>
                        </div>

                        {/* Subsections */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base">Subsections</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSubSection(section.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Subsection
                            </Button>
                          </div>

                          {errors[`section-${sectionIndex}-subsections`] && (
                            <p className="text-sm text-destructive">
                              {errors[`section-${sectionIndex}-subsections`]}
                            </p>
                          )}

                          {section.subSections.map((subSection, ssIndex) => (
                            <div
                              key={subSection.id}
                              className="space-y-4 rounded-md border bg-background p-4"
                            >
                              {/* Subsection Header */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {subSection.name || "New Subsection"}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removeSubSection(section.id, subSection.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>

                              {/* Subsection Fields */}
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Subsection Name *</Label>
                                  <Input
                                    value={subSection.name}
                                    onChange={(e) =>
                                      updateSubSection(
                                        section.id,
                                        subSection.id,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., MCQ Section A"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={subSection.description}
                                    onChange={(e) =>
                                      updateSubSection(
                                        section.id,
                                        subSection.id,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Optional description"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                  <Label>Question Type *</Label>
                                  <Select
                                    value={subSection.type}
                                    onValueChange={(value) => {
                                      // Update type and marking scheme together in one state update
                                      const newCorrectMarks = needsMultipleCorrectMarks(value)
                                        ? [4, 3, 2, 1]
                                        : [4];
                                      setSections((prev) =>
                                        prev.map((s) =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                subSections: s.subSections.map((ss) =>
                                                  ss.id === subSection.id
                                                    ? {
                                                        ...ss,
                                                        type: value as EditableSubSection["type"],
                                                        markingScheme: {
                                                          ...ss.markingScheme,
                                                          correct: newCorrectMarks,
                                                        },
                                                      }
                                                    : ss
                                                ),
                                              }
                                            : s
                                        )
                                      );
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="single">
                                        MCQ Single
                                      </SelectItem>
                                      <SelectItem value="multiple">
                                        MCQ Multiple
                                      </SelectItem>
                                      <SelectItem value="integer">
                                        Numerical
                                      </SelectItem>
                                      <SelectItem value="paragraph">
                                        Paragraph
                                      </SelectItem>
                                      <SelectItem value="matrix">
                                        Matrix Match
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Paragraph Type - Conditional */}
                                {subSection.type === "paragraph" && (
                                  <div className="space-y-2">
                                    <Label>Paragraph Type *</Label>
                                    <Select
                                      value={subSection.paragraphType || ""}
                                      onValueChange={(value) =>
                                        updateSubSection(
                                          section.id,
                                          subSection.id,
                                          "paragraphType",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="single">
                                          MCQ Single
                                        </SelectItem>
                                        <SelectItem value="multiple">
                                          MCQ Multiple
                                        </SelectItem>
                                        <SelectItem value="integer">
                                          Numerical
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {errors[
                                      `section-${sectionIndex}-subsection-${ssIndex}-paragraphType`
                                    ] && (
                                      <p className="text-sm text-destructive">
                                        {
                                          errors[
                                            `section-${sectionIndex}-subsection-${ssIndex}-paragraphType`
                                          ]
                                        }
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label>Total Questions *</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={subSection.noOfQuestions}
                                    onChange={(e) =>
                                      updateSubSection(
                                        section.id,
                                        subSection.id,
                                        "noOfQuestions",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>To Be Attempted *</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={subSection.noOfQuestions}
                                    value={subSection.toBeAttempted}
                                    onChange={(e) =>
                                      updateSubSection(
                                        section.id,
                                        subSection.id,
                                        "toBeAttempted",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                  />
                                  {errors[
                                    `section-${sectionIndex}-subsection-${ssIndex}-toBeAttempted`
                                  ] && (
                                    <p className="text-sm text-destructive">
                                      {
                                        errors[
                                          `section-${sectionIndex}-subsection-${ssIndex}-toBeAttempted`
                                        ]
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Marking Scheme */}
                              <div className="flex flex-wrap items-center gap-4 rounded-md bg-muted/50 px-3 py-2">
                                <span className="text-sm font-medium text-muted-foreground">Marking Scheme:</span>

                                {/* Correct marks */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Correct</span>
                                  <div className="flex items-center gap-1">
                                    {subSection.markingScheme.correct.map((mark, idx) => (
                                      <div key={idx} className="flex items-center">
                                        <span className="text-green-600 font-medium">+</span>
                                        <Input
                                          type="number"
                                          className="w-14 h-8 text-center"
                                          value={mark}
                                          onChange={(e) =>
                                            updateCorrectMark(
                                              section.id,
                                              subSection.id,
                                              idx,
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                        {needsMultipleCorrectMarks(subSection.type) &&
                                          subSection.markingScheme.correct.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                              onClick={() =>
                                                removeCorrectMark(
                                                  section.id,
                                                  subSection.id,
                                                  idx
                                                )
                                              }
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        {needsMultipleCorrectMarks(subSection.type) &&
                                          idx < subSection.markingScheme.correct.length - 1 && (
                                            <span className="text-muted-foreground mx-1">/</span>
                                          )}
                                      </div>
                                    ))}
                                    {needsMultipleCorrectMarks(subSection.type) && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() =>
                                          addCorrectMark(section.id, subSection.id)
                                        }
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <span className="text-muted-foreground">|</span>

                                {/* Incorrect marks */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Incorrect</span>
                                  <div className="flex items-center">
                                    <span className="text-red-600 font-medium">-</span>
                                    <Input
                                      type="number"
                                      className="w-14 h-8 text-center"
                                      value={Math.abs(subSection.markingScheme.incorrect)}
                                      onChange={(e) =>
                                        updateMarkingScheme(
                                          section.id,
                                          subSection.id,
                                          "incorrect",
                                          -(parseInt(e.target.value) || 0)
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                {needsMultipleCorrectMarks(subSection.type) && (
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    (partial marking: {subSection.markingScheme.correct.length} levels)
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigateWithCheck("/patterns")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
