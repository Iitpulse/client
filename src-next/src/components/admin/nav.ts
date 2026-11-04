/*
  The admin route map, shared by the AdminSidebar, the ⌘K palette and the topbar titles of pages that are
  not migrated yet. Boards: AdminSidebar (groups Overview, Content, People, System). The board's Institute
  group (Billing & usage, Branding) has no routes before M7/M9, so it is not drawn.
*/
import {
  FileQuestionMark,
  History,
  House,
  LayoutDashboard,
  Layers,
  type LucideIcon,
  PanelTop,
  Shield,
  SquareCheck,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";

/** Feature flags from the permissions store (stores/permissions.store.ts `hasAccess`). */
export type Access = "question" | "user" | "test" | "pattern" | "batch" | "role" | "subject";

export interface NavLink {
  label: string;
  href: string;
  permission?: Access;
  /** Extra path prefixes that keep this item highlighted. */
  match?: string[];
  keywords?: string[];
}

export interface NavItem extends NavLink {
  key: string;
  icon: LucideIcon;
  /** Sub-pages listed under the item while one of them is open (Batches & setup until M6 merges them into /setup). */
  children?: NavLink[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, keywords: ["home"] }],
  },
  {
    label: "Content",
    items: [
      { key: "questions", label: "Question bank", href: "/questions", icon: FileQuestionMark, permission: "question", keywords: ["questions"] },
      { key: "tests", label: "Tests", href: "/tests", icon: SquareCheck, permission: "test", keywords: ["exams", "mocks", "results"] },
      { key: "patterns", label: "Patterns", href: "/patterns", icon: Layers, permission: "pattern" },
      { key: "templates", label: "Exam UI templates", href: "/ui-templates", icon: PanelTop, permission: "test", keywords: ["ui templates", "theme"] },
    ],
  },
  {
    label: "People",
    items: [
      { key: "users", label: "Users", href: "/users", icon: Users, permission: "user", keywords: ["students", "teachers", "admins"] },
      {
        key: "setup",
        label: "Batches & setup",
        href: "/batches",
        icon: House,
        children: [
          { label: "Batches", href: "/batches", permission: "batch", keywords: ["classes"] },
          { label: "Exams", href: "/exams", permission: "pattern" },
          { label: "Subjects", href: "/subjects", permission: "role", keywords: ["chapters", "topics"] },
          { label: "Institutes", href: "/institutes", permission: "role", keywords: ["centres", "centers"] },
        ],
      },
      { key: "roles", label: "Roles & access", href: "/roles", icon: Shield, permission: "role", keywords: ["permissions"] },
    ],
  },
  {
    label: "System",
    items: [{ key: "audit", label: "Audit logs", href: "/audit-logs", icon: History, permission: "role", keywords: ["history", "activity"] }],
  },
];

/** Create actions offered by the ⌘K palette. */
export const ACTIONS: (NavLink & { icon: LucideIcon })[] = [
  { label: "New test", href: "/tests/new", permission: "test", icon: SquareCheck, keywords: ["create test"] },
  { label: "New question", href: "/questions/new", permission: "question", icon: FileQuestionMark, keywords: ["create question", "add question"] },
  { label: "Bulk upload questions", href: "/questions/bulk-upload", permission: "question", icon: Upload, keywords: ["import", "word", "pdf"] },
  { label: "Add user", href: "/users/new", permission: "user", icon: UserPlus, keywords: ["add student", "new student", "teacher"] },
  { label: "New pattern", href: "/patterns/new", permission: "pattern", icon: Layers },
  { label: "New role", href: "/roles/new", permission: "role", icon: Shield },
];

export function allowed(link: NavLink, hasAccess: Record<Access, boolean>): boolean {
  return !link.permission || !!hasAccess[link.permission];
}

/** Visible children of an item; an item with children is shown when any child is, and opens the first one. */
export function visibleItem(item: NavItem, hasAccess: Record<Access, boolean>): NavItem | null {
  if (!item.children) return allowed(item, hasAccess) ? item : null;
  const children = item.children.filter((c) => allowed(c, hasAccess));
  if (!children.length) return null;
  return { ...item, href: children[0].href, children };
}

export function isActive(pathname: string, link: NavLink & { children?: NavLink[] }): boolean {
  const prefixes = [link.href, ...(link.match ?? []), ...(link.children?.map((c) => c.href) ?? [])];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
}

/** Topbar titles for pages that do not draw their own topbar yet (the legacy pages). */
const TITLES: [RegExp, string][] = [
  [/^\/tests\/new$/, "New test"],
  [/^\/tests\/[^/]+\/edit$/, "Edit test"],
  [/^\/tests\/[^/]+\/preview$/, "Test preview"],
  [/^\/tests\/[^/]+\/result$/, "Results"],
  [/^\/tests\/[^/]+\/detailed-analysis$/, "Analysis"],
  [/^\/tests\/[^/]+\/student\/[^/]+$/, "Student report"],
  [/^\/questions\/new$/, "New question"],
  [/^\/questions\/bulk-upload$/, "Bulk upload"],
  [/^\/questions\/[^/]+\/edit$/, "Edit question"],
  [/^\/questions\/[^/]+\/preview$/, "Question preview"],
  [/^\/patterns\/new$/, "New pattern"],
  [/^\/patterns\/[^/]+\/edit$/, "Edit pattern"],
  [/^\/patterns\/[^/]+\/preview$/, "Pattern preview"],
  [/^\/users\/new$/, "Add user"],
  [/^\/users\/[^/]+\/edit$/, "Edit user"],
  [/^\/roles\/new$/, "New role"],
  [/^\/roles\/[^/]+$/, "Role"],
  [/^\/profile$/, "Profile"],
  [/^\/batches$/, "Batches"],
  [/^\/exams$/, "Exams"],
  [/^\/subjects$/, "Subjects"],
  [/^\/institutes$/, "Institutes"],
];

export function titleFor(pathname: string): string {
  for (const [re, title] of TITLES) if (re.test(pathname)) return title;
  for (const g of NAV) for (const item of g.items) if (isActive(pathname, item)) return item.label;
  return "Dashboard";
}
