/*
  Result and analysis maths for the Admin-Results and Admin-Analysis pages, computed in the browser from
  GET /test/result/admin (submissions with per-question marks) and GET /test/:id (the paper).
  Nothing here calls AI.
*/

export interface ResultQuestionResponse {
  id?: string;
  _id?: string;
  marks?: number;
  status?: string;
  selectedOptions?: string[];
  enteredAnswer?: number | string;
  correctAnswers?: string[];
  timeTakenInSeconds?: number;
  timeTaken?: number;
  isCorrect?: boolean;
  isAttempted?: boolean;
}

export interface ResultSubSection {
  id: string;
  name?: string;
  questions?: Record<string, ResultQuestionResponse> | ResultQuestionResponse[];
}

export interface ResultSection {
  id: string;
  name?: string;
  obtainedMarks?: number;
  totalMarks?: number;
  subSections?: ResultSubSection[];
}

export interface RawSubmission {
  id?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  obtainedMarks?: number;
  totalMarks?: number;
  timeTaken?: number;
  totalTimeTakenInSeconds?: number;
  submittedAt?: string;
  isAutoSubmitted?: boolean;
  sections?: ResultSection[];
}

export interface PaperOption { id: string; value: string }
export interface PaperQuestion {
  _id: string;
  id?: string;
  type?: string;
  difficulty?: string;
  subject?: string;
  chapters?: Array<{ name: string; topics?: string[] }>;
  correctAnswers?: string[] | number[];
  correctAnswer?: { from?: number; to?: number } | number | string;
  en?: { question?: string; options?: PaperOption[]; solution?: string };
  options?: PaperOption[];
}
export interface PaperSubSection {
  id: string;
  name?: string;
  type?: string;
  totalQuestions?: number;
  toBeAttempted?: number;
  markingScheme?: { correct?: number[]; incorrect?: number };
  questions?: PaperQuestion[];
}
export interface PaperSection { id: string; name: string; subject?: string; subSections?: PaperSubSection[] }
export interface Paper {
  _id: string;
  name: string;
  totalMarks?: number;
  durationInMinutes?: number;
  sections?: PaperSection[];
  batches?: Array<{ id: string; name: string }>;
  validity?: { from?: string; to?: string } | null;
  status?: string;
  hideResult?: boolean;
  result?: { isPublished?: boolean; publishProps?: { type?: string; publishDate?: string | null; isPublished?: boolean } };
}

export function responses(ss: ResultSubSection | undefined): Array<[string, ResultQuestionResponse]> {
  if (!ss?.questions) return [];
  if (Array.isArray(ss.questions)) return ss.questions.map((q) => [String(q.id ?? q._id ?? ""), q]);
  return Object.entries(ss.questions);
}

export function isAttempted(q: ResultQuestionResponse): boolean {
  if (typeof q.isAttempted === "boolean") return q.isAttempted;
  if (q.status === "answered" || q.status === "answered-and-marked") return true;
  return (q.selectedOptions?.length ?? 0) > 0 || (q.enteredAnswer !== undefined && q.enteredAnswer !== null && q.enteredAnswer !== "");
}

export function isCorrect(q: ResultQuestionResponse): boolean {
  return q.isCorrect ?? (q.marks ?? 0) > 0;
}

/** Max marks of one section, from its sub-sections' marking schemes. */
export function sectionMax(s: PaperSection): number {
  let total = 0;
  for (const ss of s.subSections ?? []) {
    const per = Math.max(0, ...(ss.markingScheme?.correct ?? [0]));
    total += per * (ss.toBeAttempted ?? ss.totalQuestions ?? ss.questions?.length ?? 0);
  }
  return total;
}

export interface Row {
  studentId: string;
  name: string;
  email?: string;
  batch?: string;
  marks: number;
  percentage: number;
  time: number;
  submittedAt?: string;
  autoSubmitted: boolean;
  bySection: Record<string, number>;
  rank: number;
}

export function buildRows(
  submissions: RawSubmission[],
  paper: Paper | undefined,
  lookup: (id: string) => { name?: string; email?: string; batch?: string } | undefined
): Row[] {
  const max = paper?.totalMarks || 1;
  const rows = submissions.map((s) => {
    const obtained = Number(s.obtainedMarks ?? s.totalMarks ?? 0);
    const time = Number(s.timeTaken ?? s.totalTimeTakenInSeconds ?? 0);
    const studentId = s.studentId || s.id || "";
    const info = lookup(studentId);
    const bySection: Record<string, number> = {};
    for (const sec of s.sections ?? []) {
      let sum = 0;
      let has = false;
      for (const ss of sec.subSections ?? [])
        for (const [, q] of responses(ss)) {
          has = true;
          sum += Number(q.marks ?? 0);
        }
      bySection[sec.id] = has ? sum : Number(sec.obtainedMarks ?? 0);
    }
    return {
      studentId,
      name: s.studentName || info?.name || studentId,
      email: s.studentEmail || info?.email,
      batch: info?.batch,
      marks: obtained,
      percentage: (obtained / max) * 100,
      time,
      submittedAt: s.submittedAt,
      autoSubmitted: !!s.isAutoSubmitted,
      bySection,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.marks - a.marks || a.time - b.time);
  // Competition ranking: equal marks share a rank.
  rows.forEach((r, i) => (r.rank = i > 0 && rows[i - 1].marks === r.marks ? rows[i - 1].rank : i + 1));
  return rows;
}

export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** "2h 52m", "48m 10s" */
export function duration(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s`;
}

/** "2:46" */
export function clock(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

export function fmt(n: number, digits = 1): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

/* ---------- per-question analysis ---------- */

export interface QuestionStat {
  n: number;
  id: string;
  question: PaperQuestion;
  sectionId: string;
  sectionName: string;
  subSectionType?: string;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  accuracy: number;
  avgTime: number;
  /** selections per option id (multi-select answers count once per chosen option) */
  optionCounts: Record<string, number>;
  /** upper-27% accuracy minus lower-27% accuracy, -1..1; null with fewer than 10 students */
  discrimination: number | null;
}

export function analyseQuestions(paper: Paper | undefined, submissions: RawSubmission[]): QuestionStat[] {
  if (!paper?.sections) return [];
  const byId = new Map<string, Array<{ q: ResultQuestionResponse; marks: number }>>();
  for (const s of submissions) {
    const marks = Number(s.obtainedMarks ?? s.totalMarks ?? 0);
    for (const sec of s.sections ?? [])
      for (const ss of sec.subSections ?? [])
        for (const [id, q] of responses(ss)) {
          const list = byId.get(id) ?? [];
          list.push({ q, marks });
          byId.set(id, list);
        }
  }

  // Upper and lower groups by total marks (27% rule), for the discrimination index.
  const ranked = submissions.map((s) => Number(s.obtainedMarks ?? s.totalMarks ?? 0)).sort((a, b) => b - a);
  const k = Math.floor(ranked.length * 0.27);
  const upperCut = k ? ranked[k - 1] : Infinity;
  const lowerCut = k ? ranked[ranked.length - k] : -Infinity;

  const out: QuestionStat[] = [];
  let n = 0;
  for (const sec of paper.sections)
    for (const ss of sec.subSections ?? [])
      for (const question of ss.questions ?? []) {
        n++;
        const id = String(question._id ?? question.id);
        const list = byId.get(id) ?? [];
        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        let time = 0;
        let timed = 0;
        let up = 0;
        let upOk = 0;
        let low = 0;
        let lowOk = 0;
        const optionCounts: Record<string, number> = {};
        for (const { q, marks } of list) {
          const att = isAttempted(q);
          const ok = att && isCorrect(q);
          if (!att) skipped++;
          else if (ok) correct++;
          else wrong++;
          for (const o of q.selectedOptions ?? []) optionCounts[o] = (optionCounts[o] ?? 0) + 1;
          const t = Number(q.timeTakenInSeconds ?? q.timeTaken ?? 0);
          if (t) {
            time += t;
            timed++;
          }
          if (k >= 3) {
            if (marks >= upperCut) {
              up++;
              if (ok) upOk++;
            }
            if (marks <= lowerCut) {
              low++;
              if (ok) lowOk++;
            }
          }
        }
        const total = list.length;
        out.push({
          n,
          id,
          question,
          sectionId: sec.id,
          sectionName: sec.name,
          subSectionType: ss.type,
          correct,
          wrong,
          skipped,
          total,
          accuracy: total ? Math.round((correct / total) * 100) : 0,
          avgTime: timed ? Math.round(time / timed) : 0,
          optionCounts,
          discrimination: up && low ? upOk / up - lowOk / low : null,
        });
      }
  return out;
}

export const ACC_BG = (a: number) => (a < 40 ? "#F6C9C9" : a < 75 ? "#F7E2B5" : "#CDE9D7");
