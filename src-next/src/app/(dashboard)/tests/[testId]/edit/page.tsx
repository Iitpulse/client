"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import api from "@/lib/api";
import { IPattern, IBatch, IExam, ISection, ISubSection, IQuestion } from "@/types";
import { QuestionSelectionModal } from "@/components/question-selection-modal";
import { QuestionPreviewDialog } from "@/components/question-preview-dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import RenderWithLatex from "@/components/render-with-latex";

const PUBLISH_TYPE_OPTIONS = [
  { name: "Immediately", value: "immediately" },
  { name: "At the end of test", value: "atTheEndOfTest" },
  { name: "Automatic after 'x' days", value: "autoAfterXDays" },
  { name: "Manual", value: "manual" },
];

interface TestSection extends ISection {
  subSections: TestSubSection[];
}

interface TestSubSection extends ISubSection {
  questions?: IQuestion[];
  totalQuestions?: number;
  toBeAttempted?: number;
}

interface TestFormData {
  name: string;
  description: string;
  exam: { id: string; name: string } | null;
  pattern: { id: string; name: string } | null;
  batches: Array<{ id: string; name: string }>;
  validityFrom: Date | undefined;
  validityTo: Date | undefined;
  publishType: string;
  daysAfter: number;
  sections: TestSection[];
  status: string;
}

const initialFormData: TestFormData = {
  name: "",
  description: "",
  exam: null,
  pattern: null,
  batches: [],
  validityFrom: undefined,
  validityTo: undefined,
  publishType: "immediately",
  daysAfter: 1,
  sections: [],
  status: "Active",
};

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  const { toast } = useToast();

  const [formData, setFormData] = React.useState<TestFormData>(initialFormData);
  const [originalFormData, setOriginalFormData] = React.useState<TestFormData>(initialFormData);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [patterns, setPatterns] = React.useState<IPattern[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [subjectsMap, setSubjectsMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  // Question selection modal state
  const [questionModalOpen, setQuestionModalOpen] = React.useState(false);
  const [activeSubSection, setActiveSubSection] = React.useState<{
    sectionId: string;
    subSectionId: string;
    subject: string;
    type: string;
    maxQuestions: number;
    currentQuestions: IQuestion[];
  } | null>(null);

  // Track if form has unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  }, [formData, originalFormData]);

  const {
    showDialog,
    confirmNavigation,
    cancelNavigation,
    navigateWithCheck,
  } = useUnsavedChanges({
    isDirty: hasUnsavedChanges,
    message: "You have unsaved changes to this test. Are you sure you want to leave?",
  });

  // Fetch initial data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, examsRes, batchesRes, subjectsRes] = await Promise.all([
          api.tests.getById(testId),
          api.exams.getAll(),
          api.batches.getAll(),
          api.subjects.getAll(),
        ]);

        // Parse exams
        const examsList = examsRes.data?.data || examsRes.data?.exams || examsRes.data || [];
        setExams(Array.isArray(examsList) ? examsList : []);

        // Parse batches
        const batchesList = batchesRes.data?.data || batchesRes.data?.batches || batchesRes.data || [];
        setBatches(Array.isArray(batchesList) ? batchesList : []);

        // Build subject ID to name map
        const subjectsList = subjectsRes.data?.data || subjectsRes.data?.subjects || subjectsRes.data || [];
        const subjectLookup: Record<string, string> = {};
        if (Array.isArray(subjectsList)) {
          subjectsList.forEach((s: { _id: string; name: string }) => {
            if (s._id) subjectLookup[s._id] = s.name;
          });
        }
        setSubjectsMap(subjectLookup);

        // Parse test data - API returns { success: true, data: {...} }
        const testData = testRes.data?.data || testRes.data;
        if (testData) {
          // Extract exam info - exam is stored as { id, name }
          const examInfo = testData.exam
            ? typeof testData.exam === "object"
              ? { id: testData.exam.id || testData.exam._id, name: testData.exam.name }
              : null
            : null;

          // Extract pattern info - pattern is stored as { id, name }
          const patternInfo = testData.pattern
            ? typeof testData.pattern === "object"
              ? { id: testData.pattern.id || testData.pattern._id, name: testData.pattern.name }
              : null
            : null;

          // Extract batches
          const batchesInfo = (testData.batches || []).map((b: { id?: string; _id?: string; name: string }) => ({
            id: b.id || b._id || "",
            name: b.name,
          }));

          // Extract sections with questions
          const sectionsInfo: TestSection[] = (testData.sections || []).map((section: TestSection) => ({
            ...section,
            subSections: (section.subSections || []).map((sub: TestSubSection) => ({
              ...sub,
              questions: sub.questions || [],
            })),
          }));

          // Extract result publish settings
          const publishProps = testData.result?.publishProps || {};
          const publishType = publishProps.type || "immediately";

          const formDataFromTest: TestFormData = {
            name: testData.name || "",
            description: testData.description || "",
            exam: examInfo,
            pattern: patternInfo,
            batches: batchesInfo,
            validityFrom: testData.validity?.from ? new Date(testData.validity.from) : undefined,
            validityTo: testData.validity?.to ? new Date(testData.validity.to) : undefined,
            publishType,
            daysAfter: 1,
            sections: sectionsInfo,
            status: testData.status || "Active",
          };

          setFormData(formDataFromTest);
          setOriginalFormData(formDataFromTest);

          // Expand all sections by default
          const expanded: Record<string, boolean> = {};
          sectionsInfo.forEach((s) => {
            expanded[s.id] = true;
          });
          setExpandedSections(expanded);

          // Fetch patterns for the exam
          if (examInfo?.id) {
            try {
              const patternsRes = await api.patterns.getByExam(examInfo.id);
              const patternsList = patternsRes.data?.data || patternsRes.data?.patterns || patternsRes.data || [];
              setPatterns(Array.isArray(patternsList) ? patternsList : []);
            } catch (error) {
              console.error("Failed to fetch patterns:", error);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Failed to load test data", variant: "destructive" });
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [testId, toast]);

  // Fetch patterns when exam changes
  React.useEffect(() => {
    const fetchPatterns = async () => {
      if (!formData.exam?.id) {
        setPatterns([]);
        return;
      }
      try {
        const response = await api.patterns.getByExam(formData.exam.id);
        const patternsList = response.data?.data || response.data?.patterns || response.data || [];
        setPatterns(Array.isArray(patternsList) ? patternsList : []);
      } catch (error) {
        console.error("Failed to fetch patterns:", error);
        setPatterns([]);
      }
    };
    // Only fetch if exam changed from original (not on initial load)
    if (!fetching && formData.exam?.id !== originalFormData.exam?.id) {
      fetchPatterns();
    }
  }, [formData.exam?.id, fetching, originalFormData.exam?.id]);

  // Update sections when pattern changes (only if pattern changed from original)
  React.useEffect(() => {
    if (fetching) return;
    if (formData.pattern?.id && formData.pattern.id !== originalFormData.pattern?.id && patterns.length > 0) {
      const selectedPattern = patterns.find((p) => p._id === formData.pattern?.id);
      if (selectedPattern?.sections) {
        setFormData((prev) => ({
          ...prev,
          sections: selectedPattern.sections.map((section) => ({
            ...section,
            subSections: section.subSections.map((sub) => ({
              ...sub,
              questions: [],
            })),
          })),
        }));
        // Expand all sections by default
        const expanded: Record<string, boolean> = {};
        selectedPattern.sections.forEach((s) => {
          expanded[s.id] = true;
        });
        setExpandedSections(expanded);
      }
    }
  }, [formData.pattern?.id, patterns, fetching, originalFormData.pattern?.id]);

  const handleInputChange = (field: keyof TestFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExamChange = (examId: string) => {
    const exam = exams.find((e) => e._id === examId);
    setFormData((prev) => ({
      ...prev,
      exam: exam ? { id: exam._id, name: exam.name } : null,
      pattern: null,
      sections: [],
    }));
  };

  const handlePatternChange = (patternId: string) => {
    const pattern = patterns.find((p) => p._id === patternId);
    setFormData((prev) => ({
      ...prev,
      pattern: pattern ? { id: pattern._id, name: pattern.name } : null,
    }));
  };

  const handleBatchToggle = (batch: IBatch) => {
    setFormData((prev) => {
      const exists = prev.batches.some((b) => b.id === batch._id);
      return {
        ...prev,
        batches: exists
          ? prev.batches.filter((b) => b.id !== batch._id)
          : [...prev.batches, { id: batch._id, name: batch.name }],
      };
    });
  };

  const openQuestionModal = (
    sectionId: string,
    subSectionId: string,
    subject: string,
    type: string,
    maxQuestions: number,
    currentQuestions: IQuestion[]
  ) => {
    setActiveSubSection({
      sectionId,
      subSectionId,
      subject,
      type,
      maxQuestions,
      currentQuestions,
    });
    setQuestionModalOpen(true);
  };

  const handleSaveQuestions = (questions: IQuestion[]) => {
    if (!activeSubSection) return;

    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === activeSubSection.sectionId) {
          return {
            ...section,
            subSections: section.subSections.map((sub) => {
              if (sub.id === activeSubSection.subSectionId) {
                return { ...sub, questions };
              }
              return sub;
            }),
          };
        }
        return section;
      }),
    }));

    setQuestionModalOpen(false);
    setActiveSubSection(null);
  };

  const handleDeleteQuestion = (sectionId: string, subSectionId: string, questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            subSections: section.subSections.map((sub) => {
              if (sub.id === subSectionId) {
                return {
                  ...sub,
                  questions: (sub.questions || []).filter((q) => q._id !== questionId),
                };
              }
              return sub;
            }),
          };
        }
        return section;
      }),
    }));
  };

  const getQuestionCountForSubject = (subject: string) => {
    let filled = 0;
    let total = 0;
    formData.sections.forEach((section) => {
      if (section.subject?.toLowerCase() === subject.toLowerCase()) {
        section.subSections.forEach((sub) => {
          filled += sub.questions?.length || 0;
          total += sub.totalQuestions || 0;
        });
      }
    });
    return { filled, total };
  };

  const getSelectedPattern = () => {
    return patterns.find((p) => p._id === formData.pattern?.id);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Test name is required";
    if (!formData.exam) return "Please select an exam";
    if (!formData.pattern) return "Please select a pattern";
    if (formData.batches.length === 0) return "Please select at least one batch";
    if (!formData.validityFrom) return "Start date is required";
    if (!formData.validityTo) return "End date is required";

    // Check if all questions are filled
    for (const section of formData.sections) {
      for (const sub of section.subSections) {
        const questionCount = sub.questions?.length || 0;
        const required = sub.totalQuestions || 0;
        if (questionCount !== required) {
          return `Please fill ${required - questionCount} more question(s) in ${sub.name}`;
        }
      }
    }

    return null;
  };

  const validateDraft = (): string | null => {
    if (!formData.name.trim()) return "Test name is required";
    if (!formData.exam) return "Please select an exam";
    if (!formData.pattern) return "Please select a pattern";
    if (formData.batches.length === 0) return "Please select at least one batch";
    return null;
  };

  const handleSubmit = async (saveAsDraft = false) => {
    if (saveAsDraft) {
      const draftError = validateDraft();
      if (draftError) {
        toast({ title: "Validation Error", description: draftError, variant: "destructive" });
        return;
      }
    } else {
      const error = validateForm();
      if (error) {
        toast({ title: "Validation Error", description: error, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const selectedPattern = getSelectedPattern();

      // Transform sections to ensure all questions have proper hi options
      const transformedSections = formData.sections.map((section) => ({
        ...section,
        subSections: section.subSections.map((subSection) => ({
          ...subSection,
          questions: (subSection.questions || []).map((question) => {
            const questionWithOptions = question as {
              options?: Array<{ id: string; en?: { value: string }; hi?: { value: string } }>;
              en?: { options?: Array<{ id: string; value: string }> };
              hi?: { options?: Array<{ id: string; value: string }> };
            };

            if (questionWithOptions.options) {
              return {
                ...question,
                options: questionWithOptions.options.map((opt) => ({
                  ...opt,
                  en: opt.en || { value: "" },
                  hi: opt.hi?.value ? opt.hi : { value: opt.en?.value || "" },
                })),
              };
            }

            if (questionWithOptions.en?.options) {
              return {
                ...question,
                hi: {
                  ...questionWithOptions.hi,
                  options: questionWithOptions.en.options.map((opt, idx) => ({
                    id: opt.id,
                    value: questionWithOptions.hi?.options?.[idx]?.value || opt.value || "",
                  })),
                },
              };
            }

            return question;
          }),
        })),
      }));

      const testData = {
        id: testId,  // Backend schema requires "id" not "_id"
        name: formData.name,
        description: formData.description,
        exam: formData.exam,
        pattern: formData.pattern,
        sections: transformedSections,
        batches: formData.batches.map((b) => ({ ...b, _id: b.id })),
        validity: {
          from: formData.validityFrom ? formData.validityFrom.toISOString() : null,
          to: formData.validityTo ? formData.validityTo.toISOString() : null,
        },
        durationInMinutes: selectedPattern?.durationInMinutes || 180,
        result: {
          maxMarks: null,
          averageMarks: null,
          averageCompletionTime: null,
          publishProps: {
            type: formData.publishType,
            publishDate: getPublishDate(),
            isPublished: false,
          },
          students: [],
        },
        status: saveAsDraft ? "Inactive" : "Active",
        modifiedAt: new Date().toISOString(),
      };

      await api.tests.update(testData);
      toast({
        title: saveAsDraft ? "Draft Saved" : "Test Updated",
        description: saveAsDraft
          ? "Test has been saved as draft"
          : "Test has been updated successfully",
      });
      router.push("/tests");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError?.response?.data?.message ||
        (error instanceof Error ? error.message : "Failed to update test");
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getPublishDate = () => {
    if (formData.publishType === "immediately") return new Date().toISOString();
    if (formData.publishType === "atTheEndOfTest" && formData.validityTo) {
      return formData.validityTo.toISOString();
    }
    if (formData.publishType === "autoAfterXDays" && formData.validityTo) {
      const endDate = new Date(formData.validityTo);
      endDate.setDate(endDate.getDate() + formData.daysAfter);
      return endDate.toISOString();
    }
    return null;
  };

  const getSubjectName = (subjectId: string) => {
    if (subjectId.startsWith("SB_")) {
      return subjectsMap[subjectId] || subjectId;
    }
    return subjectId;
  };

  const subjects = React.useMemo(() => {
    const subjectSet = new Set<string>();
    formData.sections.forEach((s) => {
      if (s.subject) subjectSet.add(s.subject);
    });
    return Array.from(subjectSet);
  }, [formData.sections]);

  if (fetching) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading test...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateWithCheck("/tests")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Edit Test {formData.name && `- ${formData.name}`}
            </h1>
            <p className="text-muted-foreground">
              Update the test configuration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={loading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update the basic details for the test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Title for test"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, "");
                  handleInputChange("name", value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Small description for test"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Exam *</Label>
              <SearchableSelect
                options={exams.map((exam) => ({
                  value: exam._id,
                  label: exam.name,
                }))}
                value={formData.exam?.id || ""}
                onValueChange={handleExamChange}
                placeholder="Select Exam"
                searchPlaceholder="Search exams..."
                emptyText="No exams found"
              />
            </div>
            <div className="space-y-2">
              <Label>Pattern *</Label>
              <SearchableSelect
                options={patterns.map((pattern) => ({
                  value: pattern._id,
                  label: pattern.name,
                }))}
                value={formData.pattern?.id || ""}
                onValueChange={handlePatternChange}
                placeholder={
                  !formData.exam
                    ? "Select exam first"
                    : patterns.length === 0
                    ? "No patterns available"
                    : "Select Pattern"
                }
                searchPlaceholder="Search patterns..."
                emptyText="No patterns found"
                disabled={!formData.exam || patterns.length === 0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Batches *</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[44px]">
              {batches.map((batch) => {
                const isSelected = formData.batches.some((b) => b.id === batch._id);
                return (
                  <Badge
                    key={batch._id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleBatchToggle(batch)}
                  >
                    {batch.name}
                    {isSelected && " ✓"}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <DateTimePicker
                value={formData.validityFrom}
                onChange={(date) => handleInputChange("validityFrom", date)}
                placeholder="Pick start date and time"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date & Time *</Label>
              <DateTimePicker
                value={formData.validityTo}
                onChange={(date) => handleInputChange("validityTo", date)}
                placeholder="Pick end date and time"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Result Publish Type</Label>
              <Select
                value={formData.publishType}
                onValueChange={(value) => handleInputChange("publishType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISH_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.publishType === "autoAfterXDays" && (
              <div className="space-y-2">
                <Label htmlFor="daysAfter">Publish after - Day(s)</Label>
                <Input
                  id="daysAfter"
                  type="number"
                  min={1}
                  value={formData.daysAfter}
                  onChange={(e) => handleInputChange("daysAfter", parseInt(e.target.value) || 1)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Count Summary */}
      {subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Selection Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {subjects.map((subject) => {
                const { filled, total } = getQuestionCountForSubject(subject);
                return (
                  <div
                    key={subject}
                    className={`px-4 py-2 rounded-md border ${
                      filled === total ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <span className="font-medium">{getSubjectName(subject)}:</span>{" "}
                    <span className={filled === total ? "text-green-600" : "text-yellow-600"}>
                      {filled}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {formData.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Sections</CardTitle>
            <CardDescription>Manage questions in each section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.sections.map((section) => (
              <SectionAccordion
                key={section.id}
                section={section}
                isExpanded={expandedSections[section.id] || false}
                onToggle={() =>
                  setExpandedSections((prev) => ({
                    ...prev,
                    [section.id]: !prev[section.id],
                  }))
                }
                onOpenQuestionModal={openQuestionModal}
                onDeleteQuestion={handleDeleteQuestion}
                getSubjectName={getSubjectName}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {!formData.sections.length && formData.exam && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Please select a pattern to configure test sections
          </CardContent>
        </Card>
      )}

      {/* Question Selection Modal */}
      {questionModalOpen && activeSubSection && (
        <QuestionSelectionModal
          open={questionModalOpen}
          onClose={() => {
            setQuestionModalOpen(false);
            setActiveSubSection(null);
          }}
          subject={activeSubSection.subject}
          type={activeSubSection.type}
          maxQuestions={activeSubSection.maxQuestions}
          selectedQuestions={activeSubSection.currentQuestions}
          onSave={handleSaveQuestions}
        />
      )}

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        description="You have unsaved changes to this test. Are you sure you want to leave?"
      />
    </div>
  );
}

// Section Accordion Component
function SectionAccordion({
  section,
  isExpanded,
  onToggle,
  onOpenQuestionModal,
  onDeleteQuestion,
  getSubjectName,
}: {
  section: TestSection;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenQuestionModal: (
    sectionId: string,
    subSectionId: string,
    subject: string,
    type: string,
    maxQuestions: number,
    currentQuestions: IQuestion[]
  ) => void;
  onDeleteQuestion: (sectionId: string, subSectionId: string, questionId: string) => void;
  getSubjectName: (subjectId: string) => string;
}) {
  const totalQuestions = section.subSections.reduce(
    (acc, sub) => acc + (sub.totalQuestions || 0),
    0
  );
  const filledQuestions = section.subSections.reduce(
    (acc, sub) => acc + (sub.questions?.length || 0),
    0
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="font-semibold">{section.name}</h3>
              <p className="text-sm text-muted-foreground">Subject: {getSubjectName(section.subject || "")}</p>
            </div>
            <Badge variant={filledQuestions === totalQuestions ? "default" : "secondary"}>
              {filledQuestions}/{totalQuestions} questions
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 pl-4">
        {section.subSections.map((subSection) => (
          <SubSectionCard
            key={subSection.id}
            sectionId={section.id}
            subSection={subSection}
            subject={section.subject || ""}
            onOpenQuestionModal={onOpenQuestionModal}
            onDeleteQuestion={onDeleteQuestion}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// SubSection Card Component
function SubSectionCard({
  sectionId,
  subSection,
  subject,
  onOpenQuestionModal,
  onDeleteQuestion,
}: {
  sectionId: string;
  subSection: TestSubSection;
  subject: string;
  onOpenQuestionModal: (
    sectionId: string,
    subSectionId: string,
    subject: string,
    type: string,
    maxQuestions: number,
    currentQuestions: IQuestion[]
  ) => void;
  onDeleteQuestion: (sectionId: string, subSectionId: string, questionId: string) => void;
}) {
  const [previewQuestion, setPreviewQuestion] = React.useState<IQuestion | null>(null);

  const questionColumns: ColumnDef<IQuestion>[] = [
    {
      id: "question",
      header: "Question",
      accessorFn: (row) => row.en?.question || row.question || "",
      cell: ({ row }) => {
        const question = row.original;
        const questionText = question.en?.question || question.question || "";
        return (
          <div className="max-w-md truncate">
            <RenderWithLatex quillString={questionText} />
          </div>
        );
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as string;
        const difficultyLower = difficulty?.toLowerCase();
        const colorClass =
          difficultyLower === "easy"
            ? "!bg-green-100 !text-green-800 border-green-200"
            : difficultyLower === "medium"
            ? "!bg-yellow-100 !text-yellow-800 border-yellow-200"
            : "!bg-red-100 !text-red-800 border-red-200";
        return <Badge variant="outline" className={colorClass}>{difficulty}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteQuestion(sectionId, subSection.id, row.original._id);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  const filledCount = subSection.questions?.length || 0;
  const totalCount = subSection.totalQuestions || 0;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{subSection.name}</h4>
            <Badge variant="outline">{subSection.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Total: {totalCount} | To Attempt: {subSection.toBeAttempted || totalCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={filledCount === totalCount ? "default" : "secondary"}>
            {filledCount}/{totalCount}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onOpenQuestionModal(
                sectionId,
                subSection.id,
                subject,
                subSection.type,
                totalCount,
                subSection.questions || []
              )
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Questions
          </Button>
        </div>
      </div>

      {/* Questions List */}
      {subSection.questions && subSection.questions.length > 0 && (
        <div className="border-t pt-4">
          <DataTable
            columns={questionColumns}
            data={subSection.questions}
            searchKey="question"
            searchPlaceholder="Search questions..."
            onRowClick={(question) => setPreviewQuestion(question)}
          />
        </div>
      )}

      {/* Question Preview Dialog */}
      <QuestionPreviewDialog
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
      />
    </div>
  );
}
