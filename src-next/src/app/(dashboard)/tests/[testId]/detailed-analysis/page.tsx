"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart2, Users, Clock, Target, TrendingUp } from "lucide-react";

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
import { ITest } from "@/types";

interface QuestionAnalysis {
  questionId: string;
  questionNumber: number;
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

export default function DetailedAnalysisPage() {
  const params = useParams();
  const testId = params.testId as string;

  const [test, setTest] = React.useState<ITest | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [questionAnalysis, setQuestionAnalysis] = React.useState<QuestionAnalysis[]>([]);
  const [sectionAnalysis, setSectionAnalysis] = React.useState<SectionAnalysis[]>([]);
  const [stats, setStats] = React.useState({
    totalParticipants: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    averageTime: 0,
    completionRate: 0,
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [testRes, resultsRes] = await Promise.all([
          api.tests.getById(testId),
          api.tests.getAdminResult(testId),
        ]);

        setTest(testRes.data?.test);

        // Mock analysis data - in production this would come from the API
        const results = resultsRes.data?.results || [];
        const totalParticipants = results.length;

        // Calculate stats
        if (totalParticipants > 0) {
          const scores = results.map((r: { score?: number; marks?: number }) => r.score || r.marks || 0);
          setStats({
            totalParticipants,
            averageScore: scores.reduce((a: number, b: number) => a + b, 0) / totalParticipants,
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            averageTime: 85, // Mock average time in minutes
            completionRate: 92, // Mock completion rate
          });
        }

        // Mock question-wise analysis
        const mockQuestionAnalysis: QuestionAnalysis[] = Array.from(
          { length: 10 },
          (_, i) => ({
            questionId: `q${i + 1}`,
            questionNumber: i + 1,
            correctAttempts: Math.floor(Math.random() * 80) + 20,
            wrongAttempts: Math.floor(Math.random() * 30),
            skipped: Math.floor(Math.random() * 20),
            averageTime: Math.floor(Math.random() * 180) + 60,
            accuracy: Math.floor(Math.random() * 40) + 60,
          })
        );
        setQuestionAnalysis(mockQuestionAnalysis);

        // Mock section analysis
        const mockSectionAnalysis: SectionAnalysis[] = [
          {
            sectionName: "Physics",
            totalQuestions: 30,
            averageScore: 72,
            highestScore: 100,
            lowestScore: 24,
          },
          {
            sectionName: "Chemistry",
            totalQuestions: 30,
            averageScore: 68,
            highestScore: 96,
            lowestScore: 20,
          },
          {
            sectionName: "Mathematics",
            totalQuestions: 30,
            averageScore: 65,
            highestScore: 92,
            lowestScore: 16,
          },
        ];
        setSectionAnalysis(mockSectionAnalysis);
      } catch (error) {
        console.error("Failed to fetch analysis:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testId]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading analysis...</div>
      </div>
    );
  }

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

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Question Analysis</TabsTrigger>
          <TabsTrigger value="sections">Section Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Question-wise Analysis</CardTitle>
              <CardDescription>
                Performance breakdown for each question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Q#</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Wrong</TableHead>
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
                      <TableCell className="text-green-600">
                        {q.correctAttempts}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {q.wrongAttempts}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {q.skipped}
                      </TableCell>
                      <TableCell>{Math.floor(q.averageTime / 60)}m {q.averageTime % 60}s</TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle>Section-wise Analysis</CardTitle>
              <CardDescription>
                Performance breakdown by section
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableCell className="font-medium">
                        {section.sectionName}
                      </TableCell>
                      <TableCell>{section.totalQuestions}</TableCell>
                      <TableCell>{section.averageScore}%</TableCell>
                      <TableCell className="text-green-600">
                        {section.highestScore}%
                      </TableCell>
                      <TableCell className="text-red-600">
                        {section.lowestScore}%
                      </TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Distribution Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>
            Distribution of scores across all participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
            <div className="text-center text-muted-foreground">
              <BarChart2 className="mx-auto mb-2 h-12 w-12" />
              <p>Score distribution chart</p>
              <p className="text-sm">
                (Integrate Chart.js or Recharts here)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
