"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Zap, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { IPattern, IBatch, IExam, ISection, ISubSection, IQuestion } from "@/types";
import { QuestionSelectionModal } from "@/components/question-selection-modal";
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
  validityFrom: string;
  validityTo: string;
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
  validityFrom: "",
  validityTo: "",
  publishType: "immediately",
  daysAfter: 1,
  sections: [],
  status: "Active",
};

export default function CreateTestPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = React.useState<TestFormData>(initialFormData);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [patterns, setPatterns] = React.useState<IPattern[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [loading, setLoading] = React.useState(false);
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

  // Fetch initial data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, batchesRes] = await Promise.all([
          api.exams.getAll(),
          api.batches.getAll(),
        ]);
        setExams(Array.isArray(examsRes.data) ? examsRes.data : (examsRes.data?.exams || []));
        setBatches(Array.isArray(batchesRes.data) ? batchesRes.data : (batchesRes.data?.data || batchesRes.data?.batches || []));
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch patterns when exam changes
  React.useEffect(() => {
    const fetchPatterns = async () => {
      if (!formData.exam?.name) {
        setPatterns([]);
        return;
      }
      try {
        const response = await api.patterns.getByExam(formData.exam.name);
        setPatterns(Array.isArray(response.data) ? response.data : (response.data?.patterns || []));
      } catch (error) {
        console.error("Failed to fetch patterns:", error);
        setPatterns([]);
      }
    };
    fetchPatterns();
  }, [formData.exam?.name]);

  // Update sections when pattern changes
  React.useEffect(() => {
    if (formData.pattern?.id && patterns.length > 0) {
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
  }, [formData.pattern?.id, patterns]);

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

  const handleSubmit = async (saveAsDraft = false) => {
    if (!saveAsDraft) {
      const error = validateForm();
      if (error) {
        toast({ title: "Validation Error", description: error, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const selectedPattern = getSelectedPattern();
      const testData = {
        name: formData.name,
        description: formData.description,
        exam: formData.exam,
        pattern: formData.pattern,
        sections: formData.sections,
        batches: formData.batches.map((b) => ({ ...b, _id: b.id })),
        validity: {
          from: formData.validityFrom ? new Date(formData.validityFrom).toISOString() : "",
          to: formData.validityTo ? new Date(formData.validityTo).toISOString() : "",
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
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      await api.tests.create(testData);
      toast({
        title: saveAsDraft ? "Draft Saved" : "Test Created",
        description: saveAsDraft
          ? "Test has been saved as draft"
          : "Test has been created successfully",
      });
      router.push("/tests");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create test";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getPublishDate = () => {
    if (formData.publishType === "immediately") return new Date().toISOString();
    if (formData.publishType === "atTheEndOfTest" && formData.validityTo) {
      return new Date(formData.validityTo).toISOString();
    }
    if (formData.publishType === "autoAfterXDays" && formData.validityTo) {
      const endDate = new Date(formData.validityTo);
      endDate.setDate(endDate.getDate() + formData.daysAfter);
      return endDate.toISOString();
    }
    return null;
  };

  // Get unique subjects from sections for question count display
  const subjects = React.useMemo(() => {
    const subjectSet = new Set<string>();
    formData.sections.forEach((s) => {
      if (s.subject) subjectSet.add(s.subject);
    });
    return Array.from(subjectSet);
  }, [formData.sections]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create Test {formData.name && `- ${formData.name}`}
            </h1>
            <p className="text-muted-foreground">
              Configure a new test for your students
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={loading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? "Publishing..." : "Publish Test"}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Enter the basic details for the test</CardDescription>
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
                  // Only allow alphanumeric, space, dash, underscore
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
              <Select
                value={formData.exam?.id || ""}
                onValueChange={handleExamChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam._id} value={exam._id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pattern *</Label>
              <Select
                value={formData.pattern?.id || ""}
                onValueChange={handlePatternChange}
                disabled={!formData.exam || patterns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !formData.exam
                        ? "Select exam first"
                        : patterns.length === 0
                        ? "No patterns available"
                        : "Select Pattern"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {patterns.map((pattern) => (
                    <SelectItem key={pattern._id} value={pattern._id}>
                      {pattern.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="validityFrom">Start Date & Time *</Label>
              <Input
                id="validityFrom"
                type="datetime-local"
                value={formData.validityFrom}
                onChange={(e) => handleInputChange("validityFrom", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validityTo">End Date & Time *</Label>
              <Input
                id="validityTo"
                type="datetime-local"
                value={formData.validityTo}
                onChange={(e) => handleInputChange("validityTo", e.target.value)}
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
                    <span className="font-medium">{subject}:</span>{" "}
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
            <CardDescription>Add questions to each section</CardDescription>
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
              />
            ))}
          </CardContent>
        </Card>
      )}

      {!formData.sections.length && formData.exam && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Please select a pattern to create test
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
              <p className="text-sm text-muted-foreground">Subject: {section.subject}</p>
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
  const questionColumns: ColumnDef<IQuestion>[] = [
    {
      accessorKey: "en.question",
      header: "Question",
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
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("difficulty")}</Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteQuestion(sectionId, subSection.id, row.original._id)}
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
            searchKey="en.question"
            searchPlaceholder="Search questions..."
          />
        </div>
      )}
    </div>
  );
}
