/*
  Batch 8 (contract api-tests docs/batch8-api.md): Add to schedule and Send to parents.
    POST /tests/admin/schedule-events/check · POST/GET /tests/admin/schedule-events · PATCH/DELETE …/:id
    GET  /tests/admin/tests/:id/parent-sends/recipients · POST …/parent-sends · POST …/parent-sends/test-copy · GET …/parent-sends
    GET  /tests/public/parent-reports/:token · POST …/stop   (the parent's link, no sign-in)
*/
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { API_GATEWAY } from "../ai-admin";
import { apiError, m6Tests, m6Users, source, unwrap } from "./client";

const enc = encodeURIComponent;
const wrap = async <T>(p: Promise<{ data: unknown }>): Promise<T> => {
  try {
    return unwrap<T>((await p).data as never);
  } catch (e) {
    throw apiError(e);
  }
};

/* ─────────────── schedule ─────────────── */

export type EventKind = "revision" | "doubt" | "class";
export interface ScheduleEvent {
  id: string;
  kind: EventKind;
  kindLabel: string;
  title: string;
  batchIds: string[];
  studentIds: string[] | null;
  students: number | null;
  startsAt: string;
  endsAt: string;
  minutes: number;
  place: { kind: "centre" | "online"; label: string | null };
  teacher: { id: string | null; name: string } | null;
  note: string | null;
  sourceTestId: string | null;
  notify: boolean;
  remind: boolean;
  notifiedAt: string | null;
  remindedAt: string | null;
  by: { id: string; name: string | null };
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Clash {
  kind: "test" | "event";
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  batchIds: string[];
}
export interface EventRequest {
  kind: EventKind;
  title: string;
  batchIds: string[];
  studentIds?: string[] | null;
  startsAt: string;
  minutes: number;
  placeKind: "centre" | "online";
  place?: string | null;
  teacher?: { id?: string | null; name: string } | null;
  note?: string | null;
  sourceTestId?: string | null;
  notify?: boolean;
  remind?: boolean;
}

const SCH = source("Results · Add to schedule");
export const checkEvent = (b: { batchIds: string[]; startsAt: string; minutes: number; studentIds?: string[] | null; excludeId?: string }) =>
  wrap<{ clashes: Clash[]; students: number | null }>(m6Tests.post("/admin/schedule-events/check", b, SCH));
export const createEvent = (b: EventRequest) => wrap<{ event: ScheduleEvent; told: number; clashes: Clash[] }>(m6Tests.post("/admin/schedule-events", b, SCH));
export const patchEvent = (id: string, b: Partial<Omit<EventRequest, "kind" | "batchIds" | "studentIds">>) =>
  wrap<{ event: ScheduleEvent; told: number; clashes: Clash[] }>(m6Tests.patch(`/admin/schedule-events/${enc(id)}`, b, source("Calendar · class or session")));
export const cancelEvent = (id: string) => wrap<{ event: ScheduleEvent; told: number }>(m6Tests.delete(`/admin/schedule-events/${enc(id)}`, source("Calendar · class or session")));
export function useTestEvents(testId: string) {
  return useQuery({
    queryKey: ["m6", "schedule-events", "test", testId],
    retry: 1,
    queryFn: () => wrap<{ items: ScheduleEvent[] }>(m6Tests.get("/admin/schedule-events", { params: { sourceTestId: testId } })),
  });
}

/* ─────────────── parents ─────────────── */

export type ParentStatus = "confirmed" | "notConfirmed" | "noEmail" | "stopped";
export type Delivery = "delivered" | "queued" | "sent" | "bounced" | "failed";
export interface ParentRecipient {
  student: { id: string; name: string; batch: { id: string; name: string } | null };
  score: number;
  maxScore: number;
  rank: number;
  of: number;
  submittedAt: string;
  subjects: Array<{ name: string; score: number; maxScore: number; batchAverage: number | null }>;
  parent: { status: ParentStatus; name: string | null; emailMasked: string | null };
  last: { status: Delivery; at: string } | null;
  willSend: boolean;
}
export interface ParentRecipients {
  now: string;
  test: { testId: string; name: string; shortName: string | null; maxScore: number | null };
  blocked: { code: "RESULTS_NOT_PUBLISHED"; message: string; publishesAt: string | null; mode: string; ended: boolean } | null;
  batches: Array<{ id: string; name: string }>;
  items: ParentRecipient[];
  counts: { students: number; willSend: number; alreadySent: number; bounced: number; noEmail: number; notConfirmed: number; stopped: number } | null;
  lastSend: { id: string; at: string; by: { id: string; name: string | null }; sent: number } | null;
  linkDays?: number;
}
export interface ParentSend {
  id: string;
  at: string;
  by: { id: string; name: string | null };
  note: string | null;
  only?: "bounced" | null;
  running?: boolean;
  batchIds?: string[];
  sent: number;
  delivered: number;
  queued: number;
  bounced: number;
  failed: number;
  skipped: Partial<Record<"noEmail" | "notConfirmed" | "stopped" | "alreadySent", number>>;
}

const PAR = source("Results · Send to parents");
export function useParentRecipients(testId: string, batchIds: string[]) {
  return useQuery({
    queryKey: ["m6", "parent-recipients", testId, batchIds.join(",")],
    retry: 1,
    queryFn: () => wrap<ParentRecipients>(m6Tests.get(`/admin/tests/${enc(testId)}/parent-sends/recipients`, { params: batchIds.length ? { batchId: batchIds.join(",") } : {} })),
  });
}
export function useParentSends(testId: string) {
  return useQuery({
    queryKey: ["m6", "parent-sends", testId],
    retry: 1,
    queryFn: () => wrap<{ items: ParentSend[]; totals: { sends: number; parents: number } }>(m6Tests.get(`/admin/tests/${enc(testId)}/parent-sends`)),
  });
}
export const sendParents = (testId: string, b: { note?: string | null; batchIds?: string[]; studentIds?: string[]; only?: "bounced" }) =>
  wrap<{ send: ParentSend }>(m6Tests.post(`/admin/tests/${enc(testId)}/parent-sends`, b, PAR));
export const parentTestCopy = (testId: string, b: { studentId?: string; note?: string | null }) =>
  wrap<{ copy: { sent: boolean; emailMasked: string; studentId: string } }>(m6Tests.post(`/admin/tests/${enc(testId)}/parent-sends/test-copy`, b, PAR));

/** users (batch 8): "+ Add parent email" (sends the confirmation link) and "Resend link to N" */
export const addParentEmail = (studentId: string, b: { guardianEmail: string; guardianName?: string | null }) =>
  wrap<{ status: string }>(m6Users.post(`/admin/users/${enc(studentId)}/guardian-consent`, b, PAR));
export const resendParentLinks = (studentIds: string[]) =>
  wrap<{ sent: number; limited: number; confirmed: number; noRequest: number; notFound: number; failed: number }>(m6Users.post("/admin/guardian-consent/resend", { studentIds }, PAR));

/* ─────────────── the parent's page (public) ─────────────── */

export interface ParentReport {
  now: string;
  expiresAt: string | null;
  testCopy: boolean;
  student: { name: string; firstName: string; batch: string | null };
  test: { testId: string; name: string; shortName: string | null; maxScore: number; durationMinutes: number; questions: number; opensAt: string | null };
  submission: { submittedAt: string; score: number; batchAverage: number; rank: number | null; of: number; accuracyPercent: number; counts: { correct: number; partial: number; wrong: number; skipped: number }; timeUsedSeconds: number } | null;
  subjects: Array<{ name: string; score: number; maxScore: number; right: number; wrong: number; skipped: number; batchAverage: number }>;
  chapters: Array<{ subject: string; chapter: string; questions: number; right: number; wrong: number; skipped: number; accuracyPercent: number; batchAccuracyPercent: number }>;
  questions: Array<{
    n: number;
    subject: string;
    type: string;
    outcome: "correct" | "partial" | "wrong" | "skipped";
    marks: number;
    maxMarks: number;
    yoursLabel: string | null;
    keyLabel: string | null;
    yours: { optionIds?: string[]; value?: unknown; matrix?: unknown } | null;
    key: { optionIds?: string[]; range?: { from: number; to: number }; matches?: Record<string, string[]> };
    passage: string | null;
    en: { question: string; options: Array<{ id: string; value: string }>; solution: string | null };
    dropped?: boolean;
  }>;
}
const pub = axios.create({ baseURL: `${API_GATEWAY}/tests/public`, headers: { "Content-Type": "application/json" } });
export const fetchParentReport = (token: string) => wrap<ParentReport>(pub.get(`/parent-reports/${enc(token)}`));
export const stopParentEmails = (token: string) => wrap<{ stopped: boolean; already: boolean }>(pub.post(`/parent-reports/${enc(token)}/stop`, {}));
