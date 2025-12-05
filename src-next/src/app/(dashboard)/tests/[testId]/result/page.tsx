"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Download, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

interface StudentResult {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
  };
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  rank: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
}

interface TestResult {
  test: {
    _id: string;
    name: string;
    totalMarks: number;
  };
  results: StudentResult[];
  stats: {
    totalStudents: number;
    attempted: number;
    highestMarks: number;
    lowestMarks: number;
    averageMarks: number;
  };
}

export default function TestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const [result, setResult] = React.useState<TestResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await api.tests.getAdminResult(testId);
        setResult(response.data);
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [testId]);

  const columns: ColumnDef<StudentResult>[] = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => (
        <div className="font-medium">#{row.getValue("rank")}</div>
      ),
    },
    {
      accessorKey: "student.name",
      header: "Student Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.student?.name}</div>
      ),
    },
    {
      accessorKey: "student.email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-muted-foreground">{row.original.student?.email}</div>
      ),
    },
    {
      accessorKey: "obtainedMarks",
      header: "Marks",
      cell: ({ row }) => (
        <div>
          {row.original.obtainedMarks} / {row.original.totalMarks}
        </div>
      ),
    },
    {
      accessorKey: "percentage",
      header: "Percentage",
      cell: ({ row }) => {
        const percentage = row.getValue("percentage") as number;
        return (
          <Badge
            variant={
              percentage >= 75
                ? "success"
                : percentage >= 50
                ? "warning"
                : "destructive"
            }
          >
            {percentage.toFixed(1)}%
          </Badge>
        );
      },
    },
    {
      accessorKey: "correct",
      header: "Correct",
      cell: ({ row }) => (
        <span className="text-green-600">{row.getValue("correct")}</span>
      ),
    },
    {
      accessorKey: "incorrect",
      header: "Incorrect",
      cell: ({ row }) => (
        <span className="text-red-600">{row.getValue("incorrect")}</span>
      ),
    },
    {
      accessorKey: "unattempted",
      header: "Unattempted",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("unattempted")}</span>
      ),
    },
  ];

  const exportToCSV = () => {
    if (!result) return;

    const headers = ["Rank", "Name", "Email", "Obtained Marks", "Total Marks", "Percentage", "Correct", "Incorrect", "Unattempted"];
    const rows = result.results.map((r) => [
      r.rank,
      r.student?.name,
      r.student?.email,
      r.obtainedMarks,
      r.totalMarks,
      r.percentage.toFixed(1),
      r.correct,
      r.incorrect,
      r.unattempted,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.test.name}-results.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">No results found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {result.test.name}
            </h1>
            <p className="text-muted-foreground">Test Results & Analytics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tests/${testId}/analysis`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Detailed Analysis
            </Link>
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Students</CardDescription>
            <CardTitle className="text-2xl">
              {result.stats.totalStudents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attempted</CardDescription>
            <CardTitle className="text-2xl">{result.stats.attempted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Highest Marks</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {result.stats.highestMarks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lowest Marks</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {result.stats.lowestMarks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Marks</CardDescription>
            <CardTitle className="text-2xl">
              {result.stats.averageMarks?.toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
          <CardDescription>
            Individual performance of all students who took this test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={result.results}
            searchKey="student.name"
            searchPlaceholder="Search students..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
