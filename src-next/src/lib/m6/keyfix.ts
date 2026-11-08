/*
  Answer-key fix and re-score (owner D6; contract api-ai docs/m6-api.md "Answer-key fix and re-score", board
  Admin-Analysis fix-key / fix-impact / fix-confirm / fix-progress / fix-done). Real routes only (no sample data):
    POST /tests/admin/tests/:id/key-fix/preview {questionId, mode, newKey, acceptKeys?, updateBank} → KeyFixPreview
    POST /tests/admin/tests/:id/key-fix {previewId} → 202 KeyCorrection
    GET  /tests/admin/tests/:id/key-fix/:correctionId → KeyCorrection (poll while running)
  The test's corrections so far come with GET /tests/admin/tests/:id/results (keyCorrections).
*/
import { useQuery } from "@tanstack/react-query";
import type { AdminResultsResponse, KeyCorrection, KeyFixPreview, KeyFixPreviewRequest } from "../m6-contract";
import { apiError, m6Tests, source, unwrap } from "./client";

export async function previewKeyFix(testId: string, body: KeyFixPreviewRequest): Promise<KeyFixPreview> {
  try {
    return unwrap<KeyFixPreview>((await m6Tests.post(`/admin/tests/${testId}/key-fix/preview`, body, source("Question analysis · Fix key"))).data);
  } catch (e) {
    throw apiError(e);
  }
}

export async function startKeyFix(testId: string, previewId: string): Promise<KeyCorrection> {
  try {
    const d = unwrap<KeyCorrection | { correction: KeyCorrection }>((await m6Tests.post(`/admin/tests/${testId}/key-fix`, { previewId }, source("Question analysis · Fix key"))).data);
    return "correction" in d ? d.correction : d;
  } catch (e) {
    throw apiError(e);
  }
}

export async function getKeyFix(testId: string, correctionId: string): Promise<KeyCorrection> {
  try {
    const d = unwrap<KeyCorrection | { correction: KeyCorrection }>((await m6Tests.get(`/admin/tests/${testId}/key-fix/${correctionId}`)).data);
    return "correction" in d ? d.correction : d;
  } catch (e) {
    throw apiError(e);
  }
}

/** The test's key corrections (newest first), from the results route. Empty when the route is unavailable. */
export function useKeyCorrections(testId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["m6", "key-corrections", testId],
    enabled: enabled && !!testId,
    retry: false,
    queryFn: async (): Promise<KeyCorrection[]> => {
      try {
        const r = unwrap<AdminResultsResponse>((await m6Tests.get(`/admin/tests/${testId}/results`, { params: { pageSize: 1 } })).data);
        return r.keyCorrections ?? [];
      } catch {
        return [];
      }
    },
  });
}
