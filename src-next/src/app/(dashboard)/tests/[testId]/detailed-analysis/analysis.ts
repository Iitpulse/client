/*
  Per-question analysis for the Admin-Analysis board, computed in the browser from GET /test/:id (the paper) and
  GET /test/result/admin (graded submissions). Items are numbered like tests' flattenPaper (scoring/paper.ts): every
  paragraph child is its own question, so Q numbers match the answer-key check, key fixes and the student report.
*/
import type { RawSubmission, ResultQuestionResponse } from "@/lib/results";
import { responses } from "@/lib/results";

export type ItemType = "single" | "multiple" | "integer" | "matrix";
export const TYPE_LABEL: Record<ItemType | "paragraph", string> = { single: "Single", multiple: "Multiple", integer: "Numerical", matrix: "Matrix", paragraph: "Paragraph" };

type Doc = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export interface Opt { id: string; value: string }
export interface GridLine { id: string; en: string }
export interface Marking { correct: number; incorrect: number; partial: Array<{ count: number; marks: number }> }
export interface Key { optionIds?: string[]; range?: { from: number; to: number }; matches?: Record<string, string[]> }

export interface Item {
  n: number;
  /** the paper question (a paragraph child: the child's id) = key-fix questionId */
  questionId: string;
  slotId: string;
  type: ItemType;
  paragraph: boolean;
  set: { setId: string; index: number; count: number; passage: string } | null;
  sectionId: string;
  sectionName: string;
  stem: string;
  options: Opt[];
  matrix: { rows: GridLine[]; columns: GridLine[] } | null;
  key: Key;
  acceptKeys: Key[];
  dropped: boolean;
  marking: Marking;
  chapter: string | null;
  difficulty: string | null;
}

const ROW_LABELS = "ABCDEFGHIJ".split("");
const COLUMN_LABELS = "PQRSTUVWXY".split("");

function lines(v: unknown, labels: string[]): GridLine[] {
  if (!Array.isArray(v)) return [];
  return v.map((x, i) => {
    const o = (x && typeof x === "object" ? x : { en: x }) as Doc;
    const en = o.en && typeof o.en === "object" ? str((o.en as Doc).text ?? (o.en as Doc).value) : str(o.en ?? o.text ?? o.value);
    return { id: str(o.id) || labels[i] || String(i + 1), en };
  });
}

function rangeOf(v: unknown): { from: number; to: number } | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    const n = num(v);
    return n === null ? undefined : { from: n, to: n };
  }
  const from = num((v as Doc).from);
  const to = num((v as Doc).to ?? (v as Doc).from);
  return from === null || to === null ? undefined : { from, to };
}

function markingOf(ss: Doc): Marking {
  const m = (ss.marking && typeof ss.marking === "object" ? ss.marking : null) as Doc | null;
  if (m && num(m.correct) !== null) {
    const partial = Array.isArray(m.partial) ? (m.partial as Doc[]).map((p) => ({ count: num(p.count) ?? 0, marks: num(p.marks) ?? 0 })) : [];
    return { correct: num(m.correct) ?? 0, incorrect: num(m.incorrect) ?? 0, partial };
  }
  const s = (ss.markingScheme && typeof ss.markingScheme === "object" ? ss.markingScheme : {}) as Doc;
  const c = Array.isArray(s.correct) ? (s.correct as unknown[]).map((x) => num(x) ?? 0) : [];
  const full = c.length ? Math.max(...c) : 0;
  const partial = c.length > 1 ? c.filter((x) => x < full).map((x) => ({ count: x, marks: x })) : [];
  return { correct: full, incorrect: num(s.incorrect) ?? 0, partial };
}

function optionsOf(d: Doc): Opt[] {
  const en = (d.en && typeof d.en === "object" ? (d.en as Doc).options : null) as unknown;
  const list = Array.isArray(en) && en.length ? en : Array.isArray(d.options) ? d.options : [];
  return (list as Doc[]).map((o) => ({ id: str(o.id), value: str(o.value) }));
}
function stemOf(d: Doc): string {
  const en = (d.en && typeof d.en === "object" ? d.en : {}) as Doc;
  return str(en.question ?? d.question);
}
function chapterOf(d: Doc): string | null {
  const ch = Array.isArray(d.chapters) ? (d.chapters as Doc[]) : [];
  return ch[0] ? str(ch[0].name) || null : null;
}
function keysOf(d: Doc): { acceptKeys: Key[]; dropped: boolean } {
  return { acceptKeys: Array.isArray(d.acceptKeys) ? (d.acceptKeys as Key[]) : [], dropped: d.dropped === true };
}
function optionKey(d: Doc): Key {
  return { optionIds: Array.isArray(d.correctAnswers) ? (d.correctAnswers as unknown[]).map(str) : [] };
}

function matrixOf(q: Doc): { rows: GridLine[]; columns: GridLine[]; key: Record<string, string[]> } {
  const m = (q.matrix && typeof q.matrix === "object" ? q.matrix : {}) as Doc;
  let rows = lines(m.listI, ROW_LABELS);
  let columns = lines(m.listII, COLUMN_LABELS);
  const key: Record<string, string[]> = {};
  if (m.matches && typeof m.matches === "object" && !Array.isArray(m.matches)) {
    for (const [r, cols] of Object.entries(m.matches as Doc)) if (Array.isArray(cols)) key[r] = cols.map(str).filter(Boolean);
  } else {
    const legacy = Array.isArray(q.correctAnswer) ? q.correctAnswer : Array.isArray(q.matrixAnswer) ? q.matrixAnswer : [];
    (legacy as unknown[]).forEach((row, i) => {
      const rowId = rows[i]?.id ?? ROW_LABELS[i] ?? String(i + 1);
      if (Array.isArray(row)) key[rowId] = row.flatMap((cell, j) => (typeof cell === "boolean" ? (cell ? [columns[j]?.id ?? COLUMN_LABELS[j]] : []) : str(cell) ? [str(cell)] : []));
    });
  }
  if (!rows.length) rows = Object.keys(key).map((id) => ({ id, en: "" }));
  if (!columns.length) {
    const seen = new Set<string>();
    for (const cols of Object.values(key)) for (const c of cols) seen.add(c);
    columns = [...seen].sort().map((id) => ({ id, en: "" }));
  }
  return { rows, columns, key };
}

interface PaperLike { sections?: Array<Doc & { id: string; name?: string; subSections?: Array<Doc & { id: string }> }> }

export function flattenPaper(paper: PaperLike | undefined): Item[] {
  const items: Item[] = [];
  let n = 0;
  for (const s of paper?.sections ?? []) {
    for (const ss of s.subSections ?? []) {
      const marking = markingOf(ss);
      const para = (ss.paragraph && typeof ss.paragraph === "object" ? ss.paragraph : null) as Doc | null;
      for (const q of (Array.isArray(ss.questions) ? ss.questions : []) as Doc[]) {
        const slotId = str(q._id ?? q.id);
        const type = str(q.type) || str(ss.type) || "single";
        const base = { slotId, sectionId: s.id, sectionName: str(s.name), marking, chapter: chapterOf(q), difficulty: str(q.difficulty) || null };
        if (type === "paragraph") {
          const kids = (Array.isArray(q.questions) ? q.questions : Array.isArray(q.children) ? q.children : []) as Doc[];
          const p = q.passage as Doc | undefined;
          const passage = str(p?.en) || str(q.paragraph);
          kids.forEach((child, index) => {
            const cid = str(child.id) || str(child._id) || `${slotId}~${index + 1}`;
            const ct = str(child.type) || str(para?.childType);
            const t: ItemType = ct === "multiple" || ct === "integer" ? ct : ct === "single" ? "single" : rangeOf(child.correctAnswer) && !Array.isArray(child.correctAnswers) ? "integer" : "single";
            items.push({
              ...base,
              n: ++n,
              questionId: cid,
              type: t,
              paragraph: true,
              set: { setId: slotId, index, count: kids.length, passage },
              stem: stemOf(child),
              options: optionsOf(child),
              matrix: null,
              key: t === "integer" ? { range: rangeOf(child.correctAnswer) } : optionKey(child),
              ...keysOf(child),
              chapter: chapterOf(child) ?? base.chapter,
            });
          });
          continue;
        }
        if (type === "matrix") {
          const mx = matrixOf(q);
          items.push({ ...base, n: ++n, questionId: slotId, type: "matrix", paragraph: false, set: null, stem: stemOf(q), options: [], matrix: { rows: mx.rows, columns: mx.columns }, key: { matches: mx.key }, ...keysOf(q) });
          continue;
        }
        const t: ItemType = type === "multiple" || type === "integer" ? type : "single";
        items.push({ ...base, n: ++n, questionId: slotId, type: t, paragraph: false, set: null, stem: stemOf(q), options: optionsOf(q), matrix: null, key: t === "integer" ? { range: rangeOf(q.correctAnswer) } : optionKey(q), ...keysOf(q) });
      }
    }
  }
  return items;
}

/* ---------- stats ---------- */

type Outcome = "correct" | "partial" | "wrong" | "skipped";

export interface ItemStat {
  item: Item;
  total: number;
  correct: number;
  partial: number;
  wrong: number;
  skipped: number;
  /** % fully right ("in range" for numerical, "all rows" for matrix) */
  accuracy: number;
  avgTime: number;
  discrimination: number | null;
  /** single / multiple: how often each option was ticked */
  optionCounts: Record<string, number>;
  /** multiple: chosen sets (sorted ids joined by ",") with count and the marks they got */
  combos: Array<{ ids: string[]; count: number; marks: number }>;
  /** numerical: typed values, most common first */
  values: Array<{ value: number; count: number }>;
  /** matrix: row → column → students who ticked it */
  cells: Record<string, Record<string, number>>;
}

function outcomeOf(r: ResultQuestionResponse & { outcome?: string }, answered: boolean): Outcome {
  if (r.outcome === "correct" || r.outcome === "partial" || r.outcome === "wrong" || r.outcome === "skipped") return r.outcome;
  if (!answered) return "skipped";
  return (r.marks ?? 0) > 0 ? "correct" : "wrong";
}

function answeredOf(r: ResultQuestionResponse & { matrix?: Record<string, string[]> }): boolean {
  if (r.status === "answered" || r.status === "answered-and-marked" || r.status === "answeredAndMarkedForReview") return true;
  if (r.matrix && Object.values(r.matrix).some((c) => Array.isArray(c) && c.length)) return true;
  return (r.selectedOptions?.length ?? 0) > 0 || (r.enteredAnswer !== undefined && r.enteredAnswer !== null && r.enteredAnswer !== "");
}

export function analyse(items: Item[], submissions: RawSubmission[]): ItemStat[] {
  const byId = new Map<string, Array<{ r: ResultQuestionResponse & { outcome?: string; matrix?: Record<string, string[]> }; total: number }>>();
  for (const s of submissions) {
    const total = Number(s.obtainedMarks ?? s.totalMarks ?? 0);
    for (const sec of s.sections ?? [])
      for (const ss of sec.subSections ?? [])
        for (const [id, r] of responses(ss)) {
          const list = byId.get(id) ?? [];
          list.push({ r, total });
          byId.set(id, list);
        }
  }
  const ranked = submissions.map((s) => Number(s.obtainedMarks ?? s.totalMarks ?? 0)).sort((a, b) => b - a);
  const k = Math.floor(ranked.length * 0.27);
  const upperCut = k ? ranked[k - 1] : Infinity;
  const lowerCut = k ? ranked[ranked.length - k] : -Infinity;

  return items.map((item) => {
    const list = byId.get(item.questionId) ?? [];
    const st: ItemStat = { item, total: list.length, correct: 0, partial: 0, wrong: 0, skipped: 0, accuracy: 0, avgTime: 0, discrimination: null, optionCounts: {}, combos: [], values: [], cells: {} };
    let time = 0;
    let timed = 0;
    let up = 0;
    let upOk = 0;
    let low = 0;
    let lowOk = 0;
    const combos = new Map<string, { ids: string[]; count: number; marks: Map<number, number> }>();
    const values = new Map<number, number>();
    for (const { r, total } of list) {
      const answered = answeredOf(r);
      const o = outcomeOf(r, answered);
      st[o]++;
      const ok = o === "correct";
      const ids = [...new Set((r.selectedOptions ?? []).map(String))];
      for (const id of ids) st.optionCounts[id] = (st.optionCounts[id] ?? 0) + 1;
      if (item.type === "multiple" && ids.length) {
        const sorted = ids.sort();
        const key = sorted.join(",");
        const c = combos.get(key) ?? { ids: sorted, count: 0, marks: new Map() };
        c.count++;
        const m = Number(r.marks ?? 0);
        c.marks.set(m, (c.marks.get(m) ?? 0) + 1);
        combos.set(key, c);
      }
      if (item.type === "integer" && answered) {
        const v = num(r.enteredAnswer);
        if (v !== null) values.set(v, (values.get(v) ?? 0) + 1);
      }
      if (item.type === "matrix" && r.matrix && typeof r.matrix === "object") {
        for (const [row, cols] of Object.entries(r.matrix)) {
          if (!Array.isArray(cols)) continue;
          const cell = (st.cells[row] ??= {});
          for (const c of cols) cell[String(c)] = (cell[String(c)] ?? 0) + 1;
        }
      }
      const t = Number(r.timeTakenInSeconds ?? r.timeTaken ?? 0);
      if (t) {
        time += t;
        timed++;
      }
      if (k >= 3) {
        if (total >= upperCut) {
          up++;
          if (ok) upOk++;
        }
        if (total <= lowerCut) {
          low++;
          if (ok) lowOk++;
        }
      }
    }
    st.accuracy = st.total ? Math.round((st.correct / st.total) * 100) : 0;
    st.avgTime = timed ? Math.round(time / timed) : 0;
    st.discrimination = up && low ? upOk / up - lowOk / low : null;
    st.combos = [...combos.values()]
      .map((c) => ({ ids: c.ids, count: c.count, marks: [...c.marks.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0 }))
      .sort((a, b) => b.count - a.count);
    st.values = [...values.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value - b.value);
    return st;
  });
}

/* ---------- labels ---------- */

export const LETTERS = "ABCDEFGHIJ";

export function letterOf(item: Item, optionId: string): string {
  const i = item.options.findIndex((o) => o.id === optionId);
  return i >= 0 ? (LETTERS[i] ?? optionId) : optionId;
}

const fmtNum = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

/** "B", "A, C", "12.4–12.6", "P→1, Q→3", "dropped" */
export function keyLabel(item: Item, key: Key | null | undefined): string {
  if (!key) return "—";
  if (key.range) return key.range.from === key.range.to ? fmtNum(key.range.from) : `${fmtNum(key.range.from)}–${fmtNum(key.range.to)}`;
  if (key.matches) return Object.entries(key.matches).map(([r, cs]) => `${r}→${cs.join("")}`).join(", ") || "—";
  const ids = key.optionIds ?? [];
  return ids.length ? ids.map((id) => letterOf(item, id)).sort().join(", ") : "—";
}

/** "+4 all right · +1 for each right option if no wrong one · −2 if any wrong option" */
export function markingLine(item: Item): string {
  const m = item.marking;
  const sign = (x: number) => (x > 0 ? `+${fmtNum(x)}` : x < 0 ? `−${fmtNum(-x)}` : "0");
  const parts = [`${sign(m.correct)} ${item.type === "matrix" ? "all rows right" : "all right"}`];
  const partial = m.partial.filter((p) => p.marks > 0).sort((a, b) => a.count - b.count);
  if (partial.length) {
    const per = partial.every((p) => p.marks === partial[0].marks / partial[0].count * p.count) ? partial[0].marks / partial[0].count : null;
    const what = item.type === "matrix" ? "row" : "option";
    parts.push(per !== null ? `${sign(per)} for each right ${what}${item.type === "matrix" ? "" : " if no wrong one"}` : partial.map((p) => `${sign(p.marks)} for ${p.count} right`).join(", "));
  }
  if (m.incorrect) parts.push(`${sign(m.incorrect)} if any ${item.type === "matrix" ? "row is wrong" : "wrong option"}`);
  else parts.push("no negative");
  return parts.join(" · ");
}

export function sameIds(a: string[] | undefined, b: string[] | undefined): boolean {
  const x = [...(a ?? [])].sort();
  const y = [...(b ?? [])].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export function inRange(item: Item, v: number): boolean {
  const ranges = [item.key.range, ...item.acceptKeys.map((k) => k.range)].filter(Boolean) as Array<{ from: number; to: number }>;
  return ranges.some((r) => v >= r.from - 1e-9 && v <= r.to + 1e-9);
}
