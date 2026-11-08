/*
  Sample answers for the test builder (../builder.ts): GET/PATCH a test's settings, create, readiness, publish,
  student preview, the exam's patterns and templates, ended tests. The tests themselves are the shared in-memory store
  of ./tests.ts (so the Tests list, Calendar and builder agree); builder-only settings (note, grace, template,
  fullscreen) sit in a side map here. Writes last until the page reloads.
*/
import type {
  Pattern,
  PublishResponse,
  ReadinessResponse,
  Ref,
  TemplateListResponse,
  TestCreateRequest,
  TestSettings,
  TestSettingsPatch,
  TestSettingsPatchResponse,
} from "../../m6-contract";
import { fixtureError } from "../client";
import { patternTypes, samplePatterns } from "./patterns-seed";
import { sampleWorld, type SampleTest } from "./seed";
import { sampleTests } from "./tests";
import { paperFacts } from "./builder-paper";

const now = () => new Date().toISOString();

interface Extra {
  noteForStudents: string | null;
  graceMinutes: number;
  template: Ref;
  fullscreenPolicy: TestSettings["fullscreenPolicy"];
  reentry: NonNullable<TestSettings["reentry"]>;
}
const extras = new Map<string, Extra>();

/** The exam's default template in the templates sample. */
async function defaultTemplate(examId: string): Promise<Ref> {
  const l = await templates(examId);
  return l.defaults[0]?.template ?? (l.items[0] ? { id: l.items[0].id, name: l.items[0].name } : { id: "sample-template-none", name: "NTA standard" });
}

/** Builder-only sample: a draft with every slot filled (the board's "built" state). */
let seeded = false;
async function store(): Promise<SampleTest[]> {
  const all = await sampleTests();
  if (!seeded) {
    seeded = true;
    const w = await sampleWorld();
    if (!all.some((t) => t.testId === "sample-test-draft-ready")) {
      const base = all.find((t) => t.testId === "sample-test-sched-1") ?? all[0];
      all.push({
        ...base,
        testId: "sample-test-draft-ready",
        name: "Full Mock 15",
        shortName: "Mock 15",
        state: "draft",
        batches: w.batches.slice(0, 2),
        opensAt: new Date(Date.now() + 23 * 86_400_000).toISOString(),
        closesAt: new Date(Date.now() + 23 * 86_400_000 + 12 * 3_600_000).toISOString(),
        linksMade: 0,
        started: 0,
        submitted: 0,
        autoSubmitted: 0,
        flagged: 0,
      });
    }
  }
  return all;
}

async function find(id: string): Promise<SampleTest> {
  const t = (await store()).find((x) => x.testId === id && !x.deleted);
  if (!t) throw fixtureError(404, "TEST_NOT_FOUND", "This test was deleted or never existed.");
  return t;
}

async function extra(t: SampleTest): Promise<Extra> {
  let e = extras.get(t.testId);
  if (!e) {
    e = {
      noteForStudents: null,
      graceMinutes: 2,
      template: await defaultTemplate(t.exam.id),
      fullscreenPolicy: { enabled: true, maxExits: 3, action: "warn" },
      reentry: { policy: "crash", minutes: 5 },
    };
    extras.set(t.testId, e);
  }
  return e;
}

function studentsIn(batches: Ref[], all: Ref[]): number {
  return batches.reduce((n, b) => n + 96 + 9 * Math.max(0, all.findIndex((x) => x.id === b.id)), 0);
}

async function toSettings(t: SampleTest): Promise<TestSettings> {
  const e = await extra(t);
  const w = await sampleWorld();
  const corrections: TestSettings["keyCorrections"] = t.keyCorrectedAt
    ? [
        {
          id: `sample-kc-${t.testId}`,
          status: "done",
          mode: "changeKey",
          acceptKeys: [],
          progress: { done: t.submitted, total: t.submitted },
          scoresChanged: Math.round(t.submitted * 0.18),
          ranksChanged: Math.round(t.submitted * 0.4),
          averageAfter: null,
          emailed: Math.round(t.submitted * 0.18),
          n: 14,
          questionId: "sample-q-14",
          oldKey: { optionIds: ["A"] },
          newKey: { optionIds: ["C"] },
          by: { id: "sample-staff-1", name: "Priya Verma", role: "Academic head", userType: "admin" },
          at: t.keyCorrectedAt,
          rescored: t.submitted,
          studentsNotified: Math.round(t.submitted * 0.18),
          auditEventId: null,
        },
      ]
    : [];
  return {
    id: t.testId,
    name: t.name,
    shortName: t.shortName,
    noteForStudents: e.noteForStudents,
    exam: t.exam,
    pattern: t.pattern,
    state: t.state,
    batches: t.batches,
    assignedStudents: t.batches.length ? t.assigned || studentsIn(t.batches, w.batches) : 0,
    opensAt: t.opensAt,
    closesAt: t.closesAt,
    durationMinutes: t.pattern.durationMinutes,
    graceMinutes: e.graceMinutes,
    template: e.template,
    resultMode: t.resultMode,
    resultAfterDays: t.resultAfterDays,
    fullscreenPolicy: e.fullscreenPolicy,
    reentry: e.reentry,
    reentryWaiting: t.state === "live" ? 2 : 0,
    lockedBySubmissions: t.submitted > 0,
    keyCorrections: corrections,
    updatedAt: now(),
    // additive field (contract: implementers may add): the last publish failed after it was accepted
    publishFailed: t.publishFailed,
  } as TestSettings;
}

export async function getTest(id: string): Promise<TestSettings> {
  return toSettings(await find(id));
}

export async function createTest(req: TestCreateRequest): Promise<TestSettings> {
  const w = await sampleWorld();
  const p = (await samplePatterns()).find((x) => x.id === req.patternId);
  if (!req.name.trim()) throw fixtureError(400, "VALIDATION_ERROR", "Check the highlighted fields.", { fields: { name: { code: "REQUIRED", message: "Name the test" } } });
  if (!p) throw fixtureError(400, "VALIDATION_ERROR", "Check the highlighted fields.", { fields: { patternId: { code: "REQUIRED", message: "Pick a pattern" } } });
  const exam = w.exams.find((e) => e.id === req.examId) ?? p.exam;
  const t: SampleTest = {
    testId: `sample-test-new-${Date.now()}`,
    name: req.name.trim(),
    shortName: null,
    state: "draft",
    publishFailed: null,
    exam,
    pattern: { id: p.id, name: p.name, durationMinutes: p.durationMinutes },
    batches: [],
    opensAt: null,
    closesAt: null,
    questions: { filled: 0, needed: p.totals.questions },
    maxMarks: p.totals.marks,
    resultMode: "atTheEndOfTest",
    resultAfterDays: null,
    resultPublishedAt: null,
    resultDueAt: null,
    assigned: 0,
    started: 0,
    submitted: 0,
    autoSubmitted: 0,
    flagged: 0,
    linksMade: 0,
    keyCorrectedAt: null,
  };
  (await store()).push(t);
  return toSettings(t);
}

export async function patchTest(id: string, patch: TestSettingsPatch): Promise<TestSettingsPatchResponse> {
  const t = await find(id);
  const w = await sampleWorld();
  const e = await extra(t);
  const onlyText = Object.keys(patch).every((k) => ["name", "shortName", "noteForStudents", "reentry"].includes(k));
  if ((t.state === "live" || t.submitted > 0) && !onlyText) throw fixtureError(409, "TEST_LOCKED", "Students have started this test, so only its name and note can change.");
  const fields: Record<string, { code: string; message: string }> = {};
  if (patch.name !== undefined && !patch.name.trim()) fields.name = { code: "REQUIRED", message: "Name the test" };
  if (patch.graceMinutes !== undefined && (patch.graceMinutes < 0 || patch.graceMinutes > 15)) fields.graceMinutes = { code: "RANGE", message: "Grace is 0 to 15 minutes" };
  const fp = patch.fullscreenPolicy;
  if (fp && (fp.maxExits < 1 || fp.maxExits > 10)) fields["fullscreenPolicy.maxExits"] = { code: "RANGE", message: "Allow 1 to 10 exits" };
  const re = patch.reentry;
  if (re && (!Number.isInteger(re.minutes) || re.minutes < 1 || re.minutes > 30)) fields["reentry.minutes"] = { code: "INVALID", message: "Pick 1 to 30 minutes" };
  if (Object.keys(fields).length) throw fixtureError(400, "VALIDATION_ERROR", "Check the highlighted fields.", { fields });

  const before = { opensAt: t.opensAt, closesAt: t.closesAt, batches: t.batches.map((b) => b.id).join() };
  if (patch.name !== undefined) t.name = patch.name.trim();
  if (patch.shortName !== undefined) t.shortName = patch.shortName;
  if (patch.noteForStudents !== undefined) e.noteForStudents = patch.noteForStudents;
  if (patch.opensAt !== undefined) t.opensAt = patch.opensAt;
  if (patch.closesAt !== undefined) t.closesAt = patch.closesAt;
  if (patch.graceMinutes !== undefined) e.graceMinutes = patch.graceMinutes;
  if (patch.resultMode !== undefined) t.resultMode = patch.resultMode;
  if (patch.resultAfterDays !== undefined) t.resultAfterDays = patch.resultAfterDays;
  if (fp) e.fullscreenPolicy = fp;
  if (re) e.reentry = re;
  if (patch.batchIds) t.batches = patch.batchIds.map((id) => w.batches.find((b) => b.id === id) ?? { id, name: id });
  if (patch.templateId) {
    const tl = await templates(t.exam.id);
    const found = tl.items.find((x) => x.id === patch.templateId);
    if (found) e.template = { id: found.id, name: found.name };
  }
  t.assigned = studentsIn(t.batches, w.batches);
  const moved = before.opensAt !== t.opensAt || before.closesAt !== t.closesAt || before.batches !== t.batches.map((b) => b.id).join();
  const notified = t.state === "scheduled" && moved ? t.assigned : 0;
  return { now: now(), test: await toSettings(t), notified };
}

export async function readiness(id: string): Promise<ReadinessResponse> {
  const t = await find(id);
  const w = await sampleWorld();
  const facts = await paperFacts(t);
  const checks: ReadinessResponse["checks"] = [];
  checks.push({ code: "NAME_EXAM_PATTERN", level: t.name.trim() ? "ok" : "blocking", facts: {} });
  const nowMs = Date.now();
  let problem: string | null = null;
  if (!t.opensAt || !t.closesAt) problem = "MISSING";
  else if (Date.parse(t.closesAt) <= Date.parse(t.opensAt)) problem = "CLOSES_BEFORE_OPENS";
  else if (t.state === "draft" && Date.parse(t.opensAt) <= nowMs) problem = "OPENS_IN_PAST";
  checks.push({ code: "WINDOW", level: problem ? "blocking" : "ok", facts: { opensAt: t.opensAt, closesAt: t.closesAt, problem } });
  checks.push({ code: "BATCHES", level: t.batches.length ? "ok" : "blocking", facts: { batches: t.batches.length, students: t.batches.length ? t.assigned || studentsIn(t.batches, w.batches) : 0 } });
  checks.push({ code: "QUESTIONS", level: facts.filled >= facts.needed ? "ok" : "blocking", facts: { filled: facts.filled, needed: facts.needed } });
  if (facts.withoutSolution) checks.push({ code: "WITHOUT_SOLUTION", level: "warning", facts: { count: facts.withoutSolution } });
  if (facts.needsLatex.length) checks.push({ code: "NEEDS_LATEX", level: "warning", facts: { count: facts.needsLatex.length, where: facts.needsLatex } });
  return { now: now(), canPublish: !checks.some((c) => c.level === "blocking"), checks };
}

export async function publish(id: string): Promise<PublishResponse> {
  const t = await find(id);
  const r = await readiness(id);
  if (!r.canPublish) throw fixtureError(409, "NOT_READY", "This test isn't ready to publish.", { checks: r.checks });
  // "publish failed" sample: the sample draft that failed once fails again on its first retry
  if (t.publishFailed && t.publishFailed.code === "NOTIFY_FAILED" && !extras.get(t.testId + ":retried")) {
    extras.set(t.testId + ":retried", await extra(t));
    t.publishFailed = { at: now(), code: "NOTIFY_FAILED" };
    throw fixtureError(500, "INTERNAL", "The server didn't confirm publishing.");
  }
  t.state = "scheduled";
  t.publishFailed = null;
  const w = await sampleWorld();
  t.assigned = studentsIn(t.batches, w.batches);
  return { now: now(), test: await toSettings(t), notified: t.assigned };
}

export async function studentPreview(id: string): Promise<unknown> {
  const t = await find(id);
  return { test: { id: t.testId, name: t.name, durationMinutes: t.pattern.durationMinutes }, sections: [] };
}

export async function examPatterns(examId: string) {
  return (await samplePatterns())
    .filter((p) => p.exam.id === examId)
    .map((p) => {
      const { sections, ...rest } = p;
      return { ...rest, types: patternTypes(p), negative: sections.some((s) => s.subsections.some((x) => x.marking.incorrect < 0)) };
    });
}

export async function pattern(id: string): Promise<Pattern> {
  const p = (await samplePatterns()).find((x) => x.id === id);
  if (!p) throw fixtureError(404, "PATTERN_NOT_FOUND", "This pattern was deleted.");
  return p;
}

/** The exam's templates in the sample: "NTA standard" (default) and one variant. */
export async function templates(examId: string): Promise<TemplateListResponse> {
  const w = await sampleWorld();
  const exam = w.exams.find((e) => e.id === examId) ?? { id: examId, name: "" };
  const tools = { calculator: "off" as const, markForReview: true, viewQuestionPaper: true, viewInstructions: true, languageSwitch: true, roughSheet: false };
  const doc = { heading: "", blocks: [], declaration: "" };
  const mk = (id: string, name: string, isDefault: boolean, summary: string, usedBy: number) => ({
    id,
    name,
    exam,
    isDefault,
    wording: { en: {}, hi: {} } as TemplateListResponse["items"][number]["wording"],
    instructions: { en: doc, hi: doc },
    tools,
    usedBy,
    summary,
    updatedAt: now(),
  });
  const nta = { id: `sample-template-nta-${examId}`, name: "NTA standard" };
  return {
    now: now(),
    defaults: [{ exam, template: nta }],
    items: [mk(nta.id, nta.name, true, "Same as the NTA screens", 41), mk(`sample-template-short-${examId}`, "Short instructions", false, "Shorter instructions · rough sheet on", 3)],
  };
}
