/*
  M6 test builder data (Admin-TestBuilder board; contract api-ai docs/m6-api.md "Admin tests list, builder settings,
  publish" and "AI test builder"). Routes through the gateway:
    POST /tests/admin/tests · GET/PATCH /tests/admin/tests/:id · GET …/:id/readiness · POST …/:id/publish
    GET …/:id/student-preview · POST /ai/admin/tests/:id/build (SSE)
  Patterns and templates of the exam come from ./patterns.ts and ./templates.ts, ended tests (weak-topics source) from
  ./tests.ts, the paper (sections, slots, PUT sub-section, restore) from ./paper.ts. Sample data: ./fixtures/builder.ts and
  ./fixtures/ai-build.ts (areas "tests" and "aiBuild", see ./client.ts).
*/
import { useQuery } from "@tanstack/react-query";
import type {
  Pattern,
  PatternListResponse,
  TemplateListResponse,
  PublishResponse,
  ReadinessResponse,
  TestBuild,
  TestBuildRequest,
  TestBuildStreamEvent,
  TestCreateRequest,
  TestSettings,
  TestSettingsPatch,
  TestSettingsPatchResponse,
} from "../m6-contract";
import { m6Call, m6Tests, postStream, source, unwrap } from "./client";
import * as fx from "./fixtures/builder";
import { sampleBuildStream } from "./fixtures/ai-build";

const SRC = source("Test builder");

export const builderKeys = {
  test: (id: string) => ["m6", "test", id] as const,
  readiness: (id: string) => ["m6", "readiness", id] as const,
};

/* ─────────────────────────────── settings ─────────────────────────────── */

export function useTestSettings(testId: string | undefined) {
  return useQuery({
    queryKey: builderKeys.test(testId ?? ""),
    enabled: !!testId,
    queryFn: () =>
      m6Call<TestSettings>(
        "tests",
        async () => unwrap<{ test: TestSettings }>((await m6Tests.get(`/admin/tests/${testId}`)).data).test,
        () => fx.getTest(testId!),
        true
      ),
  });
}

export function createTest(req: TestCreateRequest): Promise<TestSettings> {
  return m6Call<TestSettings>(
    "tests",
    async () => unwrap<{ test: TestSettings }>((await m6Tests.post("/admin/tests", req, SRC)).data).test,
    () => fx.createTest(req)
  );
}

export function patchTest(testId: string, patch: TestSettingsPatch): Promise<TestSettingsPatchResponse> {
  return m6Call<TestSettingsPatchResponse>(
    "tests",
    async () => unwrap<TestSettingsPatchResponse>((await m6Tests.patch(`/admin/tests/${testId}`, patch, SRC)).data),
    () => fx.patchTest(testId, patch)
  );
}

export function useReadiness(testId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: builderKeys.readiness(testId ?? ""),
    enabled: !!testId && enabled,
    queryFn: () =>
      m6Call<ReadinessResponse>(
        "tests",
        async () => unwrap<ReadinessResponse>((await m6Tests.get(`/admin/tests/${testId}/readiness`)).data),
        () => fx.readiness(testId!),
        true
      ),
  });
}

/** POST …/publish → { test, notified }; 409 NOT_READY { checks }. Also used by the Tests list. */
export function publishTest(testId: string, where = "Test builder"): Promise<PublishResponse> {
  return m6Call<PublishResponse>(
    "tests",
    async () => unwrap<PublishResponse>((await m6Tests.post(`/admin/tests/${testId}/publish`, {}, source(where))).data),
    () => fx.publish(testId)
  );
}

/** "Preview as student": the student exam payload without an attempt. */
export function getStudentPreview(testId: string): Promise<unknown> {
  return m6Call<unknown>(
    "tests",
    async () => unwrap<unknown>((await m6Tests.get(`/admin/tests/${testId}/student-preview`)).data),
    () => fx.studentPreview(testId),
    true
  );
}

/* ─────────────────────────────── the exam's patterns and templates ─────────────────────────────── */

export type PatternListItem = PatternListResponse["items"][number];

/** GET /tests/admin/patterns?examId (the pattern combobox). */
export function useExamPatterns(examId: string | undefined) {
  return useQuery({
    queryKey: ["m6", "builder", "patterns", examId ?? ""],
    enabled: !!examId,
    staleTime: 60_000,
    queryFn: () =>
      m6Call<PatternListItem[]>(
        "patterns",
        async () => unwrap<PatternListResponse>((await m6Tests.get("/admin/patterns", { params: { examId, sort: "lastUsed", pageSize: 100 } })).data).items,
        () => fx.examPatterns(examId!),
        true
      ),
  });
}

/** GET /tests/admin/patterns/:id (the pattern card). */
export function usePatternFull(patternId: string | undefined) {
  return useQuery({
    queryKey: ["m6", "builder", "pattern", patternId ?? ""],
    enabled: !!patternId,
    staleTime: 60_000,
    queryFn: () =>
      m6Call<Pattern>(
        "patterns",
        async () => {
          const d = unwrap<{ pattern?: Pattern } & Pattern>((await m6Tests.get(`/admin/patterns/${encodeURIComponent(patternId!)}`)).data);
          return d.pattern ?? d;
        },
        () => fx.pattern(patternId!),
        true
      ),
  });
}

/** GET /tests/admin/templates?examId (the "Exam screen" combobox; the exam's default is preselected). */
export function useExamTemplates(examId: string | undefined) {
  return useQuery({
    queryKey: ["m6", "builder", "templates", examId ?? ""],
    enabled: !!examId,
    staleTime: 60_000,
    queryFn: () =>
      m6Call<TemplateListResponse>(
        "templates",
        async () => unwrap<TemplateListResponse>((await m6Tests.get("/admin/templates", { params: { examId } })).data),
        () => fx.templates(examId!),
        true
      ),
  });
}

/* ─────────────────────────────── AI test builder ─────────────────────────────── */

/**
 * POST /ai/admin/tests/:id/build (SSE). Errors before the stream (TEST_LOCKED, BUILD_RUNNING, PAPER_CHANGED,
 * ADMIN_AI_DAILY_LIMIT, AI_RATE_LIMITED, AI_PAUSED, FORBIDDEN) reject with AdminApiError. Resolves with the last
 * `done` build (null when the connection dropped first).
 */
export async function buildWithAi(
  testId: string,
  req: TestBuildRequest,
  onEvent: (e: TestBuildStreamEvent) => void,
  signal?: AbortSignal
): Promise<TestBuild | null> {
  let last: TestBuild | null = null;
  const handle = (e: TestBuildStreamEvent) => {
    if (e.event === "done") last = e.data.build;
    onEvent(e);
  };
  await m6Call<"done" | "dropped">(
    "aiBuild",
    () => postStream(`/ai/admin/tests/${encodeURIComponent(testId)}/build`, req, (event, data) => handle({ event, data } as TestBuildStreamEvent), signal),
    () => sampleBuildStream(testId, req, handle, signal)
  );
  return last;
}

/* ─────────────────────────────── copy helpers ─────────────────────────────── */

export const RESULT_MODES = [
  { key: "immediately", label: "Instant" },
  { key: "atTheEndOfTest", label: "At close" },
  { key: "autoAfterXDays", label: "After days" },
  { key: "manual", label: "Manual" },
] as const;
