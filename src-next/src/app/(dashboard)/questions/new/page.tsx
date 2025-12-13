"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, AlertCircle, Check } from "lucide-react";
import { z } from "zod";

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
  MultiSelectCreatable,
  SingleSelectCreatable,
} from "@/components/ui/multi-select-creatable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateTopicDrawer } from "@/components/create-topic-drawer";
import { api } from "@/lib/api";
import { ISubject, IChapter, IExam } from "@/types";
import RenderWithLatex from "@/components/render-with-latex";
import { useAuthStore } from "@/stores/auth.store";
import {
  FormErrors,
  parseZodErrors,
  generateQuestionCore,
  generateObjectiveQuestion,
  generateIntegerQuestion,
  generateParagraphQuestion,
  generateMatrixQuestion,
  questionObjectiveSchema,
  questionIntegerSchema,
  questionParagraphSchema,
  questionMatrixSchema,
} from "@/lib/question-schemas";

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
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
  { value: "unset", label: "Unset" },
];

interface Option {
  id: string;
  value: string;
  isCorrectAnswer: boolean;
}

interface ChildQuestion {
  id: string;
  type: "single" | "multiple" | "integer";
  en: { question: string; solution: string; options?: Option[] };
  hi: { question: string; solution: string; options?: Option[] };
  correctAnswer?: { from: number; to: number };
}

const generateOptionId = () =>
  `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateQuestionId = () =>
  `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Enhanced Quill modules with formula support and list indentation
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: [] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ script: "sub" }, { script: "super" }],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    ["link", "image"],
    ["formula"],
    ["clean"],
  ],
  clipboard: {
    matchVisual: true,
  },
};

const quillFormats = [
  "header",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "script",
  "list",
  "indent",
  "link",
  "image",
  "formula",
];

// Parse input utility - converts text like "A) Option text" to options
function parseOptionsFromInput(input: string): Option[] {
  const lines = input.split("\n").filter((line) => line.trim());
  const options: Option[] = [];

  lines.forEach((line) => {
    // Match patterns like "A)", "A.", "1)", "1.", "(A)", "(1)"
    const match = line.match(/^[\(\[]?([A-Da-d1-4])[\)\]\.]\s*(.+)$/);
    if (match) {
      options.push({
        id: generateOptionId(),
        value: match[2].trim(),
        isCorrectAnswer: false,
      });
    }
  });

  return options;
}

export default function CreateQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "objective";
  const { currentUser } = useAuthStore();

  // Metadata state
  const [questionType, setQuestionType] = React.useState(initialType);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedSubjectData, setSelectedSubjectData] =
    React.useState<ISubject | null>(null);
  const [selectedChapters, setSelectedChapters] = React.useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);
  const [selectedExams, setSelectedExams] = React.useState<string[]>([]);
  const [selectedSources, setSelectedSources] = React.useState<string[]>([]);
  const [sources, setSources] = React.useState<{ _id: string; name: string }[]>(
    []
  );
  const [difficulty, setDifficulty] = React.useState("unset");
  const [isProofRead, setIsProofRead] = React.useState(false);
  const [language, setLanguage] = React.useState<"en" | "hi">("en");

  // Question content state
  const [questionEn, setQuestionEn] = React.useState("");
  const [questionHi, setQuestionHi] = React.useState("");
  const [solutionEn, setSolutionEn] = React.useState("");
  const [solutionHi, setSolutionHi] = React.useState("");

  // MCQ options - English and Hindi
  const [optionsEn, setOptionsEn] = React.useState<Option[]>([
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
  ]);
  const [optionsHi, setOptionsHi] = React.useState<Option[]>([
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
    { id: generateOptionId(), value: "", isCorrectAnswer: false },
  ]);

  // Integer answer
  const [answerFrom, setAnswerFrom] = React.useState<string>("");
  const [answerTo, setAnswerTo] = React.useState<string>("");

  // Paragraph
  const [paragraphEn, setParagraphEn] = React.useState("");
  const [paragraphHi, setParagraphHi] = React.useState("");
  const [childQuestions, setChildQuestions] = React.useState<ChildQuestion[]>(
    []
  );

  // Matrix
  const [matrixRows, setMatrixRows] = React.useState(4);
  const [matrixCols, setMatrixCols] = React.useState(4);
  const [matrixAnswer, setMatrixAnswer] = React.useState<boolean[][]>([]);

  // UI state
  const [loading, setLoading] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});
  const [topicDrawerOpen, setTopicDrawerOpen] = React.useState(false);

  // Get current options based on language
  const options = language === "en" ? optionsEn : optionsHi;
  const setOptions = language === "en" ? setOptionsEn : setOptionsHi;

  // Fetch initial data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes, examsRes, sourcesRes] = await Promise.all([
          api.subjects.getAll(),
          api.exams.getAll(),
          api.sources.getAll(),
        ]);
        setSubjects(subjectsRes.data?.data || subjectsRes.data || []);
        setExams(
          examsRes.data?.data || examsRes.data?.exams || examsRes.data || []
        );
        setSources(sourcesRes.data?.data || sourcesRes.data || []);
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
      if (subject) {
        setSelectedSubjectData(subject);
        if (subject.chapters) {
          setChapters(subject.chapters);
        }
      }
    } else {
      setSelectedSubjectData(null);
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

  // Handler to add new subject
  const handleAddSubject = async (name: string) => {
    try {
      const res = await api.subjects.create({ name });
      const newSubject = res.data?.data || res.data;
      setSubjects((prev) => [...prev, newSubject]);
      setSelectedSubject(newSubject._id);
    } catch (error) {
      console.error("Failed to create subject:", error);
      throw error;
    }
  };

  // Handler to add new exam
  const handleAddExam = async (name: string) => {
    try {
      const res = await api.exams.create({ name, fullName: name });
      const newExam = res.data?.data || res.data;
      setExams((prev) => [...prev, newExam]);
      setSelectedExams((prev) => [...prev, newExam.name]);
    } catch (error) {
      console.error("Failed to create exam:", error);
      throw error;
    }
  };

  // Handler to add new chapter
  const handleAddChapter = async (name: string) => {
    if (!selectedSubjectData?._id) return;
    try {
      const res = await api.subjects.createChapter({
        subjectId: selectedSubjectData._id,
        name,
      });
      const updatedSubject = res.data?.data || res.data;
      // Update subjects list
      setSubjects((prev) =>
        prev.map((s) => (s._id === updatedSubject._id ? updatedSubject : s))
      );
      // Update current subject data
      setSelectedSubjectData(updatedSubject);
      setChapters(updatedSubject.chapters || []);
      // Auto-select the new chapter
      const newChapter = updatedSubject.chapters?.[
        updatedSubject.chapters.length - 1
      ];
      if (newChapter) {
        setSelectedChapters((prev) => [...prev, newChapter.name]);
      }
    } catch (error) {
      console.error("Failed to create chapter:", error);
      throw error;
    }
  };

  // Handler to add new topic
  const handleAddTopic = async (data: { chapter: string; topic: string }) => {
    if (!selectedSubjectData?._id) return;

    const chapter = chapters.find((c) => c.name === data.chapter);
    // Use chapter.id (from API) or chapter._id as fallback
    const chapterId = chapter?.id || chapter?._id;
    if (!chapterId) return;

    try {
      const res = await api.subjects.createTopic({
        subjectId: selectedSubjectData._id,
        chapterId: chapterId,
        topic: data.topic,
      });
      const updatedSubject = res.data?.data || res.data;

      // Update subjects list
      setSubjects((prev) =>
        prev.map((s) => (s._id === updatedSubject._id ? updatedSubject : s))
      );
      // Update current subject data
      setSelectedSubjectData(updatedSubject);
      setChapters(updatedSubject.chapters || []);
      // Auto-select the new topic
      setSelectedTopics((prev) => [...prev, data.topic]);
      setTopicDrawerOpen(false);
    } catch (error) {
      console.error("Failed to create topic:", error);
      throw error;
    }
  };

  // Handler to add new source
  const handleAddSource = async (name: string) => {
    try {
      const res = await api.sources.create({ name });
      const newSource = res.data?.data || res.data;
      setSources((prev) => [...prev, newSource]);
      setSelectedSources((prev) => [...prev, newSource.name]);
    } catch (error) {
      console.error("Failed to create source:", error);
      throw error;
    }
  };

  // Option handlers
  const addOption = () => {
    const newOption = {
      id: generateOptionId(),
      value: "",
      isCorrectAnswer: false,
    };
    if (language === "en") {
      setOptionsEn([...optionsEn, newOption]);
      // Keep Hindi options in sync with same IDs
      setOptionsHi([
        ...optionsHi,
        { ...newOption, id: newOption.id, value: "" },
      ]);
    } else {
      setOptionsHi([...optionsHi, newOption]);
      setOptionsEn([
        ...optionsEn,
        { ...newOption, id: newOption.id, value: "" },
      ]);
    }
  };

  const removeOption = (id: string) => {
    if (optionsEn.length <= 2) return;
    setOptionsEn(optionsEn.filter((opt) => opt.id !== id));
    setOptionsHi(optionsHi.filter((opt) => opt.id !== id));
  };

  const updateOption = (
    id: string,
    field: "value" | "isCorrectAnswer",
    value: string | boolean
  ) => {
    if (field === "isCorrectAnswer") {
      // Update correct answer in both languages
      setOptionsEn(
        optionsEn.map((opt) =>
          opt.id === id ? { ...opt, isCorrectAnswer: value as boolean } : opt
        )
      );
      setOptionsHi(
        optionsHi.map((opt) =>
          opt.id === id ? { ...opt, isCorrectAnswer: value as boolean } : opt
        )
      );
    } else {
      // Update value only in current language
      setOptions(
        options.map((opt) =>
          opt.id === id ? { ...opt, value: value as string } : opt
        )
      );
    }
  };

  // Child question handlers (for paragraph)
  const addChildQuestion = (type: "single" | "multiple" | "integer" = "single") => {
    const newQuestion: ChildQuestion = {
      id: generateQuestionId(),
      type,
      en: {
        question: "",
        solution: "",
        options:
          type !== "integer"
            ? [
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
              ]
            : undefined,
      },
      hi: {
        question: "",
        solution: "",
        options:
          type !== "integer"
            ? [
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
                { id: generateOptionId(), value: "", isCorrectAnswer: false },
              ]
            : undefined,
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

  // Clear form errors on input change
  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Get error status for a field
  const getFieldError = (field: string): string | undefined => {
    return formErrors[field] as string | undefined;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!currentUser) {
      alert("Please log in to create questions");
      return;
    }

    setFormErrors({});

    // Basic validation
    if (!selectedSubject) {
      setFormErrors({ subject: "Please select a subject" });
      return;
    }
    if (selectedChapters.length === 0) {
      setFormErrors({ chapters: "Please select at least one chapter" });
      return;
    }

    setLoading(true);
    try {
      // Generate question core data with uploadedBy
      const uploadedBy = {
        userType: currentUser.userType as "operator" | "teacher" | "admin",
        id: currentUser.id,
      };

      const questionCore = generateQuestionCore(
        {
          type:
            questionType === "objective"
              ? optionsEn.filter((o) => o.isCorrectAnswer).length > 1
                ? "multiple"
                : "single"
              : (questionType as "integer" | "paragraph" | "matrix"),
          subject: selectedSubject,
          chapters: selectedChapters.map((chName) => {
            const ch = chapters.find((c) => c.name === chName);
            return {
              name: chName,
              topics: selectedTopics.filter((t) => ch?.topics?.includes(t)),
            };
          }),
          topics: selectedTopics,
          difficulty,
          exams: selectedExams,
          sources: selectedSources,
          isProofRead,
        },
        uploadedBy
      );

      let questionData: Record<string, unknown>;
      let endpoint = "mcq";

      switch (questionType) {
        case "objective": {
          endpoint = "mcq";
          const correctCount = optionsEn.filter((o) => o.isCorrectAnswer).length;
          questionData = generateObjectiveQuestion(questionCore, {
            en: {
              question: questionEn,
              options: optionsEn,
              solution: solutionEn,
            },
            hi: {
              question: questionHi,
              options: optionsHi,
              solution: solutionHi,
            },
            type: correctCount > 1 ? "multiple" : "single",
          });

          // Validate with Zod
          try {
            questionObjectiveSchema.parse(questionData);
          } catch (error) {
            if (error instanceof z.ZodError) {
              setFormErrors(parseZodErrors(error));
              setLoading(false);
              return;
            }
          }
          break;
        }

        case "integer": {
          endpoint = "numerical";
          questionData = generateIntegerQuestion(questionCore, {
            en: { question: questionEn, solution: solutionEn },
            hi: { question: questionHi, solution: solutionHi },
            correctAnswer: {
              from: parseFloat(answerFrom) || 0,
              to: parseFloat(answerTo) || parseFloat(answerFrom) || 0,
            },
          });

          // Validate with Zod
          try {
            questionIntegerSchema.parse(questionData);
          } catch (error) {
            if (error instanceof z.ZodError) {
              setFormErrors(parseZodErrors(error));
              setLoading(false);
              return;
            }
          }
          break;
        }

        case "paragraph": {
          endpoint = "paragraph";
          questionData = generateParagraphQuestion(questionCore, {
            paragraph: { en: paragraphEn, hi: paragraphHi },
            questions: childQuestions.map((cq) => ({
              id: cq.id,
              type: cq.type,
              en: cq.en,
              hi: cq.hi,
              ...(cq.type === "integer"
                ? { correctAnswer: cq.correctAnswer }
                : {
                    correctAnswers: cq.en.options
                      ?.filter((o) => o.isCorrectAnswer)
                      .map((o) => o.id),
                  }),
            })),
          });

          // Validate with Zod
          try {
            questionParagraphSchema.parse(questionData);
          } catch (error) {
            if (error instanceof z.ZodError) {
              setFormErrors(parseZodErrors(error));
              setLoading(false);
              return;
            }
          }
          break;
        }

        case "matrix": {
          endpoint = "matrix";
          questionData = generateMatrixQuestion(questionCore, {
            en: {
              question: questionEn,
              options: optionsEn.map((opt) => ({ id: opt.id, value: opt.value })),
              solution: solutionEn,
            },
            hi: {
              question: questionHi,
              options: optionsHi.map((opt) => ({ id: opt.id, value: opt.value })),
              solution: solutionHi,
            },
            correctAnswer: matrixAnswer,
          });

          // Validate with Zod
          try {
            questionMatrixSchema.parse(questionData);
          } catch (error) {
            if (error instanceof z.ZodError) {
              setFormErrors(parseZodErrors(error));
              setLoading(false);
              return;
            }
          }
          break;
        }

        default:
          return;
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

  // Check if there are any form errors
  const hasErrors = Object.keys(formErrors).length > 0;

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
            <h1 className="text-3xl font-bold tracking-tight">
              Create Question
            </h1>
            <p className="text-muted-foreground">
              Add a new question to your bank
            </p>
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

      {/* Error summary */}
      {hasErrors && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">
                  Please fix the following errors:
                </p>
                <ul className="list-disc list-inside text-sm mt-1">
                  {Object.entries(formErrors).map(([key, value]) => (
                    <li key={key}>
                      {typeof value === "string"
                        ? value
                        : typeof value === "object"
                        ? Object.values(value as Record<string, string>).join(", ")
                        : String(value)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Label>
                Subject{" "}
                {getFieldError("subject") && (
                  <span className="text-destructive text-xs">
                    ({getFieldError("subject")})
                  </span>
                )}
              </Label>
              <SingleSelectCreatable
                options={subjects.map((s) => ({
                  value: s._id,
                  label: s.name,
                  ...s,
                }))}
                value={selectedSubject}
                onValueChange={(value) => {
                  setSelectedSubject(value);
                  clearFieldError("subject");
                }}
                placeholder="Select subject"
                onCreateNew={handleAddSubject}
                createNewLabel="Add new subject"
                createNewPlaceholder="Enter subject name"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Chapters{" "}
                {getFieldError("chapters") && (
                  <span className="text-destructive text-xs">
                    ({getFieldError("chapters")})
                  </span>
                )}
              </Label>
              {!selectedSubject ? (
                <p className="text-sm text-muted-foreground rounded-md border p-2">
                  Select a subject first
                </p>
              ) : (
                <MultiSelectCreatable
                  options={chapters.map((c) => ({
                    value: c.name,
                    label: c.name,
                    ...c,
                  }))}
                  values={selectedChapters}
                  onValuesChange={(values) => {
                    setSelectedChapters(values);
                    clearFieldError("chapters");
                  }}
                  placeholder={chapters.length === 0 ? "Add a chapter" : "Select chapters"}
                  onCreateNew={handleAddChapter}
                  createNewLabel="Add new chapter"
                  createNewPlaceholder="Enter chapter name"
                  disabled={!selectedSubject}
                />
              )}
            </div>

            {selectedChapters.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Topics</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTopicDrawerOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {availableTopics.length > 0 ? (
                  <MultiSelect
                    values={selectedTopics}
                    onValuesChange={setSelectedTopics}
                  >
                    <MultiSelectTrigger>
                      <MultiSelectValue placeholder="Select topics" />
                    </MultiSelectTrigger>
                    <MultiSelectContent
                      search={{
                        placeholder: "Search topics...",
                        emptyMessage: "No topics found",
                      }}
                    >
                      {availableTopics.map((topic) => (
                        <MultiSelectItem key={topic} value={topic}>
                          {topic}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-md border p-2">
                    No topics yet. Click &quot;Add&quot; to create one.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Exams</Label>
              <MultiSelectCreatable
                options={exams.map((e) => ({
                  value: e.name,
                  label: e.name,
                  ...e,
                }))}
                values={selectedExams}
                onValuesChange={setSelectedExams}
                placeholder="Select exams"
                onCreateNew={handleAddExam}
                createNewLabel="Add new exam"
                createNewPlaceholder="Enter exam name"
              />
            </div>

            <div className="space-y-2">
              <Label>Sources</Label>
              <MultiSelectCreatable
                options={sources.map((s) => ({
                  value: s.name,
                  label: s.name,
                  ...s,
                }))}
                values={selectedSources}
                onValuesChange={setSelectedSources}
                placeholder="Select sources"
                onCreateNew={handleAddSource}
                createNewLabel="Add new source"
                createNewPlaceholder="Enter source name"
              />
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
                <Tabs
                  value={language}
                  onValueChange={(v) => setLanguage(v as "en" | "hi")}
                >
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
                <CardDescription>
                  Enter the main passage for the questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px]">
                  <ReactQuill
                    theme="snow"
                    value={language === "en" ? paragraphEn : paragraphHi}
                    onChange={
                      language === "en" ? setParagraphEn : setParagraphHi
                    }
                    modules={quillModules}
                    formats={quillFormats}
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
                <CardTitle>
                  Question{" "}
                  {formErrors.en?.question && (
                    <span className="text-destructive text-xs font-normal">
                      ({formErrors.en?.question})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px]">
                  <ReactQuill
                    theme="snow"
                    value={language === "en" ? questionEn : questionHi}
                    onChange={
                      language === "en" ? setQuestionEn : setQuestionHi
                    }
                    modules={quillModules}
                    formats={quillFormats}
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
                <CardTitle>
                  Options{" "}
                  {formErrors.en?.options && (
                    <span className="text-destructive text-xs font-normal">
                      ({formErrors.en?.options})
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Check the box to mark correct answer(s). Multiple selections
                  allowed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      option.isCorrectAnswer
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : ""
                    }`}
                  >
                    <Checkbox
                      checked={option.isCorrectAnswer}
                      onCheckedChange={(checked) =>
                        updateOption(
                          option.id,
                          "isCorrectAnswer",
                          checked as boolean
                        )
                      }
                    />
                    <span className="font-medium text-muted-foreground">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option.value}
                      onChange={(e) =>
                        updateOption(option.id, "value", e.target.value)
                      }
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
                <CardTitle>
                  Correct Answer Range{" "}
                  {getFieldError("correctAnswer") && (
                    <span className="text-destructive text-xs font-normal">
                      ({getFieldError("correctAnswer")})
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Enter the acceptable answer range (from/to). For exact
                  answers, use the same value.
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
                    <CardDescription>
                      Add questions based on the passage above
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addChildQuestion("single")}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      MCQ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addChildQuestion("integer")}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Integer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {childQuestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No questions added yet. Click the buttons above to add
                    questions.
                  </p>
                ) : (
                  childQuestions.map((cq, index) => (
                    <div
                      key={cq.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge>
                          Question {index + 1} ({cq.type})
                        </Badge>
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
                        value={
                          language === "en" ? cq.en.question : cq.hi.question
                        }
                        onChange={(e) => {
                          const lang = language;
                          updateChildQuestion(cq.id, {
                            [lang]: { ...cq[lang], question: e.target.value },
                          });
                        }}
                      />
                      {cq.type !== "integer" && cq.en.options && (
                        <div className="space-y-2 pl-4">
                          {(language === "en"
                            ? cq.en.options
                            : cq.hi.options || cq.en.options
                          ).map((opt, optIndex) => (
                            <div
                              key={opt.id}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                checked={opt.isCorrectAnswer}
                                onCheckedChange={(checked) => {
                                  const newOptions = cq.en.options?.map((o) =>
                                    o.id === opt.id
                                      ? {
                                          ...o,
                                          isCorrectAnswer: checked as boolean,
                                        }
                                      : o
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
                                placeholder={`Option ${String.fromCharCode(
                                  65 + optIndex
                                )}`}
                                value={opt.value}
                                onChange={(e) => {
                                  const lang = language;
                                  const currentOptions =
                                    lang === "en"
                                      ? cq.en.options
                                      : cq.hi.options;
                                  const newOptions = currentOptions?.map((o) =>
                                    o.id === opt.id
                                      ? { ...o, value: e.target.value }
                                      : o
                                  );
                                  updateChildQuestion(cq.id, {
                                    [lang]: {
                                      ...cq[lang],
                                      options: newOptions,
                                    },
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
                  Click cells to mark correct matchings. Rows = statements,
                  Columns = options.
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
                      onChange={(e) =>
                        setMatrixRows(parseInt(e.target.value) || 2)
                      }
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
                      onChange={(e) =>
                        setMatrixCols(parseInt(e.target.value) || 2)
                      }
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
                          {Array.from({ length: matrixCols }).map(
                            (_, colIndex) => (
                              <td
                                key={colIndex}
                                className="border p-2 text-center"
                              >
                                <Checkbox
                                  checked={
                                    matrixAnswer[rowIndex]?.[colIndex] || false
                                  }
                                  onCheckedChange={() =>
                                    toggleMatrixCell(rowIndex, colIndex)
                                  }
                                />
                              </td>
                            )
                          )}
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
                  formats={quillFormats}
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
            {/* Paragraph passage */}
            {questionType === "paragraph" && paragraphEn && (
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-semibold mb-2">Paragraph:</h4>
                <RenderWithLatex quillString={paragraphEn} />
              </div>
            )}

            {/* Main question (not for paragraph type) */}
            {questionType !== "paragraph" && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Question:</h4>
                <RenderWithLatex quillString={questionEn || "No content"} />
              </div>
            )}

            {/* MCQ options */}
            {questionType === "objective" && (
              <div className="space-y-2">
                <h4 className="font-semibold mb-2">Options:</h4>
                {optionsEn.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      opt.isCorrectAnswer
                        ? "bg-green-50 border-green-500 dark:bg-green-950"
                        : "bg-gray-50 dark:bg-gray-900"
                    }`}
                  >
                    <span className="font-medium">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <div className="flex-1">
                      <RenderWithLatex quillString={opt.value || "(empty)"} />
                    </div>
                    {opt.isCorrectAnswer && (
                      <Badge variant="default">Correct</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Integer answer range */}
            {questionType === "integer" && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Answer Range:</h4>
                <p>
                  {answerFrom || 0} to {answerTo || answerFrom || 0}
                </p>
              </div>
            )}

            {/* Paragraph child questions */}
            {questionType === "paragraph" && childQuestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Questions ({childQuestions.length}):</h4>
                {childQuestions.map((cq, idx) => (
                  <div key={cq.id} className="rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="font-medium text-sm">Q{idx + 1}.</span>
                      <RenderWithLatex quillString={cq.en.question || "(empty)"} />
                    </div>
                    {cq.type !== "integer" && cq.en.options && (
                      <div className="space-y-1 ml-6">
                        {cq.en.options.map((opt, optIdx) => (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-2 p-2 text-sm rounded ${
                              opt.isCorrectAnswer ? "bg-green-50 dark:bg-green-950" : ""
                            }`}
                          >
                            <span>{String.fromCharCode(65 + optIdx)}.</span>
                            <RenderWithLatex quillString={opt.value || "(empty)"} />
                            {opt.isCorrectAnswer && <Badge variant="default" className="text-xs">Correct</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                    {cq.type === "integer" && (
                      <div className="ml-6 text-sm">
                        <span className="text-muted-foreground">Answer: </span>
                        <span className="font-medium">
                          {cq.correctAnswer?.from || 0}
                          {cq.correctAnswer?.from !== cq.correctAnswer?.to && ` to ${cq.correctAnswer?.to || 0}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Matrix answer grid */}
            {questionType === "matrix" && matrixAnswer.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Answer Matrix:</h4>
                <div className="overflow-x-auto">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-sm"></th>
                        {Array.from({ length: matrixCols }).map((_, i) => (
                          <th key={i} className="p-2 text-sm text-center">
                            {String.fromCharCode(80 + i)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixAnswer.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td className="p-2 text-sm font-medium">{String.fromCharCode(65 + rowIdx)}</td>
                          {row.map((cell, colIdx) => (
                            <td key={colIdx} className="p-2 text-center">
                              <div className={`w-6 h-6 mx-auto rounded flex items-center justify-center ${
                                cell ? "bg-green-500 text-white" : "bg-muted"
                              }`}>
                                {cell && <Check className="h-4 w-4" />}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Solution */}
            {solutionEn && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Solution:</h4>
                <RenderWithLatex quillString={solutionEn} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Topic Drawer */}
      <CreateTopicDrawer
        open={topicDrawerOpen}
        onClose={() => setTopicDrawerOpen(false)}
        chapterOptions={chapters}
        onAddTopic={handleAddTopic}
      />
    </div>
  );
}
