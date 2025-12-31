"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  id?: string;
  name: string;
  email: string;
  userType: string;
}

export default function EditRolePage() {
  const params = useParams();
  const roleName = decodeURIComponent(params.roleName as string);

  const [role, setRole] = React.useState<IRole | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [allUsers, setAllUsers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [memberSearchQuery, setMemberSearchQuery] = React.useState("");
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>(
    {}
  );
  const [removingMember, setRemovingMember] = React.useState<string | null>(
    null
  );

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Fetch role and member details
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesRes = await api.roles.getAll();
        const roles: IRole[] = Array.isArray(rolesRes.data)
          ? rolesRes.data
          : rolesRes.data?.data || rolesRes.data?.roles || [];

        const searchName = roleName.toLowerCase();
        const foundRole = roles.find((r) => {
          const rName = r.name?.toLowerCase() || "";
          return (
            rName === searchName ||
            rName === `role_${searchName}` ||
            rName.replace("role_", "") === searchName.replace("role_", "")
          );
        });

        if (foundRole) {
          setRole(foundRole);
          const perms = Array.isArray(foundRole.permissions)
            ? foundRole.permissions.reduce(
                (acc: Record<string, boolean>, p: string) => {
                  acc[p] = true;
                  return acc;
                },
                {}
              )
            : foundRole.permissions || {};
          setPermissions(perms);

          // Extract member IDs
          if (foundRole.members && foundRole.members.length > 0) {
            const memberIds = foundRole.members.map(
              (m: string | { id: string }) => (typeof m === "string" ? m : m.id)
            );

            // Fetch actual member details from all user types
            try {
              const [studentsRes, teachersRes, adminsRes] = await Promise.all([
                api.users.getStudents(),
                api.users.getTeachers(),
                api.users.getAdmins(),
              ]);

              const allUsersData = [
                ...(studentsRes.data?.students ||
                  studentsRes.data?.data ||
                  studentsRes.data ||
                  []),
                ...(teachersRes.data?.teachers ||
                  teachersRes.data?.data ||
                  teachersRes.data ||
                  []),
                ...(adminsRes.data?.admins ||
                  adminsRes.data?.data ||
                  adminsRes.data ||
                  []),
              ];

              // Map member IDs to actual user data
              const memberDetails = memberIds.map((id: string) => {
                const user = allUsersData.find(
                  (u: Member) => u._id === id || u.id === id
                );
                return (
                  user || {
                    _id: id,
                    name: `User ${id.slice(-6)}`,
                    email: "-",
                    userType: "unknown",
                  }
                );
              });

              setMembers(memberDetails);
            } catch {
              // Fallback to placeholder data
              setMembers(
                memberIds.map((id: string) => ({
                  _id: id,
                  name: `User ${id.slice(-6)}`,
                  email: "-",
                  userType: "unknown",
                }))
              );
            }
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
        ...(students.data?.students ||
          students.data?.data ||
          students.data ||
          []),
        ...(teachers.data?.teachers ||
          teachers.data?.data ||
          teachers.data ||
          []),
        ...(admins.data?.admins || admins.data?.data || admins.data || []),
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
      // Convert permissions object to array of enabled permissions
      const permissionsArray = Object.entries(permissions)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);
      await api.roles.update(role._id || role.id || "", {
        permissions: permissionsArray,
      });
    } catch (error) {
      console.error("Failed to save permissions:", error);
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!role) return;
    try {
      await api.roles.addMember(role._id || role.id || "", userId);
      const user = allUsers.find((u) => (u._id || u.id) === userId);
      if (user) {
        setMembers((prev) => [...prev, user]);
      }
      setAddMemberDialogOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const removeMember = async (userId: string) => {
    if (!role) return;
    setRemovingMember(userId);
    try {
      await api.roles.removeMember(role._id || role.id || "", {
        id: userId,
        userType: members.find((m) => (m._id || m.id) === userId)?.userType,
      });
      setMembers((prev) => prev.filter((m) => (m._id || m.id) !== userId));
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setRemovingMember(null);
    }
  };

  // Filter members for search
  const filteredMembers = React.useMemo(() => {
    if (!memberSearchQuery) return members;
    const query = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.userType?.toLowerCase().includes(query)
    );
  }, [members, memberSearchQuery]);

  // Paginated members
  const paginatedMembers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize);

  // Filter users for add dialog (exclude existing members)
  const filteredUsers = allUsers.filter(
    (user) =>
      !members.some((m) => (m._id || m.id) === (user._id || user.id)) &&
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType?.toLowerCase()) {
      case "student":
        return "default";
      case "teacher":
        return "secondary";
      case "admin":
        return "destructive";
      default:
        return "outline";
    }
  };

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

      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="members">
            Members ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Configure what actions members of this role can perform
                  </CardDescription>
                </div>
                <Button onClick={savePermissions} disabled={saving}>
                  {saving ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>
                    {members.length} member{members.length !== 1 ? "s" : ""} in
                    this role
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    fetchUsers();
                    setAddMemberDialogOpen(true);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      className="pl-10"
                      value={memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            {memberSearchQuery
                              ? "No members found matching your search"
                              : "No members in this role yet"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedMembers.map((member) => (
                          <TableRow key={member._id || member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(member.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {member.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {member.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getUserTypeBadgeVariant(
                                  member.userType
                                )}
                              >
                                {member.userType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeMember(member._id || member.id || "")
                                }
                                disabled={
                                  removingMember ===
                                  (member._id || member.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filteredMembers.length > 0 && (
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Rows per page:</span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages || 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentPage >= totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Search and add users to this role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery
                    ? "No users found matching your search"
                    : "Loading users..."}
                </p>
              ) : (
                filteredUsers.slice(0, 20).map((user) => (
                  <div
                    key={user._id || user.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
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
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getUserTypeBadgeVariant(user.userType)}
                        className="text-xs"
                      >
                        {user.userType}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => addMember(user._id || user.id || "")}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddMemberDialogOpen(false);
                setSearchQuery("");
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
