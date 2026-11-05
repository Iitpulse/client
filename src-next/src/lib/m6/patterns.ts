/*
  Admin-Patterns data (contract "Patterns": GET/POST /tests/admin/patterns, GET/PUT/DELETE …/:id, POST …/:id/duplicate,
  POST …/:id/restore). Answers: list { now, items, pageInfo }; one { now, pattern }; delete SoftDeleteResponse.
*/
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Pattern, PatternListResponse, PatternWriteRequest, SoftDeleteResponse } from "../m6-contract";
import { m6Call, m6Tests, scenario, source, unwrap } from "./client";
import { patternFixtures } from "./fixtures/patterns";

export type PatternSort = "lastUsed" | "name" | "created";
export interface PatternQuery {
  q?: string;
  examId?: string;
  sort?: PatternSort;
}

export function usePatterns(p: PatternQuery) {
  return useQuery({
    queryKey: ["m6", "patterns", p],
    placeholderData: keepPreviousData,
    queryFn: () =>
      m6Call<PatternListResponse>(
        "patterns",
        async () =>
          unwrap<PatternListResponse>(
            (await m6Tests.get("/admin/patterns", { params: { q: p.q || undefined, examId: p.examId || undefined, sort: p.sort ?? "lastUsed", pageSize: 100 } })).data
          ),
        () => (scenario() === "empty" ? patternFixtures.empty() : patternFixtures.list(p)),
        true
      ),
  });
}

export function usePattern(id: string | undefined) {
  return useQuery({
    queryKey: ["m6", "pattern", id],
    enabled: !!id,
    queryFn: async () =>
      (
        await m6Call<{ pattern: Pattern }>(
          "patterns",
          async () => unwrap<{ pattern: Pattern }>((await m6Tests.get(`/admin/patterns/${encodeURIComponent(id!)}`)).data),
          () => patternFixtures.get(id!),
          true
        )
      ).pattern,
  });
}

const SRC = "Patterns editor";

export const patternsApi = {
  create: (body: PatternWriteRequest) =>
    m6Call<{ pattern: Pattern }>(
      "patterns",
      async () => unwrap((await m6Tests.post("/admin/patterns", body, source(SRC))).data),
      () => patternFixtures.create(body)
    ),
  update: (id: string, body: PatternWriteRequest) =>
    m6Call<{ pattern: Pattern; testsUpdated?: number }>(
      "patterns",
      async () => unwrap((await m6Tests.put(`/admin/patterns/${encodeURIComponent(id)}`, body, source(SRC))).data),
      () => patternFixtures.update(id, body)
    ),
  duplicate: (id: string, name?: string) =>
    m6Call<{ pattern: Pattern }>(
      "patterns",
      async () => unwrap((await m6Tests.post(`/admin/patterns/${encodeURIComponent(id)}/duplicate`, { name }, source(SRC))).data),
      () => patternFixtures.duplicate(id, name)
    ),
  remove: (id: string) =>
    m6Call<SoftDeleteResponse>(
      "patterns",
      async () => unwrap((await m6Tests.delete(`/admin/patterns/${encodeURIComponent(id)}`, source("Patterns list"))).data),
      () => patternFixtures.remove(id)
    ),
  restore: (id: string) =>
    m6Call<{ pattern: Pattern }>(
      "patterns",
      async () => unwrap((await m6Tests.post(`/admin/patterns/${encodeURIComponent(id)}/restore`, {}, source("Patterns list"))).data),
      () => patternFixtures.restore(id)
    ),
};

export function useInvalidatePatterns() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["m6", "pattern"] }).then(() => qc.invalidateQueries({ queryKey: ["m6", "patterns"] }));
}
