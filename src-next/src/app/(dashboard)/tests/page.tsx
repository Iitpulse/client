"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTestsStore } from "@/stores";
import { ITest, IExam } from "@/types";
import api from "@/lib/api";

type TestStatusDisplay = "Active" | "Inactive" | "Ongoing" | "Upcoming" | "Expired";

const statusVariants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  Active: "success",
  Inactive: "secondary",
  Ongoing: "success",
  Upcoming: "warning",
  Expired: "destructive",
};

// Determine test status based on validity dates
function getTestStatus(test: ITest): TestStatusDisplay {
  if (test.status === "Inactive" || test.status === "inactive") {
    return "Inactive";
  }

  const now = new Date();
  const from = test.validity?.from ? new Date(test.validity.from) : null;
  const to = test.validity?.to ? new Date(test.validity.to) : null;

  if (from && to) {
    if (now < from) {
      return "Upcoming";
    }
    if (now > to) {
      return "Expired";
    }
    return "Ongoing";
  }

  return "Active";
}

export default function TestsPage() {
  const router = useRouter();
  const { tests, setTests, deleteTest } = useTestsStore();
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [testToDelete, setTestToDelete] = React.useState<ITest | null>(null);
  const [activeTab, setActiveTab] = React.useState("active");
  const [selectedExam, setSelectedExam] = React.useState<string>("all");

  const fetchTests = React.useCallback(async (status: string) => {
    setLoading(true);
    try {
      // Fetch based on status - active or inactive from backend
      const backendStatus = status === "inactive" ? "inactive" : "active";
      const response = await api.tests.getByStatus(backendStatus as "active" | "inactive");
      const testsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.tests || []);
      setTests(testsData);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  }, [setTests]);

  React.useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await api.exams.getAll();
        const examsData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || response.data?.exams || []);
        setExams(examsData);
      } catch (error) {
        console.error("Failed to fetch exams:", error);
      }
    };
    fetchExams();
  }, []);

  React.useEffect(() => {
    // Fetch active tests on initial load and when tab changes
    if (activeTab === "inactive") {
      fetchTests("inactive");
    } else {
      fetchTests("active");
    }
  }, [activeTab, fetchTests]);

  const handleDelete = async () => {
    if (!testToDelete) return;
    try {
      await api.tests.delete(testToDelete._id);
      deleteTest(testToDelete._id);
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    } catch (error) {
      console.error("Failed to delete test:", error);
    }
  };

  const columns: ColumnDef<ITest>[] = [
    {
      accessorKey: "_id",
      header: "ID",
      cell: ({ row }) => (
        <span
          className="max-w-[100px] truncate block text-xs text-muted-foreground"
          title={row.getValue("_id")}
        >
          {row.getValue("_id")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const test = row.original;
        return (
          <Link
            href={`/tests/${test._id}/edit`}
            className="font-medium text-primary hover:underline"
          >
            {row.getValue("name")}
          </Link>
        );
      },
    },
    {
      accessorKey: "exam",
      header: "Exam",
      cell: ({ row }) => {
        const exam = row.original.exam;
        if (!exam) return "-";
        return typeof exam === "object" ? exam.name : exam;
      },
      filterFn: (row, id, value) => {
        if (value === "all") return true;
        const exam = row.original.exam;
        const examName = typeof exam === "object" ? exam?.name : exam;
        return examName === value;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        if (!date) return "-";
        return format(new Date(date), "MMM d, yyyy");
      },
    },
    {
      accessorKey: "durationInMinutes",
      header: "Duration (min)",
      cell: ({ row }) => {
        const duration = row.original.durationInMinutes || row.original.duration;
        return duration ? `${duration}` : "-";
      },
    },
    {
      id: "startTime",
      header: "Start Time",
      cell: ({ row }) => {
        const validity = row.original.validity;
        if (!validity?.from) return "-";
        return (
          <div className="text-sm">
            <div>{format(new Date(validity.from), "MMM d, yyyy")}</div>
            <div className="text-muted-foreground text-xs">
              {format(new Date(validity.from), "h:mm a")}
            </div>
          </div>
        );
      },
    },
    {
      id: "endTime",
      header: "End Time",
      cell: ({ row }) => {
        const validity = row.original.validity;
        if (!validity?.to) return "-";
        return (
          <div className="text-sm">
            <div>{format(new Date(validity.to), "MMM d, yyyy")}</div>
            <div className="text-muted-foreground text-xs">
              {format(new Date(validity.to), "h:mm a")}
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = getTestStatus(row.original);
        return (
          <Badge variant={statusVariants[status] || "default"}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const test = row.original;
        const status = getTestStatus(test);
        const resultProps = (test as unknown as { result?: { publishProps?: { type: string; isPublished: boolean } } })?.result?.publishProps;
        const hasResult =
          (test.result?.isPublished ||
            resultProps?.type === "immediately" ||
            resultProps?.isPublished) &&
          status !== "Active" &&
          status !== "Upcoming";

        return (
          <div className="flex items-center gap-2">
            {hasResult ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const examName = typeof test.exam === "object" ? test.exam?.name : test.exam;
                  router.push(`/tests/result/${test.name}/${examName}/${test._id}`);
                }}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                View Result
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">No Result</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTestToDelete(test);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Filter tests based on active tab
  const filteredTests = React.useMemo(() => {
    let filtered = tests;

    // Filter by exam if selected
    if (selectedExam !== "all") {
      filtered = filtered.filter((test) => {
        const examName = typeof test.exam === "object" ? test.exam?.name : test.exam;
        return examName === selectedExam;
      });
    }

    // Filter by status based on tab
    switch (activeTab) {
      case "active":
        // Show all active tests (any status that's not inactive)
        return filtered.filter((t) => t.status !== "Inactive" && t.status !== "inactive");
      case "inactive":
        // Backend already returns inactive tests
        return filtered;
      case "ongoing":
        return filtered.filter((t) => getTestStatus(t) === "Ongoing");
      case "upcoming":
        return filtered.filter((t) => getTestStatus(t) === "Upcoming");
      case "expired":
        return filtered.filter((t) => getTestStatus(t) === "Expired");
      default:
        return filtered;
    }
  }, [tests, activeTab, selectedExam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tests</h1>
          <p className="text-muted-foreground">
            Manage your tests and examinations
          </p>
        </div>
        <Button asChild>
          <Link href="/tests/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map((exam) => (
                <SelectItem key={exam._id} value={exam.name}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="text-muted-foreground">Loading tests...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredTests}
              searchKey="name"
              searchPlaceholder="Search tests..."
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{testToDelete?.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
