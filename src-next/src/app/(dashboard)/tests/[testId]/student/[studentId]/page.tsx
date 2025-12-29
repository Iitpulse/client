"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Timer,
  Users,
  Zap,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { api } from "@/lib/api";
import RenderWithLatex from "@/components/render-with-latex";
import { SubjectCard } from "@/components/subject-card";

interface QuestionResponse {
  id: string;
  marks: number;
  selectedOptions?: string[];
  enteredAnswer?: number;
  correctAnswers?: string[] | { from: number; to: number };
  wrongAnswers?: string[];
  timeTakenInSeconds?: number;
  averageTimeTakenInSeconds?: number;
  quickestResponse?: number;
}

interface SubSectionResponse {
  id: string;
  questions: Record<string, QuestionResponse> | QuestionResponse[];
}

interface SectionResponse {
  id: string;
  subSections: SubSectionResponse[];
}

interface StudentSubmission {
  id: string;
  sections: SectionResponse[];
  totalMarks: number;
  totalTimeTakenInSeconds?: number;
  submittedAt?: string;
}

interface QuestionOption {
  id: string;
  value: string;
  attemptedBy?: number;
}

interface QuestionChapter {
  name: string;
  topics: string[];
}

interface TestQuestion {
  _id: string;
  id?: string;
  type: string;
  question?: string;
  en?: { question?: string; options?: QuestionOption[]; solution?: string };
  hi?: { question?: string; options?: QuestionOption[]; solution?: string };
  options?: QuestionOption[];
  correctAnswers?: string[];
  correctAnswer?: { from: number; to: number };
  solution?: string;
  chapters?: QuestionChapter[];
}

interface TestSubSection {
  id: string;
  name: string;
  type: string;
  questions: TestQuestion[];
  toBeAttempted?: number;
  markingScheme: {
    correct: number[];
    incorrect: number;
  };
}

interface TestSection {
  id: string;
  name: string;
  subSections: TestSubSection[];
}

interface TestData {
  _id: string;
  name: string;
  totalMarks: number;
  sections: TestSection[];
  totalAppeared?: number;
}

interface QuestionAnalysisItem {
  questionNumber: number;
  questionId: string;
  sectionId: string;
  sectionName: string;
  subSectionId: string;
  subSectionName: string;
  type: string;
  marks: number;
  maxMarks: number;
  negativeMarks: number;
  markingScheme: { correct: number[]; incorrect: number };
  timeTaken: number;
  averageTimeTaken: number;
  quickestResponse: number;
  attemptedByPercentage: number;
  status: "correct" | "wrong" | "skipped";
  questionText: string;
  options: QuestionOption[];
  selectedOptions: string[];
  correctAnswers: string[];
  enteredAnswer?: number;
  correctAnswerRange?: { from: number; to: number };
  solution?: string;
  chapters?: QuestionChapter[];
}

interface SectionStats {
  id: string;
  name: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  marks: number;
  totalMarksPerSection: number;
  timeTakenInSeconds: number;
  positiveScore: number;
}

interface ChapterStats {
  name: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  marks: number;
  timeTakenInSeconds: number;
  topics: Record<
    string,
    {
      name: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      marks: number;
      timeTakenInSeconds: number;
    }
  >;
}

interface StudentInfo {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  batch?: string;
}

interface BatchInfo {
  id: string;
  _id?: string;
  name: string;
}

export default function StudentAnalysisPage() {
  const params = useParams();
  const testId = params.testId as string;
  const studentId = params.studentId as string;

  const [test, setTest] = React.useState<TestData | null>(null);
  const [submission, setSubmission] = React.useState<StudentSubmission | null>(null);
  const [studentInfo, setStudentInfo] = React.useState<{ name: string; batch?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [resultType, setResultType] = React.useState<string>("question-wise");
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, resultsRes, studentsRes, batchesRes] = await Promise.all([
          api.tests.getById(testId),
          api.tests.getAdminResult(testId),
          api.users.getStudents(),
          api.batches.getAll(),
        ]);

        const testData = testRes.data?.data || testRes.data;
        setTest(testData);

        const resultData = resultsRes.data?.data || resultsRes.data;
        const submissions = resultData?.submissions || [];
        const studentSubmission = submissions.find(
          (s: StudentSubmission) =>
            s.id === studentId || (s as unknown as Record<string, unknown>).studentId === studentId
        );
        setSubmission(studentSubmission || null);

        const students = studentsRes.data?.data || studentsRes.data || [];
        const student = (students as StudentInfo[]).find((s) => (s.id || s._id) === studentId);

        const batches = batchesRes.data?.data || batchesRes.data || [];
        const batchMap = new Map<string, string>();
        (batches as BatchInfo[]).forEach((b) => {
          const id = b.id || b._id;
          if (id) batchMap.set(id, b.name);
        });

        if (student) {
          setStudentInfo({
            name: student.name,
            batch: student.batch ? batchMap.get(student.batch) : undefined,
          });
        }
      } catch (error) {
        console.error("Failed to fetch student analysis:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testId, studentId]);

  // Build question-wise analysis with full details
  const questionAnalysis = React.useMemo((): QuestionAnalysisItem[] => {
    if (!test || !submission) return [];

    const result: QuestionAnalysisItem[] = [];
    let questionNumber = 0;

    test.sections.forEach((section) => {
      section.subSections.forEach((subSection) => {
        const maxMarksPerQuestion = Math.max(...subSection.markingScheme.correct);

        subSection.questions.forEach((question) => {
          questionNumber++;

          const submissionSection = submission.sections?.find((s) => s.id === section.id);
          const submissionSubSection = submissionSection?.subSections?.find(
            (ss) => ss.id === subSection.id
          );

          let response: QuestionResponse | undefined;
          if (submissionSubSection?.questions) {
            if (Array.isArray(submissionSubSection.questions)) {
              response = submissionSubSection.questions.find((q) => q.id === question._id);
            } else {
              response = submissionSubSection.questions[question._id];
            }
          }

          const marks = response?.marks ?? 0;
          const timeTaken = response?.timeTakenInSeconds ?? 0;
          const averageTimeTaken = response?.averageTimeTakenInSeconds ?? 0;
          const quickestResponse = response?.quickestResponse ?? 0;

          // Calculate attempted by percentage from options
          const options = question.en?.options || question.options || [];
          let totalAttemptedBy = 0;
          options.forEach((opt) => {
            totalAttemptedBy += opt.attemptedBy || 0;
          });
          const totalAppeared = test.totalAppeared || 1;
          const attemptedByPercentage = (totalAttemptedBy / totalAppeared) * 100;

          let status: "correct" | "wrong" | "skipped" = "skipped";
          if (response) {
            const hasAttempted =
              (response.selectedOptions?.length ?? 0) > 0 || response.enteredAnswer !== undefined;

            if (hasAttempted) {
              status = marks > 0 ? "correct" : "wrong";
            }
          }

          const questionText = question.en?.question || question.question || "";

          let correctAnswers: string[] = [];
          let correctAnswerRange: { from: number; to: number } | undefined;

          if (question.correctAnswers) {
            correctAnswers = question.correctAnswers;
          } else if (question.correctAnswer) {
            correctAnswerRange = question.correctAnswer;
          }

          if (response?.correctAnswers) {
            if (Array.isArray(response.correctAnswers)) {
              correctAnswers = response.correctAnswers;
            } else {
              correctAnswerRange = response.correctAnswers as { from: number; to: number };
            }
          }

          const solution = question.en?.solution || question.solution || "";

          result.push({
            questionNumber,
            questionId: question._id,
            sectionId: section.id,
            sectionName: section.name,
            subSectionId: subSection.id,
            subSectionName: subSection.name,
            type: subSection.type || question.type,
            marks,
            maxMarks: maxMarksPerQuestion,
            negativeMarks: subSection.markingScheme.incorrect,
            markingScheme: subSection.markingScheme,
            timeTaken,
            averageTimeTaken,
            quickestResponse,
            attemptedByPercentage,
            status,
            questionText,
            options,
            selectedOptions: response?.selectedOptions || [],
            correctAnswers,
            enteredAnswer: response?.enteredAnswer,
            correctAnswerRange,
            solution,
            chapters: question.chapters,
          });
        });
      });
    });

    return result;
  }, [test, submission]);

  // Calculate section-wise stats
  const sectionStats = React.useMemo((): SectionStats[] => {
    if (!test || !submission) return [];

    const stats: SectionStats[] = [];

    test.sections.forEach((section) => {
      let totalQuestions = 0;
      let attempted = 0;
      let correct = 0;
      let incorrect = 0;
      let marks = 0;
      let timeTakenInSeconds = 0;
      let totalMarksPerSection = 0;
      let positiveScore = 0;

      section.subSections.forEach((subSection) => {
        const maxPerQ = Math.max(...subSection.markingScheme.correct);
        totalMarksPerSection += (subSection.toBeAttempted || subSection.questions.length) * maxPerQ;

        subSection.questions.forEach((question) => {
          totalQuestions++;

          const submissionSection = submission.sections?.find((s) => s.id === section.id);
          const submissionSubSection = submissionSection?.subSections?.find(
            (ss) => ss.id === subSection.id
          );

          let response: QuestionResponse | undefined;
          if (submissionSubSection?.questions) {
            if (Array.isArray(submissionSubSection.questions)) {
              response = submissionSubSection.questions.find((q) => q.id === question._id);
            } else {
              response = submissionSubSection.questions[question._id];
            }
          }

          if (response?.timeTakenInSeconds) {
            attempted++;
            timeTakenInSeconds += response.timeTakenInSeconds;
            marks += response.marks ?? 0;

            if ((response.marks ?? 0) > 0) {
              correct++;
              positiveScore += response.marks ?? 0;
            } else if ((response.marks ?? 0) < 0) {
              incorrect++;
            }
          }
        });
      });

      stats.push({
        id: section.id,
        name: section.name,
        totalQuestions,
        attempted,
        correct,
        incorrect,
        marks,
        totalMarksPerSection,
        timeTakenInSeconds,
        positiveScore,
      });
    });

    return stats;
  }, [test, submission]);

  // Calculate chapter-wise stats
  const chapterStats = React.useMemo((): ChapterStats[] => {
    const chapters: Record<string, ChapterStats> = {};

    questionAnalysis.forEach((q) => {
      if (!q.chapters) return;

      q.chapters.forEach((chapter) => {
        if (!chapters[chapter.name]) {
          chapters[chapter.name] = {
            name: chapter.name,
            totalQuestions: 0,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            marks: 0,
            timeTakenInSeconds: 0,
            topics: {},
          };
        }

        chapters[chapter.name].totalQuestions++;
        chapters[chapter.name].marks += q.marks;
        chapters[chapter.name].timeTakenInSeconds += q.timeTaken;

        if (q.status !== "skipped") {
          chapters[chapter.name].attempted++;
          if (q.status === "correct") {
            chapters[chapter.name].correct++;
          } else {
            chapters[chapter.name].incorrect++;
          }
        }

        // Topics
        chapter.topics?.forEach((topic) => {
          if (!chapters[chapter.name].topics[topic]) {
            chapters[chapter.name].topics[topic] = {
              name: topic,
              totalQuestions: 0,
              attempted: 0,
              correct: 0,
              incorrect: 0,
              marks: 0,
              timeTakenInSeconds: 0,
            };
          }

          chapters[chapter.name].topics[topic].totalQuestions++;
          chapters[chapter.name].topics[topic].marks += q.marks;
          chapters[chapter.name].topics[topic].timeTakenInSeconds += q.timeTaken;

          if (q.status !== "skipped") {
            chapters[chapter.name].topics[topic].attempted++;
            if (q.status === "correct") {
              chapters[chapter.name].topics[topic].correct++;
            } else {
              chapters[chapter.name].topics[topic].incorrect++;
            }
          }
        });
      });
    });

    return Object.values(chapters);
  }, [questionAnalysis]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const correct = questionAnalysis.filter((q) => q.status === "correct").length;
    const wrong = questionAnalysis.filter((q) => q.status === "wrong").length;
    const skipped = questionAnalysis.filter((q) => q.status === "skipped").length;
    const totalMarks = questionAnalysis.reduce((sum, q) => sum + q.marks, 0);
    const maxMarks = questionAnalysis.reduce((sum, q) => sum + q.maxMarks, 0);
    const totalTime = submission?.totalTimeTakenInSeconds ?? 0;

    return {
      correct,
      wrong,
      skipped,
      totalQuestions: questionAnalysis.length,
      totalMarks,
      maxMarks,
      percentage: maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0,
      totalTime,
      accuracy: correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0,
    };
  }, [questionAnalysis, submission]);

  // Group questions by status for filtering
  const questionsByStatus = React.useMemo(
    () => ({
      all: questionAnalysis,
      correct: questionAnalysis.filter((q) => q.status === "correct"),
      wrong: questionAnalysis.filter((q) => q.status === "wrong"),
      skipped: questionAnalysis.filter((q) => q.status === "skipped"),
    }),
    [questionAnalysis]
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading student analysis...</div>
      </div>
    );
  }

  if (!test || !submission) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Student submission not found</div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const colors: Array<"primary" | "success" | "warning" | "error"> = [
    "primary",
    "success",
    "warning",
    "error",
  ];

  // Question navigation
  const currentQuestion = questionAnalysis[currentQuestionIndex];

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionAnalysis.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Render question card with full analytics
  const renderQuestionCardWithAnalytics = (q: QuestionAnalysisItem) => {
    const isNumerical =
      q.type?.toLowerCase().includes("numerical") || q.type?.toLowerCase().includes("integer");

    // Calculate option selection percentages
    let totalAttemptedBy = 0;
    q.options.forEach((opt) => {
      totalAttemptedBy += opt.attemptedBy || 0;
    });

    return (
      <Card
        key={q.questionId}
        className={`border-l-4 ${
          q.status === "correct"
            ? "border-l-green-500"
            : q.status === "wrong"
              ? "border-l-red-500"
              : "border-l-gray-300"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-lg font-bold">
                Q{q.questionNumber}
              </Badge>
              <Badge variant="secondary">{q.type}</Badge>
              <span className="text-sm text-muted-foreground">
                {q.sectionName} &gt; {q.subSectionName}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`font-semibold ${
                  q.marks > 0 ? "text-green-600" : q.marks < 0 ? "text-red-600" : ""
                }`}
              >
                {q.marks > 0 ? `+${q.marks}` : q.marks} / {q.maxMarks}
              </div>
              {q.status === "correct" && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle className="mr-1 h-3 w-3" /> Correct
                </Badge>
              )}
              {q.status === "wrong" && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                  <XCircle className="mr-1 h-3 w-3" /> Wrong
                </Badge>
              )}
              {q.status === "skipped" && (
                <Badge variant="secondary">
                  <MinusCircle className="mr-1 h-3 w-3" /> Skipped
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left side - Question and Options */}
            <div className="space-y-4 lg:col-span-2">
              {/* Question Text */}
              {q.questionText && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <RenderWithLatex
                    quillString={q.questionText}
                    className="prose prose-sm max-w-none dark:prose-invert"
                  />
                </div>
              )}

              {/* Options for MCQ */}
              {!isNumerical && q.options.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Options:</div>
                  <div className="grid gap-2">
                    {q.options.map((option) => {
                      const isSelected = q.selectedOptions.includes(option.id);
                      const isCorrect = q.correctAnswers.includes(option.id);

                      let bgClass = "bg-muted/30";
                      let borderClass = "border-transparent";
                      let icon = null;

                      if (isCorrect) {
                        bgClass = "bg-green-50 dark:bg-green-950/30";
                        borderClass = "border-green-500";
                        icon = <CheckCircle className="h-4 w-4 text-green-600" />;
                      }
                      if (isSelected && !isCorrect) {
                        bgClass = "bg-red-50 dark:bg-red-950/30";
                        borderClass = "border-red-500";
                        icon = <XCircle className="h-4 w-4 text-red-600" />;
                      }
                      if (isSelected && isCorrect) {
                        bgClass = "bg-green-50 dark:bg-green-950/30";
                        borderClass = "border-green-500";
                        icon = <CheckCircle className="h-4 w-4 text-green-600" />;
                      }

                      const optionLetter = option.id.split("_").pop() || option.id;

                      return (
                        <div
                          key={option.id}
                          className={`flex items-start gap-3 rounded-lg border-2 p-3 ${bgClass} ${borderClass}`}
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-medium">
                            {optionLetter}
                          </div>
                          <div className="flex-1">
                            <RenderWithLatex
                              quillString={option.value}
                              className="prose prose-sm max-w-none dark:prose-invert"
                            />
                          </div>
                          {isSelected && (
                            <span className="shrink-0 text-xs text-muted-foreground">Selected</span>
                          )}
                          {icon && <div className="shrink-0">{icon}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Numerical Answer */}
              {isNumerical && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        Student&apos;s Answer
                      </div>
                      <div
                        className={`text-lg font-semibold ${
                          q.status === "correct"
                            ? "text-green-600"
                            : q.status === "wrong"
                              ? "text-red-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {q.enteredAnswer !== undefined ? q.enteredAnswer : "Not answered"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:bg-green-950/30">
                      <div className="text-sm font-medium text-green-700">Correct Answer</div>
                      <div className="text-lg font-semibold text-green-700">
                        {q.correctAnswerRange
                          ? `${q.correctAnswerRange.from} to ${q.correctAnswerRange.to}`
                          : q.correctAnswers.join(", ") || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side - Analytics */}
            <div className="space-y-4">
              {/* Marking Scheme */}
              <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-medium">Marking Scheme</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      +{q.markingScheme.correct.sort((a, b) => b - a).join(", +")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{q.markingScheme.incorrect}</span>
                  </div>
                </div>
              </div>

              {/* Time Analytics */}
              <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-medium">Time Analytics</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      <span>Time Taken</span>
                    </div>
                    <span className="font-medium">{q.timeTaken?.toFixed(1) || 0}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Avg Time</span>
                    </div>
                    <span className="font-medium">{q.averageTimeTaken?.toFixed(1) || 0}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>Quickest</span>
                    </div>
                    <span className="font-medium">{q.quickestResponse?.toFixed(1) || 0}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Attempted By</span>
                    </div>
                    <span className="font-medium">{q.attemptedByPercentage?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Option Selection Distribution (for MCQ) */}
              {!isNumerical && q.options.length > 0 && totalAttemptedBy > 0 && (
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Selection Distribution</div>
                  <div className="space-y-2">
                    {q.options.map((option, idx) => {
                      const percentage =
                        totalAttemptedBy > 0
                          ? ((option.attemptedBy || 0) / totalAttemptedBy) * 100
                          : 0;
                      const isCorrect = q.correctAnswers.includes(option.id);
                      const isSelected = q.selectedOptions.includes(option.id);
                      const optionLetter = String.fromCharCode(65 + idx);

                      return (
                        <div key={option.id} className="flex items-center gap-2">
                          <span className="w-4 text-sm font-medium">{optionLetter}</span>
                          <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted">
                            <div
                              className={`absolute left-0 top-0 h-full transition-all ${
                                isCorrect
                                  ? "bg-green-500"
                                  : isSelected && !isCorrect
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs">{percentage.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Solution */}
          {q.solution && (
            <div className="border-t pt-4">
              <div className="mb-2 text-sm font-medium text-muted-foreground">Solution:</div>
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                <RenderWithLatex
                  quillString={q.solution}
                  className="prose prose-sm max-w-none dark:prose-invert"
                />
              </div>
            </div>
          )}

          {/* Summary for MCQ */}
          {!isNumerical && q.options.length > 0 && (
            <div className="flex gap-4 border-t pt-3 text-sm">
              <div>
                <span className="text-muted-foreground">Selected: </span>
                <span className={q.status === "wrong" ? "font-medium text-red-600" : ""}>
                  {q.selectedOptions.length > 0
                    ? q.selectedOptions.map((id) => id.split("_").pop() || id).join(", ")
                    : "None"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Correct: </span>
                <span className="font-medium text-green-600">
                  {q.correctAnswers.length > 0
                    ? q.correctAnswers.map((id) => id.split("_").pop() || id).join(", ")
                    : "-"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/tests/${testId}/result`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {studentInfo?.name || "Student Analysis"}
          </h1>
          <p className="text-muted-foreground">
            {test.name}
            {studentInfo?.batch && ` | ${studentInfo.batch}`}
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score</CardDescription>
            <CardTitle className="text-2xl">
              {stats.totalMarks} / {stats.maxMarks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Percentage</CardDescription>
            <CardTitle className="text-2xl">{stats.percentage.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Correct</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.correct}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wrong</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.wrong}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Skipped</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{stats.skipped}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accuracy</CardDescription>
            <CardTitle className="text-2xl">{stats.accuracy.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Taken</CardDescription>
            <CardTitle className="text-2xl">{formatTime(stats.totalTime)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Section-wise cards with doughnut charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sectionStats.map((section, idx) => (
          <SubjectCard
            key={section.id}
            name={section.name}
            marks={section.marks}
            totalMarksPerSection={section.totalMarksPerSection}
            attempted={section.attempted}
            correct={section.correct}
            incorrect={section.incorrect}
            timeTakenInSeconds={section.timeTakenInSeconds}
            totalQuestions={section.totalQuestions}
            positiveScore={section.positiveScore}
            variant={colors[idx % colors.length]}
          />
        ))}
      </div>

      {/* Result Type Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">View Analysis:</span>
        <Select value={resultType} onValueChange={setResultType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="question-wise">Question Wise</SelectItem>
            <SelectItem value="subject-wise">Subject Wise (Chapter/Topic)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subject Wise Analysis */}
      {resultType === "subject-wise" && chapterStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chapter-wise Analysis</CardTitle>
            <CardDescription>Performance breakdown by chapter and topic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Chapter</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Attempted</TableHead>
                    <TableHead className="text-center">Correct</TableHead>
                    <TableHead className="text-center">Incorrect</TableHead>
                    <TableHead className="text-center">Marks</TableHead>
                    <TableHead className="text-center">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapterStats.map((chapter) => (
                    <React.Fragment key={chapter.name}>
                      <Collapsible asChild>
                        <>
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
                                  {chapter.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {chapter.totalQuestions}
                              </TableCell>
                              <TableCell className="text-center">{chapter.attempted}</TableCell>
                              <TableCell className="text-center text-green-600">
                                {chapter.correct}
                              </TableCell>
                              <TableCell className="text-center text-red-600">
                                {chapter.incorrect}
                              </TableCell>
                              <TableCell className="text-center">{chapter.marks}</TableCell>
                              <TableCell className="text-center">
                                {chapter.timeTakenInSeconds?.toFixed(1)}s
                              </TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          <CollapsibleContent asChild>
                            <>
                              {Object.values(chapter.topics).map((topic) => (
                                <TableRow key={topic.name} className="bg-muted/30">
                                  <TableCell className="pl-10 text-muted-foreground">
                                    {topic.name}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {topic.totalQuestions}
                                  </TableCell>
                                  <TableCell className="text-center">{topic.attempted}</TableCell>
                                  <TableCell className="text-center text-green-600">
                                    {topic.correct}
                                  </TableCell>
                                  <TableCell className="text-center text-red-600">
                                    {topic.incorrect}
                                  </TableCell>
                                  <TableCell className="text-center">{topic.marks}</TableCell>
                                  <TableCell className="text-center">
                                    {topic.timeTakenInSeconds?.toFixed(1)}s
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question-wise Analysis */}
      {resultType === "question-wise" && (
        <>
          {/* Question Navigation Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Question Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {questionAnalysis.map((q, idx) => (
                  <button
                    type="button"
                    key={q.questionId}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium transition-colors ${
                      idx === currentQuestionIndex
                        ? "bg-primary text-primary-foreground"
                        : q.status === "correct"
                          ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30"
                          : q.status === "wrong"
                            ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30"
                            : "hover:bg-muted"
                    }`}
                  >
                    {q.questionNumber}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded border border-green-500 bg-green-50" />
                  <span>Correct</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded border border-red-500 bg-red-50" />
                  <span>Wrong</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded border" />
                  <span>Skipped</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-primary" />
                  <span>Current</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Question with navigation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Question-wise Breakdown</CardTitle>
                  <CardDescription>
                    Detailed performance for each question with answers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentQuestionIndex + 1} / {questionAnalysis.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextQuestion}
                    disabled={currentQuestionIndex === questionAnalysis.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="current">
                <TabsList className="mb-4">
                  <TabsTrigger value="current">Current Question</TabsTrigger>
                  <TabsTrigger value="all">All ({questionsByStatus.all.length})</TabsTrigger>
                  <TabsTrigger value="correct" className="text-green-600">
                    Correct ({questionsByStatus.correct.length})
                  </TabsTrigger>
                  <TabsTrigger value="wrong" className="text-red-600">
                    Wrong ({questionsByStatus.wrong.length})
                  </TabsTrigger>
                  <TabsTrigger value="skipped">
                    Skipped ({questionsByStatus.skipped.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="current" className="space-y-4">
                  {currentQuestion && renderQuestionCardWithAnalytics(currentQuestion)}
                </TabsContent>

                {(["all", "correct", "wrong", "skipped"] as const).map((status) => (
                  <TabsContent key={status} value={status} className="space-y-4">
                    {questionsByStatus[status].length > 0 ? (
                      questionsByStatus[status].map(renderQuestionCardWithAnalytics)
                    ) : (
                      <div className="flex h-32 items-center justify-center text-muted-foreground">
                        No {status === "all" ? "" : status} questions
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
