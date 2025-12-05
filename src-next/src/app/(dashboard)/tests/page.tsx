"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTestsStore } from "@/stores";
import { ITest } from "@/types";
import { api } from "@/lib/api";

const statusVariants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  scheduled: "warning",
  ongoing: "success",
  completed: "default",
  expired: "destructive",
};

export default function TestsPage() {
  const { tests, setTests, deleteTest } = useTestsStore();
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [testToDelete, setTestToDelete] = React.useState<ITest | null>(null);
  const [activeTab, setActiveTab] = React.useState("all");

  React.useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await api.tests.getAll();
        setTests(response.data?.tests || []);
      } catch (error) {
        console.error("Failed to fetch tests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [setTests]);

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

  const handlePublish = async (test: ITest) => {
    try {
      await api.tests.publish(test._id);
      const response = await api.tests.getAll();
      setTests(response.data?.tests || []);
    } catch (error) {
      console.error("Failed to publish test:", error);
    }
  };

  const columns: ColumnDef<ITest>[] = [
    {
      accessorKey: "name",
      header: "Test Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "pattern",
      header: "Pattern",
      cell: ({ row }) => {
        const pattern = row.original.pattern;
        return typeof pattern === "object" ? pattern?.name : "-";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={statusVariants[status] || "default"}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "validity",
      header: "Schedule",
      cell: ({ row }) => {
        const validity = row.original.validity;
        if (!validity?.from) return "-";
        return (
          <div className="text-sm">
            <div>{format(new Date(validity.from), "MMM d, yyyy")}</div>
            <div className="text-muted-foreground">
              {format(new Date(validity.from), "h:mm a")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number;
        return duration ? `${duration} min` : "-";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const test = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/tests/${test._id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/tests/${test._id}/preview`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </DropdownMenuItem>
              {test.status === "draft" && (
                <DropdownMenuItem onClick={() => handlePublish(test)}>
                  <Send className="mr-2 h-4 w-4" />
                  Publish
                </DropdownMenuItem>
              )}
              {(test.status === "completed" || test.status === "expired") && (
                <DropdownMenuItem asChild>
                  <Link href={`/tests/${test._id}/result`}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Results
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setTestToDelete(test);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const filteredTests = React.useMemo(() => {
    if (activeTab === "all") return tests;
    return tests.filter((test) => test.status === activeTab);
  }, [tests, activeTab]);

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
            Create Test
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
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
