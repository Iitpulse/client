import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The admin page top bar (boards: `header.topbar`, 64px, sticky inside the scrolling main column).
 * `back` draws the board's "← Tests" ghost button before the title.
 */
export function Topbar({
  title,
  back,
  badge,
  actions,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="topbar row between h-16 shrink-0 gap-3 px-7">
      <div className="row min-w-0 gap-2.5">
        {back && (
          <Link href={back.href} className="btn btn-ghost btn-sm">
            ← {back.label}
          </Link>
        )}
        <h1 className="h3 truncate">{title}</h1>
        {badge}
      </div>
      {actions && <div className="row shrink-0 gap-2">{actions}</div>}
    </header>
  );
}
