"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Zap, Search, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { IQuestion } from "@/types";
import RenderWithLatex from "@/components/render-with-latex";

interface ISubject {
  _id: string;
  name: string;
}

interface QuestionSelectionModalProps {
  open: boolean;
  onClose: () => void;
  subject: string; // Can be subject ID or subject name
  type: string;
  maxQuestions: number;
  selectedQuestions: IQuestion[];
  onSave: (questions: IQuestion[]) => void;
}

export function QuestionSelectionModal({
  open,
  onClose,
  subject,
  type,
  maxQuestions,
  selectedQuestions,
  onSave,
}: QuestionSelectionModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<"manual" | "auto">("manual");
  const [questions, setQuestions] = React.useState<IQuestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selected, setSelected] = React.useState<IQuestion[]>(selectedQuestions);
  const [subjectName, setSubjectName] = React.useState<string>(subject);

  // Auto-generate state
  const [easy, setEasy] = React.useState(Math.floor(maxQuestions * 0.3));
  const [medium, setMedium] = React.useState(Math.floor(maxQuestions * 0.5));
  const [hard, setHard] = React.useState(Math.floor(maxQuestions * 0.2));
  const [autoGenerating, setAutoGenerating] = React.useState(false);

  // Resolve subject ID to subject name if needed
  React.useEffect(() => {
    const resolveSubjectName = async () => {
      // If subject looks like an ID (starts with SB_ or contains underscores/dashes with alphanumeric)
      if (subject && (subject.startsWith("SB_") || /^[A-Z]{2}_[a-f0-9_-]+$/i.test(subject))) {
        try {
          const response = await api.subjects.getAll();
          const subjects: ISubject[] = response.data?.data || response.data?.subjects || response.data || [];
          const found = subjects.find((s) => s._id === subject);
          if (found) {
            setSubjectName(found.name);
          } else {
            setSubjectName(subject); // Fallback to original value
          }
        } catch (error) {
          console.error("Failed to resolve subject name:", error);
          setSubjectName(subject);
        }
      } else {
        setSubjectName(subject);
      }
    };

    if (open && subject) {
      resolveSubjectName();
    }
  }, [open, subject]);

  // Fetch questions when modal opens
  React.useEffect(() => {
    if (open && subject) {
      fetchQuestions();
    }
  }, [open, subject, type]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Send original subject (ID or name) - backend handles ID resolution
      const params: Record<string, unknown> = {
        subject,
        page: 1,
        size: 200,
      };

      let response;
      // Map question type to API endpoint
      if (type === "single" || type === "multiple") {
        response = await api.questions.getMCQ({ ...params, type });
      } else if (type === "integer") {
        response = await api.questions.getNumerical(params);
      } else if (type === "paragraph") {
        response = await api.questions.getParagraph(params);
      } else if (type === "matrix") {
        response = await api.questions.getMatrix(params);
      } else {
        response = await api.questions.getMCQ(params);
      }

      const questionsData = response?.data?.data || response?.data?.questions || [];
      // Filter out already selected questions
      const selectedIds = new Set(selectedQuestions.map((q) => q._id));
      setQuestions(questionsData.filter((q: IQuestion) => !selectedIds.has(q._id)));
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      toast({ title: "Error", description: "Failed to fetch questions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQuestion = (question: IQuestion) => {
    setSelected((prev) => {
      const exists = prev.some((q) => q._id === question._id);
      if (exists) {
        return prev.filter((q) => q._id !== question._id);
      }
      if (prev.length >= maxQuestions) {
        toast({
          title: "Maximum reached",
          description: `You can only select ${maxQuestions} questions`,
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, question];
    });
  };

  const handleAutoGenerate = async () => {
    if (easy + medium + hard !== maxQuestions) {
      toast({
        title: "Invalid distribution",
        description: `Total should equal ${maxQuestions} (currently ${easy + medium + hard})`,
        variant: "destructive",
      });
      return;
    }

    setAutoGenerating(true);
    try {
      // Send original subject (ID or name) - backend handles ID resolution
      const params = {
        type,
        difficulties: JSON.stringify({ easy, medium, hard }),
        rejectedQuestions: "",
        subject,
        totalQuestions: maxQuestions,
      };

      let response;
      if (type === "single" || type === "multiple") {
        response = await api.questions.autoGenerate("mcq", params);
      } else if (type === "integer") {
        response = await api.questions.autoGenerate("numerical", params);
      } else {
        toast({ title: "Error", description: "Auto-generate not supported for this type", variant: "destructive" });
        setAutoGenerating(false);
        return;
      }

      const generatedQuestions = response?.data?.data || response?.data || [];

      // Add attemptedBy field to options for MCQ
      const processedQuestions = generatedQuestions.map((q: IQuestion) => {
        if (q.type === "single" || q.type === "multiple") {
          return {
            ...q,
            en: {
              ...q.en,
              options: (q as unknown as { en?: { options?: Array<{ id: string; value: string }> } })?.en?.options?.map((opt: { id: string; value: string }) => ({
                ...opt,
                attemptedBy: 0,
              })),
            },
            hi: {
              ...(q as unknown as { hi?: Record<string, unknown> })?.hi,
              options: (q as unknown as { hi?: { options?: Array<{ id: string; value: string }> } })?.hi?.options?.map((opt: { id: string; value: string }) => ({
                ...opt,
                attemptedBy: 0,
              })),
            },
          };
        }
        return q;
      });

      setSelected(processedQuestions);
      toast({
        title: "Generated",
        description: `Auto-generated ${processedQuestions.length} questions`,
      });
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to auto-generate questions";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleSave = () => {
    onSave(selected);
  };

  const columns: ColumnDef<IQuestion>[] = [
    {
      id: "select",
      header: "",
      cell: ({ row }) => {
        const isSelected = selected.some((q) => q._id === row.original._id);
        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => handleToggleQuestion(row.original)}
          />
        );
      },
    },
    {
      id: "question",
      header: "Question",
      accessorFn: (row) => row.en?.question || row.question || "",
      cell: ({ row }) => {
        const question = row.original;
        const questionText = question.en?.question || question.question || "";
        return (
          <div className="max-w-lg">
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
      accessorKey: "chapters",
      header: "Chapter",
      cell: ({ row }) => {
        const chapters = row.original.chapters;
        if (!chapters || chapters.length === 0) return "-";
        return chapters[0]?.name || "-";
      },
    },
  ];

  const filteredQuestions = React.useMemo(() => {
    if (!searchQuery) return questions;
    const query = searchQuery.toLowerCase();
    return questions.filter((q) => {
      const questionText = q.en?.question || q.question || "";
      return questionText.toLowerCase().includes(query);
    });
  }, [questions, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Questions</DialogTitle>
          <DialogDescription>
            {subjectName} - {type} questions ({selected.length}/{maxQuestions} selected)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "auto")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Selection</TabsTrigger>
            <TabsTrigger value="auto">Auto Generate</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredQuestions}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="auto" className="flex-1 mt-4">
            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-4">Difficulty Distribution</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Easy</Label>
                    <Input
                      type="number"
                      min={0}
                      max={maxQuestions}
                      value={easy}
                      onChange={(e) => setEasy(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medium</Label>
                    <Input
                      type="number"
                      min={0}
                      max={maxQuestions}
                      value={medium}
                      onChange={(e) => setMedium(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hard</Label>
                    <Input
                      type="number"
                      min={0}
                      max={maxQuestions}
                      value={hard}
                      onChange={(e) => setHard(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total: {easy + medium + hard} / {maxQuestions}
                    {easy + medium + hard !== maxQuestions && (
                      <span className="text-destructive ml-2">
                        (must equal {maxQuestions})
                      </span>
                    )}
                  </p>
                  <Button
                    onClick={handleAutoGenerate}
                    disabled={autoGenerating || easy + medium + hard !== maxQuestions}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {autoGenerating ? "Generating..." : "Auto Generate"}
                  </Button>
                </div>
              </div>

              {selected.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Generated Questions ({selected.length})</h4>
                  <div className="border rounded-md max-h-[300px] overflow-auto">
                    <DataTable
                      columns={columns.filter((c) => c.id !== "select")}
                      data={selected}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selected.length} of {maxQuestions} questions selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={selected.length === 0}>
                <Check className="h-4 w-4 mr-2" />
                Save Selection
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
