/*
  The question editor's form (board Admin-QuestionEditor): one shape for the 5 types, English + Hindi, and the
  conversions bank document ⇄ form ⇄ write body. Contract: api-ai docs/m6-api.md "Paragraph and matrix shapes"
  (types ParagraphShape, MatrixShape in lib/m6-contract). Writes go to the kind's existing routes and carry both the
  M6 fields and the old ones (`passage` + `paragraph`, `matrix` + the boolean `correctAnswer` grid), so a backend
  before M6 keeps working. Option, child and row ids are kept on edit (tests and results point at them).
*/
import type { BankChild, BankQuestion } from "@/lib/question-queries";
import { paragraphHtml, subjectName } from "@/lib/question-queries";
import { imagesIn, isBlankHtml, isMathsOnly, latexIssues, issueText, needsLatexCount } from "@/lib/latex-source";
import type { ChildType, QuestionType } from "@/lib/m6-contract";
import type { QuestionKind } from "@/lib/m6/questions";

export type Lang = "en" | "hi";
export type NumMode = "exact" | "range";

export interface OptionF {
  id: string;
  en: string;
  hi: string;
}
export interface ChildF {
  id: string;
  /** the loaded child (kept fields the form does not edit) */
  orig?: BankChild;
  type: ChildType;
  en: { question: string; solution: string };
  hi: { question: string; solution: string };
  options: OptionF[];
  correct: string[];
  from: string;
  to: string;
}
export interface RowF {
  id: string;
  en: string;
  hi: string;
}
export interface Form {
  type: QuestionType;
  en: { question: string; solution: string };
  hi: { question: string; solution: string };
  options: OptionF[];
  correct: string[];
  numMode: NumMode;
  exact: string;
  from: string;
  to: string;
  passage: { en: string; hi: string };
  children: ChildF[];
  listI: RowF[];
  listII: RowF[];
  matches: Record<string, string[]>;
  subject: string;
  chapters: string[];
  topics: string[];
  sources: string[];
  /** not on the board; kept as loaded */
  exams: string[];
  difficulty: "" | "easy" | "medium" | "hard";
  isProofRead: boolean;
}

export const TYPE_TABS: Array<{ key: QuestionType; label: string }> = [
  { key: "single", label: "Single" },
  { key: "multiple", label: "Multiple" },
  { key: "integer", label: "Numerical" },
  { key: "paragraph", label: "Paragraph" },
  { key: "matrix", label: "Matrix" },
];
export const TYPE_HINT: Record<QuestionType, string> = {
  single: "One correct option. Students pick one.",
  multiple: "One or more correct options. Students tick every one they think is right.",
  integer: "Students type a number. No options.",
  paragraph: "One passage with its own questions. Each question has its own answer and solution.",
  matrix: "Two lists. Students match each row of List I to one or more rows of List II.",
};
export const PREVIEW_TYPE: Record<QuestionType, string> = {
  single: "Single correct",
  multiple: "One or more correct",
  integer: "Numerical",
  paragraph: "Paragraph",
  matrix: "Matrix match",
};

export const KEY = (i: number) => String.fromCharCode(65 + i);
export const COL = (i: number) => String.fromCharCode(80 + i); // P, Q, R …
let seq = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const blankOptions = (n = 4): OptionF[] => Array.from({ length: n }, () => ({ id: uid("opt"), en: "", hi: "" }));
export const blankChild = (type: ChildType): ChildF => ({
  id: uid("q"),
  type,
  en: { question: "", solution: "" },
  hi: { question: "", solution: "" },
  options: type === "integer" ? [] : blankOptions(),
  correct: [],
  from: "",
  to: "",
});
const rows = (n: number, label: (i: number) => string): RowF[] => Array.from({ length: n }, (_, i) => ({ id: label(i), en: "", hi: "" }));

export function kindOf(t: QuestionType): QuestionKind {
  return t === "integer" ? "numerical" : t === "paragraph" ? "paragraph" : t === "matrix" ? "matrix" : "mcq";
}
export function typeFromParam(t: string | null | undefined): QuestionType {
  switch ((t || "").toLowerCase()) {
    case "multiple":
      return "multiple";
    case "numerical":
    case "integer":
      return "integer";
    case "paragraph":
      return "paragraph";
    case "matrix":
      return "matrix";
    default:
      return "single";
  }
}

export function emptyForm(type: QuestionType = "single"): Form {
  return {
    type,
    en: { question: "", solution: "" },
    hi: { question: "", solution: "" },
    options: blankOptions(),
    correct: [],
    numMode: "exact",
    exact: "",
    from: "",
    to: "",
    passage: { en: "", hi: "" },
    // a new passage starts with one question to fill
    children: type === "paragraph" ? [blankChild("single")] : [],
    listI: rows(4, KEY),
    listII: rows(4, COL),
    matches: {},
    subject: "",
    chapters: [],
    topics: [],
    sources: [],
    exams: [],
    difficulty: "",
    isProofRead: false,
  };
}

const num = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "" : String(v));

function optionsFrom(en: BankChild["en"], hi: BankChild["hi"], fresh: boolean): { options: OptionF[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  const options = (en?.options ?? []).map((o, i) => {
    const id = fresh ? uid("opt") : o.id;
    idMap.set(o.id, id);
    return { id, en: o.value ?? "", hi: (hi?.options ?? []).find((h) => h.id === o.id)?.value ?? hi?.options?.[i]?.value ?? "" };
  });
  return { options, idMap };
}

/** Loaded question → form. `copy` (Duplicate as new) gives options, children and rows new ids. */
export function formFrom(q: BankQuestion, copy: boolean): Form {
  const type: QuestionType =
    q._kind === "numerical" ? "integer" : q._kind === "paragraph" ? "paragraph" : q._kind === "matrix" ? "matrix" : q.type === "multiple" ? "multiple" : "single";
  const f = emptyForm(type);
  f.en = { question: q.en?.question ?? "", solution: q.en?.solution ?? "" };
  f.hi = { question: q.hi?.question ?? "", solution: q.hi?.solution ?? "" };
  f.subject = subjectName(q);
  f.chapters = (q.chapters ?? []).map((c) => c.name).filter(Boolean);
  f.topics = [...new Set((q.chapters ?? []).flatMap((c) => c.topics ?? []))];
  f.sources = q.sources ?? [];
  f.exams = q.exams ?? [];
  const d = (q.difficulty || "").toLowerCase();
  f.difficulty = d === "easy" || d === "medium" || d === "hard" ? d : "";
  f.isProofRead = copy ? false : !!q.isProofRead;

  if (q._kind === "mcq") {
    const { options, idMap } = optionsFrom(q.en, q.hi, copy);
    f.options = options.length ? options : blankOptions();
    f.correct = (q.correctAnswers ?? []).map((id) => idMap.get(id) ?? id);
  }
  if (q._kind === "numerical" && q.correctAnswer && !Array.isArray(q.correctAnswer)) {
    const { from, to } = q.correctAnswer;
    if (from != null && to != null && from !== to) {
      f.numMode = "range";
      f.from = num(from);
      f.to = num(to);
    } else f.exact = num(from ?? to);
  }
  if (q._kind === "paragraph") {
    const hiPassage = q.passage?.hi ?? (typeof q.paragraph === "object" ? q.paragraph?.hi?.value : null) ?? "";
    f.passage = { en: paragraphHtml(q), hi: hiPassage ?? "" };
    f.children = (q.questions ?? []).map((c, i) => {
      const t: ChildType = c.type === "integer" || c.type === "numerical" ? "integer" : c.type === "multiple" ? "multiple" : "single";
      const { options, idMap } = optionsFrom(c.en, c.hi, copy);
      const from = c.correctAnswer?.from;
      const to = c.correctAnswer?.to;
      return {
        id: (!copy && (c.id || c._id)) || uid(`child${i}`),
        orig: copy ? undefined : c,
        type: t,
        en: { question: c.en?.question ?? "", solution: c.en?.solution ?? "" },
        hi: { question: c.hi?.question ?? "", solution: c.hi?.solution ?? "" },
        options,
        correct: (c.correctAnswers ?? []).map((id) => idMap.get(id) ?? id),
        from: num(from),
        to: from != null && to != null && to !== from ? num(to) : "",
      };
    });
  }
  if (q._kind === "matrix") {
    if (q.matrix?.listI?.length) {
      f.listI = q.matrix.listI.map((r) => ({ id: r.id, en: r.en ?? "", hi: r.hi ?? "" }));
      f.listII = q.matrix.listII.map((r) => ({ id: r.id, en: r.en ?? "", hi: r.hi ?? "" }));
      f.matches = Object.fromEntries(Object.entries(q.matrix.matches ?? {}).map(([k, v]) => [k, [...v]]));
    } else if (Array.isArray(q.correctAnswer) && q.correctAnswer.length) {
      // before M6: a boolean grid, rows A…, columns P…, no row texts
      const g = q.correctAnswer as boolean[][];
      const cols = Math.max(2, ...g.map((r) => r.length));
      f.listI = rows(Math.max(2, g.length), KEY);
      f.listII = rows(cols, COL);
      g.forEach((r, i) => {
        const on = r.map((v, j) => (v ? COL(j) : null)).filter(Boolean) as string[];
        if (on.length) f.matches[KEY(i)] = on;
      });
    }
  }
  return f;
}

/* ─────────────────────────────── write body ─────────────────────────────── */

const blankToEmpty = (h: string) => (isBlankHtml(h) ? "" : h);

/**
 * Hindi option values: a maths-only option is the same in Hindi; the bank needs every option of a Hindi block, so an
 * option without Hindi keeps its English text (students see the English, as they would anyway).
 */
function hiOptions(opts: OptionF[]) {
  return opts.map((o) => ({ id: o.id, value: !isBlankHtml(o.hi) ? o.hi : o.en }));
}

/** The Hindi block goes out only with a Hindi stem (the bank requires hi.question when hi is present). */
function hiBlock<T extends Record<string, unknown>>(question: string, rest: T): ({ question: string } & T) | null {
  return isBlankHtml(question) ? null : { question, ...rest };
}

function numberOf(s: string): number {
  return Number(s.trim().replace(/−/g, "-"));
}

/** The body for POST /{kind}/new and PUT /{kind}/update/:id (core fields + the type's fields). */
export function writeBody(f: Form, topicsOf: (chapter: string) => string[] | null = () => null): Record<string, unknown> {
  const body = buildBody(f, topicsOf);
  // no Hindi stem: leave the Hindi block out (the bank takes an object or nothing)
  if (body.hi === null) delete body.hi;
  return body;
}

function buildBody(f: Form, topicsOf: (chapter: string) => string[] | null): Record<string, unknown> {
  // a topic goes under the chapter that has it (all picked chapters when the list is not known)
  const chapters = f.chapters.map((name) => {
    const known = topicsOf(name);
    return { name, topics: known ? f.topics.filter((t) => known.includes(t)) : f.topics };
  });
  const core: Record<string, unknown> = {
    subject: f.subject,
    chapters,
    difficulty: f.difficulty,
    exams: f.exams,
    sources: f.sources,
    isProofRead: f.isProofRead,
  };
  if (f.type === "single" || f.type === "multiple") {
    return {
      ...core,
      type: f.type,
      en: { question: f.en.question, options: f.options.map((o) => ({ id: o.id, value: o.en })), solution: blankToEmpty(f.en.solution) },
      hi: hiBlock(f.hi.question, { options: hiOptions(f.options), solution: blankToEmpty(f.hi.solution) }),
      correctAnswers: f.options.filter((o) => f.correct.includes(o.id)).map((o) => o.id),
    };
  }
  if (f.type === "integer") {
    const from = f.numMode === "exact" ? numberOf(f.exact) : numberOf(f.from);
    const to = f.numMode === "exact" ? from : numberOf(f.to);
    return {
      ...core,
      type: "integer",
      en: { question: f.en.question, solution: blankToEmpty(f.en.solution) },
      hi: hiBlock(f.hi.question, { solution: blankToEmpty(f.hi.solution) }),
      correctAnswer: { from, to },
    };
  }
  if (f.type === "paragraph") {
    return {
      ...core,
      type: "paragraph",
      passage: { en: f.passage.en, hi: blankToEmpty(f.passage.hi) || null },
      paragraph: f.passage.en,
      questions: f.children.map((c) => {
        const { _id, ...rest } = (c.orig ?? {}) as BankChild;
        const base = c.orig ? { ...rest, ...(_id ? { _id } : {}) } : {};
        const objective = c.type !== "integer";
        const from = numberOf(c.from);
        return {
          ...base,
          id: c.id,
          type: c.type,
          en: { question: c.en.question, ...(objective ? { options: c.options.map((o) => ({ id: o.id, value: o.en })) } : {}), solution: blankToEmpty(c.en.solution) },
          hi: { question: blankToEmpty(c.hi.question), ...(objective ? { options: hiOptions(c.options) } : {}), solution: blankToEmpty(c.hi.solution) },
          ...(objective
            ? { correctAnswers: c.options.filter((o) => c.correct.includes(o.id)).map((o) => o.id), correctAnswer: undefined }
            : { correctAnswer: { from, to: c.to.trim() ? numberOf(c.to) : from }, correctAnswers: undefined }),
        };
      }),
    };
  }
  // matrix
  const grid = f.listI.map((r) => f.listII.map((c) => (f.matches[r.id] ?? []).includes(c.id)));
  return {
    ...core,
    type: "matrix",
    en: { question: f.en.question, solution: blankToEmpty(f.en.solution) },
    hi: hiBlock(f.hi.question, { solution: blankToEmpty(f.hi.solution) }),
    matrix: {
      listI: f.listI.map((r) => ({ id: r.id, en: r.en, hi: blankToEmpty(r.hi) || null })),
      listII: f.listII.map((r) => ({ id: r.id, en: r.en, hi: blankToEmpty(r.hi) || null })),
      matches: Object.fromEntries(f.listI.map((r) => [r.id, f.listII.map((c) => c.id).filter((c) => (f.matches[r.id] ?? []).includes(c))])),
    },
    correctAnswer: grid,
  };
}

/* ─────────────────────────────── checks ─────────────────────────────── */

/** One field error: `id` is the element the summary links to, `label` its name there. */
export interface FieldIssue {
  id: string;
  label: string;
  message: string;
}

const decimals = (s: string) => (s.split(".")[1] ?? "").length;
const isNum = (s: string) => s.trim() !== "" && Number.isFinite(numberOf(s));

/** LaTeX problems block Save in any field, any language. */
function latex(out: FieldIssue[], id: string, label: string, html: string) {
  const i = latexIssues(html)[0];
  if (i) out.push({ id, label, message: issueText(i) });
}

/** Everything that stops Save, in page order. */
export function validate(f: Form): FieldIssue[] {
  const out: FieldIssue[] = [];
  const stemLabel = f.type === "paragraph" ? "Passage" : "Question";
  const stemHtml = f.type === "paragraph" ? f.passage.en : f.en.question;
  if (isBlankHtml(stemHtml)) out.push({ id: "f-stem", label: stemLabel, message: f.type === "paragraph" ? "Write the passage" : "Write the question" });
  latex(out, "f-stem", stemLabel, stemHtml);
  latex(out, "f-stem", `${stemLabel} (Hindi)`, f.type === "paragraph" ? f.passage.hi : f.hi.question);

  if (f.type === "single" || f.type === "multiple") {
    if (f.options.length < 2) out.push({ id: "f-opts", label: "Options", message: "Add at least two options" });
    f.options.forEach((o, i) => {
      if (isBlankHtml(o.en)) out.push({ id: `f-opt-${o.id}`, label: `Option ${KEY(i)}`, message: `Write option ${KEY(i)}, or remove it` });
      latex(out, `f-opt-${o.id}`, `Option ${KEY(i)}`, o.en);
      latex(out, `f-opt-${o.id}`, `Option ${KEY(i)} (Hindi)`, o.hi);
    });
    const n = f.options.filter((o) => f.correct.includes(o.id)).length;
    if (f.type === "single" && n !== 1) out.push({ id: "f-key", label: "Correct answer", message: "Pick the correct option" });
    if (f.type === "multiple" && n < 1) out.push({ id: "f-key", label: "Correct answers", message: "Tick at least one correct option" });
  }
  if (f.type === "integer") {
    if (f.numMode === "exact") {
      if (!isNum(f.exact)) out.push({ id: "f-num", label: "Answer", message: "Type the answer" });
      else if (decimals(f.exact) > 2) out.push({ id: "f-num", label: "Answer", message: "Use up to 2 decimals" });
    } else if (!isNum(f.from) || !isNum(f.to)) out.push({ id: "f-num", label: "Answer range", message: "Type both From and To" });
    else if (numberOf(f.to) <= numberOf(f.from)) out.push({ id: "f-num", label: "Answer range", message: `To must be more than From (${f.from.trim()})` });
  }
  if (f.type === "paragraph") {
    if (!f.children.length) out.push({ id: "f-kids", label: "Questions", message: "Add at least one question to the passage" });
    if (f.children.length > 8) out.push({ id: "f-kids", label: "Questions", message: "A passage takes at most 8 questions" });
    f.children.forEach((c, i) => {
      const q = `Q${i + 1}`;
      if (isBlankHtml(c.en.question)) out.push({ id: `f-kid-${c.id}`, label: `${q} question`, message: `Write ${q}` });
      latex(out, `f-kid-${c.id}`, q, c.en.question);
      latex(out, `f-kid-${c.id}`, `${q} (Hindi)`, c.hi.question);
      latex(out, `f-kid-${c.id}`, `${q} solution`, c.en.solution);
      if (c.type === "integer") {
        if (!isNum(c.from)) out.push({ id: `f-kid-${c.id}-ans`, label: `${q} answer`, message: `Type the answer for ${q}` });
        else if (c.to.trim() && (!isNum(c.to) || numberOf(c.to) <= numberOf(c.from))) out.push({ id: `f-kid-${c.id}-ans`, label: `${q} answer`, message: `To must be more than From (${c.from.trim()})` });
      } else {
        c.options.forEach((o, j) => {
          if (isBlankHtml(o.en)) out.push({ id: `f-opt-${o.id}`, label: `${q} option ${KEY(j)}`, message: `Write option ${KEY(j)}, or remove it` });
        });
        const n = c.options.filter((o) => c.correct.includes(o.id)).length;
        if (c.type === "single" ? n !== 1 : n < 1) out.push({ id: `f-kid-${c.id}-ans`, label: `${q} answer`, message: c.type === "single" ? `Pick the correct option for ${q}` : `Tick at least one correct option for ${q}` });
      }
    });
  }
  if (f.type === "matrix") {
    if (f.listI.length < 2 || f.listI.length > 6 || f.listII.length < 2 || f.listII.length > 6) out.push({ id: "f-mx", label: "Lists", message: "Each list takes 2 to 6 rows" });
    f.listI.forEach((r) => {
      if (!(f.matches[r.id] ?? []).some((c) => f.listII.some((x) => x.id === c))) out.push({ id: "f-mxr", label: `Row ${r.id} match`, message: `Row ${r.id} has no match. Tick one.` });
      latex(out, "f-mx", `List I row ${r.id}`, r.en);
    });
    f.listII.forEach((r) => latex(out, "f-mx", `List II row ${r.id}`, r.en));
  }
  if (f.type !== "paragraph") {
    latex(out, "f-sol", "Solution", f.en.solution);
    latex(out, "f-sol", "Solution (Hindi)", f.hi.solution);
  }
  if (!f.subject) out.push({ id: "f-sub", label: "Subject", message: "Pick a subject" });
  if (!f.chapters.length) out.push({ id: "f-ch", label: "Chapters", message: "Pick at least one chapter" });
  if (!f.difficulty) out.push({ id: "f-dl", label: "Difficulty", message: "Pick a difficulty" });
  return out;
}

/** Server field errors (400 VALIDATION_ERROR details.fields, keyed by the form path) → the summary's issues. */
export function serverIssues(fields: Record<string, string>, f: Form): FieldIssue[] {
  return Object.entries(fields).map(([path, message]) => {
    const parts = path.split(".");
    if (parts[0] === "options" || parts[0] === "en" && parts[1] === "options") {
      const key = parts[parts.length - 1];
      const o = /^[A-Z]$/.test(key) ? f.options[key.charCodeAt(0) - 65] : f.options.find((x) => x.id === key);
      return { id: o ? `f-opt-${o.id}` : "f-opts", label: `Option ${key}`, message };
    }
    if (parts[0] === "children" || parts[0] === "questions") {
      const c = f.children[Number(parts[1])];
      return { id: c ? `f-kid-${c.id}${parts[2] === "answer" ? "-ans" : ""}` : "f-kids", label: `Q${Number(parts[1]) + 1}`, message };
    }
    if (parts[0] === "matrix") return { id: "f-mx", label: "Lists", message };
    if (parts[0] === "chapters") return { id: "f-ch", label: "Chapters", message };
    if (parts[0] === "subject") return { id: "f-sub", label: "Subject", message };
    if (parts[0] === "difficulty") return { id: "f-dl", label: "Difficulty", message };
    if (parts[0] === "correctAnswers" || parts[0] === "correctAnswer") return { id: f.type === "integer" ? "f-num" : "f-key", label: "Correct answer", message };
    if (parts[0] === "passage" || parts[0] === "paragraph") return { id: "f-stem", label: "Passage", message };
    return { id: "f-stem", label: "Question", message };
  });
}

/* ─────────────────────────────── Hindi missing ─────────────────────────────── */

/** Hindi fields missing where the English exists ("हिन्दी 3" on the language switch, "Hindi missing" marks). */
export function hindiMissing(f: Form): { count: number; stem: boolean; solution: boolean; options: Set<string>; children: Set<string>; rows: Set<string> } {
  const miss = (en: string, hi: string) => !isBlankHtml(en) && isBlankHtml(hi);
  const options = new Set<string>();
  const children = new Set<string>();
  const rowsMiss = new Set<string>();
  let count = 0;
  const stem = f.type === "paragraph" ? miss(f.passage.en, f.passage.hi) : miss(f.en.question, f.hi.question);
  if (stem) count++;
  const solution = f.type !== "paragraph" && miss(f.en.solution, f.hi.solution);
  if (solution) count++;
  if (f.type === "single" || f.type === "multiple")
    for (const o of f.options)
      if (miss(o.en, o.hi) && !isMathsOnly(o.en)) {
        options.add(o.id);
        count++;
      }
  if (f.type === "paragraph")
    for (const c of f.children) {
      const m = miss(c.en.question, c.hi.question) || miss(c.en.solution, c.hi.solution) || c.options.some((o) => miss(o.en, o.hi) && !isMathsOnly(o.en));
      if (m) {
        children.add(c.id);
        count++;
      }
    }
  if (f.type === "matrix")
    for (const r of [...f.listI, ...f.listII])
      if (miss(r.en, r.hi) && !isMathsOnly(r.en)) {
        rowsMiss.add(r.id);
        count++;
      }
  return { count, stem, solution, options, children, rows: rowsMiss };
}

/** Equation images still waiting for LaTeX in the whole form. */
export function formNeedsLatex(f: Form): number {
  const all = [
    f.en.question, f.hi.question, f.en.solution, f.hi.solution, f.passage.en, f.passage.hi,
    ...f.options.flatMap((o) => [o.en, o.hi]),
    ...f.children.flatMap((c) => [c.en.question, c.hi.question, c.en.solution, c.hi.solution, ...c.options.flatMap((o) => [o.en, o.hi])]),
    ...f.listI.flatMap((r) => [r.en, r.hi]),
    ...f.listII.flatMap((r) => [r.en, r.hi]),
  ];
  return all.reduce((n, h) => n + needsLatexCount(h), 0);
}

/** Images in the stem (for "media" counts / checks). */
export const stemImages = (f: Form) => imagesIn(f.type === "paragraph" ? f.passage.en : f.en.question);

/** "Answer A", "Answer 20", "No answer yet" for a collapsed child. */
export function childAnswerLabel(c: ChildF): string {
  if (c.type === "integer") return c.from.trim() ? `Answer ${c.from.trim()}${c.to.trim() ? `–${c.to.trim()}` : ""}` : "No answer yet";
  const keys = c.options.map((o, i) => (c.correct.includes(o.id) ? KEY(i) : null)).filter(Boolean);
  return keys.length ? `Answer ${keys.join(", ")}` : "No answer yet";
}

/** Switching type on a new question keeps what fits (stem, solution, classification). */
export function switchType(f: Form, t: QuestionType): Form {
  if (f.type === t) return f;
  const next: Form = { ...f, type: t };
  if (t === "single" && f.type === "multiple") next.correct = f.correct.slice(0, 1);
  if (t === "paragraph" && !f.children.length) next.children = [blankChild("single")];
  if (t === "paragraph" && isBlankHtml(f.passage.en) && !isBlankHtml(f.en.question)) next.passage = { en: f.en.question, hi: f.hi.question };
  if (f.type === "paragraph" && t !== "paragraph" && isBlankHtml(f.en.question)) next.en = { ...f.en, question: f.passage.en };
  return next;
}

/* ─────────────────────────────── field paths (contract LatexAssistTarget.field) ─────────────────────────────── */

/**
 * Reads or replaces one RichText field by its contract path: "en.question", "hi.solution", "en.options.D",
 * "passage.en", "questions.2.en.question", "questions.2.hi.options.B", "matrix.listI.A.en". null = no such field.
 */
export function mapField(f: Form, field: string, fn: (html: string) => string): Form | null {
  const p = field.split(".");
  const optIdx = (k: string) => (/^[A-Z]$/.test(k) ? k.charCodeAt(0) - 65 : -1);
  if ((p[0] === "en" || p[0] === "hi") && (p[1] === "question" || p[1] === "solution") && p.length === 2) {
    const l = p[0];
    const k = p[1];
    return { ...f, [l]: { ...f[l], [k]: fn(f[l][k]) } };
  }
  if ((p[0] === "en" || p[0] === "hi") && p[1] === "options") {
    const i = optIdx(p[2]);
    const o = f.options[i];
    if (!o) return null;
    const l = p[0];
    return { ...f, options: f.options.map((x, j) => (j === i ? { ...x, [l]: fn(x[l]) } : x)) };
  }
  if (p[0] === "passage" && (p[1] === "en" || p[1] === "hi")) {
    const l = p[1];
    return { ...f, passage: { ...f.passage, [l]: fn(f.passage[l]) } };
  }
  if (p[0] === "questions") {
    const c = f.children[Number(p[1])];
    const l = p[2] as Lang;
    if (!c || (l !== "en" && l !== "hi")) return null;
    let next: ChildF | null = null;
    if (p[3] === "question" || p[3] === "solution") {
      const k = p[3];
      next = { ...c, [l]: { ...c[l], [k]: fn(c[l][k]) } };
    } else if (p[3] === "options") {
      const i = optIdx(p[4]);
      if (!c.options[i]) return null;
      next = { ...c, options: c.options.map((x, j) => (j === i ? { ...x, [l]: fn(x[l]) } : x)) };
    }
    if (!next) return null;
    const nc = next;
    return { ...f, children: f.children.map((x) => (x.id === c.id ? nc : x)) };
  }
  if (p[0] === "matrix" && (p[1] === "listI" || p[1] === "listII")) {
    const list = p[1];
    const l = p[3] as Lang;
    if (l !== "en" && l !== "hi") return null;
    if (!f[list].some((r) => r.id === p[2])) return null;
    return { ...f, [list]: f[list].map((r) => (r.id === p[2] ? { ...r, [l]: fn(r[l]) } : r)) };
  }
  return null;
}

export function getField(f: Form, field: string): string | null {
  let out: string | null = null;
  mapField(f, field, (h) => {
    out = h;
    return h;
  });
  return out;
}
