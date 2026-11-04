"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CornerDownLeft, LogOut, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePermissionsStore, useAuthStore } from "@/stores";
import { ACTIONS, NAV, allowed, visibleItem, type Access } from "./nav";

/**
 * ⌘K palette over the admin's existing routes and create actions (AdminSidebar board: "Search or ask AI";
 * asking AI arrives with the M5 AI backend, so the palette only searches for now).
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const hasAccess = usePermissionsStore((s) => s.hasAccess) as Record<Access, boolean>;
  const logout = useAuthStore((s) => s.logout);

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
      <CommandInput placeholder="Search pages and actions" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No page or action matches.</CommandEmpty>
        {NAV.map((g) => {
          const items = g.items.map((i) => visibleItem(i, hasAccess)).filter((i) => i !== null);
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
