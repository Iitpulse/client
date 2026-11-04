"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Search } from "lucide-react";
import { LogoMark } from "@iitpulse/ui";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { getInitials } from "@/lib/utils";
import { useQuestionBankTotals } from "@/lib/queries";
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

/** AdminSidebar board: logo, ⌘K search, grouped nav, the signed-in user at the foot. */
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { currentUser, userDetails, logout } = useAuthStore();
  const { hasAccess, isLoading } = usePermissionsStore();
  const access = hasAccess as Record<Access, boolean>;
  const bank = useQuestionBankTotals(!isLoading && access.question);

  const name = userDetails?.name || currentUser?.name || currentUser?.email || "";
  const role = ROLE_LABEL[currentUser?.userType ?? ""] ?? currentUser?.userType ?? "";

  return (
    <aside
      aria-label="Admin navigation"
      className="cl-margin-edge col sticky top-0 h-screen w-[264px] shrink-0 gap-1.5 overflow-y-auto bg-surface px-3.5 pt-5 pb-2"
    >
      <Link href="/" className="flex px-2 pt-1 pb-2.5" aria-label="IIT-PULSE dashboard">
        <LogoMark />
      </Link>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="row mb-2.5 h-10 gap-2.5 rounded-control border border-line bg-ground px-3 text-muted transition-colors hover:border-brand-200"
      >
        <Search className="size-4" strokeWidth={2} aria-hidden />
        <span className="sm grow truncate text-left">Search</span>
        <span className="kbd">⌘K</span>
      </button>

      <nav className="col gap-1.5" aria-label="Sections">
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => <span key={i} className="skel h-[38px]" />)
          : NAV.map((g, gi) => {
              const items = g.items.map((i) => visibleItem(i, access)).filter((i) => i !== null);
              if (!items.length) return null;
              return (
                <div key={g.label} className="col gap-1.5">
                  <span className={`eyebrow px-2.5 pb-1 text-[11px] ${gi === 0 ? "pt-2" : "pt-3"}`}>{g.label}</span>
                  {items.map((item) => {
                    const on = isActive(pathname, item);
                    return (
                      <div key={item.key} className="col gap-0.5">
                        <Link href={item.href} className={`nav-item ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
                          <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
                          {item.label}
                          {item.key === "questions" && bank.data && (
                            <span className="xs mono ml-auto text-muted" title={`${bank.data.total.toLocaleString("en-IN")} questions`}>
                              {compact(bank.data.total)}
                            </span>
                          )}
                        </Link>
                        {on && item.children && item.children.length > 1 && (
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

      <div className="mt-auto flex items-center gap-1 pt-2.5">
        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className={`row min-w-0 grow gap-2.5 rounded-control p-2 text-ink hover:bg-ground ${pathname === "/profile" ? "bg-brand-50" : ""}`}
        >
          <span className="avatar">{getInitials(name || "U")}</span>
          <span className="col min-w-0 grow gap-px">
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
