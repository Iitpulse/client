/*
  Assigned practice (batch 8, board Admin-AssignPractice; contract api-tests docs/batch8-api.md):
    GET  /tests/admin/dashboard/chapter-accuracy?testId=   the test's chapters, weakest first
    POST /tests/admin/practice-assignments/preview          how many bank questions match
    POST /tests/admin/practice-assignments                  assign
    GET  /tests/admin/practice-assignments?sourceTestId=     tracking for the Results page
    PATCH / DELETE /tests/admin/practice-assignments/:id     change due date / cancel
*/
import { useQuery } from "@tanstack/react-query";
import type { ChapterAccuracyResponse } from "../m6-contract";
import { apiError, m6Tests, source, unwrap } from "./client";

export interface PracticeAssignment {
  id: string;
  title: string;
  note: string | null;
  sourceTestId: string | null;
  chapters: Array<{ subject: string | null; chapter: string }>;
  questionCount: number;
  difficulty: "mixed" | "easy" | "medium" | "hard";
  mode: "practice" | "timed";
  minutes: number | null;
  includeWrong: boolean;
  dueAt: string;
  by: { id: string; name: string | null };
  createdAt: string;
  cancelledAt: string | null;
  tracking: { assigned: number; started: number; notStarted: number; finished: number; finishedLate: number; averageCorrect: number | null };
}
export interface AssignRequest {
  title: string;
  note?: string | null;
  sourceTestId?: string | null;
  chapters: Array<{ subject: string | null; chapter: string }>;
  count: number;
  difficulty: PracticeAssignment["difficulty"];
  mode: PracticeAssignment["mode"];
  minutes?: number | null;
  includeWrong?: boolean;
  dueAt: string;
  studentIds: string[];
}
export interface AssignPreview {
  chapters: Array<{ subject: string | null; chapter: string; available: number }>;
  available: number;
  perStudent: number;
  enough: boolean;
}

const enc = encodeURIComponent;
const SRC = source("Results · Assign practice");
const wrap = async <T>(p: Promise<{ data: unknown }>): Promise<T> => {
  try {
    return unwrap<T>((await p).data as never);
  } catch (e) {
    throw apiError(e);
  }
};

export function useTestChapters(testId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["m6", "test-chapters", testId],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => wrap<ChapterAccuracyResponse>(m6Tests.get("/admin/dashboard/chapter-accuracy", { params: { testId, limit: 50 } })),
  });
}
export const previewAssign = (body: { chapters: AssignRequest["chapters"]; count: number }) => wrap<AssignPreview>(m6Tests.post("/admin/practice-assignments/preview", body, SRC));
export const createAssign = (body: AssignRequest) => wrap<{ assignment: PracticeAssignment }>(m6Tests.post("/admin/practice-assignments", body, SRC));
export const changeDue = (id: string, dueAt: string) => wrap<{ assignment: PracticeAssignment }>(m6Tests.patch(`/admin/practice-assignments/${enc(id)}`, { dueAt }, SRC));
export const cancelAssign = (id: string) => wrap<{ id: string }>(m6Tests.delete(`/admin/practice-assignments/${enc(id)}`, SRC));

export function useTestAssignments(testId: string) {
  return useQuery({
    queryKey: ["m6", "practice-assignments", testId],
    staleTime: 30_000,
    retry: false,
    queryFn: () => wrap<{ items: PracticeAssignment[] }>(m6Tests.get("/admin/practice-assignments", { params: { sourceTestId: testId } })),
  });
}

/** Every result row the caller may see (who to assign), pages of 500. */
export function useAllResultRows(testId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["m6", "results-all", testId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const get = (page: number) => wrap<import("../m6-contract").AdminResultsResponse>(m6Tests.get(`/admin/tests/${enc(testId)}/results`, { params: { page, pageSize: 500 } }));
      const first = await get(1);
      let items = first.items;
      for (let p = 2; (p - 1) * 500 < first.pageInfo.total && p <= 10; p++) items = [...items, ...(await get(p)).items];
      return items;
    },
  });
}
