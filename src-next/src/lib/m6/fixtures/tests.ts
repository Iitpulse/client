/*
  Fallback answers for the admin tests list and its row actions (GET /tests/admin/tests, publish, unpublish,
  duplicate, delete, restore, result-publish-preview) while those M6 routes are not on the backend. See ../client.ts.
  - fixture mode "on": the shared sample world (seed.ts), in memory.
  - auto (route missing): the backend's real tests through the legacy routes (GET /tests/test, /tests/admin/live,
    DELETE /tests/test/delete/:id + restore, PATCH /tests/test/publish-result), so the list keeps showing real tests.
    M6-only actions (duplicate, move back to drafts) answer NOT_IMPLEMENTED there.
*/
import type {
  AdminTestListItem,
  AdminTestListResponse,
  PublishResponse,
  ResultPublishPreview,
  SoftDeleteResponse,
  TestSettings,
  TestState,
} from "../../m6-contract";
import { api, apiTests } from "../../api";
import { fixtureError, fixtureMode, scenario } from "../client";
import { sampleWorld, type SampleTest } from "./seed";

let store: SampleTest[] | null = null;
let legacy: SampleTest[] | null = null;
const legacyMode = () => fixtureMode() !== "on";

/** The tests behind the fallback (shared with the calendar and links fixtures). */
export async function sampleTests(): Promise<SampleTest[]> {
  if (legacyMode()) return legacy ?? (await loadLegacy());
  if (!store) store = (await sampleWorld()).tests.map((t) => ({ ...t, batches: [...t.batches] }));
  return store;
}

type LegacyTest = {
  _id: string;
  name: string;
  status?: string;
  durationInMinutes?: number;
  totalMarks?: number;
  exam?: { id: string; name: string } | null;
  pattern?: { id: string; name: string } | null;
  batches?: Array<{ id: string; name: string }>;
  sections?: Array<{ subSections?: Array<{ totalQuestions?: number; questions?: unknown[] }> }>;
  validity?: { from?: string; to?: string } | null;
  result?: { isPublished?: boolean; students?: unknown[]; publishProps?: { type?: string; publishDate?: string | null; isPublished?: boolean } };
};
function legacyRows(body: unknown): LegacyTest[] {
  const b = body as { data?: unknown } | unknown[];
  return (Array.isArray(b) ? b : Array.isArray((b as { data?: unknown })?.data) ? (b as { data: unknown[] }).data : []) as LegacyTest[];
}
const MODE: Record<string, SampleTest["resultMode"]> = { immediately: "immediately", atTheEndOfTest: "atTheEndOfTest", autoAfterXDays: "autoAfterXDays", manual: "manual" };

/** Real tests through the legacy routes, mapped to the M6 list shape. */
export async function loadLegacy(): Promise<SampleTest[]> {
  const pages: LegacyTest[] = [];
  const first = await api.tests.getAll({ page: 1, size: 100 });
  pages.push(...legacyRows(first.data));
  const total = Math.min(Number((first.data as { totalPages?: number })?.totalPages ?? 1), 20);
  for (let p = 2; p <= total; p++) pages.push(...legacyRows((await api.tests.getAll({ page: p, size: 100 })).data));
  try {
    pages.push(...legacyRows((await api.tests.getAll({ page: 1, size: 100, status: "draft" })).data));
  } catch {
    /* drafts already in the list */
  }
  type Live = { testId: string; assigned: number | null; started: number; submitted: number; autoSubmitted: number };
  let live: Live[] = [];
  try {
    const r = (await apiTests.get("/admin/live")).data as { data?: { tests?: Live[] }; tests?: Live[] };
    live = r?.data?.tests ?? r?.tests ?? [];
  } catch {
    /* M5 live route missing: no live attempts */
  }
  const now = Date.now();
  const seen = new Set<string>();
  legacy = pages
    .filter((t) => t?._id && !seen.has(t._id) && seen.add(t._id))
    .map((t): SampleTest => {
      const from = t.validity?.from ?? null;
      const to = t.validity?.to ?? null;
      const state: SampleTest["state"] =
        !t.status || t.status === "draft"
          ? "draft"
          : t.status === "completed" || t.status === "expired" || (to && Date.parse(to) < now)
            ? "ended"
            : from && Date.parse(from) > now
              ? "scheduled"
              : "live";
      let filled = 0;
      let needed = 0;
      for (const s of t.sections ?? []) for (const ss of s.subSections ?? []) ((filled += ss.questions?.length ?? 0), (needed += ss.totalQuestions ?? 0));
      const lv = live.find((x) => x.testId === t._id);
      const pp = t.result?.publishProps;
      const submittedEnded = t.result?.students?.length ?? 0;
      return {
        testId: t._id,
        name: t.name,
        shortName: null,
        state,
        publishFailed: null,
        exam: t.exam ? { id: t.exam.id, name: t.exam.name } : { id: "", name: "" },
        pattern: { id: t.pattern?.id ?? "", name: t.pattern?.name ?? "", durationMinutes: t.durationInMinutes ?? 0 },
        batches: (t.batches ?? []).map((b) => ({ id: b.id, name: b.name })),
        opensAt: from,
        closesAt: to,
        questions: { filled, needed: needed || filled },
        maxMarks: t.totalMarks ?? 0,
        resultMode: MODE[pp?.type ?? ""] ?? "manual",
        resultAfterDays: null,
        resultPublishedAt: t.result?.isPublished || pp?.isPublished ? (pp?.publishDate ?? to ?? new Date(now).toISOString()) : null,
        resultDueAt: pp?.type === "autoAfterXDays" ? (pp.publishDate ?? null) : null,
        assigned: lv?.assigned ?? 0,
        started: lv?.started ?? (state === "ended" ? submittedEnded : 0),
        submitted: lv?.submitted ?? (state === "ended" ? submittedEnded : 0),
        autoSubmitted: lv?.autoSubmitted ?? 0,
        flagged: 0,
        linksMade: 0,
        keyCorrectedAt: null,
      };
    });
  return legacy;
}

export function toListItem(t: SampleTest): AdminTestListItem {
  const hasAttempts = t.state === "live" || t.state === "ended";
  return {
    testId: t.testId,
    name: t.name,
    shortName: t.shortName,
    state: t.state,
    publishFailed: t.publishFailed,
    exam: t.exam,
    pattern: { id: t.pattern.id, name: t.pattern.name },
    questions: t.questions,
    maxMarks: t.maxMarks,
    batches: t.batches,
    opensAt: t.opensAt,
    closesAt: t.closesAt,
    resultMode: t.resultMode,
    resultPublishedAt: t.resultPublishedAt,
    resultDueAt: t.resultDueAt,
    attempts: hasAttempts
      ? { assigned: t.assigned || null, started: t.started, submitted: t.submitted, autoSubmitted: t.autoSubmitted, flagged: t.flagged }
      : null,
    linksMade: t.linksMade,
    keyCorrectedAt: t.keyCorrectedAt,
  };
}

export interface ListParams {
  state?: TestState | "all";
  q?: string;
  batchId?: string;
  examId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

const ORDER: Record<TestState, number> = { live: 0, scheduled: 1, draft: 2, ended: 3 };

export async function fixtureList(p: ListParams): Promise<AdminTestListResponse> {
  if (legacyMode()) await loadLegacy();
  const all = scenario() === "empty" ? [] : (await sampleTests()).filter((t) => !t.deleted);
  const q = (p.q ?? "").trim().toLowerCase();
  const filtered = all.filter(
    (t) =>
      (!q || t.name.toLowerCase().includes(q) || (t.shortName ?? "").toLowerCase().includes(q)) &&
      (!p.batchId || t.batches.some((b) => b.id === p.batchId)) &&
      (!p.examId || t.exam.id === p.examId) &&
      (!p.from || (t.closesAt ?? t.opensAt ?? "") >= p.from) &&
      (!p.to || (t.opensAt ?? "") <= p.to)
  );
  const counts: AdminTestListResponse["counts"] = { all: filtered.length, live: 0, scheduled: 0, draft: 0, ended: 0 };
  filtered.forEach((t) => counts[t.state]++);
  const rows = filtered
    .filter((t) => !p.state || p.state === "all" || t.state === p.state)
    .sort((a, b) => {
      if (ORDER[a.state] !== ORDER[b.state]) return ORDER[a.state] - ORDER[b.state];
      const da = a.opensAt ?? "9999";
      const db = b.opensAt ?? "9999";
      return a.state === "ended" ? db.localeCompare(da) : da.localeCompare(db);
    });
  const page = p.page ?? 1;
  const pageSize = p.pageSize ?? 25;
  return {
    now: new Date().toISOString(),
    items: rows.slice((page - 1) * pageSize, page * pageSize).map(toListItem),
    pageInfo: { page, pageSize, total: rows.length },
    counts,
  };
}

async function find(id: string): Promise<SampleTest> {
  const t = (await sampleTests()).find((x) => x.testId === id && !x.deleted);
  if (!t) throw fixtureError(404, "TEST_NOT_FOUND", "This test was deleted or never existed.");
  return t;
}

function settings(t: SampleTest): TestSettings {
  return {
    id: t.testId,
    name: t.name,
    shortName: t.shortName,
    noteForStudents: null,
    exam: t.exam,
    pattern: t.pattern,
    state: t.state,
    batches: t.batches,
    assignedStudents: t.assigned,
    opensAt: t.opensAt,
    closesAt: t.closesAt,
    durationMinutes: t.pattern.durationMinutes,
    graceMinutes: 2,
    template: { id: "sample-template-nta", name: "NTA standard" },
    resultMode: t.resultMode,
    resultAfterDays: t.resultAfterDays,
    fullscreenPolicy: { enabled: true, maxExits: 3, action: "warn" },
    lockedBySubmissions: t.submitted > 0,
    keyCorrections: [],
    updatedAt: new Date().toISOString(),
  };
}

const notYet = (what: string) => fixtureError(501, "NOT_IMPLEMENTED", `${what} arrives with the M6 tests update on this server.`);

export async function fixturePublish(id: string): Promise<PublishResponse> {
  if (legacyMode()) {
    await api.tests.publish(id);
    const t = await find(id);
    return { now: new Date().toISOString(), test: settings(t), notified: 0 };
  }
  const t = await find(id);
  if (t.questions.filled < t.questions.needed || !t.batches.length || !t.opensAt)
    throw fixtureError(409, "NOT_READY", "This test isn't ready to publish.", { checks: [] });
  t.state = "scheduled";
  t.publishFailed = null;
  return { now: new Date().toISOString(), test: settings(t), notified: t.assigned };
}

export async function fixtureUnpublish(id: string): Promise<{ now: string; test: TestSettings }> {
  if (legacyMode()) throw notYet("Moving a test back to drafts");
  const t = await find(id);
  if (t.state !== "scheduled") throw fixtureError(409, "TEST_LOCKED", "This test has opened; it can't go back to drafts.");
  t.state = "draft";
  return { now: new Date().toISOString(), test: settings(t) };
}

export async function fixtureDuplicate(id: string, name?: string): Promise<{ now: string; test: TestSettings }> {
  if (legacyMode()) throw notYet("Duplicate");
  const t = await find(id);
  const all = await sampleTests();
  const copy: SampleTest = {
    ...t,
    testId: `sample-test-copy-${Date.now()}`,
    name: name || `${t.name} (copy)`,
    state: "draft",
    publishFailed: null,
    opensAt: null,
    closesAt: null,
    started: 0,
    submitted: 0,
    autoSubmitted: 0,
    flagged: 0,
    linksMade: 0,
    resultPublishedAt: null,
    resultDueAt: null,
    keyCorrectedAt: null,
  };
  all.push(copy);
  return { now: new Date().toISOString(), test: settings(copy) };
}

export async function fixtureDelete(id: string, reauthToken: string | null): Promise<SoftDeleteResponse> {
  const t = await find(id);
  if (t.state === "live")
    throw fixtureError(409, "TEST_LIVE", "Students are writing this test now.", { writing: t.started - t.submitted - t.autoSubmitted, closesAt: t.closesAt });
  const published = t.state !== "draft";
  if (published && !reauthToken) throw fixtureError(403, "REAUTH_REQUIRED", "Confirm your password to delete a published test.");
  if (legacyMode()) await api.tests.delete(id);
  t.deleted = true;
  const now = new Date();
  return {
    now: now.toISOString(),
    deleted: { type: "test", id },
    undo: published ? null : { method: "POST", path: `/tests/admin/tests/${id}/restore`, until: new Date(now.getTime() + 6000).toISOString() },
  };
}

export async function fixtureRestore(id: string): Promise<void> {
  if (legacyMode()) await api.tests.restore(id);
  const t = (await sampleTests()).find((x) => x.testId === id);
  if (t) t.deleted = false;
}

export async function fixtureResultPreview(id: string): Promise<ResultPublishPreview> {
  const t = await find(id);
  return {
    now: new Date().toISOString(),
    test: { testId: t.testId, name: t.name, shortName: t.shortName, resultMode: t.resultMode, resultDueAt: t.resultDueAt },
    students: t.submitted + t.autoSubmitted,
    absent: Math.max(0, t.assigned - t.started),
    emailed: Math.round((t.submitted + t.autoSubmitted) * 0.9),
    aiReviewUnlocks: true,
  };
}

export async function fixturePublishResults(id: string): Promise<void> {
  if (legacyMode()) await api.tests.publishResult(id);
  const t = await find(id);
  t.resultPublishedAt = new Date().toISOString();
}
