"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, currentUser, userDetails, fetchUserDetails } = useAuthStore();
  const { fetchRoles } = usePermissionsStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const isValid = checkAuth();
    if (!isValid) {
      router.push("/login");
      return;
    }

    // Fetch roles/permissions on mount
    fetchRoles();
    // Fetch user details to check onboarding status
    fetchUserDetails();
  }, [checkAuth, router, fetchRoles, fetchUserDetails]);

  // Update page title based on user type
  useEffect(() => {
    if (currentUser?.userType) {
      const titleMap: Record<string, string> = {
        student: "IITP Student Dashboard",
        teacher: "IITP Teacher Dashboard",
        admin: "IITP Admin Dashboard",
        superadmin: "IITP Super Admin Dashboard",
        operator: "IITP Operator Dashboard",
        manager: "IITP Manager Dashboard",
      };
      document.title = titleMap[currentUser.userType] || "IITP Dashboard";
    }
  }, [currentUser?.userType]);

  // Check if student needs to complete onboarding
  useEffect(() => {
    if (
      currentUser?.userType === "student" &&
      userDetails &&
      // @ts-expect-error - onboardingCompleted may not exist in older records
      userDetails.onboardingCompleted === false
    ) {
      setShowOnboarding(true);
    }
  }, [currentUser, userDetails]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-muted/30 p-6">{children}</main>
      </div>

      {/* Onboarding wizard for students who haven't completed their profile */}
      <OnboardingWizard
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
