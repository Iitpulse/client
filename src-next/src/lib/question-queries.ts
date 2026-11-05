/*
  Question-bank reads for the rebuilt Questions and QuestionEditor pages (TanStack Query, existing endpoints only).
  The questions API serves one collection per kind: mcq (single + multiple), numerical, paragraph, matrix.
*/
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { IChapter, IExam, ISubject } from "@/types";

export type QuestionKind = "mcq" | "numerical" | "paragraph" | "matrix";
export const QUESTION_KINDS: QuestionKind[] = ["mcq", "numerical", "paragraph", "matrix"];

export interface BankOption { id: string; value: string }
export interface BankChild {
  _id?: string;
  id?: string;
  type?: string;
  en?: { question?: string; solution?: string; options?: BankOption[] };
  hi?: { question?: string; solution?: string; options?: BankOption[] };
  correctAnswers?: string[];
  correctAnswer?: { from?: number | null; to?: number | null };
  [k: string]: unknown;
}
export interface BankQuestion {
  _id: string;
  type?: string;
  subject?: string | { _id?: string; name?: string };
  chapters?: Array<{ name: string; topics?: string[] }>;
  exams?: string[];
  sources?: string[];
  difficulty?: string;
  isProofRead?: boolean;
  createdAt?: string;
  modifiedAt?: string;
  uploadedBy?: { userType?: string; id?: string };
  en?: { question?: string; solution?: string; options?: BankOption[] };
  hi?: { question?: string; solution?: string; options?: BankOption[] };
  correctAnswers?: string[];
  correctAnswer?: { from?: number | null; to?: number | null } | boolean[][];
  paragraph?: string | { en?: { value?: string }; hi?: { value?: string } };
  questions?: BankChild[];
  /** M6: paragraph passage with its own Hindi (reads return it next to the old `paragraph` string) */
  passage?: { en?: string; hi?: string | null };
  /** M6: matrix List I / List II and the matches (row id → column ids) */
  matrix?: {
    listI: Array<{ id: string; en: string; hi: string | null }>;
    listII: Array<{ id: string; en: string; hi: string | null }>;
    matches: Record<string, string[]>;
  };
  /** M6: images marked data-needs-latex in the whole question */
  needsLatex?: number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: { id?: string; name?: string; userType?: string } | null;
  /** Added by the client: which collection the question came from. */
  _kind: QuestionKind;
}

const fetchers: Record<QuestionKind, (p: Record<string, unknown>) => ReturnType<typeof api.questions.getMCQ>> = {
  mcq: api.questions.getMCQ,
  numerical: api.questions.getNumerical,
  paragraph: api.questions.getParagraph,
  matrix: api.questions.getMatrix,
};

function rows<T>(body: unknown): T[] {
  const b = body as { data?: unknown; questions?: unknown };
  if (Array.isArray(b?.data)) return b.data as T[];
  if (Array.isArray(b?.questions)) return b.questions as T[];
  return [];
}

async function loadKind(kind: QuestionKind): Promise<BankQuestion[]> {
  const PAGE = 500;
  const first = await fetchers[kind]({ page: 1, size: PAGE });
  const out = rows<BankQuestion>(first.data);
  const pages = Math.min(Number((first.data as { totalPages?: number })?.totalPages ?? 1), 20);
  for (let p = 2; p <= pages; p++) out.push(...rows<BankQuestion>((await fetchers[kind]({ page: p, size: PAGE })).data));
  return out.map((q) => ({ ...q, _kind: kind }));
}

/**
 * The whole bank, every kind. The list, its filters, counts and CSV export run on the client, as before
 * (the list endpoints have no full-text search or per-filter counts).
 */
export function useQuestionBank() {
  return useQuery({
    queryKey: ["questions", "bank"],
    queryFn: async () => {
      const parts = await Promise.all(QUESTION_KINDS.map((k) => loadKind(k).catch(() => [] as BankQuestion[])));
      return parts.flat();
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await api.subjects.getAll();
      const d = r.data as { data?: ISubject[]; subjects?: ISubject[] } | ISubject[];
      return (Array.isArray(d) ? d : d?.data || d?.subjects || []) as ISubject[];
    },
  });
}

export function useExamsList() {
  return useQuery({
    queryKey: ["exams", "list"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await api.exams.getAll();
      const d = r.data as { data?: IExam[]; exams?: IExam[] } | IExam[];
      return (Array.isArray(d) ? d : d?.data || d?.exams || []) as IExam[];
    },
  });
}

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await api.sources.getAll();
      const d = r.data as { data?: { _id: string; name: string }[] } | { _id: string; name: string }[];
      return (Array.isArray(d) ? d : d?.data || []) as { _id: string; name: string }[];
    },
  });
}

/* ---------- display helpers ---------- */

export function subjectName(q: Pick<BankQuestion, "subject">): string {
  const s = q.subject;
  if (!s) return "";
  return typeof s === "string" ? s : s.name || "";
}

export function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<img[^>]*>/gi, " [image] ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function paragraphHtml(q: Pick<BankQuestion, "paragraph" | "passage">): string {
  if (q.passage?.en) return q.passage.en;
  const p = q.paragraph;
  if (!p) return "";
  return typeof p === "string" ? p : p.en?.value || "";
}

/** The stem shown in lists: the passage for paragraph questions. */
export function stemHtml(q: BankQuestion): string {
  return q._kind === "paragraph" ? paragraphHtml(q) : q.en?.question || "";
}

export type TypeLabel = "Single" | "Multiple" | "Numerical" | "Paragraph" | "Matrix";
export function typeLabel(q: BankQuestion): TypeLabel {
  if (q._kind === "numerical") return "Numerical";
  if (q._kind === "paragraph") return "Paragraph";
  if (q._kind === "matrix") return "Matrix";
  return q.type === "multiple" ? "Multiple" : "Single";
}

export function hasSolution(q: BankQuestion): boolean {
  if (q._kind === "paragraph") return (q.questions ?? []).some((c) => stripHtml(c.en?.solution).length > 0);
  return stripHtml(q.en?.solution).length > 0 || /<img/i.test(q.en?.solution ?? "");
}

export function hasHindi(q: BankQuestion): boolean {
  if (q._kind === "paragraph") return (q.questions ?? []).some((c) => stripHtml(c.hi?.question).length > 0);
  return stripHtml(q.hi?.question).length > 0;
}

export const LEVEL: Record<string, { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "b-green" },
  medium: { label: "Medium", cls: "b-amber" },
  hard: { label: "Hard", cls: "b-live" },
};
export function level(q: { difficulty?: string }) {
  return LEVEL[(q.difficulty || "").toLowerCase()] ?? { label: "Unset", cls: "b-grey" };
}

/** Kind from the ID prefix (QS/QM objective, QI numerical, QP paragraph, QX matrix), used when a link has no ?type. */
export function kindFromId(id: string): QuestionKind | null {
  const p = id.slice(0, 2).toUpperCase();
  if (p === "QS" || p === "QM") return "mcq";
  if (p === "QI" || p === "QN") return "numerical";
  if (p === "QP") return "paragraph";
  if (p === "QX" || p === "QT") return "matrix";
  return null;
}

/** ?type= values: the list uses API kinds, older links the editor's names. */
export function kindFromParam(t: string | null | undefined): QuestionKind | null {
  switch ((t || "").toLowerCase()) {
    case "mcq":
    case "objective":
    case "single":
    case "multiple":
      return "mcq";
    case "numerical":
    case "integer":
      return "numerical";
    case "paragraph":
      return "paragraph";
    case "matrix":
      return "matrix";
    default:
      return null;
  }
}

export async function fetchQuestion(id: string, hint: QuestionKind | null): Promise<BankQuestion | null> {
  const order = [...new Set([hint, kindFromId(id), ...QUESTION_KINDS].filter(Boolean) as QuestionKind[])];
  for (const kind of order) {
    try {
      const r = await api.questions.getById(id, kind);
      const q = (r.data as { data?: BankQuestion; question?: BankQuestion })?.data || (r.data as { question?: BankQuestion })?.question;
      if (q) return { ...q, _kind: kind };
    } catch {
      // try the next collection
    }
  }
  return null;
}

export type { IChapter };
