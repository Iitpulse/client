"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Topbar } from "@/components/admin/Topbar";
import { titleFor } from "@/components/admin/nav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Paper } from "@iitpulse/ui";

/**
 * Pages rebuilt on the boards (M5). They draw their own <Topbar> and use the design system directly;
 * every other page still gets a generic top bar and the quarantined Tailwind v3 look ([data-legacy], app/legacy.css).
 */
const MIGRATED: RegExp[] = [];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
      <div data-legacy="" className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const migrated = MIGRATED.some((re) => re.test(pathname));

  return (
    // Admin surface (boards: .admin.shell): the calm paper ground (dot grid, grain .24); the white sidebar
    // carries the margin rule on its edge. The main column scrolls; its top bar is sticky.
    <Paper surface="admin" className="admin flex h-screen overflow-hidden">
      <AdminSidebar />
      <div id="admin-main" className="col h-screen min-w-0 flex-1 overflow-y-auto">
        {migrated ? (
          children
        ) : (
          <>
            <Topbar title={titleFor(pathname)} />
            <main data-legacy="" className="flex-1 p-6">
              {children}
            </main>
          </>
        )}
      </div>

      {/* Onboarding wizard for students who haven't completed their profile */}
      <OnboardingWizard
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </Paper>
  );
}
