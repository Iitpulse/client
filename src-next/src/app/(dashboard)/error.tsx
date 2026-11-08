"use client";

/*
  Kit-States "Error · try again" (K13, admin column) for any admin page that throws while rendering: plain words, no
  blame, one button, a short support code (never a stack trace). The frame stays (sidebar and banners come from the
  dashboard layout), so people can leave. Copy names the thing: the nav item the address belongs to.
*/
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "@/components/admin/Topbar";
import { PageError } from "@/components/kit";
import { NAV } from "@/components/admin/nav";

/** The nav label for this address ("/tests/TT_1/result" → "Tests"); null for the dashboard or an unknown address. */
function sectionOf(pathname: string): string | null {
  let best: { label: string; len: number } | null = null;
  for (const g of NAV)
    for (const item of g.items)
      for (const l of [item, ...(item.children ?? [])])
        for (const href of [l.href, ...(l.match ?? [])]) {
          const h = href.split("?")[0]!;
          if (h === "/" || !(pathname === h || pathname.startsWith(h + "/"))) continue;
          if (!best || h.length > best.len) best = { label: l.label, len: h.length };
        }
  return best?.label ?? null;
}

/** "E-" + 4 characters from the digest Next gives the error (the server log carries the same digest). */
function codeOf(error: Error & { digest?: string }): string {
  const src = error.digest || error.message || "";
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  return `E-${(h % 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const section = sectionOf(pathname);
  useEffect(() => {
    // kept for support: the code on screen and this line carry the same digest
    console.warn(`[admin] page error ${codeOf(error)}`, error.digest ?? "");
  }, [error]);
  return (
    <>
      <Topbar title={section ?? "Dashboard"} />
      <main className="col" style={{ padding: "22px 28px 40px" }} data-testid="page-error">
        <PageError what={section ? section.toLowerCase() : "this page"} body="Something went wrong on our side. Try again in a moment." code={codeOf(error)} onRetry={reset} />
      </main>
    </>
  );
}
