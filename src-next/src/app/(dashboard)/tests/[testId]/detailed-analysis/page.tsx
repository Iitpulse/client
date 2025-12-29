"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart2, Users, Clock, Target, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

interface Submission {
  id: string;
  studentId: string;
  studentName?: string;
  obtainedMarks: number;
  totalMarks?: number;
  percentage?: number;
  timeTaken?: number;
  sections?: SectionSubmission[];
}

interface SectionSubmission {
  id: string;
  name: string;
  obtainedMarks: number;
  totalMarks: number;
  subSections?: SubSectionSubmission[];
}

interface SubSectionSubmission {
  id: string;
  name: string;
  questions: QuestionSubmission[];
}

interface QuestionSubmission {
  id: string;
  isCorrect?: boolean;
  isAttempted?: boolean;
  timeTaken?: number;
}

interface TestData {
  _id: string;
  name: string;
  totalMarks: number;
  durationInMinutes?: number;
  sections?: {
    id: string;
    name: string;
    subSections?: {
      id: string;
      name: string;
      questions: { _id: string }[];
    }[];
  }[];
}

interface QuestionAnalysis {
  questionNumber: number;
  questionId: string;
  correctAttempts: number;
  wrongAttempts: number;
  skipped: number;
  averageTime: number;
  accuracy: number;
}

interface SectionAnalysis {
  sectionName: string;
  totalQuestions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

const COLORS = ["#22c55e", "#ef4444", "#94a3b8"];

export default function DetailedAnalysisPage() {
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = React.useState<TestData | null>(null);
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, resultsRes] = await Promise.all([
          api.tests.getById(testId),
          api.tests.getAdminResult(testId),
        ]);

        const testData = testRes.data?.data || testRes.data;
        setTest(testData);

        const resultData = resultsRes.data?.data || resultsRes.data;
        setSubmissions(resultData?.submissions || []);
      } catch (error) {
        console.error("Failed to fetch analysis:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testId]);

  // Calculate stats from real submissions
  const stats = React.useMemo(() => {
    if (!submissions.length) {
      return {
        totalParticipants: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageTime: 0,
        completionRate: 0,
      };
    }

    const marks = submissions.map((s) => s.obtainedMarks || 0);
    const times = submissions.map((s) => s.timeTaken || 0).filter((t) => t > 0);

    return {
      totalParticipants: submissions.length,
      averageScore: marks.reduce((a, b) => a + b, 0) / submissions.length,
      highestScore: Math.max(...marks),
      lowestScore: Math.min(...marks),
      averageTime: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : 0,
      completionRate: 100, // All submissions are completed
    };
  }, [submissions]);

  // Calculate score distribution for histogram
  const scoreDistribution = React.useMemo(() => {
    if (!submissions.length || !test?.totalMarks) return [];

    const totalMarks = test.totalMarks;
    const ranges = [
      { range: "0-20%", min: 0, max: 0.2, count: 0 },
      { range: "20-40%", min: 0.2, max: 0.4, count: 0 },
      { range: "40-60%", min: 0.4, max: 0.6, count: 0 },
      { range: "60-80%", min: 0.6, max: 0.8, count: 0 },
      { range: "80-100%", min: 0.8, max: 1.0, count: 0 },
    ];

    submissions.forEach((s) => {
      const percentage = (s.obtainedMarks || 0) / totalMarks;
      const range = ranges.find((r) => percentage >= r.min && percentage < r.max);
      if (range) range.count++;
      else if (percentage >= 1) ranges[4].count++; // 100%
    });

    return ranges;
  }, [submissions, test]);

  // Calculate question-wise analysis from real data
  const questionAnalysis = React.useMemo((): QuestionAnalysis[] => {
    if (!submissions.length || !test?.sections) return [];

    const questionStats: Record<string, { correct: number; wrong: number; skipped: number; totalTime: number; attempts: number }> = {};

    // Initialize from test structure
    let questionNumber = 0;
    test.sections.forEach((section) => {
      section.subSections?.forEach((subSection) => {
        subSection.questions.forEach((q) => {
          questionNumber++;
          questionStats[q._id] = { correct: 0, wrong: 0, skipped: 0, totalTime: 0, attempts: 0 };
        });
      });
    });

    // Aggregate from submissions
    submissions.forEach((submission) => {
      submission.sections?.forEach((section) => {
        section.subSections?.forEach((subSection) => {
          // Handle both array and object (Record) formats for questions
          const questionsArray = (Array.isArray(subSection.questions)
            ? subSection.questions
            : Object.values(subSection.questions || {})) as Record<string, unknown>[];

          questionsArray.forEach((q) => {
            const qId = (q.id || q._id) as string;
            if (questionStats[qId]) {
              // Check if attempted based on various field names
              const hasSelectedOptions = ((q.selectedOptions as string[] | undefined)?.length ?? 0) > 0;
              const hasEnteredAnswer = q.enteredAnswer !== undefined;
              const isAttempted = q.isAttempted ?? (hasSelectedOptions || hasEnteredAnswer);
              // Check if correct based on marks or isCorrect field
              const isCorrect = q.isCorrect ?? (q.marks as number) > 0;

              if (!isAttempted) {
                questionStats[qId].skipped++;
              } else if (isCorrect) {
                questionStats[qId].correct++;
              } else {
                questionStats[qId].wrong++;
              }
              const timeTaken = (q.timeTaken ?? q.timeTakenInSeconds ?? 0) as number;
              if (timeTaken) {
                questionStats[qId].totalTime += timeTaken;
                questionStats[qId].attempts++;
              }
            }
          });
        });
      });
    });

    // Convert to array
    let qNum = 0;
    const result: QuestionAnalysis[] = [];
    test.sections.forEach((section) => {
      section.subSections?.forEach((subSection) => {
        subSection.questions.forEach((q) => {
          qNum++;
          const stat = questionStats[q._id];
          const total = stat.correct + stat.wrong + stat.skipped;
          result.push({
            questionNumber: qNum,
            questionId: q._id,
            correctAttempts: stat.correct,
            wrongAttempts: stat.wrong,
            skipped: stat.skipped,
            averageTime: stat.attempts > 0 ? Math.round(stat.totalTime / stat.attempts) : 0,
            accuracy: total > 0 ? Math.round((stat.correct / total) * 100) : 0,
          });
        });
      });
    });

    return result;
  }, [submissions, test]);

  // Calculate section-wise analysis from real data
  const sectionAnalysis = React.useMemo((): SectionAnalysis[] => {
    if (!submissions.length || !test?.sections) return [];

    return test.sections.map((section) => {
      const sectionScores: number[] = [];
      let totalQuestions = 0;

      section.subSections?.forEach((subSection) => {
        totalQuestions += subSection.questions.length;
      });

      submissions.forEach((submission) => {
        const submissionSection = submission.sections?.find((s) => s.id === section.id);
        if (submissionSection) {
          const percentage = submissionSection.totalMarks > 0
            ? (submissionSection.obtainedMarks / submissionSection.totalMarks) * 100
            : 0;
          sectionScores.push(percentage);
        }
      });

      return {
        sectionName: section.name,
        totalQuestions,
        averageScore: sectionScores.length > 0
          ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length)
          : 0,
        highestScore: sectionScores.length > 0 ? Math.round(Math.max(...sectionScores)) : 0,
        lowestScore: sectionScores.length > 0 ? Math.round(Math.min(...sectionScores)) : 0,
      };
    });
  }, [submissions, test]);

  // Overall attempt distribution for pie chart
  const attemptDistribution = React.useMemo(() => {
    const totals = questionAnalysis.reduce(
      (acc, q) => ({
        correct: acc.correct + q.correctAttempts,
        wrong: acc.wrong + q.wrongAttempts,
        skipped: acc.skipped + q.skipped,
      }),
      { correct: 0, wrong: 0, skipped: 0 }
    );

    return [
      { name: "Correct", value: totals.correct },
      { name: "Wrong", value: totals.wrong },
      { name: "Skipped", value: totals.skipped },
    ].filter((d) => d.value > 0);
  }, [questionAnalysis]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading analysis...</div>
      </div>
    );
  }

  const hasData = submissions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/tests/${testId}/result`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detailed Analysis</h1>
          <p className="text-muted-foreground">
            {test?.name || "Test"} - In-depth performance breakdown
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highestScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lowest</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowestScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageTime}m</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart2 className="mx-auto mb-2 h-12 w-12" />
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm">Analysis will be available once students submit the test</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of scores across all participants</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attempt Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Attempt Distribution</CardTitle>
                <CardDescription>Breakdown of correct, wrong, and skipped answers</CardDescription>
              </CardHeader>
              <CardContent>
                {attemptDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={attemptDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {attemptDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    No attempt data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="questions">
            <TabsList>
              <TabsTrigger value="questions">Question Analysis</TabsTrigger>
              <TabsTrigger value="sections">Section Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="questions">
              <Card>
                <CardHeader>
                  <CardTitle>Question-wise Analysis</CardTitle>
                  <CardDescription>Performance breakdown for each question</CardDescription>
                </CardHeader>
                <CardContent>
                  {questionAnalysis.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Q#</TableHead>
                            <TableHead className="text-green-600">Correct</TableHead>
                            <TableHead className="text-red-600">Wrong</TableHead>
                            <TableHead>Skipped</TableHead>
                            <TableHead>Avg Time</TableHead>
                            <TableHead>Accuracy</TableHead>
                            <TableHead>Difficulty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {questionAnalysis.map((q) => (
                          <TableRow key={q.questionId}>
                            <TableCell className="font-medium">{q.questionNumber}</TableCell>
                            <TableCell className="text-green-600">{q.correctAttempts}</TableCell>
                            <TableCell className="text-red-600">{q.wrongAttempts}</TableCell>
                            <TableCell className="text-muted-foreground">{q.skipped}</TableCell>
                            <TableCell>
                              {q.averageTime > 0
                                ? `${Math.floor(q.averageTime / 60)}m ${q.averageTime % 60}s`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 rounded-full bg-secondary">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${q.accuracy}%` }}
                                  />
                                </div>
                                <span className="text-sm">{q.accuracy}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  q.accuracy >= 70
                                    ? "default"
                                    : q.accuracy >= 50
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {q.accuracy >= 70 ? "Easy" : q.accuracy >= 50 ? "Medium" : "Hard"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                      No question analysis data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sections">
              <Card>
                <CardHeader>
                  <CardTitle>Section-wise Analysis</CardTitle>
                  <CardDescription>Performance breakdown by section</CardDescription>
                </CardHeader>
                <CardContent>
                  {sectionAnalysis.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>Questions</TableHead>
                          <TableHead>Avg Score</TableHead>
                          <TableHead>Highest</TableHead>
                          <TableHead>Lowest</TableHead>
                          <TableHead>Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionAnalysis.map((section) => (
                          <TableRow key={section.sectionName}>
                            <TableCell className="font-medium">{section.sectionName}</TableCell>
                            <TableCell>{section.totalQuestions}</TableCell>
                            <TableCell>{section.averageScore}%</TableCell>
                            <TableCell className="text-green-600">{section.highestScore}%</TableCell>
                            <TableCell className="text-red-600">{section.lowestScore}%</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 rounded-full bg-secondary">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${section.averageScore}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                      No section analysis data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
