"use client";

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, isValid } from "date-fns";
import { ArrowLeft, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { api } from "@/lib/api";
import { IBatch, IInstitute, ISubject, IRole } from "@/types";
import { cn } from "@/lib/utils";

// Helper function to safely parse dates
const safeParseDate = (dateStr: string | undefined | null): Date | undefined => {
  if (!dateStr) return undefined;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

// Helper function to safely format dates
const safeFormatDate = (date: Date | undefined | null, formatStr: string): string | null => {
  if (!date || !isValid(date)) return null;
  try {
    return format(date, formatStr);
  } catch {
    return null;
  }
};

// Indian states list
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Stream options
const streamOptions = [
  { value: "pcm", label: "PCM (Physics, Chemistry, Math)" },
  { value: "pcb", label: "PCB (Physics, Chemistry, Biology)" },
  { value: "pcmb", label: "PCMB (Physics, Chemistry, Math, Biology)" },
  { value: "commerce", label: "Commerce" },
  { value: "arts", label: "Arts" },
];

// Medium options
const mediumOptions = [
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "other", label: "Other" },
];

// Gender options
const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// Class/Standard options
const standardOptions = [
  { value: "6", label: "Class 6" },
  { value: "7", label: "Class 7" },
  { value: "8", label: "Class 8" },
  { value: "9", label: "Class 9" },
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "dropper", label: "Dropper" },
];

// Base schema for all users (no password required for edit)
const baseUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  contact: z.string().regex(/^\d{10}$/, "Contact must be exactly 10 digits"),
  dob: z.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().min(5, "Address must be at least 5 characters").max(150).optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
  institute: z.string().optional(),
  roles: z.array(z.string()).optional(),
  validityFrom: z.date().optional(),
  validityTo: z.date().optional(),
});

// Student-specific schema
const studentSchema = baseUserSchema.extend({
  batch: z.string().optional(),
  standard: z.string().optional(),
  school: z.string().max(50).optional().or(z.literal("")),
  stream: z.string().optional(),
  medium: z.string().optional(),
  parentName: z.string().optional(),
  parentContact: z.string().regex(/^\d{10}$/, "Parent contact must be exactly 10 digits").optional().or(z.literal("")),
});

// Teacher-specific schema
const teacherSchema = baseUserSchema.extend({
  subjects: z.array(z.string()).optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;
type TeacherFormData = z.infer<typeof teacherSchema>;
type BaseFormData = z.infer<typeof baseUserSchema>;
type UserFormData = StudentFormData | TeacherFormData | BaseFormData;

interface UserData {
  _id: string;
  name: string;
  email: string;
  contact?: string;
  userType: string;
  institute?: string | { _id: string; name: string };
  batch?: string | { _id: string; name: string };
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  roles?: (string | { _id: string; name: string })[] | Record<string, boolean>;
  validity?: { from?: string; to?: string };
  // Student-specific
  standard?: string;
  school?: string;
  stream?: string;
  medium?: string;
  parentDetails?: { name?: string; contact?: string };
  // Teacher-specific
  subjects?: (string | { _id: string; name: string })[];
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const userId = params.id as string;
  const userTypeParam = searchParams.get("type");

  const [user, setUser] = React.useState<UserData | null>(null);
  const [institutes, setInstitutes] = React.useState<IInstitute[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [roles, setRoles] = React.useState<IRole[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(true);

  // Determine user type
  const userType = user?.userType?.toLowerCase() || userTypeParam || "student";

  // Select appropriate schema based on user type
  const getSchema = () => {
    switch (userType) {
      case "student":
        return studentSchema;
      case "teacher":
        return teacherSchema;
      default:
        return baseUserSchema;
    }
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<UserFormData>({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      roles: [],
      subjects: [],
    },
  });

  // Unsaved changes warning
  const {
    showDialog,
    confirmNavigation,
    cancelNavigation,
    navigateWithCheck,
  } = useUnsavedChanges({
    isDirty,
    message: "You have unsaved changes. Are you sure you want to leave?",
  });

  const selectedInstitute = watch("institute");
  const selectedRoles = watch("roles") || [];

  // Fetch all supporting data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [institutesRes, batchesRes, subjectsRes, rolesRes] = await Promise.all([
          api.institutes.getAll(),
          api.batches.getAll(),
          api.subjects.getAll(),
          api.roles.getAll(),
        ]);

        // Handle various response formats
        const institutesData = institutesRes.data?.institutes || institutesRes.data?.data || institutesRes.data || [];
        const batchesData = batchesRes.data?.batches || batchesRes.data?.data || batchesRes.data || [];
        const subjectsData = subjectsRes.data?.subjects || subjectsRes.data?.data || subjectsRes.data || [];
        const rolesData = rolesRes.data?.roles || rolesRes.data?.data || rolesRes.data || [];

        setInstitutes(Array.isArray(institutesData) ? institutesData : []);
        setBatches(Array.isArray(batchesData) ? batchesData : []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      } catch (error) {
        console.error("Failed to fetch supporting data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch user data
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        // Try to fetch user based on type hint or try all types
        let foundUser: UserData | null = null;

        if (userTypeParam === "student" || !userTypeParam) {
          try {
            const res = await api.users.getStudentById(userId);
            const userData = res.data?.data || res.data;
            if (userData && userData._id) {
              foundUser = { ...userData, userType: "student" };
            }
          } catch { /* Try next type */ }
        }

        if (!foundUser && (userTypeParam === "teacher" || !userTypeParam)) {
          try {
            // Try fetching from teachers list
            const res = await api.users.getTeachers();
            const teachers = res.data?.data || res.data?.teachers || res.data || [];
            const teacher = Array.isArray(teachers) ? teachers.find((t: UserData) => t._id === userId) : null;
            if (teacher) {
              foundUser = { ...teacher, userType: "teacher" };
            }
          } catch { /* Try next type */ }
        }

        if (!foundUser && (userTypeParam === "admin" || !userTypeParam)) {
          try {
            const res = await api.users.getAdmins();
            const admins = res.data?.data || res.data?.admins || res.data || [];
            const admin = Array.isArray(admins) ? admins.find((a: UserData) => a._id === userId) : null;
            if (admin) {
              foundUser = { ...admin, userType: "admin" };
            }
          } catch { /* Try next type */ }
        }

        if (!foundUser && (userTypeParam === "operator" || !userTypeParam)) {
          try {
            const res = await api.users.getOperators();
            const operators = res.data?.data || res.data?.operators || res.data || [];
            const operator = Array.isArray(operators) ? operators.find((o: UserData) => o._id === userId) : null;
            if (operator) {
              foundUser = { ...operator, userType: "operator" };
            }
          } catch { /* Try next type */ }
        }

        if (!foundUser && (userTypeParam === "manager" || !userTypeParam)) {
          try {
            const res = await api.users.getManagers();
            const managers = res.data?.data || res.data?.managers || res.data || [];
            const manager = Array.isArray(managers) ? managers.find((m: UserData) => m._id === userId) : null;
            if (manager) {
              foundUser = { ...manager, userType: "manager" };
            }
          } catch { /* Not found */ }
        }

        if (foundUser) {
          setUser(foundUser);

          // Parse roles to IDs - handle multiple formats
          let roleIds: string[] = [];
          if (foundUser.roles) {
            console.log("[EditUser] Raw roles from API:", foundUser.roles, "isArray:", Array.isArray(foundUser.roles));
            if (Array.isArray(foundUser.roles)) {
              // Format: [{ _id: "...", name: "..." }] or [{ id: "ROLE_..." }] or ["roleId1", "roleId2"]
              roleIds = foundUser.roles
                .map((r) => {
                  if (typeof r === "string") return r;
                  if (typeof r === "object" && r !== null) {
                    // Try _id first, then id, then construct from name
                    const id = r._id || (r as { id?: string }).id;
                    if (id) return id;
                    // If role has name but no id, construct ROLE_XXX format
                    if (r.name) return `ROLE_${r.name.toUpperCase().replace(/\s+/g, '_')}`;
                  }
                  return undefined;
                })
                .filter((id): id is string => !!id);
            } else if (typeof foundUser.roles === "object") {
              // Format: { "ROLE_STUDENT": true, "ROLE_ADMIN": false }
              roleIds = Object.entries(foundUser.roles as Record<string, boolean>)
                .filter(([, value]) => value === true)
                .map(([key]) => key);
            }
          }
          console.log("[EditUser] Parsed roleIds:", roleIds);

          // Parse subjects to IDs (for teachers)
          const subjectIds = (foundUser.subjects || []).map((s) =>
            typeof s === "object" ? s._id : s
          );

          // Parse institute and batch IDs
          const instituteId = typeof foundUser.institute === "object"
            ? foundUser.institute._id
            : foundUser.institute;
          const batchId = typeof foundUser.batch === "object"
            ? foundUser.batch._id
            : foundUser.batch;

          // Parse dates safely
          const dobDate = safeParseDate(foundUser.dob);
          const validityFromDate = safeParseDate(foundUser.validity?.from);
          const validityToDate = safeParseDate(foundUser.validity?.to);

          // Reset form with user data
          reset({
            name: foundUser.name || "",
            email: foundUser.email || "",
            contact: String(foundUser.contact || ""),
            dob: dobDate,
            gender: foundUser.gender as "male" | "female" | "other" | undefined,
            address: foundUser.address || "",
            city: foundUser.city || "",
            state: foundUser.state || "",
            institute: instituteId || "",
            roles: roleIds,
            validityFrom: validityFromDate,
            validityTo: validityToDate,
            // Student-specific
            batch: batchId || "",
            standard: String(foundUser.standard || ""),
            school: foundUser.school || "",
            stream: foundUser.stream || "",
            medium: foundUser.medium || "",
            parentName: foundUser.parentDetails?.name || "",
            parentContact: String(foundUser.parentDetails?.contact || ""),
            // Teacher-specific
            subjects: subjectIds,
          } as UserFormData);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user data",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, userTypeParam, reset, toast]);

  const filteredBatches = selectedInstitute
    ? batches.filter((b) => {
        const batchInstitute = typeof b.institute === "object" ? b.institute?._id : b.institute;
        return batchInstitute === selectedInstitute;
      })
    : batches;

  const onSubmit = async (data: UserFormData) => {
    console.log("[onSubmit] Form submitted with data:", data);
    if (!user) {
      console.log("[onSubmit] No user found, returning");
      return;
    }
    setLoading(true);
    try {
      // Build the user data object based on user type
      // Transform roles from string array to object array format expected by API
      const rolesForApi = (data.roles || []).map((roleId) => ({
        id: roleId,
        from: data.validityFrom ? format(data.validityFrom, "yyyy-MM-dd") : undefined,
        to: data.validityTo ? format(data.validityTo, "yyyy-MM-dd") : undefined,
      }));

      const userData: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        contact: data.contact,
        dob: data.dob ? format(data.dob, "yyyy-MM-dd") : undefined,
        gender: data.gender,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        institute: data.institute || undefined,
        roles: rolesForApi,
        validity: {
          from: data.validityFrom ? format(data.validityFrom, "yyyy-MM-dd") : undefined,
          to: data.validityTo ? format(data.validityTo, "yyyy-MM-dd") : undefined,
        },
      };

      // Add student-specific fields
      if (userType === "student") {
        const studentData = data as StudentFormData;
        userData.batch = studentData.batch || undefined;
        userData.standard = studentData.standard || undefined;
        userData.school = studentData.school || undefined;
        userData.stream = studentData.stream || undefined;
        userData.medium = studentData.medium || undefined;
        if (studentData.parentName || studentData.parentContact) {
          userData.parentDetails = {
            name: studentData.parentName || undefined,
            contact: studentData.parentContact || undefined,
          };
        }
      }

      // Add teacher-specific fields
      if (userType === "teacher") {
        const teacherData = data as TeacherFormData;
        userData.subjects = teacherData.subjects;
      }

      // Remove undefined values
      Object.keys(userData).forEach(key => {
        if (userData[key] === undefined || userData[key] === "") {
          delete userData[key];
        }
      });

      switch (userType) {
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

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      router.push("/users");
    } catch (error: unknown) {
      console.error("Failed to update user:", error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update user";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: IRole) => {
    const current = selectedRoles || [];

    // Get role ID - handle both _id and id formats from API
    const roleId = role._id || (role as unknown as { id?: string }).id;
    const roleCode = `ROLE_${role.name.toUpperCase().replace(/\s+/g, '_')}`;

    // Find if this role is selected using any of the possible formats
    const matchingId = current.find(
      (r) => (roleId && r === roleId) || r === roleCode || r === role.name
    );

    console.log("[toggleRole] Clicked role:", role.name, "roleId:", roleId, "roleCode:", roleCode);
    console.log("[toggleRole] current selectedRoles:", current);
    console.log("[toggleRole] matchingId found:", matchingId);

    if (matchingId) {
      // Remove the role using the format it was stored in
      const newRoles = current.filter((r) => r !== matchingId);
      console.log("[toggleRole] Removing, new roles:", newRoles);
      setValue("roles", newRoles, { shouldDirty: true });
    } else {
      // Add using the roleCode format for consistency (matches API format ROLE_XXX)
      const newRoles = [...current, roleCode];
      console.log("[toggleRole] Adding, new roles:", newRoles);
      setValue("roles", newRoles, { shouldDirty: true });
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
      <div className="flex h-48 flex-col items-center justify-center gap-4">
        <div className="text-muted-foreground">User not found</div>
        <Button variant="outline" asChild>
          <Link href="/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateWithCheck("/users")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Update {user.name}&apos;s information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, (errors) => console.log("[Form] Validation errors:", errors))} className="space-y-6">
        {/* Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Update the user&apos;s personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number *</Label>
                <Input
                  id="contact"
                  placeholder="Enter 10-digit phone number"
                  {...register("contact")}
                />
                {errors.contact && (
                  <p className="text-sm text-destructive">{errors.contact.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>User Type</Label>
                <Input
                  value={userType.charAt(0).toUpperCase() + userType.slice(1)}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Controller
                  name="dob"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !safeFormatDate(field.value, "PPP") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {safeFormatDate(field.value, "PPP") || "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter address"
                  {...register("address")}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  {...register("city")}
                />
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {indianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student-specific: Academic Details */}
        {userType === "student" && (
          <Card>
            <CardHeader>
              <CardTitle>Academic Details</CardTitle>
              <CardDescription>
                Update academic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Class/Standard</Label>
                  <Controller
                    name="standard"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value as string}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {standardOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {(errors as { standard?: { message?: string } }).standard && (
                    <p className="text-sm text-destructive">{(errors as { standard?: { message?: string } }).standard?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Input
                    id="school"
                    placeholder="Enter school name"
                    {...register("school" as keyof UserFormData)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Controller
                    name="stream"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value as string}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stream" />
                        </SelectTrigger>
                        <SelectContent>
                          {streamOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Medium</Label>
                  <Controller
                    name="medium"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value as string}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medium" />
                        </SelectTrigger>
                        <SelectContent>
                          {mediumOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student-specific: Parent Details */}
        {userType === "student" && (
          <Card>
            <CardHeader>
              <CardTitle>Parent/Guardian Details</CardTitle>
              <CardDescription>
                Update parent or guardian information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent/Guardian Name</Label>
                  <Input
                    id="parentName"
                    placeholder="Enter parent name"
                    {...register("parentName" as keyof UserFormData)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentContact">Parent/Guardian Contact</Label>
                  <Input
                    id="parentContact"
                    placeholder="Enter 10-digit phone number"
                    {...register("parentContact" as keyof UserFormData)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teacher-specific: Subjects */}
        {userType === "teacher" && (
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>
                Update subjects the teacher teaches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="subjects"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subjects.map((subject) => (
                      <div key={subject._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject._id}`}
                          checked={(field.value as string[] || []).includes(subject._id)}
                          onCheckedChange={(checked) => {
                            const current = field.value as string[] || [];
                            if (checked) {
                              field.onChange([...current, subject._id]);
                            } else {
                              field.onChange(current.filter((s) => s !== subject._id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`subject-${subject._id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {subject.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              />
              {subjects.length === 0 && (
                <p className="text-sm text-muted-foreground">No subjects available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Organization - Institute & Batch */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Update institute {userType === "student" && "and batch"} assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Institute</Label>
                <Controller
                  name="institute"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
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
                  )}
                />
              </div>

              {userType === "student" && (
                <div className="space-y-2">
                  <Label>Batch</Label>
                  <Controller
                    name="batch"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value as string}
                        disabled={!selectedInstitute && filteredBatches.length === 0}
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
                    )}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Update user roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((role) => {
                // Get role ID - handle both _id and id formats from API
                const roleId = role._id || (role as unknown as { id?: string }).id;
                const roleCode = `ROLE_${role.name.toUpperCase().replace(/\s+/g, '_')}`;

                // Check if role is selected - match by _id, id, roleCode, or name
                const isSelected = (roleId && selectedRoles.includes(roleId)) ||
                  selectedRoles.includes(roleCode) ||
                  selectedRoles.includes(role.name);
                return (
                <div key={roleId || role.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${roleId || role.name}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <Label
                    htmlFor={`role-${roleId || role.name}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {role.name}
                  </Label>
                </div>
                );
              })}
            </div>
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground">No roles available</p>
            )}
          </CardContent>
        </Card>

        {/* Validity */}
        <Card>
          <CardHeader>
            <CardTitle>Account Validity</CardTitle>
            <CardDescription>
              Update the validity period for this account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Controller
                  name="validityFrom"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !safeFormatDate(field.value, "PPP") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {safeFormatDate(field.value, "PPP") || "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Valid Till</Label>
                <Controller
                  name="validityTo"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !safeFormatDate(field.value, "PPP") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {safeFormatDate(field.value, "PPP") || "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigateWithCheck("/users")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        description="You have unsaved changes. Are you sure you want to leave?"
      />
    </div>
  );
}
