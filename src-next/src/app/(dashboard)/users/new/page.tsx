"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { api } from "@/lib/api";
import { IBatch, IInstitute, ISubject, IRole } from "@/types";
import { cn } from "@/lib/utils";
import { SearchableSelect, SearchableMultiSelect } from "@/components/ui/searchable-select";

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

// Base schema fields (without refinement, so it can be extended)
const baseFields = {
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(50, "Password must be at most 50 characters"),
  confirmPassword: z.string(),
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
};

// Password match refinement
const passwordRefinement = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Base schema for all users (with refinement)
const baseUserSchema = passwordRefinement(z.object(baseFields));

// Student-specific schema
const studentSchema = passwordRefinement(
  z.object({
    ...baseFields,
    batch: z.string().optional(),
    standard: z.string().optional(),
    school: z.string().max(50).optional().or(z.literal("")),
    stream: z.string().optional(),
    medium: z.string().optional(),
    parentName: z.string().optional(),
    parentContact: z.string().regex(/^\d{10}$/, "Parent contact must be exactly 10 digits").optional().or(z.literal("")),
  })
);

// Teacher-specific schema
const teacherSchema = passwordRefinement(
  z.object({
    ...baseFields,
    subjects: z.array(z.string()).optional(),
  })
);

type StudentFormData = z.infer<typeof studentSchema>;
type TeacherFormData = z.infer<typeof teacherSchema>;
type BaseFormData = z.infer<typeof baseUserSchema>;
type UserFormData = StudentFormData | TeacherFormData | BaseFormData;

const userTypes = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "manager", label: "Manager" },
];

export default function CreateUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const userType = searchParams.get("type") || "student";

  const [institutes, setInstitutes] = React.useState<IInstitute[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [roles, setRoles] = React.useState<IRole[]>([]);
  const [loading, setLoading] = React.useState(false);

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
    watch,
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
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  const filteredBatches = selectedInstitute
    ? batches.filter((b) => {
        const batchInstitute = typeof b.institute === "object" ? b.institute?._id : b.institute;
        return batchInstitute === selectedInstitute;
      })
    : batches;

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      // Build the user data object based on user type
      const userData: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        password: data.password,
        contact: data.contact,
        dob: data.dob ? format(data.dob, "yyyy-MM-dd") : undefined,
        gender: data.gender,
        address: data.address,
        city: data.city,
        state: data.state,
        institute: data.institute,
        roles: data.roles,
        validity: {
          from: data.validityFrom ? format(data.validityFrom, "yyyy-MM-dd") : undefined,
          to: data.validityTo ? format(data.validityTo, "yyyy-MM-dd") : undefined,
        },
        userType: userType,
      };

      // Add student-specific fields
      if (userType === "student") {
        const studentData = data as StudentFormData;
        userData.batch = studentData.batch;
        userData.standard = studentData.standard;
        userData.school = studentData.school;
        userData.stream = studentData.stream;
        userData.medium = studentData.medium;
        userData.parentDetails = {
          name: studentData.parentName,
          contact: studentData.parentContact,
        };
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
          await api.users.createStudent(userData);
          break;
        case "teacher":
          await api.users.createTeacher(userData);
          break;
        case "admin":
          await api.users.createAdmin(userData);
          break;
        case "operator":
          await api.users.createOperator(userData);
          break;
        case "manager":
          await api.users.createManager(userData);
          break;
      }

      toast({
        title: "Success",
        description: `${getUserTypeLabel()} created successfully`,
      });
      router.push("/users");
    } catch (error: unknown) {
      console.error("Failed to create user:", error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create user";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeLabel = () => {
    return userTypes.find((t) => t.value === userType)?.label || "User";
  };

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
          <h1 className="text-3xl font-bold tracking-tight">
            Create {getUserTypeLabel()}
          </h1>
          <p className="text-muted-foreground">
            Add a new {userType} to the system
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Enter the user&apos;s personal information
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
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Select date"}
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
                    <SearchableSelect
                      options={genderOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select gender"
                      searchPlaceholder="Search gender..."
                    />
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
                    <SearchableSelect
                      options={indianStates.map((state) => ({ value: state, label: state }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select state"
                      searchPlaceholder="Search state..."
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Set a secure password for the account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
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
                Enter academic information
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
                      <SearchableSelect
                        options={standardOptions}
                        value={field.value as string}
                        onValueChange={field.onChange}
                        placeholder="Select class"
                        searchPlaceholder="Search class..."
                      />
                    )}
                  />
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
                      <SearchableSelect
                        options={streamOptions}
                        value={field.value as string}
                        onValueChange={field.onChange}
                        placeholder="Select stream"
                        searchPlaceholder="Search stream..."
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Medium</Label>
                  <Controller
                    name="medium"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={mediumOptions}
                        value={field.value as string}
                        onValueChange={field.onChange}
                        placeholder="Select medium"
                        searchPlaceholder="Search medium..."
                      />
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
                Enter parent or guardian information
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
                Select subjects the teacher will teach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="subjects"
                control={control}
                render={({ field }) => (
                  <SearchableMultiSelect
                    options={subjects.map((s) => ({ value: s._id, label: s.name }))}
                    value={field.value as string[] || []}
                    onValueChange={field.onChange}
                    placeholder="Select subjects"
                    searchPlaceholder="Search subjects..."
                    emptyText="No subjects found"
                  />
                )}
              />
              {subjects.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No subjects available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Organization - Institute & Batch */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Assign to an institute {userType === "student" && "and batch"}
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
                    <SearchableSelect
                      options={institutes.map((i) => ({ value: i._id, label: i.name }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select institute"
                      searchPlaceholder="Search institute..."
                    />
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
                      <SearchableSelect
                        options={filteredBatches.map((b) => ({ value: b._id, label: b.name }))}
                        value={field.value as string}
                        onValueChange={field.onChange}
                        placeholder="Select batch"
                        searchPlaceholder="Search batch..."
                        disabled={!selectedInstitute && filteredBatches.length === 0}
                      />
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
              Assign roles to the user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="roles"
              control={control}
              render={({ field }) => (
                <SearchableMultiSelect
                  options={roles.map((r) => ({ value: r._id, label: r.name }))}
                  value={field.value || []}
                  onValueChange={field.onChange}
                  placeholder="Select roles"
                  searchPlaceholder="Search roles..."
                  emptyText="No roles found"
                />
              )}
            />
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No roles available</p>
            )}
          </CardContent>
        </Card>

        {/* Validity */}
        <Card>
          <CardHeader>
            <CardTitle>Account Validity</CardTitle>
            <CardDescription>
              Set the validity period for this account
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
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Select start date"}
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
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Select end date"}
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
            {loading ? "Creating..." : `Create ${getUserTypeLabel()}`}
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
