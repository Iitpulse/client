"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CornerDownLeft, FileQuestionMark, LogOut, SquareCheck, User } from "lucide-react";
import { MathText } from "@iitpulse/ui";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePermissionsStore, useAuthStore } from "@/stores";
import { useAllTests } from "@/lib/queries";
import { useQuestionQuickSearch } from "@/lib/queries-tests-admin";
import { ACTIONS, NAV, allowed, visibleItem, type Access } from "./nav";
import { useBillingVisible } from "@/components/m7b/invites";

/**
 * ⌘K palette (AdminSidebar board: "Search"). M5 contract: search only, no "Ask AI". Pages and create actions, questions
 * through GET /questions/admin/search?q=…&pageSize=5, and tests by name (the admin's test list).
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const hasAccess = usePermissionsStore((s) => s.hasAccess) as Record<Access, boolean>;
  const logout = useAuthStore((s) => s.logout);
  const isStaff = useAuthStore((s) => !!s.currentUser && s.currentUser.userType !== "student");
  const currentUserIsTeacher = useAuthStore((s) => s.currentUser?.userType === "teacher");
  const billing = useBillingVisible();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);
  const questions = useQuestionQuickSearch(term, open && isStaff && !!hasAccess.question);
  const tests = useAllTests(open && isStaff && !!hasAccess.test);
  const testHits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!open || !hasAccess.test || needle.length < 2) return [];
    return (tests.data ?? []).filter((t) => t.name.toLowerCase().includes(needle)).slice(0, 5);
  }, [open, q, tests.data, hasAccess.test]);
  const questionHits = term.length >= 2 && term === q.trim() ? questions.data?.items ?? [] : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a page or start something new" className="sm:max-w-[560px]">
      <CommandInput placeholder="Search pages, tests and questions" value={q} onValueChange={setQ} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>{questions.isFetching ? "Searching…" : "Nothing matches."}</CommandEmpty>
        {testHits.length > 0 && (
          <CommandGroup heading="Tests">
            {testHits.map((t) => (
              <CommandItem key={t._id} value={`${q} test ${t.name} ${t._id}`} onSelect={() => go(`/tests/${t._id}/result`)}>
                <SquareCheck strokeWidth={1.8} className="text-muted" />
                <span className="truncate">{t.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {questionHits.length > 0 && (
          <CommandGroup heading="Questions">
            {questionHits.map((item) => (
              <CommandItem key={item.id} value={`${q} question ${item.id}`} onSelect={() => go(`/questions/${item.id}/edit`)}>
                <FileQuestionMark strokeWidth={1.8} className="text-muted" />
                <span className="col min-w-0 gap-0.5">
                  <MathText as="span" className="sm line-clamp-1" text={item.stemPreview || item.id} />
                  <span className="xs mono muted truncate">
                    {[item.id, item.subject?.name, item.chapters[0]?.name].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {NAV.map((g) => {
          const items = g.items.map((i) => visibleItem(i, hasAccess, currentUserIsTeacher, billing)).filter((i) => i !== null);
          if (!items.length) return null;
          return (
            <CommandGroup key={g.label} heading={g.label}>
              {items.flatMap((item) =>
                item.children
                  ? item.children.map((c) => (
                      <CommandItem key={c.href} value={`${c.label} ${item.label}`} keywords={c.keywords} onSelect={() => go(c.href)}>
                        <item.icon strokeWidth={1.8} className="text-muted" />
                        {c.label}
                      </CommandItem>
                    ))
                  : [
                      <CommandItem key={item.href} value={item.label} keywords={item.keywords} onSelect={() => go(item.href)}>
                        <item.icon strokeWidth={1.8} className="text-muted" />
                        {item.label}
                      </CommandItem>,
                    ]
              )}
            </CommandGroup>
          );
        })}
        <CommandGroup heading="Create">
          {ACTIONS.filter((a) => allowed(a, hasAccess)).map((a) => (
            <CommandItem key={a.href + a.label} value={a.label} keywords={a.keywords} onSelect={() => go(a.href)}>
              <a.icon strokeWidth={1.8} className="text-muted" />
              {a.label}
              <CornerDownLeft className="ml-auto text-muted" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Account">
          <CommandItem value="Profile" onSelect={() => go("/profile")}>
            <User strokeWidth={1.8} className="text-muted" />
            Profile
          </CommandItem>
          <CommandItem
            value="Sign out"
            keywords={["log out", "logout"]}
            onSelect={() => {
              onOpenChange(false);
              logout();
              router.push("/login");
            }}
          >
            <LogOut strokeWidth={1.8} className="text-muted" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
