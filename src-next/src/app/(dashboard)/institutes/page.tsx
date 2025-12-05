"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
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
import { api } from "@/lib/api";
import { IInstitute } from "@/types";

export default function InstitutesPage() {
  const [institutes, setInstitutes] = React.useState<IInstitute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editingInstitute, setEditingInstitute] = React.useState<IInstitute | null>(null);
  const [instituteToDelete, setInstituteToDelete] = React.useState<IInstitute | null>(null);
  const [instituteName, setInstituteName] = React.useState("");
  const [instituteCode, setInstituteCode] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchInstitutes = React.useCallback(async () => {
    try {
      const response = await api.institutes.getAll();
      setInstitutes(response.data?.institutes || []);
    } catch (error) {
      console.error("Failed to fetch institutes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInstitutes();
  }, [fetchInstitutes]);

  const handleSave = async () => {
    if (!instituteName.trim()) return;
    setSaving(true);
    try {
      if (editingInstitute) {
        await api.institutes.update(editingInstitute._id, {
          name: instituteName,
          code: instituteCode,
        });
      } else {
        await api.institutes.create({
          name: instituteName,
          code: instituteCode,
        });
      }
      fetchInstitutes();
      setDialogOpen(false);
      setEditingInstitute(null);
      setInstituteName("");
      setInstituteCode("");
    } catch (error) {
      console.error("Failed to save institute:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!instituteToDelete) return;
    try {
      await api.institutes.delete(instituteToDelete._id);
      fetchInstitutes();
      setDeleteDialogOpen(false);
      setInstituteToDelete(null);
    } catch (error) {
      console.error("Failed to delete institute:", error);
    }
  };

  const openEditDialog = (institute: IInstitute) => {
    setEditingInstitute(institute);
    setInstituteName(institute.name);
    setInstituteCode(institute.code || "");
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingInstitute(null);
    setInstituteName("");
    setInstituteCode("");
    setDialogOpen(true);
  };

  const columns: ColumnDef<IInstitute>[] = [
    {
      accessorKey: "name",
      header: "Institute Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => row.getValue("code") || "-",
    },
    {
      id: "batches",
      header: "Batches",
      cell: ({ row }) => {
        const batchCount = row.original.batches?.length || 0;
        return (
          <span>
            {batchCount} batch{batchCount !== 1 ? "es" : ""}
          </span>
        );
      },
    },
    {
      id: "students",
      header: "Students",
      cell: ({ row }) => {
        const studentCount = row.original.students?.length || 0;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {studentCount} student{studentCount !== 1 ? "s" : ""}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const institute = row.original;

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
              <DropdownMenuItem onClick={() => openEditDialog(institute)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setInstituteToDelete(institute);
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
          <h1 className="text-3xl font-bold tracking-tight">Institutes</h1>
          <p className="text-muted-foreground">
            Manage institutes and coaching centers
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Institute
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-muted-foreground">Loading institutes...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={institutes}
          searchKey="name"
          searchPlaceholder="Search institutes..."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstitute ? "Edit Institute" : "Add Institute"}
            </DialogTitle>
            <DialogDescription>
              {editingInstitute
                ? "Update the institute details"
                : "Enter details for the new institute"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instituteName">Institute Name</Label>
              <Input
                id="instituteName"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                placeholder="Enter institute name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instituteCode">Institute Code (optional)</Label>
              <Input
                id="instituteCode"
                value={instituteCode}
                onChange={(e) => setInstituteCode(e.target.value)}
                placeholder="Enter institute code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !instituteName.trim()}
            >
              {saving ? "Saving..." : editingInstitute ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Institute</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{instituteToDelete?.name}&quot;?
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
    </div>
  );
}
