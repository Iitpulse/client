"use client";
/*
  K16 Banners (Kit-Feedback): what is true right now, under the top bar, the full width of the main column. One page
  banner at a time (order: mode > block > warn > ai > info). Only AI and info banners close; a closed banner stays
  hidden until the situation changes (pass a `dismissKey` that changes with it). First sentence bold (the fact), then
  what it means, one button (the way out). Inside a card or form use <InlineNote> instead.
*/
import { useEffect, useState, type ReactNode } from "react";
import { Info, Sparkles, TriangleAlert, CircleAlert, Eye, X } from "lucide-react";
import { cx } from "./utils";

export type BannerTone = "mode" | "block" | "warn" | "info" | "ai";

const ICON: Record<BannerTone, ReactNode> = {
  mode: <Eye className="size-4" aria-hidden />,
  block: <CircleAlert className="size-4" aria-hidden />,
  warn: <TriangleAlert className="size-4" aria-hidden />,
  info: <Info className="size-4" aria-hidden />,
  ai: <Sparkles className="size-4" aria-hidden style={{ color: "var(--navy)" }} />,
};

export function Banner({
  tone,
  title,
  children,
  action,
  dismissKey,
  round = true,
  className,
}: {
  tone: BannerTone;
  /** the fact, bold */
  title: ReactNode;
  /** what it means for students / staff */
  children?: ReactNode;
  /** one button: the way out */
  action?: ReactNode;
  /** AI and info banners only: closable, remembered per key (sessionStorage) */
  dismissKey?: string;
  /** rounded card style inside the page padding (default); false = edge-to-edge under the top bar */
  round?: boolean;
  className?: string;
}) {
  const closable = !!dismissKey && (tone === "ai" || tone === "info");
  const storeKey = dismissKey ? `iitp:banner:${dismissKey}` : "";
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!closable) return;
    try {
      setHidden(sessionStorage.getItem(storeKey) === "1");
    } catch {
      /* storage blocked: show it */
    }
  }, [closable, storeKey]);
  if (hidden) return null;
  return (
    <div className={cx("k-bn", tone, round && "round", className)} role={tone === "block" || tone === "warn" ? "alert" : "status"}>
      {ICON[tone]}
      <span className="t">
        <b>{title}</b>
        {children && <> {children}</>}
      </span>
      {action}
      {closable && (
        <button
          type="button"
          className="k-x"
          aria-label="Hide this message"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(storeKey, "1");
            } catch {
              /* ignore */
            }
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Inline note inside a card or form ("Questions are locked: 42 students have submitted."). */
export function InlineNote({ children, tone = "info", icon }: { children: ReactNode; tone?: "info" | "warn"; icon?: ReactNode }) {
  return (
    <div className={cx("k-note", tone === "warn" && "warn")} role="note">
      {icon ?? (tone === "warn" ? <TriangleAlert className="size-4" aria-hidden /> : <Info className="size-4" aria-hidden />)}
      <span>{children}</span>
    </div>
  );
}
