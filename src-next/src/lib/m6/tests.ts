/*
  Admin-Tests list and row actions (M6, api-ai docs/m6-api.md "Admin tests list, builder settings, publish" and
  "Student test links"). Routes: GET /tests/admin/tests, POST /tests/admin/tests/:id/{publish,unpublish,duplicate,
  restore}, DELETE /tests/admin/tests/:id (published: x-reauth-token), GET …/:id/result-publish-preview, results via
  the existing PATCH /tests/test/publish-result; links on /users/admin/test-links{,/renew,/email}.
  Sample-data fallback per area ("tests", "links"): ./client.ts.
*/
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_GATEWAY } from "../ai-admin";
import { api } from "../api";
import type {
  AdminTestListResponse,
  PublishResponse,
  ResultPublishPreview,
  SoftDeleteResponse,
  TestLinksEmailResponse,
  TestLinksResponse,
  TestSettings,
} from "../m6-contract";
import { m6Call, m6Tests, m6Users, reauthHeader, source, unwrap } from "./client";
import {
  fixtureDelete,
  fixtureDuplicate,
  fixtureList,
  fixturePublish,
  fixturePublishResults,
  fixtureRestore,
  fixtureResultPreview,
  fixtureUnpublish,
  type ListParams,
} from "./fixtures/tests";
import { fixtureEmailLinks, fixtureLinks, fixtureMakeLinks, fixtureRenew } from "./fixtures/links";

export type { ListParams as TestListParams };

const SRC = source("Tests list");
const enc = encodeURIComponent;

function clean(p: ListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== "" && !(k === "state" && v === "all")) out[k] = v as string | number;
  return out;
}

export function useAdminTests(p: ListParams, enabled = true) {
  return useQuery({
    queryKey: ["m6", "tests", "list", p],
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    queryFn: () =>
      m6Call<AdminTestListResponse>(
        "tests",
        async () => unwrap<AdminTestListResponse>((await m6Tests.get("/admin/tests", { params: clean(p) })).data),
        () => fixtureList(p),
        true
      ),
  });
}

/** Refresh every view of the tests list and calendar after a write. */
export function useInvalidateTests() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["m6", "tests"] });
    qc.invalidateQueries({ queryKey: ["m6", "calendar"] });
    qc.invalidateQueries({ queryKey: ["tests"] });
  };
}

export const testsActions = {
  publish: (id: string) =>
    m6Call<PublishResponse>(
      "tests",
      async () => unwrap<PublishResponse>((await m6Tests.post(`/admin/tests/${enc(id)}/publish`, {}, SRC)).data),
      () => fixturePublish(id)
    ),
  unpublish: (id: string) =>
    m6Call<{ test: TestSettings }>(
      "tests",
      async () => unwrap<{ test: TestSettings }>((await m6Tests.post(`/admin/tests/${enc(id)}/unpublish`, {}, SRC)).data),
      () => fixtureUnpublish(id)
    ),
  duplicate: (id: string, name?: string) =>
    m6Call<{ test: TestSettings }>(
      "tests",
      async () => unwrap<{ test: TestSettings }>((await m6Tests.post(`/admin/tests/${enc(id)}/duplicate`, name ? { name } : {}, SRC)).data),
      () => fixtureDuplicate(id, name)
    ),
  /** Drafts: soft delete with Undo. Published: pass the re-auth token. Live: 409 TEST_LIVE. */
  remove: (id: string, reauthToken: string | null = null) =>
    m6Call<SoftDeleteResponse>(
      "tests",
      async () =>
        unwrap<SoftDeleteResponse>(
          (await m6Tests.delete(`/admin/tests/${enc(id)}`, { headers: { ...SRC.headers, ...(reauthToken ? reauthHeader(reauthToken).headers : {}) } })).data
        ),
      () => fixtureDelete(id, reauthToken)
    ),
  /** "Undo" in the toast: POST undo.path (a gateway path such as /tests/admin/tests/:id/restore). */
  undo: (path: string, id: string) =>
    m6Call<void>(
      "tests",
      async () => {
        await m6Tests.post(path, {}, { baseURL: API_GATEWAY, ...SRC });
      },
      () => fixtureRestore(id)
    ),
  resultPreview: (id: string) =>
    m6Call<ResultPublishPreview>(
      "tests",
      async () => unwrap<ResultPublishPreview>((await m6Tests.get(`/admin/tests/${enc(id)}/result-publish-preview`)).data),
      () => fixtureResultPreview(id),
      true
    ),
  /** Publishing results uses the existing route (contract). */
  publishResults: (id: string) =>
    m6Call<void>(
      "tests",
      async () => {
        await api.tests.publishResult(id);
      },
      () => fixturePublishResults(id)
    ),
};

/* ─────────────────────────────── student links ─────────────────────────────── */

const LSRC = source("Student links");

export function useTestLinks(testId: string | null, batchId: string | null) {
  return useQuery({
    queryKey: ["m6", "tests", "links", testId, batchId],
    enabled: !!testId && !!batchId,
    queryFn: () =>
      m6Call<TestLinksResponse>(
        "links",
        async () => unwrap<TestLinksResponse>((await m6Users.get("/admin/test-links", { params: { testId, batchId } })).data),
        () => fixtureLinks(testId!, batchId!),
        true
      ),
  });
}

export const linksActions = {
  make: (testId: string, batchId: string) =>
    m6Call<TestLinksResponse>(
      "links",
      async () => unwrap<TestLinksResponse>((await m6Users.post("/admin/test-links", { testId, batchId }, LSRC)).data),
      () => fixtureMakeLinks(testId, batchId)
    ),
  renew: (testId: string, studentId: string) =>
    m6Call<TestLinksResponse["items"][number]>(
      "links",
      async () => unwrap<TestLinksResponse["items"][number]>((await m6Users.post("/admin/test-links/renew", { testId, studentId }, LSRC)).data),
      () => fixtureRenew(testId, studentId)
    ),
  email: (testId: string, batchId: string) =>
    m6Call<TestLinksEmailResponse>(
      "links",
      async () => unwrap<TestLinksEmailResponse>((await m6Users.post("/admin/test-links/email", { testId, batchId }, LSRC)).data),
      () => fixtureEmailLinks(testId, batchId)
    ),
};

/** WhatsApp text: one line per student ("Aarav Jain: https://…"). */
export function linksCopyText(l: TestLinksResponse): string {
  return [`${l.test.name}`, ...l.items.map((r) => `${r.student.name}: ${r.url}`)].join("\n");
}

/** CSV of the drawer's table (Name, Phone, Link, Opened, Last opened). */
export function linksCsv(l: TestLinksResponse): string {
  const q = (s: string | number | null) => {
    const v = s == null ? "" : String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  return [["Name", "Phone", "Link", "Opened", "Last opened"], ...l.items.map((r) => [r.student.name, r.student.phone, r.url, r.opens, r.lastOpenedAt])]
    .map((row) => row.map(q).join(","))
    .join("\n");
}
