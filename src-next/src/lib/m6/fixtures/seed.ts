/*
  Shared sample world for the M6 tests-area fixtures (used only while a route is not on the backend yet; see
  ../client.ts). Exams and batches are the backend's real ones (legacy routes), so no exam or batch name is
  hardcoded; tests, patterns and students are sample rows with ids prefixed "sample-". Times are relative to now.
*/
import { api } from "../../api";
import type { Ref, ResultMode, TestState } from "../../m6-contract";

export interface SampleTest {
  testId: string;
  name: string;
  shortName: string | null;
  state: TestState;
  publishFailed: { at: string; code: string } | null;
  exam: Ref;
  pattern: Ref & { durationMinutes: number };
  batches: Ref[];
  opensAt: string | null;
  closesAt: string | null;
  questions: { filled: number; needed: number };
  maxMarks: number;
  resultMode: ResultMode;
  resultAfterDays: number | null;
  resultPublishedAt: string | null;
  resultDueAt: string | null;
  assigned: number;
  started: number;
  submitted: number;
  autoSubmitted: number;
  flagged: number;
  linksMade: number;
  keyCorrectedAt: string | null;
  deleted?: boolean;
}

export interface SamplePatternBase {
  id: string;
  name: string;
  exam: Ref;
  durationMinutes: number;
}

export interface SampleWorld {
  exams: Ref[];
  batches: Ref[];
  patterns: SamplePatternBase[];
  tests: SampleTest[];
}

type Raw = { _id?: string; id?: string; name?: string };
function list(body: unknown): Raw[] {
  const b = body as { data?: unknown; items?: unknown } | unknown[];
  if (Array.isArray(b)) return b as Raw[];
  const d = (b as { data?: unknown })?.data;
  if (Array.isArray(d)) return d as Raw[];
  return [];
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** An instant `days` from today at IST hour:minute. */
function istAt(days: number, hour: number, minute = 0): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * HOUR);
  const base = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), hour, minute) - 5.5 * HOUR;
  return new Date(base + days * DAY).toISOString();
}

let cache: Promise<SampleWorld> | null = null;

export function sampleWorld(): Promise<SampleWorld> {
  if (!cache) cache = build();
  return cache;
}

async function build(): Promise<SampleWorld> {
  let exams: Ref[] = [];
  let batches: Ref[] = [];
  try {
    exams = list((await api.exams.getAllNoPagination()).data)
      .filter((e) => e.name && !/^QA /.test(e.name))
      .map((e) => ({ id: (e._id ?? e.id)!, name: e.name! }));
  } catch {
    /* offline sample */
  }
  try {
    batches = list((await api.batches.getAll()).data)
      .filter((b) => b.name)
      .map((b) => ({ id: (b._id ?? b.id)!, name: b.name! }));
  } catch {
    /* offline sample */
  }
  if (!exams.length) exams = [{ id: "sample-exam-1", name: "Exam A" }, { id: "sample-exam-2", name: "Exam B" }];
  if (!batches.length) batches = [{ id: "sample-batch-1", name: "Batch A" }, { id: "sample-batch-2", name: "Batch B" }, { id: "sample-batch-3", name: "Batch C" }];
  const ex = (i: number) => exams[i % exams.length];
  const ba = (...i: number[]) => i.map((n) => batches[n % batches.length]).filter((b, k, a) => a.findIndex((x) => x.id === b.id) === k);

  const patterns: SamplePatternBase[] = [
    { id: "sample-pattern-full", name: `${ex(0).name} · full paper`, exam: ex(0), durationMinutes: 180 },
    { id: "sample-pattern-sectional", name: `${ex(0).name} · sectional`, exam: ex(0), durationMinutes: 60 },
    { id: "sample-pattern-advanced", name: `${ex(1).name} · paper 1`, exam: ex(1), durationMinutes: 180 },
    { id: "sample-pattern-weekly", name: "Weekly chapter test", exam: ex(0), durationMinutes: 45 },
  ];
  const P = (i: number) => ({ id: patterns[i].id, name: patterns[i].name, durationMinutes: patterns[i].durationMinutes });

  const t = (o: Partial<SampleTest> & Pick<SampleTest, "testId" | "name" | "state">): SampleTest => ({
    shortName: null,
    publishFailed: null,
    exam: ex(0),
    pattern: P(0),
    batches: ba(0, 1),
    opensAt: null,
    closesAt: null,
    questions: { filled: 75, needed: 75 },
    maxMarks: 300,
    resultMode: "atTheEndOfTest",
    resultAfterDays: null,
    resultPublishedAt: null,
    resultDueAt: null,
    assigned: 214,
    started: 0,
    submitted: 0,
    autoSubmitted: 0,
    flagged: 0,
    linksMade: 0,
    keyCorrectedAt: null,
    ...o,
  });

  const tests: SampleTest[] = [
    t({ testId: "sample-test-live-1", name: "Full Mock 12", shortName: "Mock 12", state: "live", opensAt: istAt(0, 0, 0), closesAt: istAt(0, 23, 30), started: 146, submitted: 21, autoSubmitted: 2, flagged: 3, linksMade: 214 }),
    t({ testId: "sample-test-live-2", name: "Physics Sectional 4", state: "live", pattern: P(1), batches: ba(2), questions: { filled: 25, needed: 25 }, maxMarks: 100, assigned: 96, opensAt: istAt(0, 0, 0), closesAt: istAt(0, 22, 0), started: 80, submitted: 12, flagged: 1, resultMode: "immediately", linksMade: 96 }),
    t({ testId: "sample-test-sched-1", name: "Full Mock 13", shortName: "Mock 13", state: "scheduled", opensAt: istAt(2, 9), closesAt: istAt(2, 12, 30), resultMode: "autoAfterXDays", resultAfterDays: 2, resultDueAt: istAt(4, 18), linksMade: 0 }),
    t({ testId: "sample-test-sched-2", name: "Maths Sectional 3", state: "scheduled", pattern: P(1), batches: ba(1), questions: { filled: 25, needed: 25 }, maxMarks: 100, assigned: 118, opensAt: istAt(5, 16), closesAt: istAt(5, 17), resultMode: "manual", linksMade: 118 }),
    t({ testId: "sample-test-sched-3", name: `${ex(1).name} Practice 2`, exam: ex(1), pattern: P(2), state: "scheduled", batches: ba(2), assigned: 96, opensAt: istAt(9, 9), closesAt: istAt(9, 12) }),
    t({ testId: "sample-test-draft-1", name: "Full Mock 14", state: "draft", questions: { filled: 48, needed: 75 }, assigned: 214, opensAt: istAt(12, 9), closesAt: istAt(12, 12) }),
    t({ testId: "sample-test-draft-2", name: "Chemistry Weekly 6", state: "draft", pattern: P(3), questions: { filled: 30, needed: 30 }, maxMarks: 120, batches: ba(0), assigned: 104, opensAt: istAt(3, 15), closesAt: istAt(3, 16), publishFailed: { at: new Date(Date.now() - 40 * MIN).toISOString(), code: "NOTIFY_FAILED" } }),
    t({ testId: "sample-test-draft-3", name: "Untitled test", state: "draft", questions: { filled: 0, needed: 75 }, batches: [], assigned: 0 }),
    t({ testId: "sample-test-ended-1", name: "Full Mock 11", shortName: "Mock 11", state: "ended", opensAt: istAt(-6, 9), closesAt: istAt(-6, 12), started: 205, submitted: 198, autoSubmitted: 7, flagged: 4, resultPublishedAt: istAt(-5, 18), linksMade: 214, keyCorrectedAt: istAt(-3, 11) }),
    t({ testId: "sample-test-ended-2", name: "Maths Sectional 2", state: "ended", pattern: P(1), batches: ba(1), questions: { filled: 25, needed: 25 }, maxMarks: 100, assigned: 118, opensAt: istAt(-2, 16), closesAt: istAt(-2, 17), started: 109, submitted: 109, resultMode: "manual", linksMade: 118 }),
    t({ testId: "sample-test-ended-3", name: "Full Mock 10", shortName: "Mock 10", state: "ended", opensAt: istAt(-13, 9), closesAt: istAt(-13, 12), started: 201, submitted: 199, autoSubmitted: 2, resultPublishedAt: istAt(-12, 18), linksMade: 214 }),
  ];

  return { exams, batches, patterns, tests };
}

export const sampleTime = { istAt, MIN, HOUR, DAY };
