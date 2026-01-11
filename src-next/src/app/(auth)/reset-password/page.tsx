"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, KeyRound, CheckCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
import { OtpInput } from "@/components/ui/otp-input";
import { apiUsers } from "@/lib/api";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const otpSchema = z.object({
  otp: z.string().min(4, "OTP must be at least 4 characters"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "otp" | "password" | "success">("email");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [passwordMatchStatus, setPasswordMatchStatus] = React.useState<"idle" | "match" | "mismatch">("idle");

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Watch password fields for live matching with debounce
  const password = passwordForm.watch("password");
  const confirmPassword = passwordForm.watch("confirmPassword");

  React.useEffect(() => {
    // Reset to idle if either field is empty
    if (!password || !confirmPassword) {
      setPasswordMatchStatus("idle");
      return;
    }

    // Debounce the comparison
    const timer = setTimeout(() => {
      if (password === confirmPassword) {
        setPasswordMatchStatus("match");
      } else {
        setPasswordMatchStatus("mismatch");
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [password, confirmPassword]);

  const handleEmailSubmit = async (data: EmailFormData) => {
    setLoading(true);
    setError("");
    try {
      await apiUsers.post("/otp/email/send", { email: data.email });
      setEmail(data.email);
      setStep("otp");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiUsers.post("/otp/email/verify", { email, emailotp: otp });
      setStep("password");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    setError("");
    try {
      await apiUsers.post("/reset-password", { email, password: data.password });
      setStep("success");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center mb-4">
            <img src="/logo.svg" alt="IIT Pulse" className="h-16 w-auto mb-2" />
            <span className="text-xl font-bold text-primary">IIT Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription>
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "otp" && "Enter the verification code sent to your email"}
            {step === "password" && "Create a new password for your account"}
            {step === "success" && "Your password has been reset successfully"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    {...emailForm.register("email")}
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div className="space-y-4">
                <Label className="text-center block">Verification Code</Label>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Code sent to {email}
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={loading || otp.length !== 6}
                onClick={handleOtpSubmit}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
              >
                Use a different email
              </Button>
            </div>
          )}

          {step === "password" && (
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="pl-10 pr-10"
                    {...passwordForm.register("password")}
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
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className={cn(
                      "pl-10 pr-16",
                      passwordMatchStatus === "match" && "border-green-500 focus-visible:ring-green-500",
                      passwordMatchStatus === "mismatch" && "border-red-500 focus-visible:ring-red-500"
                    )}
                    {...passwordForm.register("confirmPassword")}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {passwordMatchStatus === "match" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {passwordMatchStatus === "mismatch" && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {passwordMatchStatus === "match" && (
                  <p className="text-sm text-green-500 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
                {passwordMatchStatus === "mismatch" && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
                {passwordForm.formState.errors.confirmPassword && passwordMatchStatus === "idle" && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                Your password has been reset successfully. You can now login with your new password.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
