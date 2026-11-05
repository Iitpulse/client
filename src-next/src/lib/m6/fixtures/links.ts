/*
  Fallback answers for the student test links drawer (GET/POST /users/admin/test-links, renew, email) while those
  M6 routes are not on the backend. Fixture mode "on": sample links in memory. Auto (route missing): the real
  legacy test keys (GET/POST /users/student/test-keys) filtered to the batch's members; renew and email answer
  NOT_IMPLEMENTED there.
*/
import { api } from "../../api";
import type { TestLinksEmailResponse, TestLinksResponse } from "../../m6-contract";
import { fixtureError, fixtureMode, scenario } from "../client";
import { sampleTests } from "./tests";

const legacyMode = () => fixtureMode() !== "on";
const PORTAL = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "http://localhost:3001";

async function legacyLinks(testId: string, batchId: string): Promise<TestLinksResponse> {
  const t = (await sampleTests()).find((x) => x.testId === testId);
  if (!t) throw fixtureError(404, "TEST_NOT_FOUND", "This test was deleted or never existed.");
  const batch = t.batches.find((b) => b.id === batchId) ?? t.batches[0];
  const b = (await api.batches.getAll()).data as { data?: Array<{ _id: string; id?: string; members?: Array<{ id?: string; _id?: string }> }> };
  const row = (b.data ?? []).find((x) => x._id === batch?.id || x.id === batch?.id);
  const members = new Set((row?.members ?? []).map((m) => m.id ?? m._id ?? ""));
  const keys = ((await api.users.listTestKeys(testId)).data?.data ?? []).filter((k) => members.has(k.studentId));
  return {
    now: new Date().toISOString(),
    test: { testId, name: t.name, shortName: t.shortName, opensAt: t.opensAt, closesAt: t.closesAt },
    batch: batch ?? { id: batchId, name: "" },
    expiresAt: t.closesAt ?? keys[0]?.expiresAt ?? null,
    madeAt: null,
    counts: { links: keys.length, opened: keys.filter((k) => (k.useCount ?? 0) > 0).length, studentsWithoutLink: Math.max(0, members.size - keys.length) },
    items: keys
      .map((k) => ({ student: { id: k.studentId, name: k.name || k.email, phone: null }, url: `${PORTAL}/auth/${k.key}/${testId}`, opens: k.useCount ?? 0, lastOpenedAt: k.lastUsedAt ?? null }))
      .sort((x, y) => x.student.name.localeCompare(y.student.name)),
  };
}
const notYet = (what: string) => fixtureError(501, "NOT_IMPLEMENTED", `${what} arrives with the M6 links update on this server.`);

const FIRST = ["Aarav", "Ishita", "Rohan", "Ananya", "Vihaan", "Diya", "Kabir", "Saanvi", "Arjun", "Myra", "Reyansh", "Aadhya", "Vivaan", "Kiara", "Ayaan", "Anika", "Dhruv", "Pari", "Krish", "Navya"];
const LAST = ["Jain", "Sharma", "Patidar", "Agrawal", "Verma", "Malviya", "Choudhary", "Rathore", "Soni", "Joshi", "Dubey", "Khandelwal"];
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function seeded(n: number) {
  let x = n * 9301 + 49297;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
}
function key(r: () => number) {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHA[Math.floor(r() * ALPHA.length)];
  return s;
}

type Student = { id: string; name: string; phone: string | null; hasEmail: boolean };
const rosters = new Map<string, Student[]>();
function roster(batchId: string, size: number): Student[] {
  const k = `${batchId}:${size}`;
  if (!rosters.has(k)) {
    const r = seeded(batchId.length * 31 + size);
    rosters.set(
      k,
      Array.from({ length: size }, (_, i) => ({
        id: `sample-student-${batchId.slice(-4)}-${i}`,
        name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
        phone: r() < 0.06 ? null : `98260 ${String(10000 + Math.floor(r() * 89999))}`,
        hasEmail: r() > 0.03,
      })).sort((a, b) => a.name.localeCompare(b.name))
    );
  }
  return rosters.get(k)!;
}

type LinkRow = TestLinksResponse["items"][number];
const made = new Map<string, { madeAt: string; rows: LinkRow[] }>();

async function context(testId: string, batchId: string) {
  const t = (await sampleTests()).find((x) => x.testId === testId);
  if (!t) throw fixtureError(404, "TEST_NOT_FOUND", "This test was deleted or never existed.");
  const batch = t.batches.find((b) => b.id === batchId) ?? t.batches[0];
  if (!batch) throw fixtureError(400, "VALIDATION_ERROR", "This test has no batches yet.", { fields: { batchId: { code: "REQUIRED", message: "Pick a batch" } } });
  const size = Math.max(4, Math.round(t.assigned / Math.max(1, t.batches.length)));
  return { t, batch, students: roster(batch.id, size) };
}

function shape(t: Awaited<ReturnType<typeof context>>, entry: { madeAt: string; rows: LinkRow[] } | undefined): TestLinksResponse {
  const rows = entry?.rows ?? [];
  return {
    now: new Date().toISOString(),
    test: { testId: t.t.testId, name: t.t.name, shortName: t.t.shortName, opensAt: t.t.opensAt, closesAt: t.t.closesAt },
    batch: t.batch,
    expiresAt: t.t.closesAt,
    madeAt: entry?.madeAt ?? null,
    counts: { links: rows.length, opened: rows.filter((r) => r.opens > 0).length, studentsWithoutLink: t.students.length - rows.length },
    items: rows,
  };
}

function makeRows(t: Awaited<ReturnType<typeof context>>, existing: LinkRow[], opened: boolean): LinkRow[] {
  const r = seeded(t.batch.id.length + t.t.testId.length);
  const have = new Set(existing.map((x) => x.student.id));
  const add = t.students
    .filter((s) => !have.has(s.id))
    .map((s) => {
      const opens = opened && r() < 0.35 ? 1 + Math.floor(r() * 3) : 0;
      return {
        student: { id: s.id, name: s.name, phone: s.phone },
        url: `https://tests.iitpulse.in/t/${key(r)}`,
        opens,
        lastOpenedAt: opens ? new Date(Date.now() - Math.floor(r() * 36) * 3_600_000).toISOString() : null,
      };
    });
  return [...existing, ...add].sort((a, b) => a.student.name.localeCompare(b.student.name));
}

export async function fixtureLinks(testId: string, batchId: string): Promise<TestLinksResponse> {
  if (legacyMode()) return legacyLinks(testId, batchId);
  const c = await context(testId, batchId);
  const k = `${testId}:${c.batch.id}`;
  if (!made.has(k) && c.t.linksMade > 0 && scenario() !== "empty")
    made.set(k, { madeAt: new Date(Date.now() - 26 * 3_600_000).toISOString(), rows: makeRows(c, [], true) });
  return shape(c, made.get(k));
}

export async function fixtureMakeLinks(testId: string, batchId: string): Promise<TestLinksResponse> {
  if (legacyMode()) {
    const t = (await sampleTests()).find((x) => x.testId === testId);
    await api.users.generateTestKeys({ testId, batchId, ...(t?.closesAt ? { expiresAt: t.closesAt } : {}) });
    return legacyLinks(testId, batchId);
  }
  const c = await context(testId, batchId);
  const k = `${testId}:${c.batch.id}`;
  const prev = made.get(k);
  made.set(k, { madeAt: new Date().toISOString(), rows: makeRows(c, prev?.rows ?? [], false) });
  c.t.linksMade = Math.max(c.t.linksMade, made.get(k)!.rows.length);
  return shape(c, made.get(k));
}

export async function fixtureRenew(testId: string, studentId: string): Promise<LinkRow> {
  if (legacyMode()) throw notYet("New link");
  for (const [k, entry] of made) {
    if (!k.startsWith(`${testId}:`)) continue;
    const row = entry.rows.find((r) => r.student.id === studentId);
    if (row) {
      const r = seeded(Date.now() % 1000);
      row.url = `https://tests.iitpulse.in/t/${key(r)}`;
      row.opens = 0;
      row.lastOpenedAt = null;
      return row;
    }
  }
  throw fixtureError(404, "LINK_INVALID", "This student has no link yet.");
}

export async function fixtureEmailLinks(testId: string, batchId: string): Promise<TestLinksEmailResponse> {
  if (legacyMode()) throw notYet("Emailing links");
  const c = await context(testId, batchId);
  const rows = made.get(`${testId}:${c.batch.id}`)?.rows ?? [];
  const byId = new Map(c.students.map((s) => [s.id, s]));
  const noEmail = rows.filter((r) => !byId.get(r.student.id)?.hasEmail).length;
  return { now: new Date().toISOString(), sent: rows.length - noEmail, skippedNoEmail: noEmail, skippedRemoved: 0 };
}
