/*
  Admin-StudentReport data (board Admin-StudentReport, contract api-ai docs/m6-api.md "Admin: results, student report,
  AI review"). Real routes only (no sample data):
    GET /tests/admin/tests/:id/students/:sid/report                 overview + print
    GET /tests/admin/tests/:id/students/:sid/report/questions       question by question, answer grid
    GET /tests/admin/tests/:id/students/:sid/report/questions/:n    one question opened
    GET /tests/admin/tests/:id/results?sort=rank                    previous / next student by rank
    GET /ai/admin/tests/:id/students/:sid/review                    the AI review the student sees (never generates)
    GET /tests/admin/tests/:id/student-preview                      option order (A, B, C…) for the answer columns
*/
import { useQuery } from "@tanstack/react-query";
import type {
  AdminResultsResponse,
  AdminStudentReviewResponse,
  AnswerKey,
  StudentReportQuestionDetail,
  StudentReportQuestionsResponse,
  StudentReportResponse,
} from "../m6-contract";
import { apiError, m6Ai, m6Tests, unwrap } from "./client";

const noRetry = (n: number, e: unknown) => {
  const s = apiError(e).status;
  return n < 2 && (s === null || s === 0 || s >= 500);
};

const enc = encodeURIComponent;
const base = (testId: string, sid: string) => `/admin/tests/${enc(testId)}/students/${enc(sid)}/report`;

/** Fields the route answers beyond the contract type (server results.ts). */
export type ReportQuestion = StudentReportQuestionsResponse["items"][number] & {
  rowOutcomes?: Record<string, "right" | "wrong" | "blank"> | null;
  dropped?: boolean;
  overLimit?: boolean;
  /** future: server-side labels ("B", "A, C"); preferred when present */
  yoursLabel?: string | null;
  keyLabel?: string | null;
};
export type ReportQuestionDetail = StudentReportQuestionDetail & { outcome?: ReportQuestion["outcome"]; keyCorrected?: boolean };

export function useStudentReport(testId: string, sid: string) {
  return useQuery({
    queryKey: ["m6", "report", testId, sid],
    retry: noRetry,
    queryFn: async () => unwrap<StudentReportResponse>((await m6Tests.get(base(testId, sid))).data),
  });
}

export function useReportQuestions(testId: string, sid: string, enabled: boolean) {
  return useQuery({
    queryKey: ["m6", "report-questions", testId, sid],
    enabled,
    retry: noRetry,
    queryFn: async () => unwrap<{ items: ReportQuestion[] }>((await m6Tests.get(`${base(testId, sid)}/questions`)).data).items,
  });
}

export function useReportQuestion(testId: string, sid: string, n: number | null) {
  return useQuery({
    queryKey: ["m6", "report-question", testId, sid, n],
    enabled: n !== null,
    retry: noRetry,
    staleTime: 5 * 60_000,
    queryFn: async () => unwrap<ReportQuestionDetail>((await m6Tests.get(`${base(testId, sid)}/questions/${n}`)).data),
  });
}

export function useStudentAiReview(testId: string, sid: string, enabled: boolean) {
  return useQuery({
    queryKey: ["m6", "report-ai", testId, sid],
    enabled,
    retry: noRetry,
    staleTime: 60_000,
    refetchInterval: (q) => (q.state.data?.status === "generating" ? 5000 : false),
    queryFn: async () => unwrap<AdminStudentReviewResponse>((await m6Ai.get(`/admin/tests/${enc(testId)}/students/${enc(sid)}/review`)).data),
  });
}

type ResultRow = AdminResultsResponse["items"][number];
export interface Neighbours {
  prev: ResultRow | null;
  next: ResultRow | null;
  position: number | null;
  total: number;
}

/** The students ranked just above and below (results sorted by rank, pages of 100). */
export function useRankNeighbours(testId: string, sid: string, rank: number | null | undefined) {
  return useQuery({
    queryKey: ["m6", "report-neighbours", testId, sid, rank],
    enabled: typeof rank === "number",
    retry: noRetry,
    staleTime: 60_000,
    queryFn: async (): Promise<Neighbours> => {
      const size = 100;
      const fetchPage = async (page: number) =>
        unwrap<AdminResultsResponse>((await m6Tests.get(`/admin/tests/${enc(testId)}/results`, { params: { sort: "rank", page, pageSize: size } })).data);
      let page = Math.max(1, Math.floor(((rank as number) - 1) / size) + 1);
      let r = await fetchPage(page);
      let i = r.items.findIndex((x) => x.student.id === sid);
      // ties can push a student onto the next page
      for (let tries = 0; i < 0 && tries < 3 && page * size < r.pageInfo.total; tries++) {
        page += 1;
        r = await fetchPage(page);
        i = r.items.findIndex((x) => x.student.id === sid);
      }
      const total = r.pageInfo.total;
      if (i < 0) return { prev: null, next: null, position: null, total };
      let prev: ResultRow | null = r.items[i - 1] ?? null;
      let next: ResultRow | null = r.items[i + 1] ?? null;
      if (!prev && page > 1) prev = (await fetchPage(page - 1)).items.at(-1) ?? null;
      if (!next && page * size < total) next = (await fetchPage(page + 1)).items[0] ?? null;
      return { prev, next, position: (page - 1) * size + i + 1, total };
    },
  });
}

/** questionId → option ids in paper order (letters A, B, C…). Needs UPDATE_TEST; without it the labels fall back. */
export function useOptionOrder(testId: string) {
  return useQuery({
    queryKey: ["m6", "report-option-order", testId],
    retry: false,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const d = unwrap<{ test: { sections?: Array<{ subSections?: Array<{ questions?: unknown }> }> } }>((await m6Tests.get(`/admin/tests/${enc(testId)}/student-preview`)).data);
      const map = new Map<string, string[]>();
      type Q = { _id?: string; id?: string; en?: { options?: Array<{ id: string }> }; options?: Array<{ id: string }>; questions?: Q[] };
      const visit = (q: Q) => {
        const id = q._id ?? q.id;
        const opts = q.en?.options ?? q.options;
        if (id && opts?.length) map.set(id, opts.map((o) => String(o.id)));
        for (const c of q.questions ?? []) visit(c);
      };
      for (const s of d.test?.sections ?? [])
        for (const ss of s.subSections ?? []) {
          const qs = ss.questions;
          for (const q of (Array.isArray(qs) ? qs : Object.values((qs ?? {}) as Record<string, Q>)) as Q[]) visit(q);
        }
      return map;
    },
  });
}

/* ───────────── labels ───────────── */

const LETTER = (i: number) => String.fromCharCode(65 + i);

/** Option ids → "A, C" using the paper order; unknown order: the id's own trailing letter, else "?" */
export function optionLetters(ids: string[] | undefined, order: string[] | undefined): string {
  return (ids ?? [])
    .map((id) => {
      const i = order?.indexOf(id) ?? -1;
      if (i >= 0) return LETTER(i);
      const m = /[_-]([A-H])$/.exec(id);
      return m ? m[1] : "?";
    })
    .join(", ");
}

const num = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));

export function keyText(type: string, key: AnswerKey, order?: string[]): string {
  if (key.range) return key.range.from === key.range.to ? num(key.range.from) : `${num(key.range.from)} to ${num(key.range.to)}`;
  if (key.matches) return matrixText(key.matches);
  if (key.optionIds) return optionLetters(key.optionIds, order) || "—";
  return type === "integer" ? "—" : "—";
}

export function matrixText(m: Record<string, string[]> | undefined | null): string {
  const parts = Object.entries(m ?? {})
    .filter(([, c]) => c?.length)
    .map(([r, c]) => `${r}→${c.join(", ")}`);
  return parts.join(", ");
}

export function yoursText(q: ReportQuestion, order?: string[]): string {
  if (q.yoursLabel) return q.yoursLabel;
  const y = q.yours;
  if (!y) return "Skipped";
  if (typeof y.value === "number") return num(y.value);
  if (y.matrix) return matrixText(y.matrix as Record<string, string[]>) || "Skipped";
  if (y.optionIds?.length) return optionLetters(y.optionIds, order);
  return "Skipped";
}

export const TYPE_LABEL: Record<string, string> = {
  single: "Single",
  multiple: "Multiple",
  integer: "Numerical",
  numerical: "Numerical",
  paragraph: "Paragraph",
  matrix: "Matrix",
};

/** "2:58" for the table, "2 min 58 s" for prose */
export function mmss(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function minSec(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  if (!m) return `${s} s`;
  return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
}
export function hMin(sec: number): string {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  if (!h) return `${m} min`;
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
export const marksText = (m: number) => (m > 0 ? `+${num(m)}` : m < 0 ? `−${num(-m)}` : "0");
