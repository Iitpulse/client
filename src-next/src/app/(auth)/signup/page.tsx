"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OtpInput } from "@/components/ui/otp-input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Step schemas - Simplified to 2 steps
const accountDetailsSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    promoCode: z.string().length(6, "Promo code must be 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const personalDetailsSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  contact: z.string().length(10, "Contact must be 10 digits"),
  dob: z.string().min(1, "Please select date of birth"),
});

type AccountDetails = z.infer<typeof accountDetailsSchema>;
type PersonalDetails = z.infer<typeof personalDetailsSchema>;

const steps = [
  { id: 1, name: "Account", description: "Create your account" },
  { id: 2, name: "Personal", description: "Basic information" },
];

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // OTP states
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpVerified, setOtpVerified] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Form data - Simplified
  const [accountDetails, setAccountDetails] = React.useState<AccountDetails>({
    email: "",
    password: "",
    confirmPassword: "",
    promoCode: "",
  });

  const [personalDetails, setPersonalDetails] = React.useState<PersonalDetails>({
    name: "",
    contact: "",
    dob: "",
  });

  // Validation errors
  const [accountErrors, setAccountErrors] = React.useState<Record<string, string>>({});
  const [personalErrors, setPersonalErrors] = React.useState<Record<string, string>>({});

  const handleSendOtp = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountDetails.email)) {
      setAccountErrors({ email: "Please enter a valid email address" });
      return;
    }

    setSendingOtp(true);
    setError(null);
    try {
      await api.otp.sendEmail(accountDetails.email);
      setOtpSent(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || error.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setVerifyingOtp(true);
    setError(null);
    try {
      await api.otp.verifyEmail(accountDetails.email, otp);
      setOtpVerified(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || error.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    if (step === 1) {
      if (!otpVerified) {
        setError("Please verify your email first");
        return false;
      }
      const result = accountDetailsSchema.safeParse(accountDetails);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          errors[err.path[0] as string] = err.message;
        });
        setAccountErrors(errors);
        return false;
      }
      setAccountErrors({});
      return true;
    }

    if (step === 2) {
      const result = personalDetailsSchema.safeParse(personalDetails);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          errors[err.path[0] as string] = err.message;
        });
        setPersonalErrors(errors);
        return false;
      }
      setPersonalErrors({});
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 2));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setIsLoading(true);
    setError(null);

    try {
      const finalData = {
        email: accountDetails.email,
        password: accountDetails.password,
        promoCode: accountDetails.promoCode,
        name: personalDetails.name,
        contact: personalDetails.contact,
        dob: new Date(personalDetails.dob).toISOString(),
      };

      await api.registration.createStudent(finalData);
      router.push("/login?registered=true");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } } };
      setError(
        error.response?.data?.error?.message || error.response?.data?.message || "Failed to create account. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Student Registration
        </CardTitle>
        <CardDescription className="text-center">
          Create your account to get started
        </CardDescription>
      </CardHeader>

      {/* Stepper - Simplified to 2 steps */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-4 mt-[-1.5rem]",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {currentStep === 1 && !otpVerified && (
          <div className="p-3 text-sm text-amber-600 bg-amber-50 rounded-md">
            Please verify your email first to continue
          </div>
        )}

        {/* Step 1: Account Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={accountDetails.email}
                  onChange={(e) =>
                    setAccountDetails({
                      ...accountDetails,
                      email: e.target.value.toLowerCase(),
                    })
                  }
                  disabled={otpVerified}
                  className="flex-1"
                />
                {!otpVerified && !otpSent && (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !accountDetails.email.includes("@")}
                  >
                    {sendingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                )}
              </div>
              {accountErrors.email && (
                <p className="text-sm text-destructive">
                  {accountErrors.email}
                </p>
              )}
            </div>

            {otpSent && !otpVerified && (
              <div className="space-y-4">
                <Label className="text-center block">Enter OTP</Label>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={verifyingOtp}
                />
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otp.length !== 6}
                    className="w-full max-w-[200px]"
                  >
                    {verifyingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                  >
                    Resend OTP
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Check your email inbox for the OTP
                  </p>
                </div>
              </div>
            )}

            {otpVerified && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Email verified
              </div>
            )}

            {otpVerified && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={accountDetails.password}
                      onChange={(e) =>
                        setAccountDetails({
                          ...accountDetails,
                          password: e.target.value,
                        })
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {accountErrors.password && (
                    <p className="text-sm text-destructive">
                      {accountErrors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={accountDetails.confirmPassword}
                      onChange={(e) =>
                        setAccountDetails({
                          ...accountDetails,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {accountErrors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {accountErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <Input
                    id="promoCode"
                    type="text"
                    placeholder="6 character promo code"
                    value={accountDetails.promoCode}
                    onChange={(e) =>
                      setAccountDetails({
                        ...accountDetails,
                        promoCode: e.target.value.toUpperCase().slice(0, 6),
                      })
                    }
                  />
                  {accountErrors.promoCode && (
                    <p className="text-sm text-destructive">
                      {accountErrors.promoCode}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the promo code provided by your institute
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Personal Details (Simplified) */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={personalDetails.name}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    name: e.target.value,
                  })
                }
              />
              {personalErrors.name && (
                <p className="text-sm text-destructive">
                  {personalErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Phone Number</Label>
              <Input
                id="contact"
                type="tel"
                placeholder="10 digit phone number"
                value={personalDetails.contact}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    contact: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
              {personalErrors.contact && (
                <p className="text-sm text-destructive">
                  {personalErrors.contact}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={personalDetails.dob}
                onChange={(e) =>
                  setPersonalDetails({
                    ...personalDetails,
                    dob: e.target.value,
                  })
                }
                max={new Date().toISOString().split("T")[0]}
              />
              {personalErrors.dob && (
                <p className="text-sm text-destructive">
                  {personalErrors.dob}
                </p>
              )}
            </div>

            <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-md">
              You can complete your profile with additional details after logging in.
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="flex w-full gap-4">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={isLoading}
              className="flex-1"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}

          {currentStep < 2 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading || (currentStep === 1 && !otpVerified)}
              className="flex-1"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          )}
        </div>

        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
