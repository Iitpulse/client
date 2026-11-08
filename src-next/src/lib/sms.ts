/*
  Batch 9 SMS (pay per SMS, owner E9; boards Admin-Messages and Admin-SMSChannels, approved canvas v243).
  Contract v1: api-users docs/sms-api.md §5 (Owner and Admin only: messages summary, delivery log, templates, flagged
  numbers) and §6 (counts and cost in the staff flows, answered by api-tests on its publish / schedule / parents
  previews). Every SMS sent for the institute is billed at the price in force when it went (platform default or an
  override set by IIT-PULSE); there is no limit and no "ran out" state. Phones are only ever the last 4 digits.

  The staff-flow estimate (`SmsEstimate`) is optional on every preview: when api-tests doesn't send it yet the flows
  keep their batch-8 behaviour (no "Text students" switch, no SMS line).
*/
import { useQuery } from "@tanstack/react-query";
import { apiError, m6Users, unwrap } from "./m6/client";
import type { SmsFlowEstimate } from "./m6-contract";

/* ─────────────── types (sms-api.md §5, §6) ─────────────── */

export interface SmsPaused {
  since: string;
  reason: string | null;
  by?: string | { id?: string; name?: string } | null;
}

/** §6: what a staff flow is about to send (users' notify/preview `sms`, through api-tests); shared numbers count once */
export type SmsEstimate = SmsFlowEstimate;

export interface SmsSummary {
  month: string;
  monthLabel: string;
  soFar: boolean;
  sms: { sent: number; delivered: number; deliveredRate: number | null; notArrived: number; emailInstead: number; pending: number };
  cost: {
    sms: number;
    unitPricePaise: number;
    unitPrice: string;
    amountPaise: number;
    amount: string;
    estimate: boolean;
    byPrice: Array<{ unitPricePaise: number; count: number; amountPaise: number }>;
    invoiceOn: string | null;
    note: string | null;
  };
  lastMonth: { month: string; sms: number; amountPaise: number; amount: string } | null;
  byType: Array<{ type: string; label: string; sms: number; amountPaise: number }>;
  spike: { threshold: number | null; over: boolean } | null;
  paused: SmsPaused | null;
  sender: { id: string; dlt: "registered" | "pending" | string };
  quietHours: { from: string; to: string; timezone: string };
}

export type LogStatus = "waiting" | "delivered" | "failed" | "operator" | "invalid" | "dropped" | "paused" | "logged";
export interface SmsLogItem {
  id: string;
  at: string;
  sentAt: string | null;
  to: string;
  phone: string;
  message: string;
  template: string;
  status: LogStatus;
  statusLabel: string;
  then: string | null;
  quietHeld: boolean;
  note: string | null;
}
export interface SmsLog {
  items: SmsLogItem[];
  counts: Partial<Record<"all" | LogStatus, number>>;
  page: number;
  pageSize: number;
  total: number;
}

export interface SmsTemplate {
  key: string;
  use: string;
  text: string;
  parts?: Array<{ fixed?: string; var?: string }>;
  dltStatus: "registered" | "pending";
  dltLabel: string;
  dltTemplateIdSet?: boolean;
}

/* ─────────────── API (Owner and Admin; 403 FORBIDDEN for other roles) ─────────────── */

const get = async <T>(p: string, params?: Record<string, unknown>): Promise<T> => {
  try {
    return unwrap<T>((await m6Users.get(p, { params })).data);
  } catch (e) {
    throw apiError(e);
  }
};

export function useSmsSummary(enabled = true, month?: string) {
  return useQuery({
    queryKey: ["sms", "summary", month ?? ""],
    enabled,
    retry: (n, e) => n < 1 && (e as { status?: number })?.status !== 403,
    staleTime: 30_000,
    queryFn: () => get<SmsSummary>("/admin/messages/summary", month ? { month } : undefined),
  });
}

export function useSmsLog(f: { status: string; q: string; page: number; pageSize: number; month?: string }, enabled = true) {
  return useQuery({
    queryKey: ["sms", "log", f],
    enabled,
    retry: 1,
    placeholderData: (prev) => prev,
    queryFn: () => get<SmsLog>("/admin/messages/log", { status: f.status, q: f.q || undefined, page: f.page, pageSize: f.pageSize, month: f.month }),
  });
}

export function useSmsTemplates(enabled = true) {
  return useQuery({
    queryKey: ["sms", "templates"],
    enabled,
    retry: (n, e) => n < 1 && (e as { status?: number })?.status !== 403,
    staleTime: 5 * 60_000,
    queryFn: () => get<{ templates: SmsTemplate[] }>("/admin/messages/templates"),
  });
}

/* ─────────────── money (paise) ─────────────── */

/** 25 → "₹0.25", 100 → "₹1" (price per SMS) */
export function unitPrice(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return paise % 100 ? `₹${(paise / 100).toFixed(2)}` : `₹${(paise / 100).toLocaleString("en-IN")}`;
}
/** 31000 → "₹310", 26250 → "₹262.50", 1850 → "₹18.50" */
export function rupeesExact(paise: number | null | undefined): string {
  if (paise == null) return "—";
  const r = Math.floor(Math.abs(paise) / 100);
  const p = Math.abs(paise) % 100;
  return `₹${r.toLocaleString("en-IN")}${p ? `.${String(p).padStart(2, "0")}` : ""}`;
}
/** "about ₹103" (an estimate, whole rupees) */
export const about = (paise: number | null | undefined) => (paise == null ? "—" : `about ₹${Math.round(paise / 100).toLocaleString("en-IN")}`);
export const nf = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

/** "2026-12-01" → "1 Dec" */
export function dayMonth(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  return `${Number(m[3])} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1]}`;
}
/** the 1st of next month in IST, "1 Dec" (where this month's SMS are billed) */
export function nextInvoiceDay(now = Date.now()): string {
  const ist = new Date(now + 330 * 60_000);
  const y = ist.getUTCFullYear();
  const mo = ist.getUTCMonth() + 1;
  return dayMonth(mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`);
}

export const isPaused = (p: SmsEstimate["paused"] | SmsPaused | undefined): boolean => !!p;
export const pausedSince = (p: SmsEstimate["paused"]) => (p && typeof p === "object" ? p.since : null);

/* ─────────────── the 13 DLT templates (batch 9 note "DLT templates to submit") ─────────────── */

/** Fixed wording approved on DLT; {#var#} is a filled-in part. Used for previews when users can't list them. */
export const TEMPLATE_TEXT: Record<string, string> = {
  signin_code: "{#var#} is your IIT-PULSE sign-in code. It expires in 10 minutes. Never share it, not even with your institute. -IITPULSE",
  reset_code: "{#var#} is your IIT-PULSE password reset code. It expires in 10 minutes. Didn't ask for it? Ignore this SMS. -IITPULSE",
  verify_phone: "{#var#} is your IIT-PULSE code to verify this phone number. It expires in 10 minutes. -IITPULSE",
  class_added: "IIT-PULSE: {#var#} for {#var#} on {#var#}, {#var#}. Details: {#var#} -IITPULSE",
  class_moved: "IIT-PULSE: {#var#} for {#var#} moved to {#var#}, {#var#}. Details: {#var#} -IITPULSE",
  class_cancelled: "IIT-PULSE: {#var#} for {#var#} on {#var#} is cancelled. No need to come. -IITPULSE",
  class_reminder: "IIT-PULSE: {#var#} for {#var#} starts at {#var#} today, {#var#}. -IITPULSE",
  test_assigned: "IIT-PULSE: New test for {#var#}: {#var#}, opens {#var#}. Details: {#var#} -IITPULSE",
  test_soon: "IIT-PULSE: {#var#} for {#var#} opens at {#var#} today. Use a laptop or desktop. {#var#} -IITPULSE",
  result_out: "IIT-PULSE: Result out for {#var#}: {#var#}. Score, rank and AI review: {#var#} -IITPULSE",
  parent_result: "IIT-PULSE: {#var#} scored {#var#} in {#var#}, rank {#var#}. Report, valid 30 days: {#var#} -IITPULSE",
  parent_results: "IIT-PULSE: {#var#} results are out for {#var#}. Reports, valid 30 days: {#var#} -IITPULSE",
  reg_otp: "Hello student,Your OTP for new registration is {#var#} , please do not share and do not refresh the page after submitting. -IITPULSE",
};

export interface SmsPart {
  text: string;
  v?: boolean;
}
/** Fills a template's {#var#} parts in order. Variables are cut to 30 characters (DLT limit), no ellipsis. */
export function fillTemplate(key: string, vars: string[], text = TEMPLATE_TEXT[key] ?? ""): { parts: SmsPart[]; text: string; length: number; sms: number } {
  const bits = text.split("{#var#}");
  const parts: SmsPart[] = [];
  bits.forEach((b, i) => {
    if (b) parts.push({ text: b });
    if (i < bits.length - 1) parts.push({ text: (vars[i] ?? "").slice(0, 30), v: true });
  });
  const full = parts.map((p) => p.text).join("");
  return { parts, text: full, length: full.length, sms: smsCount(full) };
}
/** SMS parts for a GSM-7 text: 160 in one, 153 each after that */
export const smsCount = (t: string) => (t.length <= 160 ? 1 : Math.ceil(t.length / 153));

/** "Thu 12 Nov 5:00 PM" in IST (the date form the templates use) */
export function smsDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...o }).format(d);
  return `${f({ weekday: "short" })} ${f({ day: "numeric" })} ${f({ month: "short" })} ${f({ hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase().replace(/\s+/g, " ")}`;
}
/** "4:00 PM" in IST */
export function smsTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).toUpperCase();
}
/** Example short link shown in previews (each message gets its own) */
export const SAMPLE_LINK = "iitpulse.in/s/R4x9P";
/** Staff see the cost before any send over this many SMS (batch 9 rule 6) */
export const COST_CONFIRM_OVER = 50;
