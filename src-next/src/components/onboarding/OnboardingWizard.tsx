"use client";

import * as React from "react";
import { z } from "zod";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores";

// Indian states for dropdown
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
];

// Onboarding schema
const onboardingSchema = z.object({
  school: z.string().min(3, "School name must be at least 3 characters"),
  standard: z.string().min(1, "Please select standard"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select gender",
  }),
  address: z.string().min(5, "Address must be at least 5 characters"),
  stream: z.string().min(1, "Please select stream"),
  medium: z.string().min(1, "Please select medium"),
  parentName: z.string().min(1, "Parent name is required"),
  parentContact: z.string().length(10, "Parent contact must be 10 digits"),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function OnboardingWizard({
  open,
  onOpenChange,
  onComplete,
}: OnboardingWizardProps) {
  const { currentUser, fetchUserDetails } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [classes, setClasses] = React.useState<{ name: string }[]>([]);

  const [formData, setFormData] = React.useState<OnboardingData>({
    school: "",
    standard: "",
    city: "",
    state: "",
    gender: "male",
    address: "",
    stream: "",
    medium: "",
    parentName: "",
    parentContact: "",
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Fetch classes on mount
  React.useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.registration.getClasses();
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data);
        }
      } catch (err) {
        console.log("Using fallback class options");
      }
    };
    fetchClasses();
  }, []);

  const handleSubmit = async () => {
    setError(null);

    const result = onboardingSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!currentUser?.id) {
      setError("User not found. Please log in again.");
      return;
    }

    setIsLoading(true);

    try {
      await api.registration.completeOnboarding(currentUser.id, {
        school: formData.school,
        standard: formData.standard,
        city: formData.city,
        state: formData.state,
        gender: formData.gender,
        address: formData.address,
        stream: formData.stream,
        medium: formData.medium,
        parentDetails: {
          name: formData.parentName,
          contact: formData.parentContact,
        },
      });

      // Refresh user details to update onboardingCompleted status
      await fetchUserDetails();

      onOpenChange(false);
      onComplete?.();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; error?: { message?: string } } };
      };
      setError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to save profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please fill in the remaining details to complete your profile. This
            helps us personalize your experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school">School/College Name *</Label>
              <Input
                id="school"
                placeholder="Your school or college name"
                value={formData.school}
                onChange={(e) =>
                  setFormData({ ...formData, school: e.target.value })
                }
              />
              {errors.school && (
                <p className="text-sm text-destructive">{errors.school}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="standard">Standard/Class *</Label>
              <Select
                value={formData.standard}
                onValueChange={(value) =>
                  setFormData({ ...formData, standard: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <SelectItem key={cls.name} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="11">Class 11</SelectItem>
                      <SelectItem value="12">Class 12</SelectItem>
                      <SelectItem value="dropper">Dropper</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.standard && (
                <p className="text-sm text-destructive">{errors.standard}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    gender: value as "male" | "female" | "other",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-destructive">{errors.gender}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Your city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) =>
                  setFormData({ ...formData, state: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream">Stream *</Label>
              <Select
                value={formData.stream}
                onValueChange={(value) =>
                  setFormData({ ...formData, stream: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcm">
                    PCM (Physics, Chemistry, Maths)
                  </SelectItem>
                  <SelectItem value="pcb">
                    PCB (Physics, Chemistry, Biology)
                  </SelectItem>
                  <SelectItem value="pcmb">PCMB (All Sciences)</SelectItem>
                  <SelectItem value="arts">Arts</SelectItem>
                  <SelectItem value="commerce">Commerce</SelectItem>
                </SelectContent>
              </Select>
              {errors.stream && (
                <p className="text-sm text-destructive">{errors.stream}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="medium">Medium *</Label>
              <Select
                value={formData.medium}
                onValueChange={(value) =>
                  setFormData({ ...formData, medium: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
              {errors.medium && (
                <p className="text-sm text-destructive">{errors.medium}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentName">Parent/Guardian Name *</Label>
              <Input
                id="parentName"
                placeholder="Parent name"
                value={formData.parentName}
                onChange={(e) =>
                  setFormData({ ...formData, parentName: e.target.value })
                }
              />
              {errors.parentName && (
                <p className="text-sm text-destructive">{errors.parentName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentContact">Parent Contact *</Label>
              <Input
                id="parentContact"
                type="tel"
                placeholder="10 digit number"
                value={formData.parentContact}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentContact: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
              {errors.parentContact && (
                <p className="text-sm text-destructive">
                  {errors.parentContact}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              placeholder="Your full address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Complete Profile"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
