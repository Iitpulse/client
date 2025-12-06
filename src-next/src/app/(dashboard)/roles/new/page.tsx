"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { PERMISSIONS } from "@/types";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
});

type RoleFormData = z.infer<typeof roleSchema>;

const permissionGroups = [
  {
    name: "Questions",
    permissions: [
      { key: PERMISSIONS.QUESTION.CREATE, label: "Create Questions" },
      { key: PERMISSIONS.QUESTION.READ, label: "Read Own Questions" },
      { key: PERMISSIONS.QUESTION.READ_GLOBAL, label: "Read All Questions" },
      { key: PERMISSIONS.QUESTION.UPDATE, label: "Update Questions" },
      { key: PERMISSIONS.QUESTION.DELETE, label: "Delete Questions" },
    ],
  },
  {
    name: "Tests",
    permissions: [
      { key: PERMISSIONS.TEST.CREATE, label: "Create Tests" },
      { key: PERMISSIONS.TEST.READ, label: "Read Own Tests" },
      { key: PERMISSIONS.TEST.READ_GLOBAL, label: "Read All Tests" },
      { key: PERMISSIONS.TEST.UPDATE, label: "Update Tests" },
      { key: PERMISSIONS.TEST.DELETE, label: "Delete Tests" },
      { key: PERMISSIONS.TEST.VIEW_RESULT, label: "View Results" },
      { key: PERMISSIONS.TEST.PUBLISH_RESULT, label: "Publish Results" },
      { key: PERMISSIONS.TEST.EXPORT_RESULT, label: "Export Results" },
    ],
  },
  {
    name: "Users",
    permissions: [
      { key: PERMISSIONS.USER.READ, label: "Read Users" },
      { key: PERMISSIONS.USER.UPDATE, label: "Update Users" },
      { key: PERMISSIONS.USER.DELETE, label: "Delete Users" },
    ],
  },
  {
    name: "Patterns",
    permissions: [
      { key: PERMISSIONS.PATTERN.CREATE, label: "Create Patterns" },
      { key: PERMISSIONS.PATTERN.READ, label: "Read Patterns" },
      { key: PERMISSIONS.PATTERN.UPDATE, label: "Update Patterns" },
      { key: PERMISSIONS.PATTERN.DELETE, label: "Delete Patterns" },
    ],
  },
  {
    name: "Batches",
    permissions: [
      { key: PERMISSIONS.BATCH.CREATE, label: "Create Batches" },
      { key: PERMISSIONS.BATCH.READ, label: "Read Batches" },
      { key: PERMISSIONS.BATCH.UPDATE, label: "Update Batches" },
      { key: PERMISSIONS.BATCH.DELETE, label: "Delete Batches" },
    ],
  },
  {
    name: "Subjects",
    permissions: [
      { key: PERMISSIONS.SUBJECT.CREATE, label: "Create Subjects" },
      { key: PERMISSIONS.SUBJECT.READ, label: "Read Subjects" },
      { key: PERMISSIONS.SUBJECT.UPDATE, label: "Update Subjects" },
      { key: PERMISSIONS.SUBJECT.DELETE, label: "Delete Subjects" },
      { key: PERMISSIONS.SUBJECT.MANAGE_CHAPTER, label: "Manage Chapters" },
      { key: PERMISSIONS.SUBJECT.MANAGE_TOPIC, label: "Manage Topics" },
    ],
  },
  {
    name: "Roles",
    permissions: [
      { key: PERMISSIONS.ROLE.CREATE, label: "Create Roles" },
      { key: PERMISSIONS.ROLE.READ, label: "Read Roles" },
      { key: PERMISSIONS.ROLE.UPDATE, label: "Update Roles" },
      { key: PERMISSIONS.ROLE.DELETE, label: "Delete Roles" },
    ],
  },
];

export default function CreateRolePage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [selectedPermissions, setSelectedPermissions] = React.useState<
    Record<string, boolean>
  >({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleGroup = (permissions: { key: string }[]) => {
    const allSelected = permissions.every((p) => selectedPermissions[p.key]);
    const newState = !allSelected;

    const updated = { ...selectedPermissions };
    permissions.forEach((p) => {
      updated[p.key] = newState;
    });
    setSelectedPermissions(updated);
  };

  const onSubmit = async (data: RoleFormData) => {
    setLoading(true);
    try {
      await api.roles.create({
        name: data.name,
        permissions: selectedPermissions,
      });
      router.push("/roles");
    } catch (error) {
      console.error("Failed to create role:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/roles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Role</h1>
          <p className="text-muted-foreground">
            Define a new role with specific permissions
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
            <CardDescription>
              Enter a unique name for this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                placeholder="e.g., Content Manager"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              Select the permissions this role should have
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {permissionGroups.map((group) => (
                <div key={group.name} className="rounded-lg border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">{group.name}</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGroup(group.permissions)}
                    >
                      {group.permissions.every(
                        (p) => selectedPermissions[p.key]
                      )
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {group.permissions.map((permission) => (
                      <div
                        key={permission.key}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={permission.key}
                          checked={selectedPermissions[permission.key] || false}
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

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/roles">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </form>
    </div>
  );
}
