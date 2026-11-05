"use client";
/*
  Kit helpers: India time (IST, UTC+5:30, no daylight saving), the boards' number/phone formats, and small hooks.
  Times are stored as UTC ISO strings and dates as "YYYY-MM-DD" (an IST calendar date); the UI always shows IST.
*/
import { useEffect, useRef, useState } from "react";

export const cx = (...c: unknown[]) => c.filter((x): x is string => typeof x === "string" && x !== "").join(" ");

/* ---------------- IST ---------------- */

const IST_MS = 330 * 60_000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The IST wall-clock parts of an instant. */
export function istParts(d: Date | string | number) {
  const t = new Date(typeof d === "string" || typeof d === "number" ? d : d.getTime());
  const s = new Date(t.getTime() + IST_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate(), h: s.getUTCHours(), min: s.getUTCMinutes(), dow: s.getUTCDay() };
}
/** The instant (UTC ISO) of an IST wall-clock time. */
export function fromIst(y: number, m: number, d: number, h = 0, min = 0): string {
  return new Date(Date.UTC(y, m, d, h, min) - IST_MS).toISOString();
}
/** Today's IST calendar date "YYYY-MM-DD". */
export function istToday(): string {
  const p = istParts(Date.now());
  return isoDate(p.y, p.m, p.d);
}
export const isoDate = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export function parseIsoDate(s: string | null | undefined): { y: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  return r ? { y: +r[1], m: +r[2] - 1, d: +r[3] } : null;
}
/** "YYYY-MM-DD" n days from an IST date. */
export function addDays(date: string, n: number): string {
  const p = parseIsoDate(date)!;
  const t = new Date(Date.UTC(p.y, p.m, p.d + n));
  return isoDate(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}
const hm = (h: number, min: number) => `${((h + 11) % 12) + 1}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;

/** Board formats. full: "Sun 15 Nov 2026 · 9:00 AM"; short (lists, same year): "15 Nov, 9:00 AM". */
export function fmtDateTime(iso: string | null | undefined, style: "full" | "short" = "full"): string {
  if (!iso) return "—";
  const p = istParts(iso);
  if (style === "short") {
    const now = istParts(Date.now());
    return `${p.d} ${MONTHS[p.m]}${p.y !== now.y ? ` ${p.y}` : ""}, ${hm(p.h, p.min)}`;
  }
  return `${DAYS[p.dow]} ${p.d} ${MONTHS[p.m]} ${p.y} · ${hm(p.h, p.min)}`;
}
export const fmtTime = (iso: string) => {
  const p = istParts(iso);
  return hm(p.h, p.min);
};
/** "14 Mar 2010" from "YYYY-MM-DD" (or an ISO time, read in IST). */
export function fmtDate(v: string | null | undefined, withDay = false): string {
  if (!v) return "—";
  const p = v.length > 10 ? istParts(v) : parseIsoDate(v);
  if (!p) return "—";
  const dow = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay();
  return `${withDay ? DAYS[dow] + " " : ""}${p.d} ${MONTHS[p.m]} ${p.y}`;
}
/** "Today, 9:41 AM" · "Yesterday" · "3 Nov" (lists). */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = istParts(iso);
  const day = isoDate(p.y, p.m, p.d);
  const today = istToday();
  if (day === today) return `Today, ${hm(p.h, p.min)}`;
  if (day === addDays(today, -1)) return "Yesterday";
  const now = istParts(Date.now());
  return `${p.d} ${MONTHS[p.m]}${p.y !== now.y ? ` ${p.y}` : ""}`;
}
export const dayName = (date: string) => {
  const p = parseIsoDate(date)!;
  return DAYS[new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay()];
};

/* ---------------- numbers, phones ---------------- */

/** Indian grouping: 8,732 · 1,20,000. */
export const inr = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));
/** Plural helper: plural(3, "student") → "3 students". */
export const plural = (n: number, one: string, many = one + "s") => `${inr(n)} ${n === 1 ? one : many}`;
/** The 10 digits of an Indian mobile ("+91 98260 12345", "9826012345", "+919826012345" → "9826012345"). */
export function phoneDigits(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length > 10 && d.startsWith("91") ? d.slice(-10) : d.slice(0, 10);
}
/** "98260 12345" (the boards' phone format, without +91). */
export function fmtPhone(v: string | null | undefined): string {
  const d = phoneDigits(v);
  if (!d) return "—";
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-zऀ-ॿ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "—";

/** Split `text` around case-insensitive matches of `query`, for bolding matched letters in lists. */
export function highlight(text: string, query: string): Array<{ t: string; hit: boolean }> {
  const q = query.trim().toLowerCase();
  if (!q) return [{ t: text, hit: false }];
  const out: Array<{ t: string; hit: boolean }> = [];
  const low = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const j = low.indexOf(q, i);
    if (j < 0) {
      out.push({ t: text.slice(i), hit: false });
      break;
    }
    if (j > i) out.push({ t: text.slice(i, j), hit: false });
    out.push({ t: text.slice(j, j + q.length), hit: true });
    i = j + q.length;
  }
  return out;
}

/* ---------------- hooks ---------------- */

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useMediaQuery(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOn(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return on;
}
/** Under 1180px the admin folds (tablet rail, filter drawer, step labels). */
export const useTablet = () => useMediaQuery("(max-width: 1179px)");

/** true once `active` has stayed true for `ms` (skeletons only after 300 ms; "Still loading…" after 10 s). */
export function useAfter(active: boolean, ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return on;
}

let idSeq = 0;
/** A stable id for label/aria wiring when the caller gives none. */
export function useKitId(given?: string): string {
  const ref = useRef<string | null>(null);
  if (!ref.current) ref.current = given ?? `k${++idSeq}`;
  return given ?? ref.current;
}

/** A short support code from an error (status + request id or a hash), e.g. "USR-503". */
export function supportCode(prefix: string, e: unknown): string {
  const ax = e as { response?: { status?: number; headers?: Record<string, string> } };
  const status = ax?.response?.status;
  const rid = ax?.response?.headers?.["x-request-id"];
  if (rid) return `${prefix}-${String(rid).slice(-4).toUpperCase()}`;
  return `${prefix}-${status ?? "NET"}`;
}

/** The API error of an axios failure: { status, code, message, details }. */
export function apiError(e: unknown): { status: number | null; code: string | null; message: string | null; details: Record<string, unknown> | null } {
  const ax = e as { response?: { status?: number; data?: { code?: string; message?: string; details?: Record<string, unknown>; error?: { code?: string; message?: string; details?: Record<string, unknown> } } } };
  const d = ax?.response?.data;
  return {
    status: ax?.response?.status ?? null,
    code: d?.code ?? d?.error?.code ?? null,
    message: d?.message ?? d?.error?.message ?? null,
    details: d?.details ?? d?.error?.details ?? null,
  };
}
