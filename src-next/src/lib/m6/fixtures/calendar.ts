/*
  Fallback answers for the calendar (GET /tests/admin/calendar, POST /tests/admin/tests/:id/reschedule) while those
  M6 routes are not on the backend; same tests as the list fallback (fixtures/tests.ts): sample tests in fixture
  mode "on", real tests through the legacy routes otherwise (a confirmed move then answers NOT_IMPLEMENTED: the
  legacy API has no reschedule with notices and link expiry).
*/
import type { CalendarResponse, RescheduleRequest, RescheduleResponse } from "../../m6-contract";
import { fixtureError, fixtureMode, scenario } from "../client";
import { istDay } from "../shared";
import { loadLegacy, sampleTests } from "./tests";
import type { SampleTest } from "./seed";

function clashesOf(tests: SampleTest[]): CalendarResponse["clashes"] {
  const out: CalendarResponse["clashes"] = [];
  const timed = tests.filter((t) => t.opensAt && t.closesAt && !t.deleted);
  for (let i = 0; i < timed.length; i++)
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (!(a.opensAt! < b.closesAt! && b.opensAt! < a.closesAt!)) continue;
      for (const batch of a.batches)
        if (b.batches.some((x) => x.id === batch.id)) out.push({ date: istDay(a.opensAt! > b.opensAt! ? a.opensAt! : b.opensAt!), batch, testIds: [a.testId, b.testId] });
    }
  return out;
}

export interface CalendarParams {
  from: string;
  to: string;
  batchIds?: string[];
  examId?: string;
}

export async function fixtureCalendar(p: CalendarParams): Promise<CalendarResponse> {
  const now = new Date().toISOString();
  if (scenario() === "empty") return { now, tests: [], resultEvents: [], clashes: [] };
  if (fixtureMode() !== "on") await loadLegacy();
  const all = (await sampleTests()).filter(
    (t) =>
      !t.deleted &&
      t.opensAt &&
      t.closesAt &&
      (!p.batchIds?.length || t.batches.some((b) => p.batchIds!.includes(b.id))) &&
      (!p.examId || t.exam.id === p.examId)
  );
  const inRange = all.filter((t) => istDay(t.closesAt!) >= p.from && istDay(t.opensAt!) <= p.to);
  const resultEvents: CalendarResponse["resultEvents"] = [];
  for (const t of all) {
    const ref = { testId: t.testId, name: t.name, shortName: t.shortName };
    if (t.resultPublishedAt) resultEvents.push({ date: istDay(t.resultPublishedAt), test: ref, kind: "published" });
    if (t.keyCorrectedAt) resultEvents.push({ date: istDay(t.keyCorrectedAt), test: ref, kind: "keyCorrected" });
  }
  return {
    now,
    tests: inRange.map((t) => ({
      testId: t.testId,
      name: t.name,
      shortName: t.shortName,
      state: t.state,
      publishFailed: !!t.publishFailed,
      opensAt: t.opensAt!,
      closesAt: t.closesAt!,
      batches: t.batches,
      pattern: t.pattern,
      resultMode: t.resultMode,
      attempts: t.state === "live" || t.state === "ended" ? { assigned: t.assigned, submitted: t.submitted + t.autoSubmitted } : null,
      movable: t.state === "draft" || t.state === "scheduled",
    })),
    resultEvents: resultEvents.filter((e) => e.date >= p.from && e.date <= p.to),
    clashes: clashesOf(all).filter((c) => c.date >= p.from && c.date <= p.to),
  };
}

export async function fixtureReschedule(id: string, body: RescheduleRequest): Promise<RescheduleResponse> {
  const all = await sampleTests();
  const t = all.find((x) => x.testId === id && !x.deleted);
  if (!t) throw fixtureError(404, "TEST_NOT_FOUND", "This test was deleted or never existed.");
  if (t.state === "live") throw fixtureError(409, "TEST_LIVE", "Live tests can't be moved.", { writing: t.started - t.submitted, closesAt: t.closesAt });
  if (t.state === "ended") throw fixtureError(409, "TEST_ENDED", "Ended tests can't be moved.");
  if (body.opensAt <= new Date().toISOString())
    throw fixtureError(400, "VALIDATION_ERROR", "Pick a time in the future.", { fields: { opensAt: { code: "IN_PAST", message: "Pick a time in the future" } } });
  const from = { opensAt: t.opensAt, closesAt: t.closesAt };
  const moved = { ...t, opensAt: body.opensAt, closesAt: body.closesAt };
  const clashes = clashesOf(all.map((x) => (x.testId === id ? moved : x))).filter((c) => c.testIds.includes(id));
  if (body.confirm && fixtureMode() !== "on")
    throw fixtureError(501, "NOT_IMPLEMENTED", "Moving tests on the calendar arrives with the M6 tests update on this server.");
  if (body.confirm) {
    t.opensAt = body.opensAt;
    t.closesAt = body.closesAt;
  }
  return {
    now: new Date().toISOString(),
    from,
    to: { opensAt: body.opensAt, closesAt: body.closesAt },
    notify: t.state === "scheduled" ? t.assigned : 0,
    linksExpireAt: t.linksMade > 0 ? body.closesAt : null,
    applied: body.confirm,
    clashes,
  };
}
