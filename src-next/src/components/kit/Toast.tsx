"use client";
/*
  K08 Toasts (Kit-Feedback): short, past tense, one action at most. "What happened + the object", 6 words or fewer,
  no "Successfully", no "!". Success 4 s; with Undo 6 s (a ring shows time left); errors stay until closed. Hover and
  keyboard focus pause the timer. Admin: bottom right, 24px in, 3 at most (newest at the bottom), and never over a
  bottom bar: bars call useToastLift(height) and toasts sit 12px above them. role="status" / role="alert".

    notify.success("Batch saved")
    notify.success("Results published", { description: "212 students emailed", action: { label: "View", href: "/…" } })
    notify.undo('Topic "Rolling with slip" deleted', () => restore())
    notify.error("Couldn't save the batch", { description: "No connection. Your changes are kept.", retry: save })
    const id = notify.working("Exporting results"); …; notify.dismiss(id)
*/
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, Loader2, X } from "lucide-react";
import { cx } from "./utils";

type Kind = "success" | "undo" | "error" | "working";
interface ToastItem {
  id: number;
  kind: Kind;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  onUndo?: () => unknown;
  ms: number | null;
}

let seq = 0;
let items: ToastItem[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const push = (t: Omit<ToastItem, "id">) => {
  const id = ++seq;
  items = [...items, { ...t, id }].slice(-3);
  emit();
  return id;
};

export const notify = {
  success: (title: string, o?: { description?: string; action?: ToastItem["action"] }) => push({ kind: "success", title, ...o, ms: 4000 }),
  /** a reversible action that already happened: Undo for 6 s */
  undo: (title: string, onUndo: () => unknown, o?: { description?: string }) => push({ kind: "undo", title, onUndo, ...o, ms: 6000 }),
  error: (title: string, o?: { description?: string; retry?: () => void }) =>
    push({ kind: "error", title, description: o?.description, action: o?.retry ? { label: "Retry", onClick: o.retry } : undefined, ms: null }),
  /** background work with no progress of its own; dismiss it when done */
  working: (title: string, o?: { description?: string }) => push({ kind: "working", title, ...o, ms: null }),
  dismiss: (id: number) => {
    items = items.filter((t) => t.id !== id);
    emit();
  },
};

/** Lift the toasts above a sticky bottom bar while it is shown (bar height; 12px gap is added). */
export function useToastLift(px: number, active = true) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.style.setProperty("--k-toast-lift", `${px + 12}px`);
    return () => {
      root.style.removeProperty("--k-toast-lift");
    };
  }, [px, active]);
}

function Ring({ left }: { left: number }) {
  const c = 2 * Math.PI * 7;
  return (
    <svg className="k-ring" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle className="t" cx="9" cy="9" r="7" fill="none" strokeWidth="2" />
      <circle className="v" cx="9" cy="9" r="7" fill="none" strokeWidth="2" strokeDasharray={c} strokeDashoffset={c * (1 - left)} transform="rotate(-90 9 9)" strokeLinecap="round" />
    </svg>
  );
}

function ToastView({ t, age }: { t: ToastItem; age: number }) {
  const [left, setLeft] = useState(1);
  const paused = useRef(false);
  const elapsed = useRef(0);
  useEffect(() => {
    if (t.ms == null) return;
    let last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      if (!paused.current) elapsed.current += now - last;
      last = now;
      const l = 1 - elapsed.current / t.ms!;
      setLeft(Math.max(0, l));
      if (l <= 0) notify.dismiss(t.id);
    }, 100);
    return () => clearInterval(iv);
  }, [t]);
  const err = t.kind === "error";
  return (
    <div
      className={cx("k-tst", err && "err", age === 1 && "old", age >= 2 && "older")}
      role={err ? "alert" : "status"}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      {t.kind === "working" ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : err ? (
        <CircleAlert className="size-4" aria-hidden style={{ color: "#F5C2C2" }} />
      ) : (
        <CircleCheck className="size-4" aria-hidden style={{ color: "var(--green-on-navy)" }} />
      )}
      <span className="msg">
        <b>{t.title}</b>
        {t.description && <span>{t.description}</span>}
      </span>
      {t.kind === "undo" && t.onUndo && (
        <>
          <button
            type="button"
            className="act"
            onClick={async () => {
              notify.dismiss(t.id);
              try {
                await t.onUndo!();
              } catch {
                notify.error("Couldn't undo", { description: "It may be too late. Check the list." });
              }
            }}
          >
            Undo
          </button>
          <Ring left={left} />
        </>
      )}
      {t.action &&
        (t.action.href ? (
          <Link href={t.action.href} className="act" onClick={() => notify.dismiss(t.id)}>
            {t.action.label}
          </Link>
        ) : (
          <button
            type="button"
            className="act"
            onClick={() => {
              notify.dismiss(t.id);
              t.action!.onClick?.();
            }}
          >
            {t.action.label}
          </button>
        ))}
      {(err || t.kind === "working") && (
        <button type="button" className="cls" aria-label={err ? "Close" : "Hide"} onClick={() => notify.dismiss(t.id)}>
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Mount once in the root layout. */
export function KitToaster() {
  const list = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => items,
    () => items
  );
  return (
    <div className="k-toasts" aria-live="polite">
      {list.map((t, i) => (
        <ToastView key={t.id} t={t} age={list.length - 1 - i} />
      ))}
    </div>
  );
}
