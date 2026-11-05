"use client";
/* Small pieces the editor's sections share (icons as the board draws them, field error line, Hindi-missing mark). */
import * as React from "react";

const svg = (size: number, children: React.ReactNode, extra: React.SVGProps<SVGSVGElement> = {}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...extra}>
    {children}
  </svg>
);

export const I = {
  err: (s = 14) => svg(s, <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></>),
  x: (s = 14) => svg(s, <path d="M6 6l12 12M18 6 6 18" />),
  up: (s = 14) => svg(s, <path d="m6 15 6-6 6 6" />),
  down: (s = 14) => svg(s, <path d="m6 9 6 6 6-6" />),
  bin: (s = 14) => svg(s, <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  plus: (s = 14) => svg(s, <path d="M12 5v14M5 12h14" />, { strokeWidth: 2.2 }),
  tick: (s = 14) => svg(s, <path d="M5 12.5l4.5 4.5L19 7.5" />, { strokeWidth: 3 }),
  spark: (s = 13) => svg(s, <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />),
  lock: (s = 16) => svg(s, <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  cal: (s = 16) => svg(s, <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>),
  clock: (s = 16) => svg(s, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  info: (s = 16) => svg(s, <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>),
  save: (s = 16) => svg(s, <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>),
  copy: (s = 18) => svg(s, <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>),
  lines: (s = 16) => svg(s, <path d="M4 6h16M4 12h10M4 18h7" />),
  grip: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" />))}
    </svg>
  ),
  spin: (s = 13) => (
    <svg className="spin shrink-0" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  ),
};

export function FieldErr({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <span id={id} className="qe-err" role="alert">
      {I.err()}
      {children}
    </span>
  );
}

export const HindiMissing = () => <span className="qe-hm">Hindi missing</span>;

/** The boards' `.note` callouts (plain / warn / err). */
export function Note({ tone = "plain", children, className = "", role }: { tone?: "plain" | "warn" | "err"; children: React.ReactNode; className?: string; role?: string }) {
  return (
    <div className={`qe-note ${tone === "plain" ? "" : tone} ${className}`} role={role}>
      {children}
    </div>
  );
}
