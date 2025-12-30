"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Plus,
  Edit,
  Trash2,
  FileUp,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Building,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { IStudent, ITeacher, IAdmin, IOperator, IManager, IBatch } from "@/types";

type UserType = IStudent | ITeacher | IAdmin | IOperator | IManager;
type UserCategory = "students" | "teachers" | "admins" | "operators" | "managers";

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Store data for each user type separately
  const [usersData, setUsersData] = React.useState<Record<UserCategory, UserType[]>>({
    students: [],
    teachers: [],
    admins: [],
    operators: [],
    managers: [],
  });

  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserType | null>(null);
  const [activeTab, setActiveTab] = React.useState<UserCategory>("students");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Preview sidebar state
  const [selectedUser, setSelectedUser] = React.useState<UserType | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const fetchUsers = React.useCallback(async (type: UserCategory) => {
    console.log(`[Users] Fetching ${type}...`);
    setLoading(true);
    try {
      let response;
      switch (type) {
        case "students":
          response = await api.users.getStudents();
          break;
        case "teachers":
          response = await api.users.getTeachers();
          break;
        case "admins":
          response = await api.users.getAdmins();
          break;
        case "operators":
          response = await api.users.getOperators();
          break;
        case "managers":
          response = await api.users.getManagers();
          break;
      }

      console.log(`[Users] Response for ${type}:`, response.data);

      // Handle various response formats
      const data = response.data?.data || response.data?.[type] || response.data || [];
      const users = Array.isArray(data) ? data : [];

      // Log userTypes to debug
      const userTypes = users.reduce((acc: Record<string, number>, u: UserType) => {
        const ut = u.userType || "unknown";
        acc[ut] = (acc[ut] || 0) + 1;
        return acc;
      }, {});
      console.log(`[Users] Parsed ${users.length} ${type}, userTypes breakdown:`, userTypes);

      // Filter users by userType on client-side as fallback
      // Backend should already filter, but this ensures correct display
      const expectedUserType = type.slice(0, -1); // students -> student, teachers -> teacher
      const filteredUsers = users.filter((u: UserType) =>
        u.userType?.toLowerCase() === expectedUserType
      );
      console.log(`[Users] After client-side filter: ${filteredUsers.length} ${type}`);

      setUsersData(prev => ({
        ...prev,
        [type]: filteredUsers,
      }));
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch ${type}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch data when tab changes
  React.useEffect(() => {
    fetchUsers(activeTab);
  }, [activeTab, fetchUsers]);

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      // Call appropriate delete endpoint based on user type
      const userType = (userToDelete as UserType).userType?.toLowerCase();
      switch (userType) {
        case "student":
          await api.users.deleteStudent(userToDelete._id);
          break;
        case "teacher":
          await api.users.deleteTeacher(userToDelete._id);
          break;
        case "admin":
          await api.users.deleteAdmin(userToDelete._id);
          break;
        case "operator":
          await api.users.deleteOperator(userToDelete._id);
          break;
        case "manager":
          await api.users.deleteManager(userToDelete._id);
          break;
        default:
          await api.users.deleteStudent(userToDelete._id);
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers(activeTab);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setPreviewOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  const getCurrentData = React.useMemo(() => {
    let data = usersData[activeTab] || [];

    // Filter by search query
    if (searchQuery) {
      data = data.filter((user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user as IStudent).contact?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return data;
  }, [usersData, activeTab, searchQuery]);

  const openPreview = (user: UserType) => {
    setSelectedUser(user);
    setPreviewOpen(true);
  };

  // Dynamic columns based on user type
  const getColumns = (): ColumnDef<UserType>[] => {
    const baseColumns: ColumnDef<UserType>[] = [
      {
        id: "view",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openPreview(row.original);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
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
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => {
          const user = row.original as IStudent;
          return user.contact || "-";
        },
      },
    ];

    // Add type-specific columns
    if (activeTab === "students") {
      baseColumns.push(
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
          accessorKey: "standard",
          header: "Class",
          cell: ({ row }) => (row.original as IStudent).standard || "-",
        },
        {
          accessorKey: "school",
          header: "School",
          cell: ({ row }) => (row.original as IStudent).school || "-",
        }
      );
    }

    if (activeTab === "teachers") {
      baseColumns.push(
        {
          accessorKey: "subjects",
          header: "Subjects",
          cell: ({ row }) => {
            const subjects = (row.original as ITeacher).subjects;
            if (!subjects || subjects.length === 0) return "-";
            return (
              <div className="flex flex-wrap gap-1">
                {subjects.slice(0, 2).map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {typeof s === "object" ? s.name : s}
                  </Badge>
                ))}
                {subjects.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{subjects.length - 2}
                  </Badge>
                )}
              </div>
            );
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
        }
      );
    }

    if (activeTab === "admins" || activeTab === "operators" || activeTab === "managers") {
      baseColumns.push({
        accessorKey: "institute",
        header: "Institute",
        cell: ({ row }) => {
          const institute = row.original.institute;
          if (!institute) return "-";
          return typeof institute === "object" ? institute.name : institute;
        },
      });
    }

    // Add gender column for all
    baseColumns.push({
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => {
        const gender = (row.original as IStudent).gender;
        if (!gender) return "-";
        return gender.charAt(0).toUpperCase() + gender.slice(1);
      },
    });

    // Add validity column
    baseColumns.push({
      id: "validity",
      header: "Valid Till",
      cell: ({ row }) => {
        const validity = row.original.validity;
        if (!validity?.to) return "-";
        try {
          return format(new Date(validity.to), "MMM d, yyyy");
        } catch {
          return "-";
        }
      },
    });

    // Add actions column
    baseColumns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/users/${user._id}/edit?type=${activeTab.slice(0, -1)}`);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setUserToDelete(user);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    });

    return baseColumns;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage students, teachers, and staff
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "students" && (
            <Button variant="outline" asChild>
              <Link href="/users/bulk-upload">
                <FileUp className="mr-2 h-4 w-4" />
                Bulk Upload
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/users/new?type=${activeTab.slice(0, -1)}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs and Search in single line */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserCategory)}>
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
            <TabsTrigger value="managers">Managers</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search by name, email, or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[350px]"
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center border rounded-lg">
          <div className="text-muted-foreground">Loading {activeTab}...</div>
        </div>
      ) : (
        <DataTable
          columns={getColumns()}
          data={getCurrentData}
          onRowClick={(user) => openPreview(user)}
        />
      )}

      {/* User Preview Sidebar */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>User Details</SheetTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedUser) {
                      const type = (selectedUser as UserType).userType?.toLowerCase() || activeTab.slice(0, -1);
                      router.push(`/users/${selectedUser._id}/edit?type=${type}`);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (selectedUser) {
                      setUserToDelete(selectedUser);
                      setDeleteDialogOpen(true);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </SheetHeader>

          {selectedUser && (
            <div className="mt-6 space-y-6">
              {/* User Avatar and Basic Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <Badge variant="secondary">
                    {(selectedUser as UserType).userType?.charAt(0).toUpperCase() +
                     (selectedUser as UserType).userType?.slice(1)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedUser.email}</span>
                  </div>
                  {(selectedUser as IStudent).contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{(selectedUser as IStudent).contact}</span>
                    </div>
                  )}
                  {(selectedUser as IStudent).address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{(selectedUser as IStudent).address}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Type-specific details */}
              {activeTab === "students" && (
                <>
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Academic Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Batch:</span>
                        <p className="font-medium">
                          {(() => {
                            const batch = (selectedUser as IStudent).batch;
                            if (!batch) return "-";
                            if (typeof batch === "object") return batch.name || "-";
                            return batch;
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Class:</span>
                        <p className="font-medium">{(selectedUser as IStudent).standard || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stream:</span>
                        <p className="font-medium">{(selectedUser as IStudent).stream || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">School:</span>
                        <p className="font-medium">{(selectedUser as IStudent).school || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Parent Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Parent Name:</span>
                        <p className="font-medium">
                          {(selectedUser as IStudent).parentDetails?.name || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Parent Contact:</span>
                        <p className="font-medium">
                          {(selectedUser as IStudent).parentDetails?.contact || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "teachers" && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Subjects</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedUser as ITeacher).subjects?.map((subject, i) => (
                      <Badge key={i} variant="outline">
                        {typeof subject === "object" ? subject.name : subject}
                      </Badge>
                    )) || <span className="text-muted-foreground">No subjects assigned</span>}
                  </div>
                </div>
              )}

              <Separator />

              {/* Personal Details */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Personal Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <p className="font-medium">
                      {(selectedUser as IStudent).gender
                        ? (selectedUser as IStudent).gender!.charAt(0).toUpperCase() +
                          (selectedUser as IStudent).gender!.slice(1)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <p className="font-medium">{formatDate((selectedUser as IStudent).dob)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">City:</span>
                    <p className="font-medium">{(selectedUser as IStudent).city || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">State:</span>
                    <p className="font-medium">{(selectedUser as IStudent).state || "-"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Validity */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Account Validity</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valid From:</span>
                    <p className="font-medium">{formatDate(selectedUser.validity?.from)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valid Till:</span>
                    <p className="font-medium">{formatDate(selectedUser.validity?.to)}</p>
                  </div>
                </div>
              </div>

              {/* Roles */}
              {selectedUser.roles && selectedUser.roles.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.roles.map((role, i) => (
                        <Badge key={i} variant="secondary">
                          {typeof role === "object" ? role.name : role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ID */}
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">User ID:</span>
                <p className="font-mono text-xs mt-1">{selectedUser._id}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
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
