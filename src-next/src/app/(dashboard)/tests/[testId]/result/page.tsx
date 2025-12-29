"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Download, BarChart3, Eye } from "lucide-react";

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

interface Submission {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  studentBatch?: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  submittedAt: string;
  timeTaken?: number;
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

interface TestData {
  _id: string;
  name: string;
  totalMarks: number;
  durationInMinutes?: number;
}

interface TestResultData {
  test: TestData;
  submissions: Submission[];
  result?: {
    highestMarks?: number;
    lowestMarks?: number;
    averageMarks?: number;
    totalAppeared?: number;
  };
}

export default function TestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const [resultData, setResultData] = React.useState<TestResultData | null>(null);
  const [studentMap, setStudentMap] = React.useState<Map<string, StudentInfo>>(new Map());
  const [batchMap, setBatchMap] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch results, students, and batches in parallel
        const [resultResponse, studentsResponse, batchesResponse] = await Promise.all([
          api.tests.getAdminResult(testId),
          api.users.getStudents(),
          api.batches.getAll(),
        ]);

        // Handle both {success, data} and direct response formats
        const data = resultResponse.data?.data || resultResponse.data;
        setResultData(data);

        // Build student map
        const students = studentsResponse.data?.data || studentsResponse.data || [];
        const sMap = new Map<string, StudentInfo>();
        (students as StudentInfo[]).forEach((s) => {
          const id = s.id || s._id;
          if (id) sMap.set(id, s);
        });
        setStudentMap(sMap);

        // Build batch map (id -> name)
        const batches = batchesResponse.data?.data || batchesResponse.data || [];
        const bMap = new Map<string, string>();
        (batches as BatchInfo[]).forEach((b) => {
          const id = b.id || b._id;
          if (id) bMap.set(id, b.name);
        });
        setBatchMap(bMap);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testId]);

  // Normalize submission data to handle both old and new field names
  const normalizedSubmissions = React.useMemo(() => {
    if (!resultData?.submissions?.length) return [];

    return resultData.submissions.map((s) => {
      // Handle both old format (totalMarks = obtained) and new format (obtainedMarks)
      const rawSubmission = s as unknown as Record<string, unknown>;
      const obtained = (s.obtainedMarks ?? rawSubmission.totalMarks ?? 0) as number;
      const timeTaken = (s.timeTaken ?? rawSubmission.totalTimeTakenInSeconds ?? 0) as number;
      const maxMarks = resultData.test?.totalMarks || 1;

      // Look up student info
      const studentId = s.studentId || s.id;
      const studentInfo = studentMap.get(studentId);
      const studentName = s.studentName || studentInfo?.name || studentId;
      const studentEmail = s.studentEmail || studentInfo?.email;
      const batchId = studentInfo?.batch;
      const studentBatch = batchId ? batchMap.get(batchId) : undefined;

      return {
        ...s,
        obtainedMarks: obtained,
        timeTaken,
        percentage: (obtained / maxMarks) * 100,
        studentName,
        studentEmail,
        studentBatch,
      };
    });
  }, [resultData, studentMap, batchMap]);

  // Compute stats from submissions
  const stats = React.useMemo(() => {
    if (!normalizedSubmissions.length) {
      return {
        totalStudents: 0,
        attempted: 0,
        highestMarks: resultData?.result?.highestMarks || 0,
        lowestMarks: resultData?.result?.lowestMarks || 0,
        averageMarks: resultData?.result?.averageMarks || 0,
      };
    }

    const marks = normalizedSubmissions.map((s) => s.obtainedMarks);

    return {
      totalStudents: resultData?.result?.totalAppeared || normalizedSubmissions.length,
      attempted: normalizedSubmissions.length,
      highestMarks: resultData?.result?.highestMarks || Math.max(...marks),
      lowestMarks: resultData?.result?.lowestMarks || Math.min(...marks),
      averageMarks: resultData?.result?.averageMarks || marks.reduce((a, b) => a + b, 0) / marks.length,
    };
  }, [normalizedSubmissions, resultData]);

  // Transform submissions into ranked results
  const rankedResults = React.useMemo(() => {
    if (!normalizedSubmissions.length) return [];

    return normalizedSubmissions
      .sort((a, b) => b.obtainedMarks - a.obtainedMarks)
      .map((s, index) => ({
        ...s,
        rank: index + 1,
      }));
  }, [normalizedSubmissions]);

  type RankedSubmission = Submission & { rank: number };

  const columns: ColumnDef<RankedSubmission>[] = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => (
        <div className="font-medium">#{row.getValue("rank")}</div>
      ),
    },
    {
      accessorKey: "studentName",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.studentName}</div>
          {row.original.studentEmail && (
            <div className="text-sm text-muted-foreground">{row.original.studentEmail}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "studentBatch",
      header: "Batch",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.original.studentBatch || "-"}
        </div>
      ),
    },
    {
      accessorKey: "obtainedMarks",
      header: "Marks",
      cell: ({ row }) => (
        <div>
          {row.original.obtainedMarks} / {resultData?.test?.totalMarks || "-"}
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
            {percentage?.toFixed(1) || "0"}%
          </Badge>
        );
      },
    },
    {
      accessorKey: "timeTaken",
      header: "Time Taken",
      cell: ({ row }) => {
        const timeTaken = row.original.timeTaken;
        if (!timeTaken) return "-";
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        return `${minutes}m ${seconds}s`;
      },
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => {
        const date = row.original.submittedAt;
        if (!date) return "-";
        return new Date(date).toLocaleString();
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const studentId = row.original.studentId || row.original.id;
        return (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/tests/${testId}/student/${studentId}`}>
              <Eye className="mr-1 h-4 w-4" />
              View
            </Link>
          </Button>
        );
      },
    },
  ];

  const exportToCSV = () => {
    if (!resultData || !rankedResults.length) return;

    const headers = ["Rank", "Student ID", "Name", "Email", "Batch", "Obtained Marks", "Total Marks", "Percentage", "Time Taken (sec)", "Submitted At"];
    const rows = rankedResults.map((r) => [
      r.rank,
      r.studentId || r.id,
      r.studentName || "",
      r.studentEmail || "",
      r.studentBatch || "",
      r.obtainedMarks,
      resultData.test?.totalMarks || "",
      r.percentage?.toFixed(1) || "0",
      r.timeTaken || "",
      r.submittedAt || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resultData.test?.name || "test"}-results.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  if (!resultData?.test) {
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
              {resultData.test.name}
            </h1>
            <p className="text-muted-foreground">Test Results & Analytics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tests/${testId}/detailed-analysis`}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Detailed Analysis
            </Link>
          </Button>
          <Button onClick={exportToCSV} disabled={!rankedResults.length}>
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
              {stats.totalStudents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attempted</CardDescription>
            <CardTitle className="text-2xl">{stats.attempted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Highest Marks</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {stats.highestMarks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lowest Marks</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {stats.lowestMarks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Marks</CardDescription>
            <CardTitle className="text-2xl">
              {stats.averageMarks?.toFixed(1) || "0"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
          <CardDescription>
            {rankedResults.length > 0
              ? `Individual performance of ${rankedResults.length} students who took this test`
              : "No submissions yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rankedResults.length > 0 ? (
            <DataTable
              columns={columns}
              data={rankedResults}
              searchKey="studentName"
              searchPlaceholder="Search students..."
            />
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No students have submitted this test yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
