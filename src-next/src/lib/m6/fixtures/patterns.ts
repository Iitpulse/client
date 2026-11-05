/*
  In-memory sample store for /tests/admin/patterns (used only until the route is on the backend; ../client.ts).
  Behaves like the contract: NAME_TAKEN, VALIDATION_ERROR (FieldErrors), PATTERN_LOCKED (used patterns change only
  name and duration), PATTERN_IN_USE on delete, soft delete with an Undo path, duplicate as an unlocked copy.
*/
import type { Pattern, PatternListResponse, PatternWriteRequest, SoftDeleteResponse } from "../../m6-contract";
import { fixtureError } from "../client";
import { validatePattern } from "../pattern-rules";
import { patternTypes, recomputeTotals, samplePatterns } from "./patterns-seed";
import { sampleWorld } from "./seed";

interface Store {
  live: Map<string, Pattern>;
  deleted: Map<string, Pattern>;
}
let store: Promise<Store> | null = null;
function db(): Promise<Store> {
  if (!store)
    store = samplePatterns().then((ps) => ({ live: new Map(ps.map((p) => [p.id, structuredClone(p)])), deleted: new Map() }));
  return store;
}

const nowIso = () => new Date().toISOString();
let seq = 0;
const newId = (p: string) => `sample-${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

function taken(s: Store, name: string, except?: string) {
  return [...s.live.values()].some((p) => p.id !== except && p.name.trim().toLowerCase() === name.trim().toLowerCase());
}

async function toPattern(req: PatternWriteRequest, base: Partial<Pattern>): Promise<Pattern> {
  const w = await sampleWorld();
  const subjects = new Map<string, string>();
  for (const p of (await db()).live.values()) for (const s of p.sections) if (s.subject) subjects.set(s.subject.id, s.subject.name);
  const exam = w.exams.find((e) => e.id === req.examId) ?? { id: req.examId, name: req.examId };
  const sections = req.sections.map((s) => ({
    id: s.id || newId("sec"),
    name: s.name,
    subject: s.subjectId ? { id: s.subjectId, name: subjects.get(s.subjectId) ?? s.subjectId } : null,
    subsections: s.subsections.map((x) => ({ ...x, id: x.id || newId("sub"), paragraph: x.type === "paragraph" ? x.paragraph : null, marking: { ...x.marking, partial: x.type === "multiple" || x.type === "matrix" ? x.marking.partial : [] } })),
  }));
  return {
    usedBy: 0,
    locked: false,
    lastUsedAt: null,
    createdAt: nowIso(),
    ...base,
    id: base.id ?? newId("pattern"),
    name: req.name.trim(),
    exam,
    durationMinutes: req.durationMinutes,
    sections,
    totals: recomputeTotals(sections),
    updatedAt: nowIso(),
  };
}

function check(req: PatternWriteRequest) {
  const fields = validatePattern(req);
  if (Object.keys(fields).length)
    throw fixtureError(400, "VALIDATION_ERROR", "Some fields need fixing", { fields: Object.fromEntries(Object.entries(fields).map(([k, message]) => [k, { code: "INVALID", message }])) });
}

export const patternFixtures = {
  async list(q: { q?: string; examId?: string; sort?: string }): Promise<PatternListResponse> {
    const s = await db();
    let items = [...s.live.values()];
    if (q.q) items = items.filter((p) => p.name.toLowerCase().includes(q.q!.toLowerCase()));
    if (q.examId) items = items.filter((p) => p.exam.id === q.examId);
    items.sort((a, b) =>
      q.sort === "name" ? a.name.localeCompare(b.name) : q.sort === "created" ? b.createdAt.localeCompare(a.createdAt) : (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "") || b.createdAt.localeCompare(a.createdAt)
    );
    return {
      now: nowIso(),
      items: items.map(({ sections, ...rest }) => ({
        ...rest,
        types: patternTypes({ sections } as Pattern),
        negative: sections.some((x) => x.subsections.some((y) => y.marking.incorrect < 0)),
      })),
      pageInfo: { page: 1, pageSize: 100, total: items.length },
    };
  },
  async empty(): Promise<PatternListResponse> {
    return { now: nowIso(), items: [], pageInfo: { page: 1, pageSize: 100, total: 0 } };
  },
  async get(id: string): Promise<{ now: string; pattern: Pattern }> {
    const p = (await db()).live.get(id);
    if (!p) throw fixtureError(404, "PATTERN_NOT_FOUND", "Pattern not found");
    return { now: nowIso(), pattern: structuredClone(p) };
  },
  async create(req: PatternWriteRequest): Promise<{ now: string; pattern: Pattern }> {
    const s = await db();
    check(req);
    if (taken(s, req.name)) throw fixtureError(409, "NAME_TAKEN", "Another pattern has this name", { fields: { name: { code: "NAME_TAKEN", message: "Another pattern has this name" } } });
    const p = await toPattern(req, {});
    s.live.set(p.id, p);
    return { now: nowIso(), pattern: structuredClone(p) };
  },
  async update(id: string, req: PatternWriteRequest): Promise<{ now: string; pattern: Pattern; testsUpdated: number }> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "PATTERN_NOT_FOUND", "Pattern not found");
    if (taken(s, req.name, id)) throw fixtureError(409, "NAME_TAKEN", "Another pattern has this name", { fields: { name: { code: "NAME_TAKEN", message: "Another pattern has this name" } } });
    if (cur.locked) {
      const key = (secs: Array<{ subjectId?: string | null; subject?: { id: string } | null; subsections: Pattern["sections"][number]["subsections"] }>) =>
        JSON.stringify(secs.map((x) => [x.subjectId ?? x.subject?.id ?? null, x.subsections.map((y) => [y.type, y.paragraph, y.totalQuestions, y.toAttempt, y.marking])]));
      if (req.examId !== cur.exam.id || key(req.sections) !== key(cur.sections))
        throw fixtureError(409, "PATTERN_LOCKED", `${cur.usedBy} tests use this pattern: only the name and duration can change`, { usedBy: cur.usedBy });
      if (!req.name.trim()) check({ ...req, sections: [] });
      const next = { ...cur, name: req.name.trim(), durationMinutes: req.durationMinutes, updatedAt: nowIso() };
      s.live.set(id, next);
      return { now: nowIso(), pattern: structuredClone(next), testsUpdated: req.durationMinutes !== cur.durationMinutes ? 2 : 0 };
    }
    check(req);
    const next = await toPattern(req, { id, createdAt: cur.createdAt, usedBy: cur.usedBy, locked: cur.locked, lastUsedAt: cur.lastUsedAt });
    s.live.set(id, next);
    return { now: nowIso(), pattern: structuredClone(next), testsUpdated: 0 };
  },
  async duplicate(id: string, name?: string): Promise<{ now: string; pattern: Pattern }> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "PATTERN_NOT_FOUND", "Pattern not found");
    let n = name?.trim() || `${cur.name} (copy)`;
    if (name?.trim() && taken(s, n)) throw fixtureError(409, "NAME_TAKEN", "Another pattern has this name", { fields: { name: { code: "NAME_TAKEN", message: "Another pattern has this name" } } });
    for (let i = 2; taken(s, n); i++) n = `${cur.name} (copy ${i})`;
    const copy: Pattern = {
      ...structuredClone(cur),
      id: newId("pattern"),
      name: n,
      usedBy: 0,
      locked: false,
      lastUsedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sections: cur.sections.map((x) => ({ ...structuredClone(x), id: newId("sec"), subsections: x.subsections.map((y) => ({ ...structuredClone(y), id: newId("sub") })) })),
    };
    s.live.set(copy.id, copy);
    return { now: nowIso(), pattern: structuredClone(copy) };
  },
  async remove(id: string): Promise<SoftDeleteResponse> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "PATTERN_NOT_FOUND", "Pattern not found");
    if (cur.usedBy > 0) {
      const w = await sampleWorld();
      const tests = w.tests.filter((t) => t.pattern.id === id).map((t) => ({ testId: t.testId, name: t.name }));
      throw fixtureError(409, "PATTERN_IN_USE", `${cur.usedBy} tests use this pattern`, { tests: tests.length ? tests : Array.from({ length: Math.min(cur.usedBy, 50) }, (_, i) => ({ testId: `sample-t${i}`, name: `Test ${i + 1}` })) });
    }
    s.live.delete(id);
    s.deleted.set(id, cur);
    return { now: nowIso(), deleted: { type: "pattern", id }, undo: { method: "POST", path: `/tests/admin/patterns/${id}/restore`, until: new Date(Date.now() + 6000).toISOString() } };
  },
  async restore(id: string): Promise<{ now: string; pattern: Pattern }> {
    const s = await db();
    const cur = s.deleted.get(id);
    if (!cur) throw fixtureError(404, "PATTERN_NOT_FOUND", "Pattern not found");
    s.deleted.delete(id);
    s.live.set(id, cur);
    return { now: nowIso(), pattern: structuredClone(cur) };
  },
};
