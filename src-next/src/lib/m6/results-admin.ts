/*
  Admin-Results (board Admin-Results; contract m6-api.md "Admin: results, student report, AI review"):
    GET /tests/admin/tests/:id/results?q=&batchId=&flagged=1&sort=rank|name|score&page=&pageSize=   [VIEW_RESULT]
    GET /tests/admin/tests/:id/results.csv (same filters)                                         [VIEW_RESULT + EXPORT_RESULT]
    GET /tests/admin/tests/:id            (settings: result mode, fullscreen limit, key corrections) [READ_TEST]
    GET /tests/admin/tests?q=<name>       (list row: state, resultPublishedAt, resultDueAt, attempts) [READ_TEST]
    GET /tests/admin/tests/:id/result-publish-preview   [PUBLISH_RESULT or UPDATE_TEST]; publish = PATCH /tests/test/publish-result
    GET /tests/admin/tests/:id/picker/questions/:qid    (option letters for the "key corrected C → B" line)
  Real routes only (no sample data): a missing route shows the page's error state.
  The results route sorts by rank, name or score only (descending, no section or time sort), so the page reads every
  row (≤ 500 per call; launch target < 500 students) and sorts, filters and pages in the browser.
*/
import { useQuery } from "@tanstack/react-query";
import type { AdminResultsResponse, AdminTestListItem, AdminTestListResponse, AnswerKey, PickerPreview, ResultPublishPreview, TestSettings } from "../m6-contract";
import { api } from "../api";
import { apiError, m6Tests, unwrap } from "./client";

const enc = encodeURIComponent;
export type ResultRow = AdminResultsResponse["items"][number];

/** Every result row of the test (pages of 500). */
async function allResults(testId: string): Promise<AdminResultsResponse> {
  const get = async (page: number) => unwrap<AdminResultsResponse>((await m6Tests.get(`/admin/tests/${enc(testId)}/results`, { params: { page, pageSize: 500 } })).data);
  try {
    const first = await get(1);
    let items = first.items;
    for (let p = 2; (p - 1) * 500 < first.pageInfo.total && p <= 20; p++) items = [...items, ...(await get(p)).items];
    return { ...first, items };
  } catch (e) {
    throw apiError(e);
  }
}

export function useAdminResults(testId: string) {
  return useQuery({
    queryKey: ["m6", "results", testId],
    enabled: !!testId,
    retry: (n, e) => n < 1 && !["FORBIDDEN", "OUT_OF_SCOPE", "TEST_NOT_FOUND"].includes(apiError(e).code ?? ""),
    staleTime: 30_000,
    queryFn: () => allResults(testId),
  });
}

export interface ResultsTestInfo {
  settings: TestSettings | null;
  /** the tests-list row (state, result published / due, attempts) */
  row: AdminTestListItem | null;
}

/** Settings + the tests-list row of this test. Either may be null (no permission, not found). */
export function useResultsTestInfo(testId: string) {
  return useQuery({
    queryKey: ["m6", "results-test", testId],
    enabled: !!testId,
    retry: 1,
    staleTime: 30_000,
    queryFn: async (): Promise<ResultsTestInfo> => {
      const settings = await m6Tests
        .get(`/admin/tests/${enc(testId)}`)
        .then((r) => unwrap<{ test: TestSettings }>(r.data).test)
        .catch(() => null);
      let row: AdminTestListItem | null = null;
      if (settings) {
        row = await m6Tests
          .get("/admin/tests", { params: { q: settings.name, pageSize: 100 } })
          .then((r) => unwrap<AdminTestListResponse>(r.data).items.find((t) => t.testId === testId) ?? null)
          .catch(() => null);
      }
      return { settings, row };
    },
  });
}

export async function fetchResultPublishPreview(testId: string): Promise<ResultPublishPreview> {
  try {
    return unwrap<ResultPublishPreview>((await m6Tests.get(`/admin/tests/${enc(testId)}/result-publish-preview`)).data);
  } catch (e) {
    throw apiError(e);
  }
}

/** PATCH /tests/test/publish-result (manual result mode). */
export async function publishResultsNow(testId: string): Promise<void> {
  try {
    await api.tests.publishResult(testId);
  } catch (e) {
    throw apiError(e);
  }
}

export interface ResultsCsvQuery {
  q?: string;
  batchId?: string;
  flagged?: boolean;
  sort?: "rank" | "name" | "score";
}

/** Downloads results.csv through the signed-in client (tokens live in memory, so a bare link would not work). */
export async function downloadResultsCsv(testId: string, fileName: string, query: ResultsCsvQuery = {}): Promise<void> {
  let text: string;
  try {
    const r = await m6Tests.get(`/admin/tests/${enc(testId)}/results.csv`, {
      params: { q: query.q || undefined, batchId: query.batchId || undefined, flagged: query.flagged ? 1 : undefined, sort: query.sort },
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
