"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermissionsStore } from "@/stores";
import {
  LayoutDashboard,
  FileText,
  Users,
  Layers,
  BookOpen,
  Shield,
  Building2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  User,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Questions",
    href: "/questions",
    icon: BookOpen,
    permission: "question",
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    permission: "user",
  },
  {
    title: "Tests",
    href: "/tests",
    icon: FileText,
    permission: "test",
  },
  {
    title: "Patterns",
    href: "/patterns",
    icon: Layers,
    permission: "pattern",
  },
  {
    title: "Batches",
    href: "/batches",
    icon: GraduationCap,
    permission: "batch",
  },
  {
    title: "Roles",
    href: "/roles",
    icon: Shield,
    permission: "role",
  },
  {
    title: "Institutes",
    href: "/institutes",
    icon: Building2,
    permission: "role", // Same as roles - only visible to those who can manage roles
  },
  {
    title: "Subjects",
    href: "/subjects",
    icon: Settings,
    permission: "role", // Misc/Subjects - only visible to those who can manage roles
  },
  {
    title: "Exams",
    href: "/exams",
    icon: ClipboardList,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasAccess, isLoading } = usePermissionsStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasAccess[item.permission as keyof typeof hasAccess];
  });

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">IITP</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {isLoading ? (
          // Show skeleton while loading permissions
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                className={cn("h-10 rounded-md", collapsed ? "w-10" : "w-full")}
              />
            ))}
          </>
        ) : (
          filteredItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })
        )}
      </nav>

      {/* Profile at bottom */}
      <div className="border-t p-2">
        <Link
          href="/profile"
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            pathname === "/profile" && "bg-primary text-primary-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Profile" : undefined}
        >
          <User className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span>Profile</span>}
        </Link>
      </div>
    </aside>
  );
}
