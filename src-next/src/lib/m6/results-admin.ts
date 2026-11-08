/*
  Admin-Results (board Admin-Results; contract m6-api.md "Admin: results, student report, AI review" + Changes 8 Nov):
    GET  /tests/admin/tests/:id/results?q=&batchId=&flagged=any&sort=rank|score|time|s<i>&dir=&page=&pageSize=  [VIEW_RESULT]
         one page sorted / filtered by the server, plus `summary` (tiles), `batches` (filter) and phones (READ_USER)
    GET  /tests/admin/tests/:id/results.csv (same filters)                                         [VIEW_RESULT + EXPORT_RESULT]
    GET  /tests/admin/tests/:id/summary   (state, result mode, published / due, attempts, publishNow) [READ_TEST or VIEW_RESULT]
    GET  /tests/admin/tests/:id/result-publish-preview   [PUBLISH_RESULT or UPDATE_TEST]
    POST /tests/admin/tests/:id/results/publish ("Publish now": manual, or early for "after N days")  [PUBLISH_RESULT]
    GET  /tests/admin/tests/:id/picker/questions/:qid    (option letters for the "key corrected C → B" line)
  Real routes only (no sample data): a missing route shows the page's error state.
*/
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdminResultsResponse, AdminTestSummary, AdminTestSummaryResponse, AnswerKey, PickerPreview, PublishResultsNowResponse, ResultPublishPreview } from "../m6-contract";
import { apiError, m6Tests, source, unwrap } from "./client";

const enc = encodeURIComponent;
export type ResultRow = AdminResultsResponse["items"][number];

export interface ResultsQuery {
  q?: string;
  batchId?: string;
  /** any fullscreen exit or an auto-submit */
  flagged?: boolean;
  /** rank | score | time | s<i> (i-th section) */
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** One page of results, sorted and filtered by the server; the summary and batches cover every visible row. */
export function useAdminResults(testId: string, query: ResultsQuery) {
  const params = {
    q: query.q?.trim() || undefined,
    batchId: query.batchId || undefined,
    flagged: query.flagged ? "any" : undefined,
    sort: query.sort || undefined,
    dir: query.dir,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 25,
  };
  return useQuery({
    queryKey: ["m6", "results", testId, params],
    enabled: !!testId,
    placeholderData: keepPreviousData,
    retry: (n, e) => n < 1 && !["FORBIDDEN", "OUT_OF_SCOPE", "TEST_NOT_FOUND"].includes(apiError(e).code ?? ""),
    staleTime: 30_000,
    queryFn: async () => {
      try {
        return unwrap<AdminResultsResponse>((await m6Tests.get(`/admin/tests/${enc(testId)}/results`, { params })).data);
      } catch (e) {
        throw apiError(e);
      }
    },
  });
}

/** The test's header facts (one route, no list scan). null when it can't be read. */
export function useResultsTestInfo(testId: string) {
  return useQuery({
    queryKey: ["m6", "results-test", testId],
    enabled: !!testId,
    retry: 1,
    staleTime: 30_000,
    queryFn: async (): Promise<AdminTestSummary | null> =>
      m6Tests
        .get(`/admin/tests/${enc(testId)}/summary`)
        .then((r) => unwrap<AdminTestSummaryResponse>(r.data).test)
        .catch(() => null),
  });
}

export async function fetchResultPublishPreview(testId: string): Promise<ResultPublishPreview> {
  try {
    return unwrap<ResultPublishPreview>((await m6Tests.get(`/admin/tests/${enc(testId)}/result-publish-preview`)).data);
  } catch (e) {
    throw apiError(e);
  }
}

/** POST …/results/publish: Manual, or early for "After N days". 409 codes: ALREADY_PUBLISHED, TEST_NOT_ENDED, RESULT_HIDDEN, NO_SUBMISSIONS. */
export async function publishResultsNow(testId: string): Promise<PublishResultsNowResponse> {
  try {
    return unwrap<PublishResultsNowResponse>((await m6Tests.post(`/admin/tests/${enc(testId)}/results/publish`, {}, source("Results · Publish now"))).data);
  } catch (e) {
    throw apiError(e);
  }
}

/** Why "Publish now" isn't offered, in the page's words. */
export function publishNowWhy(code: string | null | undefined): string | null {
  if (code === "TEST_NOT_ENDED") return "Publishing opens once the test has closed and every student has finished (extra time included).";
  if (code === "RESULT_HIDDEN") return "Results are hidden from students for this test. Show them in the test's settings first.";
  if (code === "NO_SUBMISSIONS") return "No one has submitted yet.";
  return null;
}

export interface ResultsCsvQuery {
  q?: string;
  batchId?: string;
  flagged?: boolean;
  sort?: string;
  dir?: "asc" | "desc";
}

/** Downloads results.csv through the signed-in client (tokens live in memory, so a bare link would not work). */
export async function downloadResultsCsv(testId: string, fileName: string, query: ResultsCsvQuery = {}): Promise<void> {
  let text: string;
  try {
    const r = await m6Tests.get(`/admin/tests/${enc(testId)}/results.csv`, {
      params: { q: query.q || undefined, batchId: query.batchId || undefined, flagged: query.flagged ? "any" : undefined, sort: query.sort, dir: query.dir },
      responseType: "text",
      transformResponse: (d) => d,
    });
    text = String(r.data);
  } catch (e) {
    throw apiError(e);
  }
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/[^A-Za-z0-9 ._-]+/g, "").trim() || "test"}-results.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Option letters of a question (A, B, …) by option id, for "C → B". null when it can't be read. */
export function useOptionLetters(testId: string, questionId: string | null) {
  return useQuery({
    queryKey: ["m6", "option-letters", testId, questionId],
    enabled: !!testId && !!questionId,
    retry: 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<string, string> | null> => {
      try {
        const p = unwrap<PickerPreview>((await m6Tests.get(`/admin/tests/${enc(testId)}/picker/questions/${enc(questionId!)}`)).data);
        const opts = p.question.en.options ?? [];
        return Object.fromEntries(opts.map((o, i) => [o.id, String.fromCharCode(65 + i)]));
      } catch {
        return null;
      }
    },
  });
}

/** "B", "A, C", "4–6", "12"; null when the letters are unknown. */
export function keyText(k: AnswerKey | null | undefined, letters: Record<string, string> | null | undefined): string | null {
  if (!k) return null;
  if (k.range) return k.range.from === k.range.to ? String(k.range.from) : `${k.range.from}–${k.range.to}`;
  if (k.optionIds?.length) {
    if (!letters) return null;
    const l = k.optionIds.map((id) => letters[id]);
    return l.every(Boolean) ? l.join(", ") : null;
  }
  return null;
}
