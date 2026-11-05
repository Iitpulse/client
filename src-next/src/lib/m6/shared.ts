/*
  Reference lists the M6 tests pages share: exams (GET /tests/admin/exams), batches (GET /users/admin/batches),
  subjects (existing GET /questions/subject/subjects). Until the M6 routes are on this backend the exams and
  batches fall back to the legacy routes (real names, never hardcoded), mapped to the M6 shapes.
*/
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { BatchListItem, ExamListItem, Ref } from "../m6-contract";
import { m6Call, m6Tests, m6Users, unwrap } from "./client";

type Rows<T> = T[] | { data?: T[] | { items?: T[] }; items?: T[] };
function rows<T>(body: unknown): T[] {
  const b = body as Rows<T>;
  if (Array.isArray(b)) return b;
  if (Array.isArray(b?.data)) return b.data;
  if (b?.data && Array.isArray((b.data as { items?: T[] }).items)) return (b.data as { items: T[] }).items;
  return Array.isArray(b?.items) ? b.items : [];
}

/** Legacy exam rows → ExamListItem (counts unknown: 0). */
async function legacyExams(): Promise<ExamListItem[]> {
  const r = await api.exams.getAllNoPagination();
  return rows<{ _id: string; id?: string; name: string; fullName?: string; description?: string }>(r.data).map((e) => ({
    id: e._id ?? e.id,
    shortName: e.name,
    fullName: e.fullName ?? null,
    description: e.description ?? null,
    defaultTemplate: null,
    patterns: 0,
    tests: 0,
    status: "active",
    deletedAt: null,
    restoreUntil: null,
  }));
}

export function useM6Exams(enabled = true) {
  return useQuery({
    queryKey: ["m6", "exams"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () =>
      m6Call<ExamListItem[]>(
        "exams",
        async () => {
          const d = unwrap<{ items?: ExamListItem[] } | ExamListItem[]>((await m6Tests.get("/admin/exams")).data);
          return Array.isArray(d) ? d : d.items ?? [];
        },
        legacyExams,
        true
      ),
  });
}

/** Exams as Ref (id, display name) for comboboxes. */
export function examRefs(exams: ExamListItem[] | undefined): Ref[] {
  return (exams ?? []).filter((e) => e.status !== "deleted").map((e) => ({ id: e.id, name: e.shortName }));
}

async function legacyBatches(): Promise<BatchListItem[]> {
  const r = await api.batches.getAll();
  return rows<{ _id: string; id?: string; name: string; members?: unknown[]; exams?: string[] }>(r.data).map((b) => ({
    id: b._id ?? b.id,
    name: b.name,
    centre: null,
    medium: "",
    exams: (b.exams ?? []).map((x) => ({ id: x, name: x })),
    promoCodes: [],
    students: b.members?.length ?? 0,
    teachers: 0,
    archivedAt: null,
  }));
}

export function useM6Batches(enabled = true) {
  return useQuery({
    queryKey: ["m6", "batches"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const d = unwrap<{ items?: BatchListItem[] }>((await m6Users.get("/admin/batches", { params: { pageSize: 100 } })).data);
        if (Array.isArray(d.items)) return d.items;
      } catch {
        /* M6 batches not on this backend yet: legacy list */
      }
      return legacyBatches();
    },
  });
}

export interface SubjectRef extends Ref {
  chapters: Array<Ref & { topics: Ref[] }>;
}

export function useM6Subjects(enabled = true) {
  return useQuery({
    queryKey: ["m6", "subjects"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SubjectRef[]> => {
      const r = await api.subjects.getAll();
      type S = { _id: string; id?: string; name: string; chapters?: Array<{ _id?: string; id?: string; name: string; topics?: Array<string | { _id?: string; id?: string; name: string }> }> };
      return rows<S>(r.data).map((s) => ({
        id: s._id ?? s.id ?? s.name,
        name: s.name,
        chapters: (s.chapters ?? []).map((c) => ({
          id: c._id ?? c.id ?? c.name,
          name: c.name,
          topics: (c.topics ?? []).map((t) => (typeof t === "string" ? { id: t, name: t } : { id: t._id ?? t.id ?? t.name, name: t.name })),
        })),
      }));
    },
  });
}

/* ─────────────────────────────── formatting (IST) ─────────────────────────────── */

const IST = "Asia/Kolkata";
/** "Thu 19 Nov, 9:00 AM" in IST */
export function istDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(/\bam\b/i, "AM")
    .replace(/\bpm\b/i, "PM");
}
/** "19 Nov" in IST */
export function istDate(iso: string | null | undefined, withYear = false): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(new Date(iso));
}
/** "9:00 AM" in IST */
export function istTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(/\bam\b/i, "AM")
    .replace(/\bpm\b/i, "PM");
}
/** IST calendar date YYYY-MM-DD of an instant */
export function istDay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
/** "+4 · −1" style signed marks */
export function signedMarks(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
}
