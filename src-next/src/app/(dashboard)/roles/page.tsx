"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Users, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissionsStore } from "@/stores";

// Role type for display (matches backend)
interface IRoleDisplay {
  id: string;
  _id?: string;
  name: string;
  permissions: string[];
  members: Array<{ id: string; userType: string }>;
  createdAt?: string;
}

export default function RolesPage() {
  const router = useRouter();
  const { allRoles, fetchRoles, deleteRole } = usePermissionsStore();
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [roleToDelete, setRoleToDelete] = React.useState<IRoleDisplay | null>(
    null
  );
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const loadRoles = async () => {
      try {
        await fetchRoles();
      } catch (error) {
        console.error("Failed to fetch roles:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRoles();
  }, [fetchRoles]);

  const handleDelete = async () => {
    if (!roleToDelete) return;
    const roleId = roleToDelete.id || roleToDelete._id;
    if (!roleId) return;

    setDeleting(true);
    try {
      await deleteRole(roleId);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error("Failed to delete role:", error);
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<IRoleDisplay>[] = [
    {
      accessorKey: "name",
      header: "Role Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      id: "permissions",
      header: "Permissions",
      cell: ({ row }) => {
        const count = row.original.permissions?.length || 0;
        return (
          <Badge variant="secondary">
            {count} permission{count !== 1 ? "s" : ""}
          </Badge>
        );
      },
    },
    {
      id: "members",
      header: "Members",
      cell: ({ row }) => {
        const memberCount = row.original.members?.length || 0;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const role = row.original;

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setRoleToDelete(role);
              setDeleteDialogOpen(true);
            }}
            title="Delete role"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
        <Button asChild>
          <Link href="/roles/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-muted-foreground">Loading roles...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={allRoles}
          searchKey="name"
          searchPlaceholder="Search roles..."
          onRowClick={(role) => router.push(`/roles/${role.name}`)}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{roleToDelete?.name}&quot;?
              All members will lose their permissions. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
