"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTablet } from "@/components/kit/utils";
import { useMe } from "@/lib/m6/people";
import { LogOut, Search } from "lucide-react";
import { LogoMark } from "@iitpulse/ui";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { getInitials } from "@/lib/utils";
import { useQuestionBankTotals } from "@/lib/queries";
import { useBankCounts, useLiveTests } from "@/lib/queries-tests-admin";
import { CommandPalette } from "./CommandPalette";
import { NAV, isActive, visibleItem, type Access } from "./nav";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  teacher: "Teacher",
  operator: "Operator",
  manager: "Manager",
  student: "Student",
};

function compact(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
}

/**
 * AdminSidebar board: logo, ⌘K "Search", grouped nav (Question bank total, Tests live count), the signed-in user at
 * the foot. The "AI this month" meter is the board's `aiMeterM9` tweak (off): M9, not drawn. `nav="m6"`: Batches &
 * setup is one page; `nav="teacher"`: no setup, roles, audit or templates and Users reads "My students". Under 1180px
 * (tablets) it folds to the board's 72px icon rail: labels stay for screen readers and show as tooltips.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { currentUser, userDetails, logout } = useAuthStore();
  const { hasAccess, isLoading } = usePermissionsStore();
  const access = hasAccess as Record<Access, boolean>;
  const isStaff = !!currentUser && currentUser.userType !== "student";
  const bankM5 = useBankCounts(!isLoading && access.question && isStaff);
  // Before the M5 search route (or for an engine still on Mongo): the per-type totals.
  const bankOld = useQuestionBankTotals(!isLoading && access.question && (!isStaff || bankM5.isError));
  const bankTotal = bankM5.data?.total ?? bankOld.data?.total;
  const live = useLiveTests(!isLoading && access.test && isStaff);
  const liveCount = live.data?.tests.length ?? 0;

  const rail = useTablet();
  const me = useMe().data;
  // /me is the server's view of the signed-in account; the persisted store is the fallback while it loads.
  const teacher = (me?.user.userType ?? currentUser?.userType) === "teacher";
  const name = me?.user.name || userDetails?.name || currentUser?.name || currentUser?.email || "";
  // Board: "Academic head · IIT-PULSE Indore" (first role name · centre or institute).
  const role = me
    ? [me.user.roles[0]?.name ?? ROLE_LABEL[me.user.userType], me.user.centre?.name ?? me.tenant.name].filter(Boolean).join(" · ")
    : ROLE_LABEL[currentUser?.userType ?? ""] ?? currentUser?.userType ?? "";

  return (
    <aside
      aria-label="Admin navigation"
      className={`cl-margin-edge col sticky top-0 h-screen shrink-0 gap-1.5 overflow-y-auto bg-surface pt-5 pb-2 ${rail ? "admin-rail w-[72px] px-2.5" : "w-[264px] px-3.5"}`}
    >
      <Link href="/" className={`flex pt-1 pb-2.5 ${rail ? "justify-center overflow-hidden px-0" : "px-2"}`} aria-label="Dashboard">
        <span className={rail ? "block w-[28px] overflow-hidden" : undefined}>
          <BrandLogo fallback={<LogoMark />} />
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search (⌘K)"
        title={rail ? "Search (⌘K)" : undefined}
        className={`row mb-2.5 gap-2.5 rounded-control border border-line bg-ground text-muted transition-colors hover:border-brand-200 ${rail ? "h-11 justify-center px-0" : "h-10 px-3"}`}
      >
        <Search className="size-4" strokeWidth={2} aria-hidden />
        <span className={rail ? "sr-only" : "sm grow truncate text-left"}>Search</span>
        {!rail && <span className="kbd">⌘K</span>}
      </button>

      <nav className="col gap-1.5" aria-label="Sections">
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => <span key={i} className="skel h-[38px]" />)
          : NAV.map((g, gi) => {
              const items = g.items.map((i) => visibleItem(i, access, teacher)).filter((i) => i !== null);
              if (!items.length) return null;
              return (
                <div key={g.label} className="col gap-1.5">
                  {rail ? (
                    <span className="block h-2.5" aria-hidden>
                      <span className="sr-only">{g.label}</span>
                    </span>
                  ) : (
                    <span className={`eyebrow px-2.5 pb-1 text-[11px] ${gi === 0 ? "pt-2" : "pt-3"}`}>{g.label}</span>
                  )}
                  {items.map((item) => {
                    const on = isActive(pathname, item);
                    return (
                      <div key={item.key} className="col gap-0.5">
                        <Link
                          href={item.href}
                          className={`nav-item ${on ? "on" : ""} ${rail ? "h-11 justify-center px-0" : ""}`}
                          aria-current={on ? "page" : undefined}
                          title={rail ? item.label : undefined}
                        >
                          <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
                          <span className={rail ? "sr-only" : undefined}>{item.label}</span>
                          {!rail && item.key === "questions" && bankTotal !== undefined && (
                            <span className="xs mono ml-auto text-muted" title={`${bankTotal.toLocaleString("en-IN")} questions`}>
                              {compact(bankTotal)}
                            </span>
                          )}
                          {!rail && item.key === "tests" && liveCount > 0 && (
                            <span className="badge b-live ml-auto h-5 px-[7px]" title={`${liveCount} live now`} aria-label={`${liveCount} live now`}>
                              <span className="live-dot size-1.5" />
                              {liveCount}
                            </span>
                          )}
                        </Link>
                        {!rail && on && item.children && item.children.length > 1 && (
                          <div className="col gap-0.5 pb-1 pl-[38px]">
                            {item.children.map((c) => {
                              const cOn = pathname === c.href || pathname.startsWith(c.href + "/");
                              return (
                                <Link
                                  key={c.href}
                                  href={c.href}
                                  aria-current={cOn ? "page" : undefined}
                                  className={`sm rounded-lg px-2.5 py-1.5 font-medium transition-colors ${cOn ? "text-brand" : "text-muted hover:bg-ground hover:text-ink"}`}
                                >
                                  {c.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
      </nav>

      <div className={`mt-auto flex items-center gap-1 pt-2.5 ${rail ? "flex-col" : ""}`}>
        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          title={rail ? "Your profile" : undefined}
          className={`row min-w-0 grow gap-2.5 rounded-control p-2 text-ink hover:bg-ground ${rail ? "justify-center" : ""} ${pathname === "/profile" ? "bg-brand-50" : ""}`}
        >
          <span className="avatar">{getInitials(name || "U")}</span>
          <span className={rail ? "sr-only" : "col min-w-0 grow gap-px"}>
            <span className="sm truncate font-semibold">{name}</span>
            <span className="xs muted truncate">{role}</span>
          </span>
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon danger-hover w-8 shrink-0"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </aside>
  );
}
