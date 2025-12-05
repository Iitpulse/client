"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { IBatch } from "@/types";

export default function BatchesPage() {
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<IBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = React.useState<IBatch | null>(null);
  const [batchName, setBatchName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchBatches = React.useCallback(async () => {
    try {
      const response = await api.batches.getAll();
      setBatches(response.data?.batches || []);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleSave = async () => {
    if (!batchName.trim()) return;
    setSaving(true);
    try {
      if (editingBatch) {
        await api.batches.update(editingBatch._id, { name: batchName });
      } else {
        await api.batches.create({ name: batchName });
      }
      fetchBatches();
      setDialogOpen(false);
      setEditingBatch(null);
      setBatchName("");
    } catch (error) {
      console.error("Failed to save batch:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!batchToDelete) return;
    try {
      await api.batches.delete(batchToDelete._id);
      fetchBatches();
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
    } catch (error) {
      console.error("Failed to delete batch:", error);
    }
  };

  const openEditDialog = (batch: IBatch) => {
    setEditingBatch(batch);
    setBatchName(batch.name);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBatch(null);
    setBatchName("");
    setDialogOpen(true);
  };

  const columns: ColumnDef<IBatch>[] = [
    {
      accessorKey: "name",
      header: "Batch Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "institute",
      header: "Institute",
      cell: ({ row }) => {
        const institute = row.original.institute;
        if (!institute) return "-";
        return typeof institute === "object" ? institute.name : institute;
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
        const batch = row.original;

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
              <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setBatchToDelete(batch);
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
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            Manage student batches
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Batch
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-muted-foreground">Loading batches...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={batches}
          searchKey="name"
          searchPlaceholder="Search batches..."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBatch ? "Edit Batch" : "Create Batch"}
            </DialogTitle>
            <DialogDescription>
              {editingBatch
                ? "Update the batch name"
                : "Enter a name for the new batch"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="batchName">Batch Name</Label>
            <Input
              id="batchName"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Enter batch name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !batchName.trim()}>
              {saving ? "Saving..." : editingBatch ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{batchToDelete?.name}&quot;?
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
