"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { IPattern } from "@/types";

export default function PatternsPage() {
  const [patterns, setPatterns] = React.useState<IPattern[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false);
  const [patternToDelete, setPatternToDelete] = React.useState<IPattern | null>(null);
  const [patternToDuplicate, setPatternToDuplicate] = React.useState<IPattern | null>(null);
  const [duplicateName, setDuplicateName] = React.useState("");

  const fetchPatterns = React.useCallback(async () => {
    try {
      const response = await api.patterns.getAll();
      setPatterns(response.data?.patterns || []);
    } catch (error) {
      console.error("Failed to fetch patterns:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

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

  const columns: ColumnDef<IPattern>[] = [
    {
      accessorKey: "name",
      header: "Pattern Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "exam",
      header: "Exam",
      cell: ({ row }) => {
        const exam = row.original.exam;
        return typeof exam === "object" ? exam?.name : "-";
      },
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
      id: "actions",
      cell: ({ row }) => {
        const pattern = row.original;

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
        );
      },
    },
  ];

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

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-muted-foreground">Loading patterns...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={patterns}
          searchKey="name"
          searchPlaceholder="Search patterns..."
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
