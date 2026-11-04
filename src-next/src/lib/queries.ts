/*
  Shared TanStack Query reads for the migrated admin pages. Every call goes to an existing endpoint;
  the response shapes are the services' `{ success, data, totalDocs?, totalPages? }`.
*/
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";

type Paged<T> = { data?: T[]; totalDocs?: number; totalPages?: number };

function rows<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  const b = body as { data?: unknown; tests?: unknown };
  if (Array.isArray(b?.data)) return b.data as T[];
  if (Array.isArray(b?.tests)) return b.tests as T[];
  return [];
}

export const QUESTION_TYPES = ["mcq", "numerical", "paragraph", "matrix"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Question-bank size per type: four `size=1` reads, totals only. */
export function useQuestionBankTotals(enabled = true) {
  return useQuery({
    queryKey: ["questions", "totals"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const get = {
        mcq: api.questions.getMCQ,
        numerical: api.questions.getNumerical,
        paragraph: api.questions.getParagraph,
        matrix: api.questions.getMatrix,
      };
      const entries = await Promise.all(
        QUESTION_TYPES.map(async (t) => {
          try {
            const r = await get[t]({ page: 1, size: 1 });
            return [t, Number((r.data as Paged<unknown>)?.totalDocs ?? 0)] as const;
          } catch {
            return [t, 0] as const;
          }
        })
      );
      const byType = Object.fromEntries(entries) as Record<QuestionType, number>;
      return { byType, total: entries.reduce((s, [, n]) => s + n, 0) };
    },
  });
}

/* ---------- tests ---------- */

export interface TestRef { id: string; name: string }
export interface AdminTestSubSection {
  id: string;
  name?: string;
  type?: string;
  totalQuestions?: number;
  toBeAttempted?: number;
  markingScheme?: { correct?: number[]; incorrect?: number };
  questions?: Array<{ _id?: string; id?: string; difficulty?: string; chapters?: Array<{ name: string }>; [k: string]: unknown }>;
}
export interface AdminTestSection { id: string; name: string; subject?: string; subSections?: AdminTestSubSection[] }
export interface AdminTest {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  status?: string;
  durationInMinutes?: number;
  totalMarks?: number;
  exam?: TestRef | null;
  pattern?: TestRef | null;
  batches?: TestRef[];
  sections?: AdminTestSection[];
  validity?: { from?: string; to?: string } | null;
  hideResult?: boolean;
  result?: {
    isPublished?: boolean;
    students?: Array<{ _id?: string; studentId?: string; marks?: number; totalMarks?: number; [k: string]: unknown }>;
    publishProps?: { type?: string; publishDate?: string | null; isPublished?: boolean };
    averageMarks?: number;
    highestMarks?: number;
  };
  createdAt?: string;
  modifiedAt?: string;
}

/** Every test the admin can see (the list endpoint is paged; tests are few, so all pages are read). */
export function useAllTests() {
  return useQuery({
    queryKey: ["tests", "all"],
    queryFn: async () => {
      const first = await api.tests.getAll({ page: 1, size: 100 });
      const out = rows<AdminTest>(first.data);
      const pages = Math.min(Number((first.data as Paged<unknown>)?.totalPages ?? 1), 20);
      for (let p = 2; p <= pages; p++) out.push(...rows<AdminTest>((await api.tests.getAll({ page: p, size: 100 })).data));
      return out;
    },
  });
}

export type TestState = "live" | "scheduled" | "draft" | "ended";

/** Board states: Draft (not published), Scheduled (opens later), Live (inside its window), Ended. */
export function testState(t: AdminTest, now = dayjs()): TestState {
  if (!t.status || t.status === "draft") return "draft";
  if (t.status === "completed" || t.status === "expired") return "ended";
  const from = t.validity?.from ? dayjs(t.validity.from) : null;
  const to = t.validity?.to ? dayjs(t.validity.to) : null;
  if (from && now.isBefore(from)) return "scheduled";
  if (to && now.isAfter(to)) return "ended";
  return "live";
}

export function questionCount(t: AdminTest): { filled: number; needed: number } {
  let filled = 0;
  let needed = 0;
  for (const s of t.sections ?? [])
    for (const ss of s.subSections ?? []) {
      filled += ss.questions?.length ?? 0;
      needed += ss.totalQuestions ?? 0;
    }
  return { filled, needed };
}

/** "Today 9 AM – 9 PM", "3 Nov, 5 – 6 PM", "8 Nov, 9 AM – 9 PM", or one date once ended. */
export function windowLabel(t: AdminTest, now = dayjs()): string {
  const f = t.validity?.from ? dayjs(t.validity.from) : null;
  const to = t.validity?.to ? dayjs(t.validity.to) : null;
  if (!f) return "—";
  const time = (d: dayjs.Dayjs) => (d.minute() ? d.format("h:mm A") : d.format("h A"));
  const day = (d: dayjs.Dayjs) => (d.isSame(now, "day") ? "Today" : d.isSame(now.add(1, "day"), "day") ? "Tomorrow" : d.format("D MMM"));
  if (!to) return `${day(f)}, ${time(f)}`;
  if (!f.isSame(to, "day")) return `${day(f)} – ${day(to)}`;
  const sameHalf = f.format("A") === to.format("A");
  const range = sameHalf ? `${time(f).replace(/ (AM|PM)$/, "")} – ${time(to)}` : `${time(f)} – ${time(to)}`;
  return day(f) === "Today" ? `Today ${range}` : `${day(f)}, ${range}`;
}

/* ---------- batches ---------- */

export interface AdminBatch {
  _id: string;
  id?: string;
  name: string;
  members?: Array<{ id?: string; name?: string }>;
  exams?: string[];
}

export function useBatches() {
  return useQuery({
    queryKey: ["batches"],
    staleTime: 5 * 60_000,
    queryFn: async () => rows<AdminBatch>((await api.batches.getAll()).data),
  });
}

/** Students assigned to a test through its batches (batch member lists). */
export function assignedStudents(t: AdminTest, batches: AdminBatch[] | undefined): number | null {
  if (!batches || !t.batches?.length) return null;
  const ids = new Set(t.batches.map((b) => b.id));
  const members = new Set<string>();
  for (const b of batches)
    if (ids.has(b._id) || (b.id && ids.has(b.id)))
      for (const m of b.members ?? []) members.add(m.id ?? m.name ?? "");
  return members.size;
}
