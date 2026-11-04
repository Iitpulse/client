"use client";

import { usePathname } from "next/navigation";
import { Topbar } from "@/components/admin/Topbar";
import { titleFor } from "@/components/admin/nav";

/**
 * Pages not rebuilt on the boards yet (M5/M6). They get a generic top bar and keep the quarantined Tailwind v3 look
 * ([data-legacy], app/legacy.css). Migrating a page = moving it out of this route group (URLs do not change)
 * and drawing its own <Topbar>.
 */
export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <Topbar title={titleFor(pathname)} />
      <main data-legacy="" className="flex-1 p-6">
        {children}
      </main>
    </>
  );
}
