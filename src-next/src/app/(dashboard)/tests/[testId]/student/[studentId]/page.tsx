"use client";

/*
  Student report (Admin-Analysis board, "Student report" view): one student's paper, question by question.
  Data: GET /test/:id, GET /test/result/admin (the student's submission), students and batches for the name.
*/

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MathText } from "@iitpulse/ui";

import { Topbar } from "@/components/admin/Topbar";
import { useFillHeight } from "@/components/kit";
import { api } from "@/lib/api";
import "../../results.css";

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
  const [filter, setFilter] = React.useState<"current" | "all" | "correct" | "wrong" | "skipped">("current");
  const [openChapters, setOpenChapters] = React.useState<Set<string>>(new Set());
  const toggleChapter = (name: string) =>
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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

          const answered =
            !!response &&
            ((response.selectedOptions?.length ?? 0) > 0 ||
              response.enteredAnswer !== undefined ||
              (response.marks ?? 0) !== 0 ||
              !!response.timeTakenInSeconds);
          if (answered && response) {
            attempted++;
            timeTakenInSeconds += response.timeTakenInSeconds ?? 0;
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


  const LETTERS = "ABCDEFGHIJ";
  const title = studentInfo?.name ? `${studentInfo.name} · student report` : "Student report";
  const tabs = (
    <div className="seg" aria-label="Analysis views">
      <Link href={`/tests/${testId}/detailed-analysis`} className="tab">Questions</Link>
      <span className="tab on" aria-current="page">Student report</span>
    </div>
  );

  // owner rule (6 Nov), table below a summary: the chapters table is a one-screen panel (the report scrolls away), only its rows scroll
  const [fillRef, fillH] = useFillHeight<HTMLElement>(resultType === "subject-wise" && chapterStats.length > 0, 320, 0, "panel");
  if (loading || !test || !submission) {
    return (
      <>
        <Topbar title={title} back={{ href: `/tests/${testId}/result`, label: "Results" }} actions={tabs} />
        <main className="col gap-4 px-7 pt-5 pb-10">
          {loading ? (
            <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <span key={i} className="skel h-[96px]" />)}</div>
          ) : (
            <div className="card col items-center gap-1.5 p-12 text-center">
              <span className="h3">Student submission not found</span>
              <span className="sm muted">This student has not submitted this test.</span>
            </div>
          )}
        </main>
      </>
    );
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    return h ? `${h}h ${String(mins).padStart(2, "0")}m` : `${mins}m ${secs}s`;
  };
  const seconds = (s: number) => (s ? `${Math.round(s)}s` : "—");

  const currentQuestion = questionAnalysis[currentQuestionIndex];
  const statusBadge = (s: QuestionAnalysisItem["status"]) =>
    s === "correct" ? <span className="badge b-green">Correct</span> : s === "wrong" ? <span className="badge b-red">Wrong</span> : <span className="badge b-grey">Skipped</span>;

  const renderQuestion = (q: QuestionAnalysisItem) => {
    const isNumerical = q.type?.toLowerCase().includes("numerical") || q.type?.toLowerCase().includes("integer");
    const totalAttemptedBy = q.options.reduce((s, o) => s + (o.attemptedBy || 0), 0);
    return (
      <article key={q.questionId} className={`card pad-lg col gap-3.5 border-l-4 ${q.status === "correct" ? "border-l-success" : q.status === "wrong" ? "border-l-danger" : "border-l-line"}`}>
        <div className="row between wrap gap-2">
          <div className="row wrap gap-2.5">
            <span className="h3 mono">Q{q.questionNumber}</span>
            <span className="badge b-grey">{q.sectionName}</span>
            {q.chapters?.[0]?.name && <span className="badge b-grey">{q.chapters[0].name}</span>}
            <span className="xs muted">{q.subSectionName}</span>
          </div>
          <div className="row gap-2.5">
            <span className={`num sm font-semibold ${q.marks > 0 ? "text-success" : q.marks < 0 ? "text-danger" : "muted"}`}>
              {q.marks > 0 ? `+${q.marks}` : q.marks} / {q.maxMarks}
            </span>
            {statusBadge(q.status)}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="col gap-3 lg:col-span-2">
            {q.questionText && <MathText html as="div" className="font-serif text-[16px] leading-[1.55]" text={q.questionText} />}
            {!isNumerical && q.options.length > 0 && (
              <div className="col gap-2">
                {q.options.map((option, i) => {
                  const isSelected = q.selectedOptions.includes(option.id);
                  const isCorrect = q.correctAnswers.includes(option.id);
                  return (
                    <div key={option.id} className={`opt ${isCorrect ? "correct" : isSelected ? "wrong" : ""}`}>
                      <span className="key">{LETTERS[i] ?? option.id}</span>
                      <MathText html as="div" className="sm grow font-serif" text={option.value} />
                      {isSelected && <span className="xs muted shrink-0">Their answer</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {isNumerical && (
              <div className="grid grid-cols-2 gap-3">
                <div className={`opt ${q.status === "correct" ? "correct" : q.status === "wrong" ? "wrong" : ""} col items-start gap-1`}>
                  <span className="xs muted">Their answer</span>
                  <span className="num h3">{q.enteredAnswer !== undefined ? q.enteredAnswer : "Not answered"}</span>
                </div>
                <div className="opt correct col items-start gap-1">
                  <span className="xs muted">Correct answer</span>
                  <span className="num h3">
                    {q.correctAnswerRange ? `${q.correctAnswerRange.from} to ${q.correctAnswerRange.to}` : q.correctAnswers.join(", ") || "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="col gap-3">
            <div className="col gap-1.5 rounded-tile bg-ground p-3">
              <span className="xs font-semibold">Marking</span>
              <span className="sm">
                <span className="text-success">+{[...q.markingScheme.correct].sort((a, b) => b - a).join(", +")}</span> · <span className="text-danger">{q.markingScheme.incorrect}</span>
              </span>
            </div>
            <div className="col gap-1.5 rounded-tile bg-ground p-3 sm">
              <span className="xs font-semibold">Time</span>
              <span className="row between"><span className="muted">Taken</span><span className="num">{seconds(q.timeTaken)}</span></span>
              <span className="row between"><span className="muted">Batch average</span><span className="num">{seconds(q.averageTimeTaken)}</span></span>
              <span className="row between"><span className="muted">Quickest</span><span className="num">{seconds(q.quickestResponse)}</span></span>
              <span className="row between"><span className="muted">Attempted by</span><span className="num">{q.attemptedByPercentage.toFixed(0)}%</span></span>
            </div>
            {!isNumerical && totalAttemptedBy > 0 && (
              <div className="col gap-1.5 rounded-tile bg-ground p-3">
                <span className="xs font-semibold">How the batch answered</span>
                {q.options.map((option, idx) => {
                  const pct = ((option.attemptedBy || 0) / totalAttemptedBy) * 100;
                  const isCorrect = q.correctAnswers.includes(option.id);
                  return (
                    <div key={option.id} className="row gap-2">
                      <span className="mono xs w-3">{LETTERS[idx]}</span>
                      <div className="bar h-1.5 grow">
                        <i style={{ width: `${pct}%`, background: isCorrect ? "var(--green)" : q.selectedOptions.includes(option.id) ? "var(--red-600)" : undefined }} />
                      </div>
                      <span className="xs num w-9 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {q.solution && (
          <div className="col gap-1.5 border-t border-line-2 pt-3">
            <span className="eyebrow">Solution</span>
            <MathText html as="div" className="sm font-serif" text={q.solution} />
          </div>
        )}
      </article>
    );
  };

  const filters = [
    ["current", "Current", null],
    ["all", "All", questionsByStatus.all.length],
    ["correct", "Correct", questionsByStatus.correct.length],
    ["wrong", "Wrong", questionsByStatus.wrong.length],
    ["skipped", "Skipped", questionsByStatus.skipped.length],
  ] as const;

  return (
    <>
      <Topbar title={title} back={{ href: `/tests/${testId}/result`, label: "Results" }} actions={tabs} />
      <main className="col gap-4 px-7 pt-5 pb-10">
        <div className="col gap-1">
          <h2 className="h1">{studentInfo?.name || studentId}</h2>
          <span className="sm muted">{[test.name, studentInfo?.batch].filter(Boolean).join(" · ")}</span>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            ["Score", <>{stats.totalMarks}<span className="sm muted">/{stats.maxMarks}</span></>],
            ["Percentage", `${stats.percentage.toFixed(1)}%`],
            ["Correct", <span key="c" className="text-success">{stats.correct}</span>],
            ["Wrong", <span key="w" className="text-danger">{stats.wrong}</span>],
            ["Skipped", <span key="s" className="muted">{stats.skipped}</span>],
            ["Accuracy", `${stats.accuracy.toFixed(1)}%`],
            ["Time", formatTime(stats.totalTime)],
          ].map(([label, value], i) => (
            <article key={label as string} className="card pad col rise gap-1" style={{ ["--i" as string]: i }}>
              <span className="sm muted">{label}</span>
              <span className="num text-[24px] font-[650] tracking-[-.01em]">{value}</span>
            </article>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sectionStats.map((s, i) => (
            <article key={s.id} className="card pad col rise gap-2" style={{ ["--i" as string]: i + 2 }}>
              <div className="row between">
                <span className="h3">{s.name}</span>
                <span className="num sm font-semibold">{s.marks}<span className="muted">/{s.totalMarksPerSection}</span></span>
              </div>
              <div className="bar h-1.5">
                <i style={{ width: `${s.totalMarksPerSection ? Math.max(0, Math.min(100, (s.marks / s.totalMarksPerSection) * 100)) : 0}%` }} />
              </div>
              <span className="xs muted">
                {s.attempted} of {s.totalQuestions} attempted · <span className="text-success">{s.correct} correct</span> · <span className="text-danger">{s.incorrect} wrong</span> · {formatTime(s.timeTakenInSeconds)}
              </span>
            </article>
          ))}
        </section>

        <div className="row between wrap gap-2">
          <div className="seg" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={resultType === "question-wise"} className={`tab ${resultType === "question-wise" ? "on" : ""}`} onClick={() => setResultType("question-wise")}>
              Questions
            </button>
            <button type="button" role="tab" aria-selected={resultType === "subject-wise"} className={`tab ${resultType === "subject-wise" ? "on" : ""}`} onClick={() => setResultType("subject-wise")}>
              Chapters and topics
            </button>
          </div>
        </div>

        {resultType === "subject-wise" && (
          <section ref={fillRef} className={`card ${fillH !== null ? "k-fill k-fill-panel" : "scrollx"}`} style={{ height: fillH ?? undefined, overflow: fillH !== null ? "hidden" : undefined }}>
            {chapterStats.length ? (
              <div className="k-fill-body scrollx">
              <table className="table">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    <th className="num">Total</th>
                    <th className="num">Attempted</th>
                    <th className="num">Correct</th>
                    <th className="num">Wrong</th>
                    <th className="num">Marks</th>
                    <th className="num">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {chapterStats.map((chapter) => {
                    const open = openChapters.has(chapter.name);
                    const topics = Object.values(chapter.topics);
                    return (
                      <React.Fragment key={chapter.name}>
                        <tr className={topics.length ? "cursor-pointer" : ""} onClick={() => topics.length && toggleChapter(chapter.name)} aria-expanded={topics.length ? open : undefined}>
                          <td className="sm font-semibold">
                            <span className="row gap-1.5">
                              {topics.length > 0 && <ChevronRight className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />}
                              {chapter.name}
                            </span>
                          </td>
                          <td className="sm num">{chapter.totalQuestions}</td>
                          <td className="sm num">{chapter.attempted}</td>
                          <td className="sm num text-success">{chapter.correct}</td>
                          <td className="sm num text-danger">{chapter.incorrect}</td>
                          <td className="sm num">{chapter.marks}</td>
                          <td className="sm num">{seconds(chapter.timeTakenInSeconds)}</td>
                        </tr>
                        {open &&
                          topics.map((topic) => (
                            <tr key={topic.name} className="bg-ground/60">
                              <td className="sm muted pl-10">{topic.name}</td>
                              <td className="sm num">{topic.totalQuestions}</td>
                              <td className="sm num">{topic.attempted}</td>
                              <td className="sm num text-success">{topic.correct}</td>
                              <td className="sm num text-danger">{topic.incorrect}</td>
                              <td className="sm num">{topic.marks}</td>
                              <td className="sm num">{seconds(topic.timeTakenInSeconds)}</td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            ) : (
              <div className="pad sm muted">The questions in this test carry no chapters.</div>
            )}
          </section>
        )}

        {resultType === "question-wise" && (
          <>
            <section className="card pad-lg col gap-3">
              <div className="row between wrap gap-2">
                <span className="h3">Questions</span>
                <div className="row xs muted gap-1.5">
                  <span className="size-3 rounded-[3px] bg-[#CDE9D7]" />
                  <span>Correct</span>
                  <span aria-hidden>·</span>
                  <span className="size-3 rounded-[3px] bg-[#F6C9C9]" />
                  <span>Wrong</span>
                  <span aria-hidden>·</span>
                  <span className="size-3 rounded-[3px] bg-line-2" />
                  <span>Skipped</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-[5px]">
                {questionAnalysis.map((q, idx) => (
                  <button
                    type="button"
                    key={q.questionId}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setFilter("current");
                    }}
                    className={`rs-qc ${idx === currentQuestionIndex ? "on" : ""}`}
                    style={{ background: q.status === "correct" ? "#CDE9D7" : q.status === "wrong" ? "#F6C9C9" : "var(--line-2)" }}
                    aria-label={`Q${q.questionNumber}, ${q.status}`}
                    aria-pressed={idx === currentQuestionIndex}
                  >
                    {q.questionNumber}
                  </button>
                ))}
              </div>
            </section>

            <div className="row between wrap gap-2">
              <div className="seg" role="tablist" aria-label="Show">
                {filters.map(([key, label, count]) => (
                  <button key={key} type="button" role="tab" aria-selected={filter === key} className={`tab ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>
                    {label}
                    {count !== null && <span className="count">{count}</span>}
                  </button>
                ))}
              </div>
              {filter === "current" && (
                <div className="row gap-2">
                  <button type="button" className="btn btn-secondary btn-sm btn-icon w-8" aria-label="Previous question" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}>
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <span className="sm muted num">
                    {currentQuestionIndex + 1} / {questionAnalysis.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-icon w-8"
                    aria-label="Next question"
                    disabled={currentQuestionIndex >= questionAnalysis.length - 1}
                    onClick={() => setCurrentQuestionIndex((i) => Math.min(questionAnalysis.length - 1, i + 1))}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>

            <div className="col gap-3.5">
              {filter === "current"
                ? currentQuestion && renderQuestion(currentQuestion)
                : questionsByStatus[filter].length
                  ? questionsByStatus[filter].map(renderQuestion)
                  : <div className="card pad sm muted">No {filter === "all" ? "" : filter} questions.</div>}
            </div>
          </>
        )}
      </main>
    </>
  );
}
