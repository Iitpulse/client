/*
  In-memory sample store for /tests/admin/templates (only until the route is on the backend; ../client.ts).
  Every sample exam gets "NTA standard" as its default (as the server's ensureExamTemplates), plus one sectional
  template with a basic calculator. TEMPLATE_IN_USE for the default or used ones, soft delete with an Undo path.
*/
import type { ExamTemplate, Lang, Ref, TemplateListResponse, TemplatePreviewResponse, TemplateWriteRequest, SoftDeleteResponse, WordingKey } from "../../m6-contract";
import { fixtureError } from "../client";
import { cloneContent, fillPlaceholders, NTA_STANDARD, NTA_STANDARD_NAME, summaryOf, WORDING_KEYS, WORDING_MAX, type TemplateContent, type TestFacts } from "../nta-standard";
import { sampleWorld } from "./seed";

interface Store {
  live: Map<string, ExamTemplate>;
  deleted: Map<string, ExamTemplate>;
  exams: Ref[];
}
let store: Promise<Store> | null = null;
const nowIso = () => new Date().toISOString();
let seq = 0;
const newId = () => `sample-template-${Date.now().toString(36)}${(seq++).toString(36)}`;

function make(id: string, name: string, exam: Ref, isDefault: boolean, c: TemplateContent, usedBy: number): ExamTemplate {
  return { id, name, exam, isDefault, ...c, usedBy, summary: summaryOf(c), updatedAt: nowIso() };
}

function db(): Promise<Store> {
  if (!store)
    store = sampleWorld().then((w) => {
      const live = new Map<string, ExamTemplate>();
      w.exams.forEach((exam, i) => {
        const used = w.tests.filter((t) => t.exam.id === exam.id).length;
        live.set(`sample-template-nta-${i}`, make(`sample-template-nta-${i}`, NTA_STANDARD_NAME, exam, true, cloneContent(NTA_STANDARD), used));
      });
      const first = w.exams[0];
      const calc = cloneContent(NTA_STANDARD);
      calc.tools.calculator = "basic";
      calc.tools.languageSwitch = false;
      calc.wording.en.markReviewNext = "Review later & Next";
      calc.wording.en.submit = "Submit test";
      calc.instructions.en.blocks[0].lines = [
        "Total duration of {test name} is {duration} min.",
        "The clock is set at the server. The timer at the top right shows the time left. When it reaches zero, the test ends by itself.",
        "The question palette on the right shows the status of each question.",
        "A basic on-screen calculator is available in this test.",
      ];
      live.set("sample-template-calc", make("sample-template-calc", "Sectional · with calculator", first, false, calc, 1));
      return { live, deleted: new Map(), exams: w.exams };
    });
  return store;
}

function contentOf(t: ExamTemplate): TemplateContent {
  return cloneContent({ wording: t.wording, instructions: t.instructions, tools: t.tools });
}

function merge(base: TemplateContent, body: TemplateWriteRequest): TemplateContent {
  const out = cloneContent(base);
  const fields: Record<string, { code: string; message: string }> = {};
  for (const lang of ["en", "hi"] as Lang[])
    for (const k of WORDING_KEYS) {
      const v = body.wording?.[lang]?.[k];
      if (v === undefined) continue;
      if (!v.trim()) fields[`wording.${lang}.${k}`] = { code: "REQUIRED", message: "Write a label" };
      else if (v.trim().length > WORDING_MAX) fields[`wording.${lang}.${k}`] = { code: "TOO_LONG", message: `At most ${WORDING_MAX} characters` };
      else out.wording[lang][k as WordingKey] = v.trim();
    }
  for (const lang of ["en", "hi"] as Lang[]) {
    const d = body.instructions?.[lang];
    if (!d) continue;
    if (!d.declaration.trim()) fields[`instructions.${lang}.declaration`] = { code: "INVALID", message: "Write the declaration students tick" };
    out.instructions[lang] = structuredClone(d);
  }
  if (body.tools) out.tools = { ...out.tools, ...body.tools };
  if (Object.keys(fields).length) throw fixtureError(400, "VALIDATION_ERROR", "Some fields need fixing", { fields });
  return out;
}

const taken = (s: Store, examId: string, name: string, except?: string) =>
  [...s.live.values()].some((t) => t.id !== except && t.exam.id === examId && t.name.toLowerCase() === name.trim().toLowerCase());
const nameTakenError = () => fixtureError(409, "NAME_TAKEN", "A template of this exam already has that name", { fields: { name: { code: "NAME_TAKEN", message: "A template of this exam already has that name" } } });

export const SAMPLE_FACTS: TestFacts = { name: "Sample mock test", durationMinutes: 180, questions: 75, marks: 300, negativeMarks: "1" };

export const templateFixtures = {
  async list(examId?: string): Promise<TemplateListResponse> {
    const s = await db();
    const items = [...s.live.values()].filter((t) => !examId || t.exam.id === examId).sort((a, b) => a.exam.name.localeCompare(b.exam.name) || Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
    return { now: nowIso(), defaults: items.filter((t) => t.isDefault).map((t) => ({ exam: t.exam, template: { id: t.id, name: t.name } })), items: structuredClone(items) };
  },
  async empty(): Promise<TemplateListResponse> {
    return { now: nowIso(), defaults: [], items: [] };
  },
  async get(id: string): Promise<{ now: string; template: ExamTemplate }> {
    const t = (await db()).live.get(id);
    if (!t) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    return { now: nowIso(), template: structuredClone(t) };
  },
  async create(body: TemplateWriteRequest): Promise<{ now: string; template: ExamTemplate }> {
    const s = await db();
    const fields: Record<string, { code: string; message: string }> = {};
    if (!body.name?.trim()) fields.name = { code: "REQUIRED", message: "Give the template a name" };
    if (!body.examId) fields.examId = { code: "REQUIRED", message: "Pick the exam" };
    if (Object.keys(fields).length) throw fixtureError(400, "VALIDATION_ERROR", "Some fields need fixing", { fields });
    const exam = s.exams.find((e) => e.id === body.examId) ?? { id: body.examId!, name: body.examId! };
    if (taken(s, exam.id, body.name!)) throw nameTakenError();
    const base = body.copyFromId && s.live.get(body.copyFromId) ? contentOf(s.live.get(body.copyFromId)!) : cloneContent(NTA_STANDARD);
    const t = make(newId(), body.name!.trim(), exam, false, merge(base, body), 0);
    s.live.set(t.id, t);
    return { now: nowIso(), template: structuredClone(t) };
  },
  async update(id: string, body: TemplateWriteRequest): Promise<{ now: string; template: ExamTemplate }> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    if (body.name !== undefined && !body.name.trim()) throw fixtureError(400, "VALIDATION_ERROR", "Some fields need fixing", { fields: { name: { code: "REQUIRED", message: "Give the template a name" } } });
    if (body.name && taken(s, cur.exam.id, body.name, id)) throw nameTakenError();
    const c = merge(contentOf(cur), body);
    const next = make(id, body.name?.trim() || cur.name, cur.exam, cur.isDefault, c, cur.usedBy);
    s.live.set(id, next);
    return { now: nowIso(), template: structuredClone(next) };
  },
  async makeDefault(id: string): Promise<{ now: string; template: ExamTemplate }> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    for (const t of s.live.values()) if (t.exam.id === cur.exam.id) t.isDefault = t.id === id;
    return { now: nowIso(), template: structuredClone(cur) };
  },
  async duplicate(id: string, name?: string): Promise<{ now: string; template: ExamTemplate }> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    let n = name?.trim() || `${cur.name} (copy)`;
    for (let i = 2; taken(s, cur.exam.id, n); i++) n = `${cur.name} (copy ${i})`;
    const t = make(newId(), n, cur.exam, false, contentOf(cur), 0);
    s.live.set(t.id, t);
    return { now: nowIso(), template: structuredClone(t) };
  },
  async remove(id: string): Promise<SoftDeleteResponse> {
    const s = await db();
    const cur = s.live.get(id);
    if (!cur) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    if (cur.isDefault || cur.usedBy > 0)
      throw fixtureError(409, "TEMPLATE_IN_USE", cur.isDefault ? "This is the exam's default template" : `${cur.usedBy} tests use this template`, { defaultFor: cur.isDefault ? cur.exam : null, tests: cur.usedBy });
    s.live.delete(id);
    s.deleted.set(id, cur);
    return { now: nowIso(), deleted: { type: "template", id }, undo: { method: "POST", path: `/tests/admin/templates/${id}/restore`, until: new Date(Date.now() + 30 * 86_400_000).toISOString() } };
  },
  async restore(id: string): Promise<{ now: string; template: ExamTemplate }> {
    const s = await db();
    const cur = s.deleted.get(id);
    if (!cur) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    s.deleted.delete(id);
    s.live.set(id, cur);
    return { now: nowIso(), template: structuredClone(cur) };
  },
  async preview(id: string, lang: Lang): Promise<TemplatePreviewResponse> {
    const t = (await db()).live.get(id);
    if (!t) throw fixtureError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    const d = t.instructions[lang] ?? t.instructions.en;
    const f = SAMPLE_FACTS;
    return {
      now: nowIso(),
      lang,
      test: { ...f },
      heading: fillPlaceholders(d.heading, f),
      blocks: d.blocks.map((b) => ({ title: fillPlaceholders(b.title, f), lines: b.lines.map((l) => fillPlaceholders(l, f)) })),
      declaration: fillPlaceholders(d.declaration, f),
      wording: t.wording[lang] ?? t.wording.en,
      tools: t.tools,
    };
  },
};
