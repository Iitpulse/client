"use client";
/*
  K13 Page states (Kit-States). The frame always stays (sidebar, top bar, tabs keep working); only the content area
  changes. Loading: skeletons shaped like the page after 300 ms, never a full-page spinner; over 10 s "Still
  loading…" with Try again. Empty: what will appear here + the first step (admin may use its one doodle). Error:
  plain words, one button, a short support code. No permission: what, why, who can change it. Copy names the thing
  ("Couldn't load batches"), never "Oops".
*/
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CircleAlert, Lock, WifiOff } from "lucide-react";
import { StateBox } from "./DataTable";
import { Banner } from "./Banner";
import { cx, useAfter } from "./utils";

/** The admin's one doodle: a pencil-drawn stack of cards. */
export function Doodle({ size = 64 }: { size?: number }) {
  return (
    <svg className="k-doodle" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="14" y="18" width="36" height="30" rx="4" />
      <path d="M18 14h28M22 10h20" />
      <path d="M21 28h16M21 34h22M21 40h10" />
      <circle cx="47" cy="44" r="7" />
      <path d="M44.5 44l2 2 3.5-4" />
    </svg>
  );
}

export function PageCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("card", className)}>{children}</section>;
}

export function EmptyState({ title, body, actions, doodle = true }: { title: string; body?: ReactNode; actions?: ReactNode; doodle?: boolean }) {
  return (
    <PageCard>
      <StateBox title={title} body={body} action={actions} doodle={doodle ? <Doodle /> : undefined} />
    </PageCard>
  );
}

export function PageError({ what, body = "Try again in a moment.", code, onRetry }: { what: string; body?: ReactNode; code?: string; onRetry?: () => void }) {
  return (
    <PageCard>
      <StateBox tone="error" title={`Couldn't load ${what}`} body={body} code={code} action={onRetry ? <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button> : undefined} />
    </PageCard>
  );
}

/**
 * For old links only (nav items people can't open are hidden). `role` = the person's role name.
 * The boards name the person who can grant access; the API has no such field yet, so it says "an admin".
 */
export function NoAccess({ what, role, who }: { what: string; role?: string | null; who?: string }) {
  return (
    <PageCard>
      <div className="k-st-box">
        <span className="ico grey">
          <Lock className="size-5" aria-hidden />
        </span>
        <span className="h3">You can&rsquo;t open {what}</span>
        <span className="sm muted" style={{ maxWidth: 420 }}>
          {role ? `Your role, ${role}, doesn't include it.` : "Your role doesn't include it."} {who ?? "An admin at your institute"} can give you access.
        </span>
        <Link href="/" className="btn btn-secondary btn-sm">
          Back to dashboard
        </Link>
      </div>
    </PageCard>
  );
}

export function NotFoundState({ deleted }: { deleted?: string }) {
  return (
    <PageCard>
      <div className="k-st-box">
        <span className="num" style={{ fontSize: 32, fontWeight: 650, color: "var(--navy-200)", letterSpacing: "-.02em" }}>
          404
        </span>
        <span className="h3">{deleted ?? "Page not found"}</span>
        <span className="sm muted">The link may be old or mistyped.</span>
        <Link href="/" className="btn btn-primary btn-sm">
          Go to dashboard
        </Link>
      </div>
    </PageCard>
  );
}

/** Skeleton for a list page: a toolbar row and shimmering lines, after 300 ms; "Still loading…" after 10 s. */
export function PageSkeleton({ rows = 6, onRetry }: { rows?: number; onRetry?: () => void }) {
  const show = useAfter(true, 300);
  const slow = useAfter(true, 10_000);
  if (!show) return <div style={{ minHeight: 240 }} aria-busy />;
  return (
    <div className="col" style={{ gap: 14 }} aria-busy>
      <div className="card col" style={{ gap: 14, padding: 16 }}>
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="skel" style={{ height: 10, width: `${88 + ((i * 7) % 12)}%` }} />
        ))}
      </div>
      {slow && (
        <div className="row" style={{ gap: 8 }}>
          <span className="sm muted">Still loading…</span>
          {onRetry && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Offline: a banner, not a page. */
export function OfflineBanner({ what = "Your changes save when you're back." }: { what?: string }) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const f = () => setOff(!navigator.onLine);
    f();
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => {
      window.removeEventListener("online", f);
      window.removeEventListener("offline", f);
    };
  }, []);
  if (!off) return null;
  return (
    <Banner tone="warn" round={false} title="You're offline.">
      <span>
        <WifiOff className="inline size-3.5" aria-hidden /> {what}
      </span>
    </Banner>
  );
}

/** An inline error line (small sections inside a drawer). */
export function InlineError({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="row" style={{ gap: 8, color: "var(--red-600)" }} role="alert">
      <CircleAlert className="size-4" aria-hidden />
      <span className="sm" style={{ fontWeight: 600 }}>
        {children}
      </span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
