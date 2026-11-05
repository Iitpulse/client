"use client";

/* Small pieces the M5 question pages share (boards Admin-Questions, Admin-QuestionEditor): the board's `.dlg`
   dialog shell (540px, top 96px over the scrim), the `.note` callouts and the AI sparkle mark. */
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function Sparkle({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  );
}

export function ClockIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function AlertIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

export function CrossIcon({ color = "#C40000", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

export function TickIcon({ color = "currentColor", size = 16, width = 2.5 }: { color?: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** The boards' `.note` (grey), `.note.warn` (amber) and `.note.err` (red) callouts. */
export function Note({ tone = "plain", children, className = "", role }: { tone?: "plain" | "warn" | "err" | "navy"; children: React.ReactNode; className?: string; role?: string }) {
  const tones = {
    plain: "bg-ground text-ink",
    navy: "bg-surface text-ink border border-brand-100",
    warn: "bg-warning-50 text-[#5C3600]",
    err: "bg-danger-50 text-[#7A1010]",
  } as const;
  return (
    <div className={`row items-start gap-2.5 rounded-[10px] px-3 py-2.5 ${tones[tone]} ${className}`} role={role}>
      {children}
    </div>
  );
}

/** The boards' `.dlg` over the `.scrim`: 540px, 96px from the top, 16px corners, no close cross. */
export function BoardDialog({
  open,
  onClose,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="top-24 flex max-h-[calc(100vh-112px)] max-w-[540px] translate-y-0 flex-col gap-3.5 overflow-y-auto rounded-[16px] px-[22px] pt-[22px] pb-[18px]"
      >
        {description ? <DialogDescription className="sr-only">{description}</DialogDescription> : <DialogDescription className="sr-only" />}
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's visible title (the boards' `h2.h3`), wired as the dialog's accessible name. */
export function BoardTitle({ children }: { children: React.ReactNode }) {
  return <DialogTitle className="m-0 text-[16px] leading-[1.3] font-semibold tracking-normal">{children}</DialogTitle>;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
