/*
  The admin route map, shared by the AdminSidebar, the ⌘K palette and the topbar titles of pages that are
  not migrated yet. Boards: AdminSidebar `nav="m6"` (groups Overview, Content, People, System; "Batches & setup" is
  one page with tabs since M6) and `nav="teacher"` (no setup, roles, audit or templates; Users reads "My students").
  The board's Institute group: Branding since M7b (admins or MANAGE_BRANDING); Billing & usage since M9 (the Owner
  only: `ownerOnly`; a support visit sees it read-only). Messages since batch 9 (Admin-Messages: under Billing & usage,
  Owner and Admin only: `adminOnly`).
*/
import {
  CreditCard,
  MessageSquareText,
  FileQuestionMark,
  Palette,
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
export type Access = "question" | "user" | "test" | "pattern" | "batch" | "role" | "subject" | "branding";

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
  /** Sub-pages listed under the item while one of them is open. */
  children?: NavLink[];
  /** Hidden from teachers (board AdminSidebar `nav="teacher"`: no setup, roles, audit or templates). */
  staffOnly?: boolean;
  /** Only the institute's Owner (M9 Billing & usage; route access is owner-only server side) */
  ownerOnly?: boolean;
  /** Owner and Admins only (batch 9 Messages; the API answers 403 to other roles) */
  adminOnly?: boolean;
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
      { key: "templates", label: "Exam UI templates", href: "/templates", icon: PanelTop, permission: "test", keywords: ["ui templates", "wording", "instructions", "calculator"], staffOnly: true },
    ],
  },
  {
    label: "People",
    items: [
      { key: "users", label: "Users", href: "/users", icon: Users, permission: "user", keywords: ["students", "teachers", "admins"] },
      {
        key: "setup",
        label: "Batches & setup",
        href: "/setup",
        icon: House,
        permission: "batch",
        match: ["/batches", "/exams", "/subjects", "/institutes"],
        keywords: ["batches", "classes", "promo codes", "exams", "subjects", "chapters", "topics", "centres", "centers", "institutes"],
        staffOnly: true,
      },
      { key: "roles", label: "Roles & access", href: "/roles", icon: Shield, permission: "role", keywords: ["permissions"], staffOnly: true },
    ],
  },
  {
    label: "Institute",
    items: [
      { key: "branding", label: "Branding", href: "/branding", icon: Palette, permission: "branding", keywords: ["logo", "colour", "color", "theme", "white label"], staffOnly: true },
      { key: "billing", label: "Billing & usage", href: "/billing", icon: CreditCard, keywords: ["invoices", "plan", "ai credits", "top-up", "gst", "payment"], staffOnly: true, ownerOnly: true },
      { key: "messages", label: "Messages", href: "/messages", icon: MessageSquareText, keywords: ["sms", "text messages", "delivery", "dlt", "templates", "sender"], staffOnly: true, adminOnly: true },
    ],
  },
  {
    label: "System",
    items: [{ key: "audit", label: "Audit logs", href: "/audit-logs", icon: History, permission: "role", keywords: ["history", "activity"], staffOnly: true }],
  },
];

/** Create actions offered by the ⌘K palette. */
export const ACTIONS: (NavLink & { icon: LucideIcon })[] = [
  { label: "New test", href: "/tests/new", permission: "test", icon: SquareCheck, keywords: ["create test"] },
  { label: "New question", href: "/questions/new", permission: "question", icon: FileQuestionMark, keywords: ["create question", "add question"] },
  { label: "Bulk upload questions", href: "/questions/bulk-upload", permission: "question", icon: Upload, keywords: ["import", "word", "pdf"] },
  { label: "Add user", href: "/users?add=student", permission: "user", icon: UserPlus, keywords: ["add student", "new student", "teacher"] },
  { label: "New pattern", href: "/patterns/new", permission: "pattern", icon: Layers },
  { label: "New role", href: "/roles?new=1", permission: "role", icon: Shield },
];

export function allowed(link: NavLink, hasAccess: Record<Access, boolean>): boolean {
  return !link.permission || !!hasAccess[link.permission];
}

/** Visible children of an item; an item with children is shown when any child is, and opens the first one. */
export function visibleItem(item: NavItem, hasAccess: Record<Access, boolean>, teacher = false, owner = false, admin = false): NavItem | null {
  if (teacher && item.staffOnly) return null;
  if (item.ownerOnly && !owner) return null;
  if (item.adminOnly && !admin) return null;
  if (teacher && item.key === "users") return { ...item, label: "My students" };
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
