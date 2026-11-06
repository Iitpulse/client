/*
  M5 reads for the dashboard, tests, results and analysis pages (contract: api-ai docs/m5-api.md, types in
  src/contracts/m5.ts). Routes go through the gateway: /tests/admin/*, /questions/admin/*, /ai/admin/*.
  Polling: live every 30 s, overview every 60 s; TanStack pauses interval refetches while the tab is hidden
  (refetchIntervalInBackground stays false). AI reads poll every 3 s for up to 60 s while "generating".
*/
import axios, { type AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { apiQuestions, apiTests } from "@/lib/api";
import type {
  AdminOverview,
  BatchSummaryResponse,
  DeltaUnit,
  KeyCheckResponse,
  LiveTestsResponse,
  QuestionFilter,
  QuestionInsightResponse,
  QuestionSearchResponse,
  ResultInsights,
} from "@/lib/m5-contract";

import { withSession } from "./auth-axios";

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

/** /ai through the gateway (api.ts has no ai client yet); same auth header and 401 handling as the others. */
const apiAiAdmin = axios.create({ baseURL: `${API_GATEWAY}/ai`, headers: { "Content-Type": "application/json" } });
withSession(apiAiAdmin); // M7b auth v2 (lib/auth-axios.ts)

const unwrap = <T>(r: { data: { data?: T } }) => r.data.data as T;

/** The M5 error code of a failed request (STAFF_ONLY, NOT_IMPLEMENTED, AI_PAUSED, …), or null. */
export function m5ErrorCode(e: unknown): string | null {
  const d = (e as AxiosError<{ code?: string; error?: { code?: string } }>)?.response?.data;
  return d?.code ?? d?.error?.code ?? null;
}

/** 501 NOT_IMPLEMENTED (an engine still on Mongo) and 404s are permanent: no retry. */
const retry = (count: number, e: unknown) => {
  const s = (e as AxiosError)?.response?.status;
  if (s && s >= 400 && s < 500) return false;
  if (s === 501 || s === 503) return false;
  return count < 2;
};

/* ---------- tests ---------- */

export function useAdminOverview(enabled = true) {
  return useQuery({
    queryKey: ["m5", "overview"],
    enabled,
    retry,
    refetchInterval: 60_000,
    queryFn: async () => unwrap<AdminOverview>(await apiTests.get("/admin/overview")),
  });
}

export function useLiveTests(enabled = true) {
  return useQuery({
    queryKey: ["m5", "live"],
    enabled,
    retry,
    refetchInterval: 30_000,
    queryFn: async () => unwrap<LiveTestsResponse>(await apiTests.get("/admin/live")),
  });
}

export function useResultInsights(testId: string | undefined) {
  return useQuery({
    queryKey: ["m5", "result-insights", testId],
    enabled: !!testId,
    retry,
    staleTime: 30_000,
    queryFn: async () => unwrap<ResultInsights>(await apiTests.get(`/admin/tests/${testId}/result-insights`)),
  });
}

/* ---------- questions ---------- */

function searchParams(filter: QuestionFilter & { page?: number; pageSize?: number }) {
  const p: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === "" || v === false) continue;
    p[k] = v === true ? 1 : (v as string | number);
  }
  return p;
}

/** Bank totals and flag counts (`pageSize=0`, no filters): Dashboard "Question bank", Needs attention, sidebar count. */
export function useBankCounts(enabled = true) {
  return useQuery({
    queryKey: ["m5", "bank-counts"],
    enabled,
    retry,
    staleTime: 2 * 60_000,
    queryFn: async () => unwrap<QuestionSearchResponse>(await apiQuestions.get("/admin/search", { params: { pageSize: 0 } })),
  });
}

/** ⌘K question search: `?q=…&pageSize=5`. */
export function useQuestionQuickSearch(q: string, enabled = true) {
  const term = q.trim();
  return useQuery({
    queryKey: ["m5", "quick-search", term],
    enabled: enabled && term.length >= 2,
    retry,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => unwrap<QuestionSearchResponse>(await apiQuestions.get("/admin/search", { params: searchParams({ q: term, pageSize: 5 }) })),
  });
}

/* ---------- ai: batch summary, key check, "Why B" ---------- */

/** Poll every 3 s while generating, for at most 60 s (20 polls) per mount. */
const pollWhileGenerating = (q: { state: { data?: { status?: string }; dataUpdateCount: number } }) =>
  q.state.data?.status === "generating" && q.state.dataUpdateCount <= 20 ? 3000 : false;

export function useBatchSummary(testId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["m5", "summary", testId],
    enabled: enabled && !!testId,
    retry,
    staleTime: 5 * 60_000,
    refetchInterval: pollWhileGenerating,
    queryFn: async () => unwrap<BatchSummaryResponse>(await apiAiAdmin.get(`/admin/tests/${testId}/summary`)),
  });
}

export function useKeyCheck(testId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["m5", "key-check", testId],
    enabled: enabled && !!testId,
    retry,
    staleTime: 5 * 60_000,
    refetchInterval: pollWhileGenerating,
    queryFn: async () => unwrap<KeyCheckResponse>(await apiAiAdmin.get(`/admin/tests/${testId}/key-check`)),
  });
}

export function useQuestionInsight(testId: string | undefined, questionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["m5", "insight", testId, questionId],
    enabled: enabled && !!testId && !!questionId,
    retry,
    staleTime: 10 * 60_000,
    refetchInterval: pollWhileGenerating,
    queryFn: async () => unwrap<QuestionInsightResponse>(await apiAiAdmin.get(`/admin/tests/${testId}/questions/${questionId}/insight`)),
  });
}

/* ---------- formatting shared by these pages ---------- */

/** "+9", "−6", "+2.5", "0" (true minus sign, at most one decimal). */
export function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  const s = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1);
  return r > 0 ? `+${s}` : r < 0 ? `−${s}` : "0";
}

/** Tone of a "vs previous" delta: green up, amber down, muted when within 2 % of the paper (board: +1 is muted).
 *  A delta in percentage points (previous mock out of another maximum) is judged against 100. */
export function deltaTone(delta: number, maxScore: number, unit: DeltaUnit | null = "marks"): "good" | "bad" | "flat" {
  const scale = unit === "percentPoints" ? 100 : maxScore;
  if (Math.abs(delta) < Math.max(0.5, scale * 0.02)) return "flat";
  return delta > 0 ? "good" : "bad";
}

/** "+9 vs Mock 10" (same maximum) or "+1.8 pts vs Mock 10" (percentage points, another maximum). */
export function vsPrevious(delta: number, unit: DeltaUnit | null | undefined, previousName: string): string {
  return `${signed(delta)}${unit === "percentPoints" ? " pts" : ""} vs ${previousName}`;
}
