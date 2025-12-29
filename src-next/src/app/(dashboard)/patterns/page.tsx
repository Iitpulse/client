"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Clock,
  X,
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
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { IPattern, IExam } from "@/types";

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = React.useState<IPattern[]>([]);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [examsMap, setExamsMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false);
  const [patternToDelete, setPatternToDelete] = React.useState<IPattern | null>(null);
  const [patternToDuplicate, setPatternToDuplicate] = React.useState<IPattern | null>(null);
  const [duplicateName, setDuplicateName] = React.useState("");

  // Filter and sort states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [examFilter, setExamFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("date-desc");

  const handleRowClick = React.useCallback((pattern: IPattern) => {
    router.push(`/patterns/${pattern._id}/preview`);
  }, [router]);

  const fetchPatterns = React.useCallback(async () => {
    try {
      // Fetch all patterns - DataTable handles client-side pagination
      const [patternsRes, examsRes] = await Promise.all([
        api.patterns.getAllNoPagination(),
        api.exams.getAll(),
      ]);
      // Backend returns { success, data: [...] }
      const patternsData = patternsRes.data?.data || patternsRes.data?.patterns || patternsRes.data || [];
      setPatterns(patternsData);

      // Build exam ID -> name lookup map
      const examsList: IExam[] = examsRes.data?.data || examsRes.data?.exams || examsRes.data || [];
      setExams(examsList);
      const examLookup: Record<string, string> = {};
      examsList.forEach((exam) => {
        if (exam._id) {
          examLookup[exam._id] = exam.name;
        }
      });
      setExamsMap(examLookup);
    } catch (error) {
      console.error("Failed to fetch patterns:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // Filter and sort patterns
  const filteredPatterns = React.useMemo(() => {
    let result = patterns.filter((pattern) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = pattern.name?.toLowerCase().includes(query);
        // Get exam name - could be object, ID string, or name string
        const examName = typeof pattern.exam === "object"
          ? pattern.exam?.name
          : (examsMap[pattern.exam as string] || pattern.exam);
        const examMatch = examName?.toLowerCase().includes(query);
        if (!nameMatch && !examMatch) return false;
      }

      // Exam filter - pattern.exam could be exam ID, exam name, or object
      if (examFilter !== "all") {
        const patternExamId = typeof pattern.exam === "object" ? pattern.exam?._id : pattern.exam;
        const patternExamName = typeof pattern.exam === "object"
          ? pattern.exam?.name
          : (examsMap[pattern.exam as string] || pattern.exam);

        // Match by ID or by name (in case exam is stored as name string)
        const selectedExamName = examsMap[examFilter];
        if (patternExamId !== examFilter && patternExamName !== selectedExamName) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "date-asc":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        default:
          return 0;
      }
    });

    return result;
  }, [patterns, searchQuery, examFilter, sortBy, examsMap]);

  const clearFilters = () => {
    setSearchQuery("");
    setExamFilter("all");
    setSortBy("date-desc");
  };

  const hasActiveFilters = searchQuery || examFilter !== "all" || sortBy !== "date-desc";

  const handleDelete = async () => {
    if (!patternToDelete) return;
    try {
      await api.patterns.delete(patternToDelete._id);
      fetchPatterns();
      setDeleteDialogOpen(false);
      setPatternToDelete(null);
    } catch (error) {
      console.error("Failed to delete pattern:", error);
    }
  };

  const handleDuplicate = async () => {
    if (!patternToDuplicate || !duplicateName) return;
    try {
      await api.patterns.duplicate(patternToDuplicate._id, duplicateName);
      fetchPatterns();
      setDuplicateDialogOpen(false);
      setPatternToDuplicate(null);
      setDuplicateName("");
    } catch (error) {
      console.error("Failed to duplicate pattern:", error);
    }
  };

  const getTotalQuestions = (pattern: IPattern) => {
    return pattern.sections?.reduce((total, section) => {
      return (
        total +
        (section.subSections?.reduce(
          (subTotal, subSection) => subTotal + (subSection.noOfQuestions || 0),
          0
        ) || 0)
      );
    }, 0) || 0;
  };

  const getTotalMarks = (pattern: IPattern) => {
    return pattern.sections?.reduce((total, section) => {
      return (
        total +
        (section.subSections?.reduce(
          (subTotal, subSection) =>
            subTotal +
            (subSection.noOfQuestions || 0) * (subSection.marksPerQuestion || 0),
          0
        ) || 0)
      );
    }, 0) || 0;
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const columns: ColumnDef<IPattern>[] = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "Pattern Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      id: "exam",
      header: "Exam Type",
      cell: ({ row }) => {
        const exam = row.original.exam;
        // Exam can be an object (populated) or a string (ID)
        if (typeof exam === "object" && exam?.name) {
          return exam.name;
        }
        // Look up exam name from examsMap using the exam ID
        if (typeof exam === "string" && exam) {
          const examName = examsMap[exam];
          return examName || "-";
        }
        // No exam assigned
        return "-";
      },
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {formatDuration(row.original.durationInMinutes)}
        </div>
      ),
    },
    {
      id: "sections",
      header: "Sections",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.sections?.length || 0} sections
        </Badge>
      ),
    },
    {
      id: "questions",
      header: "Questions",
      cell: ({ row }) => getTotalQuestions(row.original),
    },
    {
      id: "marks",
      header: "Total Marks",
      cell: ({ row }) => getTotalMarks(row.original),
    },
    {
      id: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.original.createdAt;
        if (!date) return "-";
        try {
          return format(new Date(date), "dd MMM yyyy");
        } catch {
          return "-";
        }
      },
    },
    {
      id: "createdBy",
      header: "Created By",
      cell: ({ row }) => {
        const createdBy = row.original.createdBy;
        if (!createdBy) return "-";
        return (
          <Badge variant="outline" className="uppercase text-xs">
            {createdBy.userType || "-"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const pattern = row.original;

        return (
          <div onClick={(e) => e.stopPropagation()}>
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
                  <Link href={`/patterns/${pattern._id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/patterns/${pattern._id}/preview`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setPatternToDuplicate(pattern);
                    setDuplicateName(`${pattern.name} (Copy)`);
                    setDuplicateDialogOpen(true);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setPatternToDelete(pattern);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [examsMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patterns</h1>
          <p className="text-muted-foreground">
            Manage test patterns and marking schemes
          </p>
        </div>
        <Button asChild>
          <Link href="/patterns/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Pattern
          </Link>
        </Button>
      </div>

      {/* Search, Filters & Sort - Inline */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search patterns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[250px]"
        />

        <Select value={examFilter} onValueChange={setExamFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams.map((exam) => (
              <SelectItem key={exam._id} value={exam._id}>
                {exam.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-muted-foreground">Loading patterns...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredPatterns}
          onRowClick={handleRowClick}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pattern</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{patternToDelete?.name}&quot;?
              This action cannot be undone.
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

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Pattern</DialogTitle>
            <DialogDescription>
              Enter a name for the duplicated pattern
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicateName">Pattern Name</Label>
            <Input
              id="duplicateName"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Enter pattern name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName}>
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
