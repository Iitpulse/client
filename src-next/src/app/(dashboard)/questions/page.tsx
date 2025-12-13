"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Edit,
  Trash2,
  FileUp,
  Download,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { api } from "@/lib/api";
import { IQuestion, ISubject, IChapter } from "@/types";
import RenderWithLatex from "@/components/render-with-latex";

const difficultyVariants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  easy: "success",
  medium: "warning",
  hard: "destructive",
};

const difficultyOptions = [
  { value: "all", label: "All Difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = React.useState<IQuestion[]>([]);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [topics, setTopics] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [questionToDelete, setQuestionToDelete] = React.useState<IQuestion | null>(null);
  const [activeTab, setActiveTab] = React.useState("mcq");

  // Filters - using arrays for multi-select
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>("all");
  const [selectedChapters, setSelectedChapters] = React.useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);

  // Preview sidebar
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [selectedQuestion, setSelectedQuestion] = React.useState<IQuestion | null>(null);
  const [updatingProofread, setUpdatingProofread] = React.useState(false);

  const fetchQuestions = React.useCallback(async (type: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      // For multi-select, join with comma for backend
      if (selectedSubjects.length > 0) params.subject = selectedSubjects.join(",");
      if (selectedDifficulty !== "all") params.difficulty = selectedDifficulty;
      if (selectedChapters.length > 0) params.chapter = selectedChapters.join(",");
      if (selectedTopics.length > 0) params.topic = selectedTopics.join(",");

      let response;

      switch (type) {
        case "mcq":
          response = await api.questions.getMCQ(params);
          break;
        case "numerical":
          response = await api.questions.getNumerical(params);
          break;
        case "paragraph":
          response = await api.questions.getParagraph(params);
          break;
        case "matrix":
          response = await api.questions.getMatrix(params);
          break;
        default:
          response = await api.questions.getMCQ(params);
      }
      // Backend returns { success, data: [...], totalDocs, currentPage, totalPages }
      setQuestions(response.data?.data || response.data?.questions || []);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjects, selectedDifficulty, selectedChapters, selectedTopics]);

  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.subjects.getAll();
        // Backend returns { success, data: [...] }
        setSubjects(response.data?.data || response.data?.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  // Update chapters when subjects change (collect from all selected subjects)
  React.useEffect(() => {
    if (selectedSubjects.length === 0) {
      setChapters([]);
      setSelectedChapters([]);
      setTopics([]);
      setSelectedTopics([]);
      return;
    }

    // Collect chapters from all selected subjects
    const allChapters: IChapter[] = [];
    selectedSubjects.forEach((subjectId) => {
      const subject = subjects.find((s) => s._id === subjectId);
      if (subject?.chapters) {
        allChapters.push(...subject.chapters);
      }
    });
    setChapters(allChapters);
    // Clear chapter selection when subjects change
    setSelectedChapters([]);
    setTopics([]);
    setSelectedTopics([]);
  }, [selectedSubjects, subjects]);

  // Update topics when chapters change (collect from all selected chapters)
  React.useEffect(() => {
    if (selectedChapters.length === 0) {
      setTopics([]);
      setSelectedTopics([]);
      return;
    }

    // Collect unique topics from all selected chapters
    const allTopics = new Set<string>();
    selectedChapters.forEach((chapterId) => {
      const chapter = chapters.find((c) => c._id === chapterId || c.id === chapterId || c.name === chapterId);
      if (chapter?.topics) {
        chapter.topics.forEach((t) => allTopics.add(t));
      }
    });
    setTopics(Array.from(allTopics));
    // Clear topic selection when chapters change
    setSelectedTopics([]);
  }, [selectedChapters, chapters]);

  React.useEffect(() => {
    fetchQuestions(activeTab);
  }, [activeTab, fetchQuestions]);

  const handleDelete = async () => {
    if (!questionToDelete) return;
    try {
      await api.questions.delete(activeTab, questionToDelete._id);
      fetchQuestions(activeTab);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const handleProofreadToggle = async (question: IQuestion, checked: boolean) => {
    setUpdatingProofread(true);
    try {
      await api.questions.update(activeTab, question._id, { isProofRead: checked });
      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q._id === question._id ? { ...q, isProofRead: checked } : q
        )
      );
      // Update selected question if it's the same
      if (selectedQuestion?._id === question._id) {
        setSelectedQuestion({ ...selectedQuestion, isProofRead: checked });
      }
    } catch (error) {
      console.error("Failed to update proofread status:", error);
    } finally {
      setUpdatingProofread(false);
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleExportCSV = () => {
    if (questions.length === 0) return;

    const headers = ["ID", "Question", "Subject", "Chapter", "Topics", "Difficulty", "Status", "Uploaded By"];
    const rows = questions.map((q) => {
      const questionText = (q as unknown as { en?: { question?: string } })?.en?.question || "";
      const subject = typeof q.subject === "string" ? q.subject : (q.subject as { name?: string })?.name || "";
      const chapters = (q as unknown as { chapters?: Array<{ name: string; topics?: string[] }> })?.chapters;
      const chapterNames = Array.isArray(chapters) ? chapters.map((ch) => ch.name).join("; ") : "";
      const topicsList = Array.isArray(chapters)
        ? chapters.flatMap((ch) => ch.topics || []).join("; ")
        : "";
      const uploadedBy = q.uploadedBy ? `${q.uploadedBy.userType} (${q.uploadedBy.id})` : "";

      return [
        q._id,
        `"${stripHtml(questionText).replace(/"/g, '""')}"`,
        subject,
        chapterNames,
        topicsList,
        q.difficulty || "unset",
        q.isProofRead ? "Proofread" : "Pending",
        uploadedBy,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `questions_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openPreview = (question: IQuestion) => {
    setSelectedQuestion(question);
    setPreviewOpen(true);
  };

  const columns: ColumnDef<IQuestion>[] = [
    {
      id: "question",
      header: "Question",
      cell: ({ row }) => {
        // Question text is at en.question, not question
        const questionText = (row.original as unknown as { en?: { question?: string } })?.en?.question || "";
        // For table display, show truncated HTML for LaTeX rendering
        const stripped = stripHtml(questionText);
        const truncatedHtml = questionText.length > 150
          ? questionText.substring(0, 150) + "..."
          : questionText;
        return (
          <div className="max-w-md font-medium" title={stripped}>
            <RenderWithLatex quillString={truncatedHtml} className="line-clamp-2" />
          </div>
        );
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => {
        const subject = row.original.subject;
        // subject can be a string (name) or an object with name property
        if (typeof subject === "string") return subject;
        if (typeof subject === "object" && subject) return (subject as { name?: string })?.name || "-";
        return "-";
      },
    },
    {
      id: "chapter",
      header: "Chapter",
      cell: ({ row }) => {
        // chapters is an array of { name, topics } objects
        const chapters = (row.original as unknown as { chapters?: Array<{ name: string; topics?: string[] }> })?.chapters;
        if (Array.isArray(chapters) && chapters.length > 0) {
          return (
            <span className="max-w-[150px] truncate block" title={chapters.map(ch => ch.name).join(", ")}>
              {chapters.map(ch => ch.name).join(", ")}
            </span>
          );
        }
        return "-";
      },
    },
    {
      id: "topics",
      header: "Topics",
      cell: ({ row }) => {
        const chapters = (row.original as unknown as { chapters?: Array<{ name: string; topics?: string[] }> })?.chapters;
        const allTopics = Array.isArray(chapters)
          ? chapters.flatMap((ch) => ch.topics || [])
          : [];
        if (allTopics.length > 0) {
          const displayText = allTopics.slice(0, 2).join(", ");
          const hasMore = allTopics.length > 2;
          return (
            <span className="max-w-[150px] truncate block" title={allTopics.join(", ")}>
              {displayText}{hasMore && ` +${allTopics.length - 2}`}
            </span>
          );
        }
        return "-";
      },
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as string;
        return (
          <Badge variant={difficultyVariants[difficulty?.toLowerCase()] || "default"}>
            {difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isProofRead",
      header: "Status",
      cell: ({ row }) => {
        const isProofRead = row.getValue("isProofRead") as boolean;
        return (
          <Badge variant={isProofRead ? "success" : "secondary"}>
            {isProofRead ? "Proofread" : "Pending"}
          </Badge>
        );
      },
    },
    {
      id: "uploadedBy",
      header: "Uploaded By",
      cell: ({ row }) => {
        const uploadedBy = row.original.uploadedBy;
        if (uploadedBy?.userType && uploadedBy?.id) {
          return (
            <span className="text-sm text-muted-foreground">
              {uploadedBy.userType}
            </span>
          );
        }
        return "-";
      },
    },
    {
      id: "edit",
      header: "Edit",
      cell: ({ row }) => {
        const question = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/questions/${question._id}/edit?type=${activeTab}`);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
          <p className="text-muted-foreground">
            Manage your question bank
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={questions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" asChild>
            <Link href="/questions/bulk-upload">
              <FileUp className="mr-2 h-4 w-4" />
              Bulk Upload
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/questions/new?type=${activeTab}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-56">
          <MultiSelect values={selectedSubjects} onValuesChange={setSelectedSubjects}>
            <MultiSelectTrigger>
              <MultiSelectValue placeholder="Filter by subject" />
            </MultiSelectTrigger>
            <MultiSelectContent
              search={{ placeholder: "Search subjects...", emptyMessage: "No subjects found" }}
            >
              {subjects.map((subject) => (
                <MultiSelectItem key={subject._id} value={subject._id}>
                  {subject.name}
                </MultiSelectItem>
              ))}
            </MultiSelectContent>
          </MultiSelect>
        </div>

        <div className="w-56">
          <MultiSelect
            values={selectedChapters}
            onValuesChange={setSelectedChapters}
            disabled={selectedSubjects.length === 0 || chapters.length === 0}
          >
            <MultiSelectTrigger>
              <MultiSelectValue placeholder="Filter by chapter" />
            </MultiSelectTrigger>
            <MultiSelectContent
              search={{ placeholder: "Search chapters...", emptyMessage: "No chapters found" }}
            >
              {chapters.map((chapter) => (
                <MultiSelectItem key={chapter._id || chapter.id || chapter.name} value={chapter.name}>
                  {chapter.name}
                </MultiSelectItem>
              ))}
            </MultiSelectContent>
          </MultiSelect>
        </div>

        <div className="w-56">
          <MultiSelect
            values={selectedTopics}
            onValuesChange={setSelectedTopics}
            disabled={selectedChapters.length === 0 || topics.length === 0}
          >
            <MultiSelectTrigger>
              <MultiSelectValue placeholder="Filter by topic" />
            </MultiSelectTrigger>
            <MultiSelectContent
              search={{ placeholder: "Search topics...", emptyMessage: "No topics found" }}
            >
              {topics.map((topic) => (
                <MultiSelectItem key={topic} value={topic}>
                  {topic}
                </MultiSelectItem>
              ))}
            </MultiSelectContent>
          </MultiSelect>
        </div>

        <div className="w-48">
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficultyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mcq">MCQ</TabsTrigger>
          <TabsTrigger value="numerical">Numerical</TabsTrigger>
          <TabsTrigger value="paragraph">Paragraph</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="text-muted-foreground">Loading questions...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={questions}
              searchKey="question"
              searchPlaceholder="Search questions..."
              onRowClick={(question) => openPreview(question)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Sidebar */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>Question Preview</SheetTitle>
            <SheetDescription>
              View question details and manage proofread status
            </SheetDescription>
          </SheetHeader>

          {selectedQuestion && (
            <div className="mt-6 space-y-6 flex-1 overflow-y-auto pr-2">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/questions/${selectedQuestion._id}/edit?type=${activeTab}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Question
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setQuestionToDelete(selectedQuestion);
                    setDeleteDialogOpen(true);
                    setPreviewOpen(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>

              <Separator />

              {/* Proofread Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="proofread-toggle">Proofread Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark this question as proofread
                  </p>
                </div>
                <Switch
                  id="proofread-toggle"
                  checked={selectedQuestion.isProofRead || false}
                  onCheckedChange={(checked) => handleProofreadToggle(selectedQuestion, checked)}
                  disabled={updatingProofread}
                />
              </div>

              <Separator />

              {/* Question Content */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Question</h4>
                  <div className="rounded-md border p-4 bg-muted/30">
                    <RenderWithLatex
                      quillString={(selectedQuestion as unknown as { en?: { question?: string } })?.en?.question || ""}
                    />
                  </div>
                </div>

                {/* Options for MCQ */}
                {(selectedQuestion.type === "single" || selectedQuestion.type === "multiple") && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Options</h4>
                    <div className="space-y-2">
                      {((selectedQuestion as unknown as { en?: { options?: Array<{ id: string; value: string }> } })?.en?.options || []).map((option, idx) => {
                        const isCorrect = (selectedQuestion as unknown as { correctAnswers?: string[] })?.correctAnswers?.includes(option.id);
                        return (
                          <div
                            key={option.id}
                            className={`rounded-md border p-3 ${isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "bg-muted/30"}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-sm">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <div className="flex-1">
                                <RenderWithLatex quillString={option.value} />
                              </div>
                              {isCorrect && (
                                <Check className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Correct Answer for Integer */}
                {selectedQuestion.type === "integer" && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Correct Answer</h4>
                    <div className="rounded-md border p-3 bg-green-50 dark:bg-green-950/30 border-green-500">
                      <span className="font-medium">
                        {(selectedQuestion as unknown as { correctAnswer?: { from: number; to: number } })?.correctAnswer?.from}
                        {(selectedQuestion as unknown as { correctAnswer?: { from: number; to: number } })?.correctAnswer?.from !==
                          (selectedQuestion as unknown as { correctAnswer?: { from: number; to: number } })?.correctAnswer?.to &&
                          ` - ${(selectedQuestion as unknown as { correctAnswer?: { from: number; to: number } })?.correctAnswer?.to}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Paragraph Question */}
                {selectedQuestion.type === "paragraph" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Passage</h4>
                      <div className="rounded-md border p-4 bg-muted/30">
                        <RenderWithLatex
                          quillString={
                            (selectedQuestion as unknown as { paragraph?: { en?: { value: string } } })?.paragraph?.en?.value || ""
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Questions ({(selectedQuestion as unknown as { questions?: unknown[] })?.questions?.length || 0})
                      </h4>
                      <div className="space-y-4">
                        {((selectedQuestion as unknown as { questions?: Array<{
                          id: string;
                          type: string;
                          en?: { question: string; options?: Array<{ id: string; value: string }> };
                          correctAnswers?: string[];
                          correctAnswer?: { from: number; to: number };
                        }> })?.questions || []).map((childQ, idx) => (
                          <div key={childQ.id || idx} className="rounded-md border p-4 bg-muted/20">
                            <div className="flex items-start gap-2 mb-3">
                              <span className="font-medium text-sm shrink-0">Q{idx + 1}.</span>
                              <RenderWithLatex quillString={childQ.en?.question || ""} />
                            </div>
                            {/* Child question options */}
                            {(childQ.type === "single" || childQ.type === "multiple") && childQ.en?.options && (
                              <div className="space-y-2 ml-6">
                                {childQ.en.options.map((opt, optIdx) => {
                                  const isCorrect = childQ.correctAnswers?.includes(opt.id);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`rounded-md border p-2 text-sm ${isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "bg-background"}`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="font-medium">{String.fromCharCode(65 + optIdx)}.</span>
                                        <div className="flex-1">
                                          <RenderWithLatex quillString={opt.value} />
                                        </div>
                                        {isCorrect && <Check className="h-3 w-3 text-green-600 shrink-0" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Child question integer answer */}
                            {childQ.type === "integer" && childQ.correctAnswer && (
                              <div className="ml-6 mt-2">
                                <span className="text-sm text-muted-foreground">Answer: </span>
                                <span className="font-medium text-green-600">
                                  {childQ.correctAnswer.from}
                                  {childQ.correctAnswer.from !== childQ.correctAnswer.to && ` - ${childQ.correctAnswer.to}`}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Matrix Question */}
                {selectedQuestion.type === "matrix" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Answer Matrix</h4>
                      <div className="rounded-md border p-4 bg-muted/30 overflow-x-auto">
                        {(() => {
                          const matrix = (selectedQuestion as unknown as { correctAnswer?: boolean[][] })?.correctAnswer || [];
                          if (matrix.length === 0) return <p className="text-sm text-muted-foreground">No matrix data</p>;

                          const cols = matrix[0]?.length || 0;
                          return (
                            <table className="border-collapse">
                              <thead>
                                <tr>
                                  <th className="p-2 text-sm font-medium"></th>
                                  {Array(cols).fill(0).map((_, i) => (
                                    <th key={i} className="p-2 text-sm font-medium text-center min-w-[40px]">
                                      C{i + 1}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {matrix.map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    <td className="p-2 text-sm font-medium">R{rowIdx + 1}</td>
                                    {row.map((cell, colIdx) => (
                                      <td key={colIdx} className="p-2 text-center">
                                        <div className={`w-6 h-6 mx-auto rounded border flex items-center justify-center ${
                                          cell ? "bg-green-500 border-green-600 text-white" : "bg-muted border-border"
                                        }`}>
                                          {cell && <Check className="h-4 w-4" />}
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Solution */}
                {(selectedQuestion as unknown as { en?: { solution?: string } })?.en?.solution && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Solution</h4>
                    <div className="rounded-md border p-4 bg-muted/30">
                      <RenderWithLatex
                        quillString={(selectedQuestion as unknown as { en?: { solution?: string } })?.en?.solution || ""}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <p className="font-medium">
                      {typeof selectedQuestion.subject === "string"
                        ? selectedQuestion.subject
                        : (selectedQuestion.subject as { name?: string })?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Difficulty:</span>
                    <p>
                      <Badge variant={difficultyVariants[selectedQuestion.difficulty?.toLowerCase()] || "default"}>
                        {selectedQuestion.difficulty?.charAt(0).toUpperCase() +
                          selectedQuestion.difficulty?.slice(1).toLowerCase()}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chapters:</span>
                    <p className="font-medium">
                      {(selectedQuestion as unknown as { chapters?: Array<{ name: string }> })?.chapters
                        ?.map((ch) => ch.name)
                        .join(", ") || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Topics:</span>
                    <p className="font-medium">
                      {(selectedQuestion as unknown as { chapters?: Array<{ name: string; topics?: string[] }> })?.chapters
                        ?.flatMap((ch) => ch.topics || [])
                        .join(", ") || "-"}
                    </p>
                  </div>
                  {selectedQuestion.uploadedBy && (
                    <div>
                      <span className="text-muted-foreground">Uploaded By:</span>
                      <p className="font-medium">
                        {selectedQuestion.uploadedBy.userType} ({selectedQuestion.uploadedBy.id})
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>
                      <Badge variant={selectedQuestion.isProofRead ? "success" : "secondary"}>
                        {selectedQuestion.isProofRead ? "Proofread" : "Pending"}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
