"use client";
/* Shared bits of Setup: URL state shape, small formatters and error helpers. */
import type { ReactNode } from "react";
import { apiError } from "@/components/kit";

export const SETUP_DEFAULTS = {
  tab: "batches",
  q: "",
  centre: "",
  medium: "",
  page: "1",
  size: "25",
  show: "active",
  sq: "",
  subject: "",
  chapter: "",
  batch: "",
  moved: "",
};
export type SetupState = typeof SETUP_DEFAULTS;
export type SetSetup = (p: Partial<SetupState>) => void;

/** "english" / "English" → "English" */
export const mediumLabel = (m: string | null | undefined) => (m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : "—");

/** Field errors of a 400/409 answer (VALIDATION_ERROR details.fields, PROMO_* details.fields). */
export function fieldErrs(e: unknown): Record<string, string> {
  const a = apiError(e);
  const f = (a.details as { fields?: Record<string, { message: string }> } | null)?.fields;
  return f ? Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.message])) : {};
}

export function Sec({ children, first }: { children: ReactNode; first?: boolean }) {
  return <span className={`k-sec${first ? " first" : ""}`}>{children}</span>;
}

export const PROMO_RE = /^[A-Z0-9]{6}$/;
