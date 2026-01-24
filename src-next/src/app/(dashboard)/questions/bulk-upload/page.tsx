"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Edit,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import api, { ParsedQuestion as APIParsedQuestion } from "@/lib/api";
import { ISubject, IChapter } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface EditableQuestion extends APIParsedQuestion {
  isSelected: boolean;
  isEditing: boolean;
  editedSubject?: string;
  editedChapter?: string;
  editedDifficulty?: "easy" | "medium" | "hard";
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Subject and chapter data
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedChapter, setSelectedChapter] = React.useState("");
  const [defaultDifficulty, setDefaultDifficulty] = React.useState<"easy" | "medium" | "hard">("medium");

  // Upload state
  const [uploadMode, setUploadMode] = React.useState<"file" | "text">("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [textContent, setTextContent] = React.useState("");
  const [parsing, setParsing] = React.useState(false);
  const [parsingProgress, setParsingProgress] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [step, setStep] = React.useState<"upload" | "preview" | "complete">("upload");

  // Parsed questions
  const [parsedQuestions, setParsedQuestions] = React.useState<EditableQuestion[]>([]);
  const [invalidQuestions, setInvalidQuestions] = React.useState<Array<{ question: APIParsedQuestion; reason: string }>>([]);
  const [expandedQuestions, setExpandedQuestions] = React.useState<Set<string>>(new Set());

  // Edit dialog
  const [editingQuestion, setEditingQuestion] = React.useState<EditableQuestion | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Fetch subjects
  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.subjects.getAll();
        setSubjects(response.data?.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch chapters when subject changes
  React.useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedSubject) {
        setChapters([]);
        return;
      }
      try {
        const response = await api.subjects.getChapters(selectedSubject);
        setChapters(response.data?.chapters || []);
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      }
    };
    fetchChapters();
  }, [selectedSubject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseWithAI = async () => {
    if (uploadMode === "file" && !file) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }
    if (uploadMode === "text" && !textContent.trim()) {
      toast({ title: "Error", description: "Please enter some text content", variant: "destructive" });
      return;
    }

    setParsing(true);
    setParsingProgress(10);

    try {
      let response;

      if (uploadMode === "file" && file) {
        // Use sync parsing for smaller files, async for larger ones
        const fileSizeMB = file.size / (1024 * 1024);

        if (fileSizeMB < 5) {
          // Sync parsing for files under 5MB
          setParsingProgress(30);
          response = await api.aiParsing.parseFileSync(file);
          setParsingProgress(100);
        } else {
          // Async parsing for larger files
          const jobResponse = await api.aiParsing.parseFile(file);
          const jobId = jobResponse.data.data.jobId;

          // Poll for completion
          let completed = false;
          while (!completed) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const statusResponse = await api.aiParsing.getJobStatus(jobId);
            const status = statusResponse.data.data;

            setParsingProgress(Math.min(status.progress || 50, 95));

            if (status.status === "completed") {
              completed = true;
              response = { data: { success: true, data: status } };
            } else if (status.status === "failed") {
              throw new Error(status.errors.join(", ") || "Parsing failed");
            }
          }
        }
      } else {
        // Parse text content
        setParsingProgress(30);
        response = await api.aiParsing.parseText(textContent);
        setParsingProgress(100);
      }

      if (!response) {
        throw new Error("Failed to get parsing response");
      }

      const data = response.data.data;

      if (!data?.questions) {
        throw new Error("No questions found in response");
      }

      // Convert to editable questions with selection state
      const editableQuestions: EditableQuestion[] = data.questions.map((q) => ({
        ...q,
        isSelected: true,
        isEditing: false,
        editedSubject: selectedSubject || q.subject,
        editedChapter: selectedChapter || q.chapter,
        editedDifficulty: q.difficulty,
      }));

      setParsedQuestions(editableQuestions);
      const invalidQs = data.invalidQuestions || [];
      setInvalidQuestions(invalidQs);

      // Calculate counts from the data
      const validCount = editableQuestions.length;
      const invalidCount = invalidQs.length;

      toast({
        title: "Parsing Complete",
        description: `Found ${validCount} valid questions and ${invalidCount} invalid questions`,
      });

      setStep("preview");
    } catch (error) {
      console.error("Failed to parse:", error);
      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : "Failed to parse content with AI",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
      setParsingProgress(0);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isSelected: !q.isSelected } : q))
    );
  };

  const toggleAllSelection = (selected: boolean) => {
    setParsedQuestions((prev) => prev.map((q) => ({ ...q, isSelected: selected })));
  };

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openEditDialog = (question: EditableQuestion) => {
    setEditingQuestion({ ...question });
    setEditDialogOpen(true);
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion) return;

    setParsedQuestions((prev) =>
      prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
    );
    setEditDialogOpen(false);
    setEditingQuestion(null);
  };

  const uploadQuestions = async () => {
    const selectedQuestions = parsedQuestions.filter((q) => q.isSelected);

    if (selectedQuestions.length === 0) {
      toast({ title: "Error", description: "No questions selected", variant: "destructive" });
      return;
    }

    // Validate that all questions have subject and chapter
    const missingMetadata = selectedQuestions.filter(
      (q) => !q.editedSubject || !q.editedChapter
    );

    if (missingMetadata.length > 0) {
      toast({
        title: "Missing Information",
        description: `${missingMetadata.length} question(s) are missing subject or chapter. Please edit them.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Prepare questions for API
      const questionsToSave = selectedQuestions.map((q) => ({
        type: q.type,
        difficulty: q.editedDifficulty || q.difficulty,
        en: q.en,
        hi: q.hi,
        correctAnswers: q.correctAnswers,
        subject: q.editedSubject || q.subject || "",
        chapters: [
          {
            name: q.editedChapter || q.chapter || "",
            topics: q.topics || [],
          },
        ],
        sources: ["AI Parsed"],
      }));

      const response = await api.aiParsing.confirmQuestions(questionsToSave);

      toast({
        title: "Success",
        description: `Successfully created ${response.data.data.created} questions`,
      });

      setStep("complete");
    } catch (error) {
      console.error("Failed to upload questions:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to save questions",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const selectedCount = parsedQuestions.filter((q) => q.isSelected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/questions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Question Parser
          </h1>
          <p className="text-muted-foreground">
            Upload documents or paste text to extract questions using AI
          </p>
        </div>
      </div>

      {step === "upload" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Content</CardTitle>
              <CardDescription>
                Upload a PDF, image, or paste text containing questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "text")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Select File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported: PDF, PNG, JPG, TXT
                    </p>
                  </div>

                  {file && (
                    <div className="flex items-center gap-2 rounded-lg border p-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text">Paste Question Text</Label>
                    <Textarea
                      id="text"
                      placeholder="Paste your questions here...

Example format:
Q1. What is the capital of France?
(a) London
(b) Paris *
(c) Berlin
(d) Madrid

Solution: Paris is the capital city of France."
                      className="min-h-[200px] font-mono text-sm"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {parsing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Parsing with AI...</span>
                    <span>{parsingProgress}%</span>
                  </div>
                  <Progress value={parsingProgress} />
                </div>
              )}

              <Button
                onClick={parseWithAI}
                disabled={parsing || (uploadMode === "file" ? !file : !textContent.trim())}
                className="w-full"
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Parse with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Settings</CardTitle>
              <CardDescription>
                Set default subject and chapter for parsed questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject._id} value={subject._id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Chapter</Label>
                <Select
                  value={selectedChapter}
                  onValueChange={setSelectedChapter}
                  disabled={!selectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter._id} value={chapter._id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Difficulty</Label>
                <Select
                  value={defaultDifficulty}
                  onValueChange={(v) => setDefaultDifficulty(v as "easy" | "medium" | "hard")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Tips for Best Results
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>- Clear question numbering (Q1, Q2, etc.)</li>
                  <li>- Options labeled as (a), (b), (c), (d)</li>
                  <li>- Correct answers marked with * or bold</li>
                  <li>- Solutions labeled with "Solution:" or "Explanation:"</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Review Parsed Questions</CardTitle>
                <CardDescription>
                  Review, edit, and select questions to save
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="default">{selectedCount} Selected</Badge>
                <Badge variant="secondary">{parsedQuestions.length} Total</Badge>
                {invalidQuestions.length > 0 && (
                  <Badge variant="destructive">{invalidQuestions.length} Invalid</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCount === parsedQuestions.length}
                  onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                />
                <span className="text-sm">Select All</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep("upload");
                  setParsedQuestions([]);
                  setInvalidQuestions([]);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-parse
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {parsedQuestions.map((q, index) => (
                  <Collapsible key={q.id}>
                    <div className="border rounded-lg">
                      <div className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={q.isSelected}
                          onCheckedChange={() => toggleQuestionSelection(q.id)}
                        />
                        <CollapsibleTrigger
                          className="flex-1 flex items-center gap-2 text-left"
                          onClick={() => toggleQuestionExpanded(q.id)}
                        >
                          {expandedQuestions.has(q.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">Q{index + 1}.</span>
                          <span className="truncate flex-1 text-sm">
                            {q.en.question.substring(0, 100)}...
                          </span>
                        </CollapsibleTrigger>
                        <Badge variant={q.type === "single" ? "default" : "secondary"}>
                          {q.type}
                        </Badge>
                        <Badge
                          variant={
                            q.difficulty === "easy"
                              ? "outline"
                              : q.difficulty === "hard"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {q.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(q.confidence * 100)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(q)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>

                      <CollapsibleContent>
                        {expandedQuestions.has(q.id) && (
                          <div className="border-t p-4 bg-muted/30 space-y-3">
                            <div>
                              <h4 className="text-sm font-medium mb-1">Question:</h4>
                              <p className="text-sm whitespace-pre-wrap">{q.en.question}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-1">Options:</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {q.en.options.map((opt) => (
                                  <div
                                    key={opt.id}
                                    className={`text-sm p-2 rounded ${
                                      q.correctAnswers.includes(opt.id)
                                        ? "bg-green-100 dark:bg-green-900/30 border border-green-500"
                                        : "bg-background border"
                                    }`}
                                  >
                                    <span className="font-medium">{opt.id.toUpperCase()})</span>{" "}
                                    {opt.value}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {q.en.solution && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Solution:</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {q.en.solution}
                                </p>
                              </div>
                            )}
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Subject: {q.editedSubject || q.subject || "Not set"}</span>
                              <span>Chapter: {q.editedChapter || q.chapter || "Not set"}</span>
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>

            {invalidQuestions.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg bg-destructive/10">
                <h4 className="font-medium text-destructive mb-2">
                  Invalid Questions ({invalidQuestions.length})
                </h4>
                <div className="space-y-2 text-sm">
                  {invalidQuestions.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <X className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <p className="truncate max-w-md">
                          {item.question.en?.question?.substring(0, 50) || "Unknown question"}...
                        </p>
                        <p className="text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                  {invalidQuestions.length > 5 && (
                    <p className="text-muted-foreground">
                      ...and {invalidQuestions.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={uploadQuestions} disabled={uploading || selectedCount === 0}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save {selectedCount} Questions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Upload Complete</h2>
            <p className="mt-2 text-muted-foreground">
              Successfully created {selectedCount} questions
            </p>
            <div className="mt-6 flex gap-4">
              <Button variant="outline" onClick={() => router.push("/questions")}>
                View Questions
              </Button>
              <Button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setTextContent("");
                  setParsedQuestions([]);
                  setInvalidQuestions([]);
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Question Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Modify the question details before saving
            </DialogDescription>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  value={editingQuestion.en.question}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      en: { ...editingQuestion.en, question: e.target.value },
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={editingQuestion.editedSubject || ""}
                    onValueChange={(v) =>
                      setEditingQuestion({ ...editingQuestion, editedSubject: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chapter</Label>
                  <Select
                    value={editingQuestion.editedChapter || ""}
                    onValueChange={(v) =>
                      setEditingQuestion({ ...editingQuestion, editedChapter: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingQuestion.type}
                    onValueChange={(v) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        type: v as "single" | "multiple",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Answer</SelectItem>
                      <SelectItem value="multiple">Multiple Answers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={editingQuestion.editedDifficulty || editingQuestion.difficulty}
                    onValueChange={(v) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        editedDifficulty: v as "easy" | "medium" | "hard",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correct Answers</Label>
                <div className="flex gap-2">
                  {editingQuestion.en.options.map((opt) => (
                    <Button
                      key={opt.id}
                      variant={
                        editingQuestion.correctAnswers.includes(opt.id)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        const newAnswers = editingQuestion.correctAnswers.includes(opt.id)
                          ? editingQuestion.correctAnswers.filter((a) => a !== opt.id)
                          : [...editingQuestion.correctAnswers, opt.id];
                        setEditingQuestion({
                          ...editingQuestion,
                          correctAnswers: newAnswers,
                        });
                      }}
                    >
                      {opt.id.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Solution (Optional)</Label>
                <Textarea
                  value={editingQuestion.en.solution || ""}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      en: { ...editingQuestion.en, solution: e.target.value },
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedQuestion}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
