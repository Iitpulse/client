/*
  Patterns: type labels, default marking per type, the board's "Reads as" line (built client-side from `marking`,
  contract "Patterns") and the same checks the server runs (FieldErrors paths), so the editor can show them as you type.
*/
import type { ChildType, Marking, PatternSection, PatternSubsection, PatternWriteRequest, QuestionType } from "../m6-contract";

export const TYPE_ORDER: QuestionType[] = ["single", "multiple", "integer", "paragraph", "matrix"];
export const TYPE_LABEL: Record<QuestionType, string> = { single: "Single", multiple: "Multiple", integer: "Numerical", paragraph: "Paragraph", matrix: "Matrix" };
export const CHILD_LABEL: Record<ChildType | "mixed", string> = { single: "Single correct", multiple: "Multiple correct", integer: "Numerical", mixed: "Mixed" };
export const TYPE_HELP: Record<QuestionType, string> = {
  single: "One correct option. Students pick one.",
  multiple: "One or more correct options.",
  integer: "Students type a number. Answers can be a range, set per question.",
  paragraph: "A passage with questions under it.",
  matrix: "Match each row to columns. Rows and columns come from each question.",
};
export const CORRECT_LABEL: Record<QuestionType, string> = { single: "Correct", multiple: "All correct", integer: "Correct", paragraph: "Correct", matrix: "All rows right" };

/** Partial marking exists only for multiple ("k correct options, none wrong") and matrix ("k rows right, none wrong"). */
export function hasPartial(t: QuestionType): boolean {
  return t === "multiple" || t === "matrix";
}
/** Counts the editor offers a level for (the boards draw 3, 2, 1). */
export const PARTIAL_COUNTS = [3, 2, 1];

export function defaultMarking(t: QuestionType): Marking {
  if (t === "multiple") return { correct: 4, incorrect: -2, partial: [{ count: 3, marks: 3 }, { count: 2, marks: 2 }, { count: 1, marks: 1 }] };
  if (t === "matrix") return { correct: 3, incorrect: -1, partial: [{ count: 3, marks: 2 }, { count: 2, marks: 1 }] };
  if (t === "integer") return { correct: 4, incorrect: 0, partial: [] };
  return { correct: 4, incorrect: -1, partial: [] };
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

/** "+4 all correct · +1 per correct option · −2 any wrong · 0 if left" */
export function readsAs(type: QuestionType, m: Marking): string {
  const parts: string[] = [];
  const levels = [...m.partial].filter((l) => l.marks !== 0).sort((a, b) => b.count - a.count);
  if (type === "multiple" || type === "matrix") {
    const unit = type === "multiple" ? "correct option" : "row";
    parts.push(`${signed(m.correct)} ${type === "multiple" ? "all correct" : "all rows"}`);
    const perUnit = levels.length > 0 && levels.every((l) => l.marks === l.count) && levels[levels.length - 1].count === 1;
    if (perUnit) parts.push(`+1 per ${unit}`);
    else for (const l of levels) parts.push(`${signed(l.marks)} for ${l.count} ${type === "multiple" ? "correct" : l.count === 1 ? "row" : "rows"}`);
    parts.push(m.incorrect < 0 ? `${signed(m.incorrect)} any wrong` : "0 if any wrong");
  } else {
    parts.push(`${signed(m.correct)} correct`);
    parts.push(m.incorrect < 0 ? `${signed(m.incorrect)} wrong` : "no negative");
  }
  parts.push("0 if left");
  return parts.join(" · ");
}

/** "Single · Numerical", "All 5 types", "Single · no negative" */
export function typesLine(types: QuestionType[], negative: boolean): string {
  const ordered = TYPE_ORDER.filter((t) => types.includes(t));
  const base = ordered.length === 5 ? "All 5 types" : ordered.map((t) => TYPE_LABEL[t]).join(" · ") || "No questions yet";
  return negative || !ordered.length ? base : `${base} · no negative`;
}

export function sectionTotals(s: Pick<PatternSection, "subsections">) {
  let questions = 0;
  let toAttempt = 0;
  let marks = 0;
  for (const x of s.subsections) {
    questions += x.totalQuestions;
    toAttempt += x.toAttempt;
    marks += x.toAttempt * x.marking.correct;
  }
  return { questions, toAttempt, marks };
}

/** Same checks as the server (contract "Patterns" validation). Keys are FieldErrors paths. */
export function validatePattern(p: PatternWriteRequest): Record<string, string> {
  const e: Record<string, string> = {};
  if (!p.name.trim()) e.name = "Give the pattern a name";
  if (!p.examId) e.examId = "Pick an exam";
  if (!Number.isInteger(p.durationMinutes) || p.durationMinutes < 1 || p.durationMinutes > 600) e.durationMinutes = "Duration in whole minutes, 1 to 600";
  if (!p.sections.length) e.sections = "Add at least one section";
  p.sections.forEach((s, i) => {
    const at = `sections.${i}`;
    if (!s.name.trim()) e[`${at}.name`] = "Give the section a name";
    if (!s.subsections.length) e[`${at}.subsections`] = "Add at least one sub-section";
    s.subsections.forEach((x: PatternSubsection, j) => {
      const sp = `${at}.subsections.${j}`;
      if (!x.name.trim()) e[`${sp}.name`] = "Give the sub-section a name";
      if (!Number.isInteger(x.totalQuestions) || x.totalQuestions < 1) e[`${sp}.totalQuestions`] = "At least 1 question";
      if (!Number.isInteger(x.toAttempt) || x.toAttempt < 1) e[`${sp}.toAttempt`] = "At least 1 to attempt";
      else if (x.toAttempt > x.totalQuestions) e[`${sp}.toAttempt`] = `To attempt can't be more than ${x.totalQuestions} questions`;
      if (!(x.marking.correct > 0)) e[`${sp}.marking.correct`] = "Marks for a correct answer must be more than 0";
      if (x.marking.incorrect > 0) e[`${sp}.marking.incorrect`] = "Marks taken off can't be added";
      if (x.type === "paragraph") {
        const size = x.paragraph?.setSize ?? 0;
        if (!Number.isInteger(size) || size < 1 || size > 8) e[`${sp}.paragraph.setSize`] = "1 to 8 questions per paragraph";
        else if (x.totalQuestions % size !== 0) e[`${sp}.paragraph.setSize`] = `${x.totalQuestions} questions can't be split into paragraphs of ${size}`;
      }
      if (hasPartial(x.type)) {
        const bad = x.marking.partial.find((l) => l.marks < 0 || l.marks >= x.marking.correct);
        if (bad) e[`${sp}.marking.partial`] = `Partial marks must be from 0 to less than ${x.marking.correct}`;
      }
    });
  });
  return e;
}

/** Readable place of a field path for the error summary ("Physics · Section 2"). */
export function whereOf(path: string, p: PatternWriteRequest): string {
  const m = /^sections\.(\d+)(?:\.subsections\.(\d+))?/.exec(path);
  if (!m) return path === "name" ? "Name" : path === "examId" ? "Exam" : path === "durationMinutes" ? "Duration" : "Pattern";
  const s = p.sections[Number(m[1])];
  if (!s) return "Section";
  if (m[2] === undefined) return s.name || `Section ${Number(m[1]) + 1}`;
  const x = s.subsections[Number(m[2])];
  return `${s.name || `Section ${Number(m[1]) + 1}`} · ${x?.name || `Sub-section ${Number(m[2]) + 1}`}`;
}
