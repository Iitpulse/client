/*
  Sample data for the live Monitor (area "monitor"; used only while GET /tests/admin/tests/:id/monitor is not on the
  backend, see ../client.ts). Built on the shared sample world: a live test gets a writing mix, a scheduled one the
  before-open waiting room, an ended one the closed picture. Students are sample names in the test's real batches
  (Indore only). Extra time mutates this store, so the row and the timeline update like the real route.
*/
import type {
  ExtraTimeRequest,
  ExtraTimeResponse,
  MonitorResponse,
  MonitorRow,
  MonitorStatus,
  MonitorStudentDetail,
  Ref,
} from "../../m6-contract";
import { fixtureError } from "../client";
import { samplePatterns } from "./patterns-seed";
import { sampleWorld, type SampleTest } from "./seed";

const FIRST = ["Aarav", "Ishita", "Rohan", "Sneha", "Kabir", "Ananya", "Vihaan", "Meera", "Aditya", "Diya", "Arjun", "Kavya", "Yash", "Riya", "Dev", "Tanvi", "Harsh", "Pooja", "Nikhil", "Sanya", "Pranav", "Aditi", "Kunal", "Nandini", "Siddharth", "Muskan", "Ayush", "Khushi", "Ritik", "Shruti"];
const LAST = ["Jain", "Sharma", "Patidar", "Choudhary", "Malviya", "Agrawal", "Yadav", "Dubey", "Verma", "Rathore", "Soni", "Tiwari", "Joshi", "Mishra", "Khandelwal", "Gupta", "Pandey", "Chouhan"];

interface SampleStudent {
  row: MonitorRow;
  /** the student's own clock end (extra time included) */
  expiresAt: string | null;
  markedForReview: number;
  timeline: MonitorStudentDetail["timeline"];
}

interface SampleMonitor {
  test: SampleTest;
  sections: string[];
  students: SampleStudent[];
  exitsFlagAt: number;
  exitsLimit: number | null;
}

const stores = new Map<string, Promise<SampleMonitor>>();

/** Deterministic pseudo-random in [0, 1) from a seed (mulberry32). */
function rnd(seed: number): number {
  let t = (seed * 2654435761 + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

async function testFor(testId: string): Promise<SampleTest> {
  const w = await sampleWorld();
  const t = w.tests.find((x) => x.testId === testId);
  if (t) return t;
  if (testId.startsWith("sample-")) throw fixtureError(404, "TEST_NOT_FOUND", "This test doesn't exist or was deleted.");
  // a real test id while the monitor route is missing: show the first live sample under that id
  const live = w.tests.find((x) => x.state === "live")!;
  return { ...live, testId };
}

function store(testId: string): Promise<SampleMonitor> {
  let s = stores.get(testId);
  if (!s) {
    s = build(testId);
    stores.set(testId, s);
  }
  return s;
}

async function build(testId: string): Promise<SampleMonitor> {
  const test = await testFor(testId);
  const patterns = await samplePatterns();
  const pattern = patterns.find((p) => p.id === test.pattern.id);
  const sections = pattern?.sections.map((s) => s.name) ?? ["Section 1"];
  const batches: Ref[] = test.batches.length ? test.batches : [{ id: "sample-batch-1", name: "Batch A" }];
  const n = Math.min(test.assigned, 250);
  const now = Date.now();
  const dur = test.pattern.durationMinutes * 60_000;
  const opens = test.opensAt ? Date.parse(test.opensAt) : now;
  const closes = test.closesAt ? Date.parse(test.closesAt) : now + dur;
  const exitsLimit = 3;
  const exitsFlagAt = exitsLimit - 1;
  const total = test.questions.needed;
  const iso = (ms: number) => new Date(ms).toISOString();

  const students: SampleStudent[] = [];
  for (let i = 0; i < n; i++) {
    const r = (k: number) => rnd(i * 131 + k * 7919 + testId.length);
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]}`;
    const batch = batches[i % batches.length];
    const phone = `98${String(26000000 + Math.floor(r(1) * 9_999_999)).padStart(8, "0")}`;
    const id = `sample-student-${i + 1}`;
    const timeline: MonitorStudentDetail["timeline"] = [];
    let status: MonitorStatus;
    let reason: MonitorRow["reason"] = null;
    let reasonAt: string | null = null;
    let startedAt: string | null = null;
    let answered = 0;
    let exits = 0;
    let lastSeen: number | null = null;
    let expiresAt: string | null = null;
    const p = r(2);

    if (test.state === "scheduled" || test.state === "draft") {
      status = "notStarted";
      if (p < 0.2) {
        reason = "waitingOnInstructions";
        lastSeen = now - Math.floor(r(3) * 40) * 60_000;
        reasonAt = iso(lastSeen);
        timeline.push({ at: reasonAt, kind: "linkOpened", data: {} });
      } else reason = "neverOpened";
    } else {
      // live and ended share the history; an ended test has no one writing
      // live: started within the last 85% of the paper's duration (so the writing mix is still writing); ended: near the open
      const start =
        test.state === "live"
          ? Math.max(opens, now - Math.floor((0.15 + r(4) * 0.7) * dur))
          : Math.min(opens + Math.floor(r(4) * 25) * 60_000, now - 12 * 60_000);
      // shares from the sample test's own counts (started, submitted, auto-submitted of assigned)
      const A = Math.max(1, test.assigned);
      const auto = Math.max(test.autoSubmitted, test.state === "ended" ? 3 : 2) / A;
      const sub = test.submitted / A;
      const started = Math.max(test.started / A, sub + auto);
      const off = test.state === "live" ? 0.02 : 0;
      const cut = [off, off + auto * 0.6, off + auto, off + auto + sub, started, started + (1 - started) / 3];
      const kind = p < cut[0] ? "offline" : p < cut[1] ? "autoExit" : p < cut[2] ? "autoTime" : p < cut[3] ? "submitted" : p < cut[4] ? "writing" : p < cut[5] ? "openedLink" : "neverOpened";
      const resolved = test.state === "ended" && (kind === "writing" || kind === "offline") ? "submitted" : kind;
      if (resolved === "openedLink" || resolved === "neverOpened") {
        status = "notStarted";
        reason = resolved;
        if (resolved === "openedLink") {
          lastSeen = start + 30 * 60_000;
          reasonAt = iso(lastSeen);
          timeline.push({ at: reasonAt, kind: "linkOpened", data: {} });
        }
      } else {
        startedAt = iso(start);
        timeline.push({ at: iso(start - 3 * 60_000), kind: "linkOpened", data: {} });
        timeline.push({ at: startedAt, kind: "started", data: {} });
        exits = r(5) < 0.7 ? 0 : r(5) < 0.9 ? 1 : 2;
        expiresAt = iso(Math.min(start + dur, closes));
        const elapsed = Math.min(now, Date.parse(expiresAt)) - start;
        answered = Math.min(total, Math.max(1, Math.round((elapsed / dur) * total * (0.7 + r(6) * 0.4))));
        for (let e = 0; e < exits; e++) {
          const at = start + Math.floor(((e + 1) / (exits + 1)) * elapsed);
          timeline.push({ at: iso(at), kind: "fullscreenExit", data: { durationSeconds: 5 + Math.floor(r(10 + e) * 120), action: "warned" } });
        }
        if (resolved === "writing") {
          status = "writing";
          lastSeen = now - Math.floor(r(7) * 80) * 1000;
          timeline.push({ at: iso(lastSeen), kind: "answerSaved", data: { question: `${sections[i % sections.length]} Q${1 + (answered % 25)}` } });
        } else if (resolved === "offline") {
          status = "offline";
          exits = Math.max(exits, 2);
          lastSeen = now - (3 + Math.floor(r(8) * 6)) * 60_000;
          timeline.push({ at: iso(lastSeen), kind: "answerSaved", data: { question: `${sections[i % sections.length]} Q${1 + (answered % 25)}` } });
          timeline.push({ at: iso(lastSeen + 4 * 60_000 < now ? lastSeen + 4 * 60_000 : now), kind: "noContact", data: {} });
        } else if (resolved === "autoExit") {
          status = "autoSubmitted";
          reason = "exitLimit";
          exits = exitsLimit;
          lastSeen = start + Math.floor(elapsed * 0.6);
          reasonAt = iso(lastSeen);
          timeline.push({ at: reasonAt, kind: "fullscreenExit", data: { durationSeconds: null, action: "submitted" } });
          timeline.push({ at: reasonAt, kind: "autoSubmitted", data: { reason: "exitLimit" } });
        } else if (resolved === "autoTime") {
          status = "autoSubmitted";
          reason = "timeUp";
          lastSeen = Date.parse(expiresAt);
          reasonAt = expiresAt;
          timeline.push({ at: expiresAt, kind: "autoSubmitted", data: { reason: "timeUp" } });
        } else {
          status = "submitted";
          const sub = Math.min(start + Math.floor(dur * (0.7 + r(9) * 0.28)), now - 60_000, Date.parse(expiresAt));
          lastSeen = sub;
          reasonAt = iso(sub);
          answered = Math.min(total, Math.max(answered, Math.round(total * (0.75 + r(11) * 0.25))));
          timeline.push({ at: reasonAt, kind: "submitted", data: {} });
        }
      }
    }
    timeline.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    students.push({
      row: {
        student: { id, name, batch, phone },
        status,
        reason,
        reasonAt,
        startedAt,
        answered,
        secondsLeft: null,
        fullscreenExits: exits,
        lastSeenAt: lastSeen == null ? null : iso(lastSeen),
        extraMinutes: 0,
      },
      expiresAt,
      markedForReview: answered ? Math.floor(r(12) * 8) : 0,
      timeline,
    });
  }
  return { test, sections, students, exitsFlagAt, exitsLimit };
}

/** Live view of a student's row: offline after 2 minutes without autosave, seconds left on their own clock. */
function liveRow(s: SampleStudent, now: number): MonitorRow {
  const row = { ...s.row };
  if ((row.status === "writing" || row.status === "offline") && s.expiresAt) {
    const left = Math.round((Date.parse(s.expiresAt) - now) / 1000);
    if (left <= 0) {
      row.status = "autoSubmitted";
      row.reason = "timeUp";
      row.reasonAt = s.expiresAt;
      row.secondsLeft = null;
    } else row.secondsLeft = left;
  }
  if (row.status === "writing" && row.lastSeenAt && now - Date.parse(row.lastSeenAt) > 120_000) row.lastSeenAt = new Date(now - 20_000).toISOString();
  return row;
}

const ORDER: Record<MonitorStatus, number> = { offline: 0, writing: 2, notStarted: 3, submitted: 4, autoSubmitted: 4 };

export async function fixtureMonitor(
  testId: string,
  q: { filter?: string; q?: string; batchId?: string; page?: number; pageSize?: number },
  empty: boolean
): Promise<MonitorResponse> {
  const m = await store(testId);
  const now = Date.now();
  const all = empty ? [] : m.students.map((s) => liveRow(s, now));
  const t = m.test;
  const tiles: MonitorResponse["tiles"] = { writing: 0, submitted: 0, notStarted: 0, waiting: 0, neverOpened: 0, autoSubmitted: 0, offline: 0, exitsFlagged: 0 };
  for (const r of all) {
    if (r.status === "writing") tiles.writing++;
    else if (r.status === "offline") tiles.offline++;
    else if (r.status === "submitted") tiles.submitted++;
    else if (r.status === "autoSubmitted") {
      // as the tests backend: "Submitted" counts the auto-submitted too
      tiles.autoSubmitted++;
      tiles.submitted++;
    }
    else {
      tiles.notStarted++;
      if (r.reason === "neverOpened") tiles.neverOpened++;
      else tiles.waiting++;
    }
    if (r.fullscreenExits >= m.exitsFlagAt) tiles.exitsFlagged++;
  }
  const needle = (q.q ?? "").trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  let items = all.filter((r) => {
    if (q.batchId && r.student.batch?.id !== q.batchId) return false;
    if (needle && !r.student.name.toLowerCase().includes(needle) && !(digits.length >= 3 && (r.student.phone ?? "").includes(digits))) return false;
    switch (q.filter) {
      case "submitted":
        return r.status === "submitted" || r.status === "autoSubmitted";
      case "writing":
      case "notStarted":
      case "autoSubmitted":
      case "offline":
        return r.status === q.filter;
      case "flagged":
      case "exitsFlagged":
        return r.fullscreenExits >= m.exitsFlagAt;
      default:
        return true;
    }
  });
  const rank = (r: MonitorRow) =>
    r.status === "offline" ? 0 : r.fullscreenExits >= m.exitsFlagAt && r.status !== "submitted" ? 1 : r.status === "notStarted" && r.reason !== "neverOpened" ? 2.5 : ORDER[r.status];
  items = items.sort((a, b) => rank(a) - rank(b) || b.fullscreenExits - a.fullscreenExits || (a.secondsLeft ?? 1e9) - (b.secondsLeft ?? 1e9) || a.student.name.localeCompare(b.student.name));
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 25;
  return {
    now: new Date(now).toISOString(),
    test: {
      testId: t.testId,
      name: t.name,
      shortName: t.shortName,
      state: t.state,
      opensAt: t.opensAt,
      closesAt: t.closesAt,
      questions: t.questions.needed,
      batches: t.batches,
      resultMode: t.resultMode,
    },
    assigned: empty ? 0 : all.length,
    tiles,
    exitsFlagAt: m.exitsFlagAt,
    exitsLimit: m.exitsLimit,
    items: items.slice((page - 1) * pageSize, page * pageSize),
    pageInfo: { page, pageSize, total: items.length },
  };
}

export async function fixtureMonitorStudent(testId: string, studentId: string): Promise<MonitorStudentDetail> {
  const m = await store(testId);
  const s = m.students.find((x) => x.row.student.id === studentId);
  if (!s) throw fixtureError(404, "NOT_FOUND", "This student isn't in this test's batches.");
  const row = liveRow(s, Date.now());
  const per = m.sections.map((section, i) => ({ section, answered: Math.floor(row.answered / m.sections.length) + (i < row.answered % m.sections.length ? 1 : 0) }));
  return {
    now: new Date().toISOString(),
    row,
    answeredBySection: row.answered ? per : [],
    markedForReview: s.markedForReview,
    exitsAllowed: m.exitsLimit,
    timeline: [...s.timeline].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
  };
}

export async function fixtureExtraTime(testId: string, studentId: string, body: ExtraTimeRequest): Promise<ExtraTimeResponse> {
  const m = await store(testId);
  const s = m.students.find((x) => x.row.student.id === studentId);
  if (!s) throw fixtureError(404, "NOT_FOUND", "This student isn't in this test's batches.");
  const reason = body.reason.trim();
  if (reason.length < 3)
    throw fixtureError(400, "VALIDATION_ERROR", "Write why this student needs more time.", { fields: { reason: { code: "REQUIRED", message: "Write why this student needs more time" } } });
  const row = liveRow(s, Date.now());
  if ((row.status !== "writing" && row.status !== "offline") || !s.expiresAt)
    throw fixtureError(409, "ATTEMPT_NOT_RUNNING", "This student isn't writing the test now, so there is no clock to extend.");
  const old = s.expiresAt;
  s.expiresAt = new Date(Date.parse(old) + body.minutes * 60_000).toISOString();
  s.row = { ...s.row, extraMinutes: s.row.extraMinutes + body.minutes };
  const now = new Date().toISOString();
  s.timeline.push({ at: now, kind: "extraTime", data: { minutes: body.minutes, by: "You", reason } });
  return {
    now,
    expiresAt: s.expiresAt,
    secondsLeft: Math.round((Date.parse(s.expiresAt) - Date.now()) / 1000),
    extraMinutes: s.row.extraMinutes,
    auditEventId: `sample-audit-${Date.now()}`,
  };
}

/** A sample 6-character sign-in link for "Copy their sign-in link". */
export function fixtureStudentLink(testId: string, studentId: string): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h = 0;
  for (const c of studentId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let key = "";
  for (let i = 0; i < 6; i++) {
    key += A[h % A.length];
    h = Math.floor(h / A.length) + (i + 1) * 7919;
  }
  const base = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "http://localhost:3001";
  return `${base.replace(/\/$/, "")}/auth/${key}/${testId}`;
}
