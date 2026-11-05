/*
  M6 test paper + question picker data (contract: api-ai docs/m6-api.md "Paper, picker, fill by rule"; types
  ../m6-contract). Routes (gateway /tests):
    GET  /admin/tests/:id/paper                          → PaperView
    PUT  /admin/tests/:id/paper/subsections/:subId       { questionIds, expectedRevision } → PaperWriteResponse
    POST /admin/tests/:id/paper/restore                  { revision } → PaperWriteResponse ("Undo")
    POST /admin/tests/:id/picker/search                  PickerSearchRequest → PickerSearchResponse
    GET  /admin/tests/:id/picker/questions/:qid          → PickerPreview
    POST /admin/tests/:id/picker/fill-preview            FillPreviewRequest → FillPreviewResponse
  Errors: 409 PAPER_CHANGED { revision } (someone else saved: reload), 409 TEST_LOCKED (someone started), 403 FORBIDDEN.
  Sample data (areas "paper", "picker") until the routes are on the backend: ./fixtures/paper.ts.

  Used by the TestBuilder (sections, slots, Undo of an AI rebuild) and the QuestionPicker page.
*/
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FillPreviewRequest,
  FillPreviewResponse,
  PaperView,
  PaperWriteResponse,
  PickerPreview,
  PickerSearchRequest,
  PickerSearchResponse,
  TestState,
} from "../m6-contract";
import { m6Call, m6Tests, source, unwrap } from "./client";
import * as fx from "./fixtures/paper";

const T = (id: string) => `/admin/tests/${encodeURIComponent(id)}`;

export const paperKey = (testId: string) => ["m6", "paper", testId] as const;

/** GET …/paper (the builder's sections and the picker's tally). */
export function usePaper(testId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: paperKey(testId ?? ""),
    enabled: !!testId && enabled,
    queryFn: () =>
      m6Call<PaperView>("paper", async () => unwrap<{ paper?: PaperView } & PaperView>((await m6Tests.get(`${T(testId!)}/paper`)).data), () => fx.getPaper(testId!), true).then(
        (d) => ((d as { paper?: PaperView }).paper ?? d) as PaperView
      ),
  });
}

/** PUT one sub-section's whole ordered list (add, remove, replace, reorder). `sources` marks slots "ai" | "manual" (default manual). */
export function putSubsection(
  testId: string,
  subsectionId: string,
  questionIds: string[],
  expectedRevision: number,
  where = "Question picker",
  sources?: Record<string, "ai" | "manual">
): Promise<PaperWriteResponse> {
  return m6Call<PaperWriteResponse>(
    "paper",
    async () =>
      unwrap<PaperWriteResponse>(
        (await m6Tests.put(`${T(testId)}/paper/subsections/${encodeURIComponent(subsectionId)}`, { questionIds, expectedRevision, ...(sources ? { sources } : {}) }, source(where))).data
      ),
    () => fx.putSubsection(testId, subsectionId, questionIds, expectedRevision)
  );
}

/** POST …/paper/restore { revision }: every "Undo" (picker toast, AI rebuild). */
export function restorePaper(testId: string, revision: number, where = "Question picker"): Promise<PaperWriteResponse> {
  return m6Call<PaperWriteResponse>(
    "paper",
    async () => unwrap<PaperWriteResponse>((await m6Tests.post(`${T(testId)}/paper/restore`, { revision }, source(where))).data),
    () => fx.restorePaper(testId, revision)
  );
}

/** Puts a write's paper in the cache (no refetch flash). */
export function useSetPaper(testId: string) {
  const qc = useQueryClient();
  return (paper: PaperView) => {
    qc.setQueryData(paperKey(testId), paper);
    qc.invalidateQueries({ queryKey: ["m6", "picker", testId] });
    qc.invalidateQueries({ queryKey: ["m6", "readiness", testId] });
  };
}

export function pickerSearch(testId: string, req: PickerSearchRequest): Promise<PickerSearchResponse> {
  return m6Call<PickerSearchResponse>(
    "picker",
    async () => unwrap<PickerSearchResponse>((await m6Tests.post(`${T(testId)}/picker/search`, req)).data),
    () => fx.pickerSearch(testId, req),
    true
  );
}

export function usePickerSearch(testId: string | undefined, req: PickerSearchRequest | null) {
  return useQuery({
    queryKey: ["m6", "picker", testId ?? "", "search", req],
    enabled: !!testId && !!req?.subsectionId,
    placeholderData: keepPreviousData,
    queryFn: () => pickerSearch(testId!, req!),
  });
}

export function usePickerPreview(testId: string | undefined, questionId: string | null) {
  return useQuery({
    queryKey: ["m6", "picker", testId ?? "", "preview", questionId],
    enabled: !!testId && !!questionId,
    staleTime: 5 * 60_000,
    queryFn: () =>
      m6Call<PickerPreview>(
        "picker",
        async () => unwrap<PickerPreview>((await m6Tests.get(`${T(testId!)}/picker/questions/${encodeURIComponent(questionId!)}`)).data),
        () => fx.pickerPreview(questionId!),
        true
      ),
  });
}

export function fillPreview(testId: string, req: FillPreviewRequest): Promise<FillPreviewResponse> {
  return m6Call<FillPreviewResponse>(
    "picker",
    async () => unwrap<FillPreviewResponse>((await m6Tests.post(`${T(testId)}/picker/fill-preview`, req)).data),
    () => fx.fillPreview(testId, req)
  );
}

/** The picker page's header: name, state, locked (GET /tests/admin/tests/:id → { test }). */
export interface PaperTestHead {
  id: string;
  name: string;
  state: TestState;
  locked: boolean;
  exam: { id: string; name: string } | null;
  batches: Array<{ id: string; name: string }>;
}
export function usePaperTestHead(testId: string | undefined) {
  return useQuery({
    queryKey: ["m6", "paper-test", testId ?? ""],
    enabled: !!testId,
    staleTime: 30_000,
    queryFn: () =>
      m6Call<PaperTestHead>(
        "tests",
        async () => {
          const d = unwrap<{ test: { id: string; name: string; state: TestState; lockedBySubmissions: boolean; exam: { id: string; name: string } | null; batches: Array<{ id: string; name: string }> } }>(
            (await m6Tests.get(T(testId!))).data
          );
          const t = d.test;
          return { id: t.id, name: t.name, state: t.state, locked: t.lockedBySubmissions || t.state === "live" || t.state === "ended", exam: t.exam, batches: t.batches };
        },
        () => fx.testHead(testId!),
        true
      ),
  });
}

/* ─────────────────────────────── copy shared by the builder and the picker ─────────────────────────────── */

export const TYPE_NAME: Record<string, string> = {
  single: "Single correct",
  multiple: "More than one correct",
  integer: "Numerical",
  paragraph: "Paragraph",
  matrix: "Matrix match",
};

/** "+4 / −1" */
export function markingShort(m: { correct: number; incorrect: number }): string {
  const neg = m.incorrect < 0 ? `−${Math.abs(m.incorrect)}` : "0";
  return `+${m.correct} / ${neg}`;
}

/** Paper numbers of a slot: "Q7" or "Q21–23" (paragraph sets take setSize numbers). */
export function slotNumbers(n: number, count: number): string {
  return count > 1 ? `Q${n}–${n + count - 1}` : `Q${n}`;
}

export function blockedCopy(reason: string | null, setSize?: number | null, childType?: string | null): string | null {
  if (reason === "WRONG_SET_SIZE") return `This section takes sets of ${setSize ?? "?"}`;
  if (reason === "WRONG_CHILD_TYPE") return `This section takes ${childType ? TYPE_NAME[childType]?.toLowerCase() ?? childType : "other"} questions`;
  if (reason === "SUBSECTION_FULL") return "Section is full";
  return null;
}

/** "Rejected" reasons of a sub-section PUT, for the toast. */
export const REJECT_COPY: Record<string, string> = {
  WRONG_TYPE: "is a different type",
  WRONG_SUBJECT: "is from another subject",
  SET_SIZE: "has the wrong number of questions",
  SUBSECTION_FULL: "didn't fit: the section is full",
  DUPLICATE: "is already in this test",
  QUESTION_NOT_FOUND: "no longer exists",
  DELETED: "was deleted",
};
