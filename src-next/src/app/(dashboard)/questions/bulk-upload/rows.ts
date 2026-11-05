/*
  Review rows of an import (board Admin-BulkUpload, step 3): the parsed question, what needs a look, and what is
  imported. A flagged row (no answer, equation image, WMF diagram, low confidence, cut off, unreadable, no chapter)
  is skipped until someone checks it in the row-fix drawer ("Save and next"); a duplicate of a bank question is
  skipped unless the row says "Import anyway". Flags never stop the rest of the import.
*/
import type { ImportRowData, DupMatch } from "@/lib/m6/import";
import type { ISubject } from "@/types";

export interface ReviewRow {
  data: ImportRowData;
  /** paper order, 1-based */
  n: number;
  /** the reader could not make it whole (from invalidQuestions) */
  invalid: string | null;
  /** checked in the drawer (flags are then shown as done) */
  checked: boolean;
  /** "Skip this row" */
  skipped: boolean;
  dup: DupMatch | null;
  /** "Import anyway" on a duplicate */
  forced: boolean;
  /** a field error the server answered for this row on import */
  serverError: string | null;
}

export type Tone = "ok" | "warn" | "bad" | "dup" | "done" | "skip";
export interface RowCheck {
  tone: Tone;
  label: string;
  /** the action button's label */
  action: "Check" | "Fix" | "Set answer" | "Preview";
}

const LETTERS = "ABCDEFGHIJ";
export const strip = (html?: string | null) =>
  (html ?? "").replace(/<img[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export function hasAnswer(q: ImportRowData): boolean {
  if (q.type === "single" || q.type === "multiple") {
    const ids = new Set((q.en.options ?? []).map((o) => o.id));
    const a = (q.correctAnswers ?? []).filter((x) => ids.has(x));
    return q.type === "single" ? a.length === 1 : a.length >= 1;
  }
  if (q.type === "integer") return !!q.correctAnswer && Number.isFinite(q.correctAnswer.from) && Number.isFinite(q.correctAnswer.to);
  if (q.type === "paragraph") return !!q.questions?.length && q.questions.every((c) => (c.type === "integer" ? !!c.correctAnswer && Number.isFinite(c.correctAnswer.from) : (c.correctAnswers ?? []).length > 0));
  if (q.type === "matrix") return !!q.matrix && q.matrix.listI.every((r) => (q.matrix!.matches[r.id] ?? []).length > 0);
  return false;
}

export const hasTaxonomy = (q: ImportRowData) => !!q.subjectId && (q.chapterIds?.length ?? 0) > 0;

/** The flag the row shows (worst first). */
export function rowCheck(r: ReviewRow): RowCheck {
  const q = r.data;
  if (r.skipped) return { tone: "skip", label: "Skipped", action: "Preview" };
  if (r.dup && !r.forced) {
    const same = r.dup.similarity >= 0.99;
    return { tone: "dup", label: same ? `Same as ${r.dup.questionId} in the bank` : `${Math.round(r.dup.similarity * 100)}% like ${r.dup.questionId}`, action: "Preview" };
  }
  if (r.serverError) return { tone: "bad", label: r.serverError, action: "Fix" };
  if (r.invalid && !r.checked) return { tone: "bad", label: `Read incompletely · ${r.invalid}`, action: "Fix" };
  if (!hasAnswer(q)) return { tone: "bad", label: "No answer in the key", action: "Set answer" };
  if (!r.checked) {
    if (q.flags.includes("DIAGRAM_WMF")) return { tone: "warn", label: "Diagram was WMF · upload it as PNG", action: "Fix" };
    if (q.flags.includes("EQUATION_WAS_IMAGE")) return { tone: "warn", label: "Equation was an image · check the LaTeX", action: "Check" };
    if (q.flags.includes("PARTIAL")) return { tone: "warn", label: "May be cut off at a page break · check it", action: "Check" };
    if (q.flags.includes("LOW_CONFIDENCE")) return { tone: "warn", label: "Read with low confidence · check it", action: "Check" };
  }
  if (!hasTaxonomy(q)) return { tone: "warn", label: "Pick a subject and chapter", action: "Fix" };
  if (r.checked) return { tone: "done", label: "Checked", action: "Preview" };
  if (r.dup && r.forced) return { tone: "ok", label: "Importing anyway", action: "Preview" };
  return { tone: "ok", label: "Looks good", action: "Preview" };
}

export const needsLook = (r: ReviewRow) => {
  const t = rowCheck(r).tone;
  return t === "bad" || t === "warn";
};
export const importable = (r: ReviewRow) => {
  const t = rowCheck(r).tone;
  return t === "ok" || t === "done";
};

export const BADGE: Record<Tone, string> = { ok: "b-green", done: "b-green", warn: "b-amber", bad: "b-live", dup: "b-grey", skip: "b-grey" };

export function answerLabel(q: ImportRowData): string {
  if (q.type === "single" || q.type === "multiple") {
    const ids = (q.en.options ?? []).map((o) => o.id);
    const l = (q.correctAnswers ?? []).map((a) => (ids.indexOf(a) >= 0 ? LETTERS[ids.indexOf(a)] : null)).filter(Boolean);
    return l.length ? l.join(", ") : "—";
  }
  if (q.type === "integer") {
    const a = q.correctAnswer;
    if (!a || !Number.isFinite(a.from)) return "—";
    return a.from === a.to ? String(a.from) : `${a.from}–${a.to}`;
  }
  if (q.type === "matrix") {
    const m = q.matrix;
    if (!m) return "—";
    const parts = m.listI.flatMap((row) => (m.matches[row.id] ?? []).map((c) => `${row.id}-${c}`));
    return parts.length ? parts.join(", ") : "—";
  }
  const n = q.questions?.length ?? 0;
  return n === 1 ? "1 question" : `${n} questions`;
}

export function stemOf(q: ImportRowData): string {
  return strip(q.type === "paragraph" ? q.passage?.en : q.en?.question) || "(no text)";
}

/** Resolve the parser's subject / chapter names to ids (case-insensitive); defaults already carry ids. */
export function withTaxonomy(q: ImportRowData, subjects: ISubject[]): ImportRowData {
  const out = { ...q };
  const subj =
    (out.subjectId && subjects.find((s) => s._id === out.subjectId)) ||
    (out.subject ? subjects.find((s) => s.name.toLowerCase() === out.subject!.trim().toLowerCase()) : undefined);
  if (subj) out.subjectId = subj._id;
  if (subj && !(out.chapterIds?.length) && out.chapter) {
    const ch = (subj.chapters ?? []).find((c) => c.name?.toLowerCase() === out.chapter!.trim().toLowerCase());
    const id = ch && ((ch as { id?: string }).id || ch._id);
    if (id) out.chapterIds = [id];
  }
  return out;
}

export function subjectLabel(q: ImportRowData, subjects: ISubject[]): string {
  return subjects.find((s) => s._id === q.subjectId)?.name || q.subject || "—";
}
