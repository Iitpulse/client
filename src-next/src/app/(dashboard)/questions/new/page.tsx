"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, GripVertical } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { ISubject, IChapter, IExam } from "@/types";
import RenderWithLatex from "@/components/render-with-latex";

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

const questionTypes = [
  { value: "objective", label: "Objective (MCQ)" },
  { value: "integer", label: "Integer (Numerical)" },
  { value: "paragraph", label: "Paragraph" },
  { value: "matrix", label: "Matrix Match" },
];

const difficultyOptions = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

interface Option {
  id: string;
  value: string;
  isCorrect: boolean;
}

interface ChildQuestion {
  id: string;
  type: "single" | "multiple" | "integer";
  en: { question: string; solution: string; options?: Option[] };
  hi: { question: string; solution: string; options?: Option[] };
  correctAnswer?: { from: number; to: number };
}

const generateOptionId = () => `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateQuestionId = () => `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ script: "sub" }, { script: "super" }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

export default function CreateQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "objective";

  // Metadata state
  const [questionType, setQuestionType] = React.useState(initialType);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedChapters, setSelectedChapters] = React.useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);
  const [selectedExams, setSelectedExams] = React.useState<string[]>([]);
  const [difficulty, setDifficulty] = React.useState("medium");
  const [isProofRead, setIsProofRead] = React.useState(false);
  const [language, setLanguage] = React.useState<"en" | "hi">("en");

  // Question content state
  const [questionEn, setQuestionEn] = React.useState("");
  const [questionHi, setQuestionHi] = React.useState("");
  const [solutionEn, setSolutionEn] = React.useState("");
  const [solutionHi, setSolutionHi] = React.useState("");

  // MCQ options
  const [options, setOptions] = React.useState<Option[]>([
    { id: generateOptionId(), value: "", isCorrect: false },
    { id: generateOptionId(), value: "", isCorrect: false },
    { id: generateOptionId(), value: "", isCorrect: false },
    { id: generateOptionId(), value: "", isCorrect: false },
  ]);

  // Integer answer
  const [answerFrom, setAnswerFrom] = React.useState<string>("");
  const [answerTo, setAnswerTo] = React.useState<string>("");

  // Paragraph
  const [paragraphEn, setParagraphEn] = React.useState("");
  const [paragraphHi, setParagraphHi] = React.useState("");
  const [childQuestions, setChildQuestions] = React.useState<ChildQuestion[]>([]);

  // Matrix
  const [matrixRows, setMatrixRows] = React.useState(4);
  const [matrixCols, setMatrixCols] = React.useState(4);
  const [matrixAnswer, setMatrixAnswer] = React.useState<boolean[][]>([]);

  // UI state
  const [loading, setLoading] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Fetch initial data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes, examsRes] = await Promise.all([
          api.subjects.getAll(),
          api.exams.getAll(),
        ]);
        setSubjects(subjectsRes.data?.subjects || []);
        setExams(examsRes.data?.exams || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch chapters when subject changes
  React.useEffect(() => {
    if (selectedSubject) {
      const subject = subjects.find((s) => s._id === selectedSubject);
      if (subject?.chapters) {
        setChapters(subject.chapters);
      }
    } else {
      setChapters([]);
      setSelectedChapters([]);
      setSelectedTopics([]);
    }
  }, [selectedSubject, subjects]);

  // Get available topics from selected chapters
  const availableTopics = React.useMemo(() => {
    const topics: string[] = [];
    selectedChapters.forEach((chapterName) => {
      const chapter = chapters.find((c) => c.name === chapterName);
      if (chapter?.topics) {
        topics.push(...chapter.topics);
      }
    });
    return [...new Set(topics)];
  }, [selectedChapters, chapters]);

  // Initialize matrix answer when dimensions change
  React.useEffect(() => {
    setMatrixAnswer(
      Array(matrixRows)
        .fill(null)
        .map(() => Array(matrixCols).fill(false))
    );
  }, [matrixRows, matrixCols]);

  // Option handlers
  const addOption = () => {
    setOptions([...options, { id: generateOptionId(), value: "", isCorrect: false }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const updateOption = (id: string, field: "value" | "isCorrect", value: string | boolean) => {
    setOptions(
      options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  // Child question handlers (for paragraph)
  const addChildQuestion = (type: "single" | "multiple" | "integer" = "single") => {
    const newQuestion: ChildQuestion = {
      id: generateQuestionId(),
      type,
      en: {
        question: "",
        solution: "",
        options: type !== "integer" ? [
          { id: generateOptionId(), value: "", isCorrect: false },
          { id: generateOptionId(), value: "", isCorrect: false },
          { id: generateOptionId(), value: "", isCorrect: false },
          { id: generateOptionId(), value: "", isCorrect: false },
        ] : undefined,
      },
      hi: {
        question: "",
        solution: "",
        options: type !== "integer" ? [
          { id: generateOptionId(), value: "", isCorrect: false },
          { id: generateOptionId(), value: "", isCorrect: false },
          { id: generateOptionId(), value: "", isCorrect: false },
          { id: generateOptionId(), value: "", isCorrect: false },
        ] : undefined,
      },
      correctAnswer: type === "integer" ? { from: 0, to: 0 } : undefined,
    };
    setChildQuestions([...childQuestions, newQuestion]);
  };

  const removeChildQuestion = (id: string) => {
    setChildQuestions(childQuestions.filter((q) => q.id !== id));
  };

  const updateChildQuestion = (id: string, updates: Partial<ChildQuestion>) => {
    setChildQuestions(
      childQuestions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  // Matrix handlers
  const toggleMatrixCell = (row: number, col: number) => {
    const newMatrix = matrixAnswer.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? !c : c))
    );
    setMatrixAnswer(newMatrix);
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedSubject || selectedChapters.length === 0) {
      alert("Please select subject and at least one chapter");
      return;
    }

    setLoading(true);
    try {
      let questionData: Record<string, unknown> = {
        subject: selectedSubject,
        chapters: selectedChapters.map((chName) => {
          const ch = chapters.find((c) => c.name === chName);
          return { name: chName, topics: selectedTopics.filter((t) => ch?.topics?.includes(t)) };
        }),
        difficulty,
        exams: selectedExams,
        isProofRead,
        en: {
          question: questionEn,
          solution: solutionEn,
        },
        hi: {
          question: questionHi,
          solution: solutionHi,
        },
      };

      let endpoint = "mcq";

      switch (questionType) {
        case "objective":
          endpoint = "mcq";
          const correctCount = options.filter((o) => o.isCorrect).length;
          questionData = {
            ...questionData,
            type: correctCount > 1 ? "multiple" : "single",
            options: options.map((opt) => ({
              id: opt.id,
              en: { value: opt.value },
              isCorrectAnswer: opt.isCorrect,
            })),
            correctAnswers: options.filter((o) => o.isCorrect).map((o) => o.id),
          };
          break;

        case "integer":
          endpoint = "numerical";
          questionData = {
            ...questionData,
            type: "integer",
            correctAnswer: {
              from: parseFloat(answerFrom) || 0,
              to: parseFloat(answerTo) || parseFloat(answerFrom) || 0,
            },
          };
          break;

        case "paragraph":
          endpoint = "paragraph";
          questionData = {
            ...questionData,
            type: "paragraph",
            paragraph: {
              en: { value: paragraphEn },
              hi: { value: paragraphHi },
            },
            questions: childQuestions.map((cq) => ({
              id: cq.id,
              type: cq.type,
              en: cq.en,
              hi: cq.hi,
              ...(cq.type === "integer"
                ? { correctAnswer: cq.correctAnswer }
                : {
                    correctAnswers: cq.en.options
                      ?.filter((o) => o.isCorrect)
                      .map((o) => o.id),
                  }),
            })),
          };
          break;

        case "matrix":
          endpoint = "matrix";
          questionData = {
            ...questionData,
            type: "matrix",
            options: options.map((opt) => ({
              id: opt.id,
              en: { value: opt.value },
            })),
            correctAnswer: matrixAnswer,
          };
          break;
      }

      await api.questions.create(endpoint, questionData);
      router.push("/questions");
    } catch (error) {
      console.error("Failed to create question:", error);
      alert("Failed to create question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/questions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Question</h1>
            <p className="text-muted-foreground">Add a new question to your bank</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Question"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Metadata Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Question Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
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
              <Label>Chapters</Label>
              {chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md border p-2">Select a subject first</p>
              ) : (
                <MultiSelect
                  values={selectedChapters}
                  onValuesChange={setSelectedChapters}
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Select chapters" />
                  </MultiSelectTrigger>
                  <MultiSelectContent search={{ placeholder: "Search chapters...", emptyMessage: "No chapters found" }}>
                    {chapters.map((chapter) => (
                      <MultiSelectItem key={chapter._id} value={chapter.name}>
                        {chapter.name}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              )}
            </div>

            {availableTopics.length > 0 && (
              <div className="space-y-2">
                <Label>Topics</Label>
                <MultiSelect
                  values={selectedTopics}
                  onValuesChange={setSelectedTopics}
                >
                  <MultiSelectTrigger>
                    <MultiSelectValue placeholder="Select topics" />
                  </MultiSelectTrigger>
                  <MultiSelectContent search={{ placeholder: "Search topics...", emptyMessage: "No topics found" }}>
                    {availableTopics.map((topic) => (
                      <MultiSelectItem key={topic} value={topic}>
                        {topic}
                      </MultiSelectItem>
                    ))}
                  </MultiSelectContent>
                </MultiSelect>
              </div>
            )}

            <div className="space-y-2">
              <Label>Exams</Label>
              <MultiSelect
                values={selectedExams}
                onValuesChange={setSelectedExams}
              >
                <MultiSelectTrigger>
                  <MultiSelectValue placeholder="Select exams" />
                </MultiSelectTrigger>
                <MultiSelectContent search={{ placeholder: "Search exams...", emptyMessage: "No exams found" }}>
                  {exams.map((exam) => (
                    <MultiSelectItem key={exam._id} value={exam.name}>
                      {exam.name}
                    </MultiSelectItem>
                  ))}
                </MultiSelectContent>
              </MultiSelect>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="proofread"
                checked={isProofRead}
                onCheckedChange={(checked) => setIsProofRead(checked as boolean)}
              />
              <Label htmlFor="proofread" className="cursor-pointer">
                Mark as Proofread
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Question Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Language Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Question Content</CardTitle>
                <Tabs value={language} onValueChange={(v) => setLanguage(v as "en" | "hi")}>
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="hi">Hindi</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
          </Card>

          {/* Paragraph (for paragraph type) */}
          {questionType === "paragraph" && (
            <Card>
              <CardHeader>
                <CardTitle>Paragraph / Passage</CardTitle>
                <CardDescription>Enter the main passage for the questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px]">
                  <ReactQuill
                    theme="snow"
                    value={language === "en" ? paragraphEn : paragraphHi}
                    onChange={language === "en" ? setParagraphEn : setParagraphHi}
                    modules={quillModules}
                    className="h-[150px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Question (for non-paragraph types) */}
          {questionType !== "paragraph" && (
            <Card>
              <CardHeader>
                <CardTitle>Question</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px]">
                  <ReactQuill
                    theme="snow"
                    value={language === "en" ? questionEn : questionHi}
                    onChange={language === "en" ? setQuestionEn : setQuestionHi}
                    modules={quillModules}
                    className="h-[150px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* MCQ Options */}
          {questionType === "objective" && (
            <Card>
              <CardHeader>
                <CardTitle>Options</CardTitle>
                <CardDescription>
                  Check the box to mark correct answer(s). Multiple selections allowed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      option.isCorrect ? "border-green-500 bg-green-50" : ""
                    }`}
                  >
                    <Checkbox
                      checked={option.isCorrect}
                      onCheckedChange={(checked) =>
                        updateOption(option.id, "isCorrect", checked as boolean)
                      }
                    />
                    <span className="font-medium text-muted-foreground">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option.value}
                      onChange={(e) => updateOption(option.id, "value", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(option.id)}
                      disabled={options.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addOption}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Integer Answer */}
          {questionType === "integer" && (
            <Card>
              <CardHeader>
                <CardTitle>Correct Answer Range</CardTitle>
                <CardDescription>
                  Enter the acceptable answer range (from/to). For exact answers, use the same value.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      type="number"
                      step="any"
                      value={answerFrom}
                      onChange={(e) => setAnswerFrom(e.target.value)}
                      placeholder="Minimum value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      type="number"
                      step="any"
                      value={answerTo}
                      onChange={(e) => setAnswerTo(e.target.value)}
                      placeholder="Maximum value"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paragraph Child Questions */}
          {questionType === "paragraph" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>Add questions based on the passage above</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addChildQuestion("single")}>
                      <Plus className="mr-1 h-4 w-4" />
                      MCQ
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addChildQuestion("integer")}>
                      <Plus className="mr-1 h-4 w-4" />
                      Integer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {childQuestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No questions added yet. Click the buttons above to add questions.
                  </p>
                ) : (
                  childQuestions.map((cq, index) => (
                    <div key={cq.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge>Question {index + 1} ({cq.type})</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChildQuestion(cq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Enter question..."
                        value={language === "en" ? cq.en.question : cq.hi.question}
                        onChange={(e) => {
                          const lang = language;
                          updateChildQuestion(cq.id, {
                            [lang]: { ...cq[lang], question: e.target.value },
                          });
                        }}
                      />
                      {cq.type !== "integer" && cq.en.options && (
                        <div className="space-y-2 pl-4">
                          {cq.en.options.map((opt, optIndex) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={opt.isCorrect}
                                onCheckedChange={(checked) => {
                                  const newOptions = cq.en.options?.map((o) =>
                                    o.id === opt.id ? { ...o, isCorrect: checked as boolean } : o
                                  );
                                  updateChildQuestion(cq.id, {
                                    en: { ...cq.en, options: newOptions },
                                  });
                                }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                value={opt.value}
                                onChange={(e) => {
                                  const newOptions = cq.en.options?.map((o) =>
                                    o.id === opt.id ? { ...o, value: e.target.value } : o
                                  );
                                  updateChildQuestion(cq.id, {
                                    en: { ...cq.en, options: newOptions },
                                  });
                                }}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {cq.type === "integer" && (
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          <Input
                            type="number"
                            placeholder="From"
                            value={cq.correctAnswer?.from || ""}
                            onChange={(e) =>
                              updateChildQuestion(cq.id, {
                                correctAnswer: {
                                  from: parseFloat(e.target.value) || 0,
                                  to: cq.correctAnswer?.to || 0,
                                },
                              })
                            }
                          />
                          <Input
                            type="number"
                            placeholder="To"
                            value={cq.correctAnswer?.to || ""}
                            onChange={(e) =>
                              updateChildQuestion(cq.id, {
                                correctAnswer: {
                                  from: cq.correctAnswer?.from || 0,
                                  to: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Matrix Answer Grid */}
          {questionType === "matrix" && (
            <Card>
              <CardHeader>
                <CardTitle>Matrix Grid</CardTitle>
                <CardDescription>
                  Click cells to mark correct matchings. Rows = statements, Columns = options.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      min={2}
                      max={6}
                      value={matrixRows}
                      onChange={(e) => setMatrixRows(parseInt(e.target.value) || 2)}
                      className="w-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Columns</Label>
                    <Input
                      type="number"
                      min={2}
                      max={6}
                      value={matrixCols}
                      onChange={(e) => setMatrixCols(parseInt(e.target.value) || 2)}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2"></th>
                        {Array.from({ length: matrixCols }).map((_, i) => (
                          <th key={i} className="border p-2 text-center">
                            {String.fromCharCode(80 + i)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: matrixRows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="border p-2 font-medium">
                            {String.fromCharCode(65 + rowIndex)}
                          </td>
                          {Array.from({ length: matrixCols }).map((_, colIndex) => (
                            <td key={colIndex} className="border p-2 text-center">
                              <Checkbox
                                checked={matrixAnswer[rowIndex]?.[colIndex] || false}
                                onCheckedChange={() => toggleMatrixCell(rowIndex, colIndex)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Solution */}
          <Card>
            <CardHeader>
              <CardTitle>Solution (Optional)</CardTitle>
              <CardDescription>Provide a detailed explanation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[200px]">
                <ReactQuill
                  theme="snow"
                  value={language === "en" ? solutionEn : solutionHi}
                  onChange={language === "en" ? setSolutionEn : setSolutionHi}
                  modules={quillModules}
                  className="h-[150px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {questionType === "paragraph" && paragraphEn && (
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">Paragraph:</h4>
                <RenderWithLatex quillString={paragraphEn} />
              </div>
            )}
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">Question:</h4>
              <RenderWithLatex quillString={questionEn || "No content"} />
            </div>
            {questionType === "objective" && (
              <div className="space-y-2">
                <h4 className="font-semibold mb-2">Options:</h4>
                {options.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${opt.isCorrect ? "bg-green-50 border-green-500 dark:bg-green-950" : "bg-gray-50 dark:bg-gray-900"}`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
                    <div className="flex-1">
                      <RenderWithLatex quillString={opt.value || "(empty)"} />
                    </div>
                    {opt.isCorrect && (
                      <Badge variant="default">Correct</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {questionType === "integer" && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Answer Range:</h4>
                <p>{answerFrom || 0} to {answerTo || answerFrom || 0}</p>
              </div>
            )}
            {solutionEn && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Solution:</h4>
                <RenderWithLatex quillString={solutionEn} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
