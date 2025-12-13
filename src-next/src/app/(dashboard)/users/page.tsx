"use client";

import * as React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  FileUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useUsersStore } from "@/stores";
import { api } from "@/lib/api";
import { IStudent, ITeacher, IAdmin, IOperator, IManager } from "@/types";

type UserType = IStudent | ITeacher | IAdmin | IOperator | IManager;

export default function UsersPage() {
  const { students, teachers, admins, operators, managers, setUsers } = useUsersStore();
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserType | null>(null);
  const [activeTab, setActiveTab] = React.useState("students");

  const fetchUsers = React.useCallback(async (type: string) => {
    setLoading(true);
    try {
      let response;
      switch (type) {
        case "students":
          response = await api.users.getStudents();
          // Backend returns { success, data: [...] }
          setUsers("students", response.data?.data || response.data?.students || []);
          break;
        case "teachers":
          response = await api.users.getTeachers();
          setUsers("teachers", response.data?.data || response.data?.teachers || []);
          break;
        case "admins":
          response = await api.users.getAdmins();
          setUsers("admins", response.data?.data || response.data?.admins || []);
          break;
        case "operators":
          response = await api.users.getOperators();
          setUsers("operators", response.data?.data || response.data?.operators || []);
          break;
        case "managers":
          response = await api.users.getManagers();
          setUsers("managers", response.data?.data || response.data?.managers || []);
          break;
      }
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
    } finally {
      setLoading(false);
    }
  }, [setUsers]);

  React.useEffect(() => {
    fetchUsers(activeTab);
  }, [activeTab, fetchUsers]);

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.users.deleteStudent(userToDelete._id);
      fetchUsers(activeTab);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "students":
        return students;
      case "teachers":
        return teachers;
      case "admins":
        return admins;
      case "operators":
        return operators;
      case "managers":
        return managers;
      default:
        return [];
    }
  };

  const columns: ColumnDef<UserType>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.getValue("phone") || "-",
    },
    {
      accessorKey: "batch",
      header: "Batch",
      cell: ({ row }) => {
        const batch = (row.original as IStudent).batch;
        if (!batch) return "-";
        return typeof batch === "object" ? batch.name : batch;
      },
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
      accessorKey: "userType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {(row.getValue("userType") as string)?.charAt(0).toUpperCase() +
            (row.getValue("userType") as string)?.slice(1)}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;

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
                <Link href={`/users/${user._id}/edit?type=${activeTab}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setUserToDelete(user);
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
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage students, teachers, and staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/users/bulk-upload">
              <FileUp className="mr-2 h-4 w-4" />
              Bulk Upload
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/users/new?type=${activeTab}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="operators">Operators</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="text-muted-foreground">Loading users...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={getCurrentData()}
              searchKey="name"
              searchPlaceholder="Search users..."
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{userToDelete?.name}&quot;?
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
