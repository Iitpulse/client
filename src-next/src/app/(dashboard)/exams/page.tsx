"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { IExam } from "@/types";

interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export default function ExamsPage() {
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationInfo>({
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedExam, setSelectedExam] = React.useState<IExam | null>(null);
  const [examName, setExamName] = React.useState("");
  const [examFullName, setExamFullName] = React.useState("");
  const [examDescription, setExamDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchExams = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.exams.getAll({
        page: pagination.page,
        size: pagination.size,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setExams(response.data?.data || []);
      if (response.data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size]);

  React.useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleCreate = () => {
    setSelectedExam(null);
    setExamName("");
    setExamFullName("");
    setExamDescription("");
    setDialogOpen(true);
  };

  const handleEdit = (exam: IExam) => {
    setSelectedExam(exam);
    setExamName(exam.name);
    setExamFullName(exam.fullName || "");
    setExamDescription(exam.description || "");
    setDialogOpen(true);
  };

  const handleDelete = (exam: IExam) => {
    setSelectedExam(exam);
    setDeleteDialogOpen(true);
  };

  const handleRestore = async (exam: IExam) => {
    try {
      await api.exams.restore(exam._id);
      await fetchExams();
    } catch (error) {
      console.error("Failed to restore exam:", error);
    }
  };

  const handleSave = async () => {
    if (!examName.trim()) return;

    setSaving(true);
    try {
      if (selectedExam) {
        await api.exams.update({
          id: selectedExam._id,
          name: examName,
          fullName: examFullName || examName,
          description: examDescription,
        });
      } else {
        await api.exams.create({
          name: examName,
          fullName: examFullName || examName,
          description: examDescription,
        });
      }
      await fetchExams();
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save exam:", error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedExam) return;
    await api.exams.delete(selectedExam._id);
    await fetchExams();
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: string) => {
    setPagination((prev) => ({ ...prev, size: parseInt(newSize, 10), page: 1 }));
  };

  // Client-side search filter (for current page results)
  const filteredExams = exams.filter((exam) =>
    exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (exam.fullName && exam.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Types</h1>
          <p className="text-muted-foreground">
            Manage exam types for your tests and patterns
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Exam Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Exam Types</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exams..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            Showing {filteredExams.length} of {pagination.total} exam types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No exam types found
            </div>
          ) : (
            <>
              <Table containerClassName="max-h-[calc(100vh-400px)] min-h-[300px]">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow key={exam._id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {exam.fullName || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {exam.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={exam.isDeleted ? "destructive" : "default"}>
                          {exam.isDeleted ? "Deleted" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {exam.isDeleted ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(exam)}
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(exam)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(exam)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select
                    value={pagination.size.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedExam ? "Edit Exam Type" : "Create Exam Type"}
            </DialogTitle>
            <DialogDescription>
              {selectedExam
                ? "Update the exam type details"
                : "Add a new exam type to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Short Name *</Label>
              <Input
                id="name"
                placeholder="e.g., JEE, NEET, CAT"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="e.g., Joint Entrance Examination"
                value={examFullName}
                onChange={(e) => setExamFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of the exam"
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !examName.trim()}>
              {saving ? "Saving..." : selectedExam ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setSelectedExam(null);
        }}
        title="Delete Exam Type"
        description="Are you sure you want to delete this exam type? This action cannot be undone and may affect existing patterns and tests."
        itemName={selectedExam?.name}
        onConfirm={confirmDelete}
        requirePassword={true}
      />
    </div>
  );
}
