"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { IBatch, IInstitute } from "@/types";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  institute: z.string().optional(),
  batch: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  userType: string;
  institute?: string;
  batch?: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserData | null>(null);
  const [institutes, setInstitutes] = React.useState<IInstitute[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const selectedInstitute = watch("institute");

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [institutesRes, batchesRes] = await Promise.all([
          api.institutes.getAll(),
          api.batches.getAll(),
        ]);
        setInstitutes(institutesRes.data?.institutes || []);
        setBatches(batchesRes.data?.batches || []);

        // Try to find user in different user types
        const [studentsRes, teachersRes, adminsRes, operatorsRes, managersRes] = await Promise.all([
          api.users.getStudents(),
          api.users.getTeachers(),
          api.users.getAdmins(),
          api.users.getOperators(),
          api.users.getManagers(),
        ]);

        const allUsers = [
          ...(studentsRes.data?.students || []).map((u: UserData) => ({ ...u, userType: "student" })),
          ...(teachersRes.data?.teachers || []).map((u: UserData) => ({ ...u, userType: "teacher" })),
          ...(adminsRes.data?.admins || []).map((u: UserData) => ({ ...u, userType: "admin" })),
          ...(operatorsRes.data?.operators || []).map((u: UserData) => ({ ...u, userType: "operator" })),
          ...(managersRes.data?.managers || []).map((u: UserData) => ({ ...u, userType: "manager" })),
        ];

        const foundUser = allUsers.find((u) => u._id === userId);
        if (foundUser) {
          setUser(foundUser);
          reset({
            name: foundUser.name,
            email: foundUser.email,
            phone: foundUser.phone || "",
            institute: foundUser.institute,
            batch: foundUser.batch,
          });
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [userId, reset]);

  const filteredBatches = selectedInstitute
    ? batches.filter((b) => b.institute === selectedInstitute)
    : batches;

  const onSubmit = async (data: UserFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const userData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        institute: data.institute,
        batch: data.batch,
      };

      switch (user.userType) {
        case "student":
          await api.users.updateStudent(userId, userData);
          break;
        case "teacher":
          await api.users.updateTeacher(userId, userData);
          break;
        case "admin":
          await api.users.updateAdmin(userId, userData);
          break;
        case "operator":
          await api.users.updateOperator(userId, userData);
          break;
        case "manager":
          await api.users.updateManager(userId, userData);
          break;
      }

      router.push("/users");
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading user...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Update {user.name}'s information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update the user's personal details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>User Type</Label>
                <Input
                  value={user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {(user.userType === "student" || user.userType === "teacher") && (
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Update institute and batch assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="institute">Institute</Label>
                  <Select
                    defaultValue={user.institute}
                    onValueChange={(value) => setValue("institute", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select institute" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutes.map((institute) => (
                        <SelectItem key={institute._id} value={institute._id}>
                          {institute.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {user.userType === "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="batch">Batch</Label>
                    <Select
                      defaultValue={user.batch}
                      onValueChange={(value) => setValue("batch", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredBatches.map((batch) => (
                          <SelectItem key={batch._id} value={batch._id}>
                            {batch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/users">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
