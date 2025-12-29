"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus, Trash2, BarChart3, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
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
  // Check for inactive status (case-insensitive)
  const statusLower = test.status?.toLowerCase();
  if (statusLower === "inactive") {
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

  // If no validity dates, check if status is explicitly "Active"
  if (statusLower === "active") {
    return "Active";
  }

  // Default to Active for tests without validity dates
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
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchTests = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all tests - status filtering is done client-side based on validity dates
      const response = await api.tests.getAll();
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
    // Fetch all tests once - filtering is done client-side
    fetchTests();
  }, [fetchTests]);

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
          className="max-w-[80px] truncate block text-xs text-muted-foreground"
          title={row.getValue("_id")}
        >
          {(row.getValue("_id") as string)?.slice(-8)}
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
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.original.durationInMinutes || row.original.duration;
        return duration ? `${duration} min` : "-";
      },
    },
    {
      id: "startTime",
      header: "Start Time",
      cell: ({ row }) => {
        const validity = row.original.validity;
        if (!validity?.from) return "-";
        return (
          <div className="text-sm whitespace-nowrap">
            {format(new Date(validity.from), "MMM d, h:mm a")}
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
          <div className="text-sm whitespace-nowrap">
            {format(new Date(validity.to), "MMM d, h:mm a")}
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
      header: "",
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/tests/${test._id}/edit`);
              }}
              title="Edit test"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {hasResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/tests/${test._id}/result`);
                }}
                title="View results"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setTestToDelete(test);
                setDeleteDialogOpen(true);
              }}
              title="Delete test"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Filter tests based on active tab and search
  const filteredTests = React.useMemo(() => {
    let filtered = tests;

    // Filter by exam if selected
    if (selectedExam !== "all") {
      filtered = filtered.filter((test) => {
        const examName = typeof test.exam === "object" ? test.exam?.name : test.exam;
        return examName === selectedExam;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((test) =>
        test.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status based on tab
    // Note: getTestStatus computes status from validity dates
    switch (activeTab) {
      case "active":
        // Show only Active and Ongoing tests (not expired, not upcoming, not inactive)
        return filtered.filter((t) => {
          const status = getTestStatus(t);
          return status === "Active" || status === "Ongoing";
        });
      case "inactive":
        return filtered.filter((t) => getTestStatus(t) === "Inactive");
      case "ongoing":
        return filtered.filter((t) => getTestStatus(t) === "Ongoing");
      case "upcoming":
        return filtered.filter((t) => getTestStatus(t) === "Upcoming");
      case "expired":
        return filtered.filter((t) => getTestStatus(t) === "Expired");
      default:
        return filtered;
    }
  }, [tests, activeTab, selectedExam, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Inline Controls: Exam Filter, Tabs, Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Exams" />
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[200px]"
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center border rounded-lg">
          <div className="text-muted-foreground">Loading tests...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredTests}
          searchKey="name"
          searchPlaceholder=""
          onRowClick={(test) => router.push(`/tests/${test._id}/edit`)}
        />
      )}

      {/* Delete Dialog */}
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
