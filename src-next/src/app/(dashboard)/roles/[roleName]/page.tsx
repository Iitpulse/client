"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, UserMinus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";
import { IRole, PERMISSIONS } from "@/types";

const permissionGroups = [
  {
    name: "Questions",
    permissions: [
      { key: PERMISSIONS.QUESTION.CREATE, label: "Create" },
      { key: PERMISSIONS.QUESTION.READ, label: "Read Own" },
      { key: PERMISSIONS.QUESTION.READ_GLOBAL, label: "Read All" },
      { key: PERMISSIONS.QUESTION.UPDATE, label: "Update" },
      { key: PERMISSIONS.QUESTION.DELETE, label: "Delete" },
    ],
  },
  {
    name: "Tests",
    permissions: [
      { key: PERMISSIONS.TEST.CREATE, label: "Create" },
      { key: PERMISSIONS.TEST.READ, label: "Read Own" },
      { key: PERMISSIONS.TEST.READ_GLOBAL, label: "Read All" },
      { key: PERMISSIONS.TEST.UPDATE, label: "Update" },
      { key: PERMISSIONS.TEST.DELETE, label: "Delete" },
      { key: PERMISSIONS.TEST.VIEW_RESULT, label: "View Results" },
      { key: PERMISSIONS.TEST.PUBLISH_RESULT, label: "Publish Results" },
    ],
  },
  {
    name: "Users",
    permissions: [
      { key: PERMISSIONS.USER.READ, label: "Read" },
      { key: PERMISSIONS.USER.UPDATE, label: "Update" },
      { key: PERMISSIONS.USER.DELETE, label: "Delete" },
    ],
  },
  {
    name: "Patterns",
    permissions: [
      { key: PERMISSIONS.PATTERN.CREATE, label: "Create" },
      { key: PERMISSIONS.PATTERN.READ, label: "Read" },
      { key: PERMISSIONS.PATTERN.UPDATE, label: "Update" },
      { key: PERMISSIONS.PATTERN.DELETE, label: "Delete" },
    ],
  },
  {
    name: "Batches",
    permissions: [
      { key: PERMISSIONS.BATCH.CREATE, label: "Create" },
      { key: PERMISSIONS.BATCH.READ, label: "Read" },
      { key: PERMISSIONS.BATCH.UPDATE, label: "Update" },
      { key: PERMISSIONS.BATCH.DELETE, label: "Delete" },
    ],
  },
  {
    name: "Subjects",
    permissions: [
      { key: PERMISSIONS.SUBJECT.CREATE, label: "Create" },
      { key: PERMISSIONS.SUBJECT.READ, label: "Read" },
      { key: PERMISSIONS.SUBJECT.MANAGE_CHAPTER, label: "Chapters" },
      { key: PERMISSIONS.SUBJECT.MANAGE_TOPIC, label: "Topics" },
    ],
  },
];

interface Member {
  _id: string;
  name: string;
  email: string;
  userType: string;
}

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleName = decodeURIComponent(params.roleName as string);

  const [role, setRole] = React.useState<IRole | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [allUsers, setAllUsers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesRes = await api.roles.getAll();
        const roles: IRole[] = rolesRes.data?.roles || [];
        const foundRole = roles.find((r) => r.name === roleName);

        if (foundRole) {
          setRole(foundRole);
          setPermissions(foundRole.permissions || {});

          // Fetch member details
          if (foundRole.members && foundRole.members.length > 0) {
            // In a real app, you'd fetch member details
            // For now, we'll just show the IDs
            setMembers(
              foundRole.members.map((id) => ({
                _id: id,
                name: `User ${id.slice(-4)}`,
                email: `user${id.slice(-4)}@example.com`,
                userType: "user",
              }))
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch role:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roleName]);

  const fetchUsers = async () => {
    try {
      const [students, teachers, admins] = await Promise.all([
        api.users.getStudents(),
        api.users.getTeachers(),
        api.users.getAdmins(),
      ]);

      const users = [
        ...(students.data?.students || []),
        ...(teachers.data?.teachers || []),
        ...(admins.data?.admins || []),
      ];
      setAllUsers(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const savePermissions = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await api.roles.update(role._id, { permissions });
    } catch (error) {
      console.error("Failed to save permissions:", error);
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!role) return;
    try {
      await api.roles.addMember(role._id, userId);
      const user = allUsers.find((u) => u._id === userId);
      if (user) {
        setMembers((prev) => [...prev, user]);
      }
      setAddMemberDialogOpen(false);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const removeMember = async (userId: string) => {
    if (!role) return;
    try {
      await api.roles.removeMember(role._id, userId);
      setMembers((prev) => prev.filter((m) => m._id !== userId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const filteredUsers = allUsers.filter(
    (user) =>
      !members.some((m) => m._id === user._id) &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading role...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Role not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{role.name}</h1>
          <p className="text-muted-foreground">
            Manage permissions and members
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Permissions</CardTitle>
                <Button onClick={savePermissions} disabled={saving}>
                  {saving ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {permissionGroups.map((group) => (
                  <div key={group.name} className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold">{group.name}</h3>
                    <div className="space-y-2">
                      {group.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={permission.key}
                            checked={permissions[permission.key] || false}
                            onCheckedChange={() =>
                              togglePermission(permission.key)
                            }
                          />
                          <Label
                            htmlFor={permission.key}
                            className="cursor-pointer text-sm"
                          >
                            {permission.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Members</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  fetchUsers();
                  setAddMemberDialogOpen(true);
                }}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
            <CardDescription>
              {members.length} member{members.length !== 1 ? "s" : ""} in this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No members yet
                </p>
              ) : (
                members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMember(member._id)}
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Search and add users to this role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No users found
                </p>
              ) : (
                filteredUsers.slice(0, 10).map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addMember(user._id)}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMemberDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
