"use client";

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Plus, Trash2, Eye, Languages, Check } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { ISubject, IChapter, IExam } from "@/types";

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-md bg-muted" />,
});

import "react-quill-new/dist/quill.snow.css";

// Question types
const questionTypes = [
  { value: "objective", label: "Objective (MCQ)", apiType: "mcq" },
  { value: "integer", label: "Integer (Numerical)", apiType: "numerical" },
  { value: "paragraph", label: "Paragraph", apiType: "paragraph" },
  { value: "matrix", label: "Matrix Match", apiType: "matrix" },
];

const difficulties = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// Quill modules configuration
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ script: "sub" }, { script: "super" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

interface Option {
  text: string;
  textHindi?: string;
  isCorrect: boolean;
}

interface ChildQuestion {
  id: string;
  type: "mcq" | "integer";
  question: string;
  questionHindi?: string;
  options?: Option[];
  answerFrom?: number;
  answerTo?: number;
}

interface MatrixRow {
  left: string;
  leftHindi?: string;
}

interface MatrixColumn {
  right: string;
  rightHindi?: string;
}

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const questionId = params.id as string;
  const typeParam = searchParams.get("type") || "mcq";

  // Map API type to internal type
  const getInternalType = (apiType: string) => {
    switch (apiType) {
      case "mcq":
        return "objective";
      case "numerical":
        return "integer";
      case "paragraph":
        return "paragraph";
      case "matrix":
        return "matrix";
      default:
        return "objective";
    }
  };

  const questionTypeParam = getInternalType(typeParam);

  // Determine API type from internal type
  const getApiType = (type: string) => {
    const found = questionTypes.find((t) => t.value === type);
    return found?.apiType || "mcq";
  };

  // Core state
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);
  const [questionType] = React.useState(questionTypeParam);
  const [language, setLanguage] = React.useState<"en" | "hi">("en");
  const [isProofread, setIsProofread] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Question content
  const [questionEn, setQuestionEn] = React.useState("");
  const [questionHi, setQuestionHi] = React.useState("");
  const [solutionEn, setSolutionEn] = React.useState("");
  const [solutionHi, setSolutionHi] = React.useState("");

  // Metadata
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [allTopics, setAllTopics] = React.useState<string[]>([]);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedChapters, setSelectedChapters] = React.useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);
  const [selectedExams, setSelectedExams] = React.useState<string[]>([]);
  const [difficulty, setDifficulty] = React.useState("medium");
  const [source, setSource] = React.useState("");

  // MCQ specific
  const [options, setOptions] = React.useState<Option[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  // Integer specific
  const [answerFrom, setAnswerFrom] = React.useState<number>(0);
  const [answerTo, setAnswerTo] = React.useState<number>(0);

  // Paragraph specific
  const [paragraphText, setParagraphText] = React.useState("");
  const [paragraphTextHindi, setParagraphTextHindi] = React.useState("");
  const [childQuestions, setChildQuestions] = React.useState<ChildQuestion[]>([]);

  // Matrix specific
  const [matrixRows, setMatrixRows] = React.useState<MatrixRow[]>([
    { left: "" },
    { left: "" },
    { left: "" },
    { left: "" },
  ]);
  const [matrixColumns, setMatrixColumns] = React.useState<MatrixColumn[]>([
    { right: "" },
    { right: "" },
    { right: "" },
    { right: "" },
  ]);
  const [matrixAnswers, setMatrixAnswers] = React.useState<boolean[][]>(
    Array(4)
      .fill(null)
      .map(() => Array(4).fill(false))
  );

  // Fetch initial data
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subjectsRes, examsRes] = await Promise.all([
          api.subjects.getAll(),
          api.exams.getAll(),
        ]);
        setSubjects(subjectsRes.data?.subjects || []);
        setExams(examsRes.data?.exams || []);

        // Fetch the question
        const apiType = getApiType(questionTypeParam);
        const questionRes = await api.questions.getById(questionId, apiType);
        const question = questionRes.data?.question;

        if (question) {
          // Set basic fields
          setQuestionEn(question.question || question.en?.question || "");
          setQuestionHi(question.hi?.question || question.questionHindi || "");
          setSolutionEn(question.solution || question.en?.solution || "");
          setSolutionHi(question.hi?.solution || question.solutionHindi || "");
          setDifficulty(question.difficulty || "medium");
          setIsProofread(question.isProofRead || false);
          setSource(question.source || "");

          // Subject
          const subjectId =
            typeof question.subject === "object"
              ? question.subject._id
              : question.subject;
          if (subjectId) {
            setSelectedSubject(subjectId);
            const chaptersRes = await api.subjects.getChapters(subjectId);
            setChapters(chaptersRes.data?.chapters || []);
          }

          // Chapters
          if (question.chapters && Array.isArray(question.chapters)) {
            setSelectedChapters(
              question.chapters.map((c: string | { _id: string }) =>
                typeof c === "object" ? c._id : c
              )
            );
          } else if (question.chapter) {
            const chapterId =
              typeof question.chapter === "object"
                ? question.chapter._id
                : question.chapter;
            setSelectedChapters([chapterId]);
          }

          // Topics
          if (question.topics && Array.isArray(question.topics)) {
            setSelectedTopics(question.topics);
          }

          // Exams
          if (question.exams && Array.isArray(question.exams)) {
            setSelectedExams(
              question.exams.map((e: string | { _id: string }) =>
                typeof e === "object" ? e._id : e
              )
            );
          }

          // Type-specific data
          if (questionTypeParam === "objective" && question.options) {
            setOptions(
              question.options.map(
                (opt: {
                  option?: string;
                  text?: string;
                  optionHindi?: string;
                  textHindi?: string;
                  isCorrect?: boolean;
                }) => ({
                  text: opt.option || opt.text || "",
                  textHindi: opt.optionHindi || opt.textHindi || "",
                  isCorrect: opt.isCorrect || false,
                })
              )
            );
          } else if (questionTypeParam === "integer") {
            setAnswerFrom(question.answerFrom ?? question.answer ?? 0);
            setAnswerTo(question.answerTo ?? question.answer ?? 0);
          } else if (questionTypeParam === "paragraph") {
            setParagraphText(question.paragraph || question.passage || "");
            setParagraphTextHindi(
              question.paragraphHindi || question.passageHindi || ""
            );
            if (question.questions && Array.isArray(question.questions)) {
              setChildQuestions(
                question.questions.map(
                  (
                    q: {
                      _id?: string;
                      type?: string;
                      question?: string;
                      questionHindi?: string;
                      options?: { option?: string; optionHindi?: string; isCorrect?: boolean }[];
                      answerFrom?: number;
                      answerTo?: number;
                    },
                    idx: number
                  ) => ({
                    id: q._id || `child-${idx}`,
                    type: q.type === "integer" ? "integer" : "mcq",
                    question: q.question || "",
                    questionHindi: q.questionHindi || "",
                    options: q.options?.map((opt) => ({
                      text: opt.option || "",
                      textHindi: opt.optionHindi || "",
                      isCorrect: opt.isCorrect || false,
                    })),
                    answerFrom: q.answerFrom,
                    answerTo: q.answerTo,
                  })
                )
              );
            }
          } else if (questionTypeParam === "matrix") {
            if (question.rows && Array.isArray(question.rows)) {
              setMatrixRows(
                question.rows.map((r: { left?: string; leftHindi?: string }) => ({
                  left: r.left || "",
                  leftHindi: r.leftHindi || "",
                }))
              );
            }
            if (question.columns && Array.isArray(question.columns)) {
              setMatrixColumns(
                question.columns.map(
                  (c: { right?: string; rightHindi?: string }) => ({
                    right: c.right || "",
                    rightHindi: c.rightHindi || "",
                  })
                )
              );
            }
            if (question.answers && Array.isArray(question.answers)) {
              setMatrixAnswers(question.answers);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchInitialData();
  }, [questionId, questionTypeParam]);

  // Fetch chapters when subject changes
  React.useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedSubject) {
        setChapters([]);
        setAllTopics([]);
        return;
      }
      try {
        const response = await api.subjects.getChapters(selectedSubject);
        const chaptersData = response.data?.chapters || [];
        setChapters(chaptersData);

        // Extract all topics from chapters
        const topics: string[] = [];
        chaptersData.forEach((chapter: IChapter) => {
          if (chapter.topics && Array.isArray(chapter.topics)) {
            topics.push(...chapter.topics);
          }
        });
        setAllTopics([...new Set(topics)]);
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      }
    };
    fetchChapters();
  }, [selectedSubject]);

  // MCQ option handlers
  const addOption = () => {
    setOptions([...options, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (
    index: number,
    field: "text" | "textHindi" | "isCorrect",
    value: string | boolean
  ) => {
    setOptions(
      options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  // Child question handlers for Paragraph type
  const addChildQuestion = (type: "mcq" | "integer") => {
    const newChild: ChildQuestion = {
      id: `child-${Date.now()}`,
      type,
      question: "",
      questionHindi: "",
      options:
        type === "mcq"
          ? [
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
            ]
          : undefined,
      answerFrom: type === "integer" ? 0 : undefined,
      answerTo: type === "integer" ? 0 : undefined,
    };
    setChildQuestions([...childQuestions, newChild]);
  };

  const removeChildQuestion = (id: string) => {
    setChildQuestions(childQuestions.filter((q) => q.id !== id));
  };

  const updateChildQuestion = (
    id: string,
    field: keyof ChildQuestion,
    value: unknown
  ) => {
    setChildQuestions(
      childQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Matrix handlers
  const addMatrixRow = () => {
    setMatrixRows([...matrixRows, { left: "" }]);
    setMatrixAnswers(
      matrixAnswers.map((row) => [...row, false]).concat([Array(matrixColumns.length).fill(false)])
    );
  };

  const addMatrixColumn = () => {
    setMatrixColumns([...matrixColumns, { right: "" }]);
    setMatrixAnswers(matrixAnswers.map((row) => [...row, false]));
  };

  const toggleMatrixAnswer = (rowIndex: number, colIndex: number) => {
    const newAnswers = matrixAnswers.map((row, rIdx) =>
      row.map((cell, cIdx) =>
        rIdx === rowIndex && cIdx === colIndex ? !cell : cell
      )
    );
    setMatrixAnswers(newAnswers);
  };

  // Form submission
  const handleSubmit = async () => {
    if (!selectedSubject) {
      alert("Please select a subject");
      return;
    }

    setLoading(true);
    try {
      const baseData = {
        question: questionEn,
        questionHindi: questionHi,
        solution: solutionEn,
        solutionHindi: solutionHi,
        subject: selectedSubject,
        chapters: selectedChapters,
        topics: selectedTopics,
        exams: selectedExams,
        difficulty,
        source,
        isProofRead: isProofread,
        en: {
          question: questionEn,
          solution: solutionEn,
        },
        hi: {
          question: questionHi,
          solution: solutionHi,
        },
      };

      let updateData: Record<string, unknown> = baseData;
      let apiType = "mcq";

      if (questionType === "objective") {
        apiType = "mcq";
        updateData = {
          ...baseData,
          options: options.map((opt) => ({
            option: opt.text,
            optionHindi: opt.textHindi,
            isCorrect: opt.isCorrect,
          })),
          type: options.filter((o) => o.isCorrect).length > 1 ? "multiple" : "single",
        };
      } else if (questionType === "integer") {
        apiType = "numerical";
        updateData = {
          ...baseData,
          answerFrom,
          answerTo,
          answer: answerFrom,
        };
      } else if (questionType === "paragraph") {
        apiType = "paragraph";
        updateData = {
          ...baseData,
          paragraph: paragraphText,
          paragraphHindi: paragraphTextHindi,
          questions: childQuestions.map((child) => ({
            type: child.type,
            question: child.question,
            questionHindi: child.questionHindi,
            options:
              child.type === "mcq" && child.options
                ? child.options.map((opt) => ({
                    option: opt.text,
                    optionHindi: opt.textHindi,
                    isCorrect: opt.isCorrect,
                  }))
                : undefined,
            answerFrom: child.type === "integer" ? child.answerFrom : undefined,
            answerTo: child.type === "integer" ? child.answerTo : undefined,
          })),
        };
      } else if (questionType === "matrix") {
        apiType = "matrix";
        updateData = {
          ...baseData,
          rows: matrixRows.map((r) => ({
            left: r.left,
            leftHindi: r.leftHindi,
          })),
          columns: matrixColumns.map((c) => ({
            right: c.right,
            rightHindi: c.rightHindi,
          })),
          answers: matrixAnswers,
        };
      }

      await api.questions.update(apiType, questionId, updateData);
      router.push("/questions");
    } catch (error) {
      console.error("Failed to update question:", error);
      alert("Failed to update question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading question...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/questions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Question</h1>
            <p className="text-muted-foreground">
              Update the question details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
          >
            <Languages className="mr-2 h-4 w-4" />
            {language === "en" ? "हिंदी" : "English"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Question Type Display */}
          <Card>
            <CardHeader>
              <CardTitle>Question Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm">
                {questionTypes.find((t) => t.value === questionType)?.label ||
                  "Objective (MCQ)"}
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                Question type cannot be changed after creation
              </p>
            </CardContent>
          </Card>

          {/* Question Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                Question {language === "en" ? "(English)" : "(Hindi)"}
              </CardTitle>
              <CardDescription>
                {questionType === "paragraph"
                  ? "Enter the paragraph/passage text"
                  : "Enter your question content"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionType === "paragraph" && (
                <div className="space-y-2">
                  <Label>Paragraph/Passage</Label>
                  <ReactQuill
                    theme="snow"
                    value={
                      language === "en" ? paragraphText : paragraphTextHindi
                    }
                    onChange={(value) =>
                      language === "en"
                        ? setParagraphText(value)
                        : setParagraphTextHindi(value)
                    }
                    modules={quillModules}
                    className="bg-background"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {questionType === "paragraph" ? "Instructions" : "Question"}
                </Label>
                <ReactQuill
                  theme="snow"
                  value={language === "en" ? questionEn : questionHi}
                  onChange={(value) =>
                    language === "en" ? setQuestionEn(value) : setQuestionHi(value)
                  }
                  modules={quillModules}
                  className="bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* Type-specific editors */}
          {questionType === "objective" && (
            <Card>
              <CardHeader>
                <CardTitle>Options</CardTitle>
                <CardDescription>
                  Edit options and mark the correct one(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <Checkbox
                      checked={option.isCorrect}
                      onCheckedChange={(checked) =>
                        updateOption(index, "isCorrect", checked as boolean)
                      }
                      className="mt-3"
                    />
                    <div className="flex-1 space-y-2">
                      <ReactQuill
                        theme="snow"
                        value={
                          language === "en"
                            ? option.text
                            : option.textHindi || ""
                        }
                        onChange={(value) =>
                          updateOption(
                            index,
                            language === "en" ? "text" : "textHindi",
                            value
                          )
                        }
                        modules={quillModules}
                        className="bg-background"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
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

          {questionType === "integer" && (
            <Card>
              <CardHeader>
                <CardTitle>Answer Range</CardTitle>
                <CardDescription>
                  Specify the valid answer range (from and to values)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="answerFrom">From</Label>
                    <Input
                      id="answerFrom"
                      type="number"
                      value={answerFrom}
                      onChange={(e) => setAnswerFrom(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answerTo">To</Label>
                    <Input
                      id="answerTo"
                      type="number"
                      value={answerTo}
                      onChange={(e) => setAnswerTo(Number(e.target.value))}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Any answer between these values (inclusive) will be considered
                  correct
                </p>
              </CardContent>
            </Card>
          )}

          {questionType === "paragraph" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Child Questions</CardTitle>
                    <CardDescription>
                      Questions based on the paragraph above
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addChildQuestion("mcq")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add MCQ
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addChildQuestion("integer")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Integer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {childQuestions.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                    No child questions added yet
                  </div>
                ) : (
                  childQuestions.map((child, idx) => (
                    <div key={child.id} className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant={child.type === "mcq" ? "default" : "secondary"}>
                          Q{idx + 1}: {child.type === "mcq" ? "MCQ" : "Integer"}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChildQuestion(child.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Question</Label>
                        <ReactQuill
                          theme="snow"
                          value={
                            language === "en"
                              ? child.question
                              : child.questionHindi || ""
                          }
                          onChange={(value) =>
                            updateChildQuestion(
                              child.id,
                              language === "en" ? "question" : "questionHindi",
                              value
                            )
                          }
                          modules={quillModules}
                          className="bg-background"
                        />
                      </div>

                      {child.type === "mcq" && child.options && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {child.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Checkbox
                                checked={opt.isCorrect}
                                onCheckedChange={(checked) => {
                                  const newOptions = [...child.options!];
                                  newOptions[optIdx] = {
                                    ...newOptions[optIdx],
                                    isCorrect: checked as boolean,
                                  };
                                  updateChildQuestion(child.id, "options", newOptions);
                                }}
                              />
                              <Input
                                placeholder={`Option ${optIdx + 1}`}
                                value={
                                  language === "en"
                                    ? opt.text
                                    : opt.textHindi || ""
                                }
                                onChange={(e) => {
                                  const newOptions = [...child.options!];
                                  newOptions[optIdx] = {
                                    ...newOptions[optIdx],
                                    [language === "en" ? "text" : "textHindi"]:
                                      e.target.value,
                                  };
                                  updateChildQuestion(child.id, "options", newOptions);
                                }}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {child.type === "integer" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>From</Label>
                            <Input
                              type="number"
                              value={child.answerFrom || 0}
                              onChange={(e) =>
                                updateChildQuestion(
                                  child.id,
                                  "answerFrom",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>To</Label>
                            <Input
                              type="number"
                              value={child.answerTo || 0}
                              onChange={(e) =>
                                updateChildQuestion(
                                  child.id,
                                  "answerTo",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {questionType === "matrix" && (
            <Card>
              <CardHeader>
                <CardTitle>Matrix Matching</CardTitle>
                <CardDescription>
                  Define rows (left column) and columns (right column), then
                  mark matching pairs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="rows">
                  <TabsList>
                    <TabsTrigger value="rows">Rows (Left)</TabsTrigger>
                    <TabsTrigger value="columns">Columns (Right)</TabsTrigger>
                    <TabsTrigger value="answers">Answers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="rows" className="space-y-4">
                    {matrixRows.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-8 text-sm font-medium">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <Input
                          placeholder={`Row ${idx + 1}`}
                          value={
                            language === "en" ? row.left : row.leftHindi || ""
                          }
                          onChange={(e) => {
                            const newRows = [...matrixRows];
                            newRows[idx] = {
                              ...newRows[idx],
                              [language === "en" ? "left" : "leftHindi"]:
                                e.target.value,
                            };
                            setMatrixRows(newRows);
                          }}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMatrixRow}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  </TabsContent>

                  <TabsContent value="columns" className="space-y-4">
                    {matrixColumns.map((col, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-8 text-sm font-medium">
                          {idx + 1}.
                        </span>
                        <Input
                          placeholder={`Column ${idx + 1}`}
                          value={
                            language === "en"
                              ? col.right
                              : col.rightHindi || ""
                          }
                          onChange={(e) => {
                            const newCols = [...matrixColumns];
                            newCols[idx] = {
                              ...newCols[idx],
                              [language === "en" ? "right" : "rightHindi"]:
                                e.target.value,
                            };
                            setMatrixColumns(newCols);
                          }}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMatrixColumn}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Column
                    </Button>
                  </TabsContent>

                  <TabsContent value="answers">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24"></TableHead>
                            {matrixColumns.map((_, idx) => (
                              <TableHead key={idx} className="text-center">
                                {idx + 1}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matrixRows.map((_, rowIdx) => (
                            <TableRow key={rowIdx}>
                              <TableCell className="font-medium">
                                {String.fromCharCode(65 + rowIdx)}
                              </TableCell>
                              {matrixColumns.map((_, colIdx) => (
                                <TableCell key={colIdx} className="text-center">
                                  <Button
                                    type="button"
                                    variant={
                                      matrixAnswers[rowIdx]?.[colIdx]
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      toggleMatrixAnswer(rowIdx, colIdx)
                                    }
                                  >
                                    {matrixAnswers[rowIdx]?.[colIdx] && (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Solution */}
          <Card>
            <CardHeader>
              <CardTitle>
                Solution {language === "en" ? "(English)" : "(Hindi)"}
              </CardTitle>
              <CardDescription>
                Provide a detailed explanation of the answer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReactQuill
                theme="snow"
                value={language === "en" ? solutionEn : solutionHi}
                onChange={(value) =>
                  language === "en" ? setSolutionEn(value) : setSolutionHi(value)
                }
                modules={quillModules}
                className="bg-background"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
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

              {/* Chapters */}
              <div className="space-y-2">
                <Label>Chapters</Label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {chapters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Select a subject first
                    </p>
                  ) : (
                    chapters.map((chapter) => (
                      <div
                        key={chapter._id}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`chapter-${chapter._id}`}
                          checked={selectedChapters.includes(chapter._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedChapters([
                                ...selectedChapters,
                                chapter._id,
                              ]);
                            } else {
                              setSelectedChapters(
                                selectedChapters.filter(
                                  (id) => id !== chapter._id
                                )
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`chapter-${chapter._id}`}
                          className="text-sm"
                        >
                          {chapter.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Topics */}
              <div className="space-y-2">
                <Label>Topics</Label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {allTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No topics available
                    </p>
                  ) : (
                    allTopics.map((topic) => (
                      <div key={topic} className="flex items-center gap-2">
                        <Checkbox
                          id={`topic-${topic}`}
                          checked={selectedTopics.includes(topic)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTopics([...selectedTopics, topic]);
                            } else {
                              setSelectedTopics(
                                selectedTopics.filter((t) => t !== topic)
                              );
                            }
                          }}
                        />
                        <label htmlFor={`topic-${topic}`} className="text-sm">
                          {topic}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Exams */}
              <div className="space-y-2">
                <Label>Exams</Label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {exams.map((exam) => (
                    <div key={exam._id} className="flex items-center gap-2">
                      <Checkbox
                        id={`exam-${exam._id}`}
                        checked={selectedExams.includes(exam._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExams([...selectedExams, exam._id]);
                          } else {
                            setSelectedExams(
                              selectedExams.filter((id) => id !== exam._id)
                            );
                          }
                        }}
                      />
                      <label htmlFor={`exam-${exam._id}`} className="text-sm">
                        {exam.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((diff) => (
                      <SelectItem key={diff.value} value={diff.value}>
                        {diff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label>Source (Optional)</Label>
                <Input
                  placeholder="e.g., JEE 2023, NEET 2022"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>

              {/* Proofread toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="proofread">Proofread</Label>
                <Switch
                  id="proofread"
                  checked={isProofread}
                  onCheckedChange={setIsProofread}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/questions">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {questionType === "paragraph" && paragraphText && (
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold">Paragraph:</h4>
                <div
                  className="prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: paragraphText }}
                />
              </div>
            )}

            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-semibold">Question:</h4>
              <div
                className="prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: questionEn }}
              />
            </div>

            {questionType === "objective" && (
              <div className="space-y-2">
                <h4 className="font-semibold">Options:</h4>
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 ${
                      opt.isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950" : ""
                    }`}
                  >
                    <span className="mr-2 font-medium">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                    {opt.isCorrect && (
                      <Badge variant="default" className="ml-2">
                        Correct
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {questionType === "integer" && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">Answer Range:</h4>
                <p>
                  {answerFrom} to {answerTo}
                </p>
              </div>
            )}

            {solutionEn && (
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">Solution:</h4>
                <div
                  className="prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: solutionEn }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
