"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Paper } from "@iitpulse/ui";
import { InstituteBanners } from "@/components/brand/InstituteBanners";
import { StaffTermsPrompt } from "@/components/m7b/staff-terms";
import { SupportVisitBanner } from "@/components/m8/SupportVisitBanner";
import { auth } from "@/lib/session";
import { OfflineBanner } from "@/components/kit";
import { LibraryWarningDialog } from "@/components/questions-admin/library-warning";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, currentUser, fetchUserDetails } = useAuthStore();
  const { fetchRoles } = usePermissionsStore();

  useEffect(() => {
    const isValid = checkAuth();
    if (!isValid) {
      router.push("/login");
      return;
    }

    // Fetch roles/permissions on mount
    fetchRoles();
    // Profile details (name, institute) for the sidebar and the dashboard greeting
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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    // Admin surface (boards: .admin.shell): the calm paper ground (dot grid, grain .24); the white sidebar
    // carries the margin rule on its edge. The main column scrolls; its top bar is sticky.
    <Paper surface="admin" className="admin flex h-screen overflow-hidden">
      <AdminSidebar />
      <div id="admin-main" className="col h-screen min-w-0 flex-1 overflow-y-auto">
        {/* M8 Platform-Impersonation: the read-only banner during an IIT-PULSE support visit */}
        <SupportVisitBanner />
        {/* Admin-SeatsBanners: past due / paused / AI paused, above the page's own top bar (nothing in good standing) */}
        <InstituteBanners />
        {/* Kit-States "Offline": a banner, not a page, on every route; the page keeps what it loaded */}
        <OfflineBanner />
        {/* Every page draws its own <Topbar> (the (legacy) group with its generic one is gone since the M6 exit). */}
        {children}
      </div>

      {/* M7b: changed terms are accepted before work continues (board Admin-Security, terms-changed); not during a support visit */}
      {!auth.isSupportVisit() && <StaffTermsPrompt />}
      {/* M10: "N of these are already in the library" for every paper write on an IIT-PULSE paper (lib/m10-library-warning.ts) */}
      <LibraryWarningDialog />
    </Paper>
  );
}
