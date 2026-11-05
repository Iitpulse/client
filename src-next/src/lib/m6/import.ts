/*
  M6 "Import questions" API (board Admin-BulkUpload; contract api-ai docs/m6-api.md "Paper parse v2" and "Import
  confirm v2", types ../m6-contract). Routes:
    POST /ai/admin/parse            multipart: defaults (subjectId, chapterId, difficulty) then `file` → { jobId, job? }
    GET  /ai/admin/parse-status/:id → status + `job` (ParseJobV2) + rows (ParsedQuestionV2) when completed
    POST /ai/admin/parse-text       { content } → rows (pasted text, read in the request)
    GET  /ai/admin/parse/jobs?active=1, POST /ai/admin/parse/jobs/:id/cancel (M6)
    GET  /ai/admin/parse/template.xlsx (v2 columns once api-ai ships them)
    POST /questions/ai/confirm      ImportConfirmRequestV2 → ImportConfirmResponseV2
  An M5 backend answers parse rows in the old shape (single/multiple, no flags, no `job`): rows are turned into V2 here
  and the flags computed the same way api-ai does. Routes that are not there yet answer from fixtures (qCall, areas
  parseV2 / confirmV2). An M5 confirm refuses the v2 body: single/multiple rows then go through the old body, the
  other types through the per-type create routes, and the done-step counts are computed here.
*/
import type { AxiosProgressEvent } from "axios";
import { api } from "../api";
import { questionsAdmin } from "../ai-admin";
import type {
  Difficulty,
  ImportConfirmRequestV2,
  ImportConfirmResponseV2,
  ParseDefaults,
  ParsedQuestionV2,
  ParseJobListResponse,
  ParseJobV2,
  ParseRowFlag,
} from "../m6-contract";
import { AdminApiError, apiError, m6AiQ, m6Questions, qCall, source } from "./questions";
import { isMissingRoute, unwrap } from "./client";

export type { ParsedQuestionV2, ParseJobV2, ParseRowFlag };

/** A parsed row as the review step keeps it (ids of the taxonomy the import is tagged with). */
export type ImportRowData = ParsedQuestionV2 & { subjectId?: string; chapterIds?: string[]; topicIds?: string[] };

export const PARSE_MAX_BYTES = 20 * 1024 * 1024;
export const PARSE_EXTENSIONS = [".docx", ".pdf", ".xlsx", ".png", ".jpg", ".jpeg"];

export type FileKind = ParseJobV2["kind"];
export function fileKind(name: string): FileKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "docx") return "docx";
  if (ext === "pdf") return "pdf";
  if (ext === "xlsx") return "xlsx";
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return "image";
  return null;
}

/* ─────────────────────────────── rows: M5 → V2 ─────────────────────────────── */

interface V1Row {
  id?: string;
  type?: string;
  difficulty?: string;
  en?: { question?: string; options?: Array<{ id: string; value: string }>; solution?: string };
  hi?: { question?: string; options?: Array<{ id: string; value: string }>; solution?: string } | null;
  correctAnswers?: string[];
  subject?: string;
  chapter?: string;
  topics?: string[];
  confidence?: number;
  isPartialStart?: boolean;
  isPartialEnd?: boolean;
}

const isV2Row = (q: unknown): q is ImportRowData => !!q && typeof q === "object" && Array.isArray((q as { flags?: unknown }).flags);

/** An M5 row (or a V2 row) → ImportRowData numbered n (paper order). */
export function toV2Row(q: unknown, n: number): ImportRowData {
  if (isV2Row(q)) return { ...q, id: q.id || `p${n}`, n: q.n || n };
  const r = q as V1Row;
  const flags: ParseRowFlag[] = [];
  if (!r.correctAnswers?.length) flags.push("NO_ANSWER");
  if (typeof r.confidence === "number" && r.confidence < 0.6) flags.push("LOW_CONFIDENCE");
  if (r.isPartialStart || r.isPartialEnd) flags.push("PARTIAL");
  const html = `${r.en?.question ?? ""} ${(r.en?.options ?? []).map((o) => o.value).join(" ")}`;
  if (/data-needs-latex/i.test(html)) flags.push("EQUATION_WAS_IMAGE");
  const hi = r.hi && r.hi.question ? { question: r.hi.question, ...(r.hi.options?.length ? { options: r.hi.options } : {}), ...(r.hi.solution ? { solution: r.hi.solution } : {}) } : null;
  return {
    id: `p${n}`,
    n,
    type: r.type === "multiple" ? "multiple" : "single",
    en: { question: r.en?.question ?? "", options: r.en?.options ?? [], ...(r.en?.solution ? { solution: r.en.solution } : {}) },
    hi,
    correctAnswers: r.correctAnswers ?? [],
    subject: r.subject,
    chapter: r.chapter,
    topics: r.topics ?? [],
    difficulty: (["easy", "medium", "hard"].includes(String(r.difficulty)) ? r.difficulty : undefined) as Difficulty | undefined,
    flags,
    confidence: typeof r.confidence === "number" ? r.confidence : 1,
  };
}

/* ─────────────────────────────── parse ─────────────────────────────── */

export interface ParseResult {
  rows: ImportRowData[];
  /** rows the reader could not make whole (shown as "needs a look", fixable in the drawer) */
  invalid: Array<{ row: ImportRowData; reason: string }>;
  job: ParseJobV2 | null;
  seconds: number | null;
}

export interface ParseStatus {
  status: ParseJobV2["status"];
  job: ParseJobV2 | null;
  /** 0–100 */
  pct: number;
  result: ParseResult | null;
  error: { code: string; message: string } | null;
}

function resultOf(body: Record<string, unknown>, job: ParseJobV2 | null): ParseResult {
  const qs = (body.questions as unknown[]) ?? [];
  const rows = qs.map((q, i) => toV2Row(q, i + 1));
  const invalid: ParseResult["invalid"] = [];
  ((body.invalidQuestions as Array<{ question: unknown; reason: string }>) ?? []).forEach((x, i) => {
    const row = { ...toV2Row(x.question, rows.length + i + 1), id: `x${i + 1}` };
    // A row whose only problem is the missing answer is a "No answer in the key" row, not an unreadable one
    const reasons = x.reason.replace(/^Row \d+:\s*/, "").split(/;\s*/);
    if (reasons.every((r) => /answer.*\bempty\b|no answer/i.test(r))) rows.push({ ...row, flags: [...new Set<ParseRowFlag>([...row.flags, "NO_ANSWER"])] });
    else invalid.push({ row, reason: x.reason.replace(/^Row \d+:\s*/, "") });
  });
  const ms = Number(body.processingTime);
  return { rows, invalid, job, seconds: Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : null };
}

/** POST /ai/admin/parse. Defaults go before the file (the server reads fields in order). */
export async function startParse(file: File, defaults: ParseDefaults, onUpload?: (loaded: number, total: number) => void, signal?: AbortSignal): Promise<{ jobId: string; job: ParseJobV2 | null }> {
  if (file.size > PARSE_MAX_BYTES) throw new AdminApiError(413, "FILE_TOO_LARGE", `${file.name} is ${Math.round(file.size / 1024 / 1024)} MB. The limit is 20 MB.`, { maxBytes: PARSE_MAX_BYTES });
  const fd = new FormData();
  if (defaults.subjectId) fd.append("subjectId", defaults.subjectId);
  if (defaults.chapterId) fd.append("chapterId", defaults.chapterId);
  if (defaults.difficulty) fd.append("difficulty", defaults.difficulty);
  fd.append("file", file);
  try {
    const r = await m6AiQ.post("/admin/parse", fd, {
      headers: { "Content-Type": "multipart/form-data", ...source("Import questions").headers },
      signal,
      onUploadProgress: (e: AxiosProgressEvent) => onUpload?.(e.loaded, e.total ?? file.size),
    });
    const d = unwrap<{ jobId: string; job?: ParseJobV2 }>(r.data);
    return { jobId: d.jobId, job: d.job ?? null };
  } catch (e) {
    throw apiError(e);
  }
}

/** GET /ai/admin/parse-status/:jobId, normalised (M5 bodies have no `job`). */
export async function parseStatus(jobId: string): Promise<ParseStatus> {
  let body: Record<string, unknown>;
  try {
    body = unwrap<Record<string, unknown>>((await m6AiQ.get(`/admin/parse-status/${encodeURIComponent(jobId)}`)).data);
  } catch (e) {
    throw apiError(e);
  }
  const job = (body.job as ParseJobV2 | undefined) ?? null;
  const raw = String(body.status ?? job?.status ?? "processing");
  const status = (["pending", "processing", "completed", "failed", "cancelled"].includes(raw) ? raw : "processing") as ParseJobV2["status"];
  const pct = status === "completed" ? 100 : job?.progress?.total ? Math.round((100 * job.progress.done) / job.progress.total) : Number(body.progress) || 0;
  const errors = (body.errors as string[]) ?? [];
  const error =
    status === "failed"
      ? (job?.error ?? { code: /paused/i.test(errors.join(" ")) ? "AI_PAUSED" : /read|blurry|no text/i.test(errors.join(" ")) ? "READ_FAILED" : "AI_UNAVAILABLE", message: errors.join(", ") || "The paper could not be read." })
      : null;
  return { status, job, pct, result: status === "completed" ? resultOf(body, job) : null, error };
}

/** POST /ai/admin/parse-text (read in the request). */
export async function parseText(content: string): Promise<ParseResult> {
  try {
    const r = await m6AiQ.post("/admin/parse-text", { content }, source("Import questions"));
    const body = unwrap<Record<string, unknown>>(r.data);
    return resultOf(body, (body.job as ParseJobV2) ?? null);
  } catch (e) {
    throw apiError(e);
  }
}

/** POST /ai/admin/parse/jobs/:id/cancel (sample: the page simply stops waiting). */
export async function cancelParse(jobId: string): Promise<ParseJobV2 | null> {
  return qCall<ParseJobV2 | null>(
    "parseV2",
    async () => unwrap<{ job: ParseJobV2 }>((await m6AiQ.post(`/admin/parse/jobs/${encodeURIComponent(jobId)}/cancel`, {}, source("Import questions"))).data).job,
    () => null
  );
}

/** GET /ai/admin/parse/jobs?active=1 ("We keep reading and show it under Import in the bank"). */
export async function activeParseJobs(): Promise<ParseJobV2[]> {
  const r = await qCall<ParseJobListResponse>(
    "parseV2",
    async () => unwrap<ParseJobListResponse>((await m6AiQ.get("/admin/parse/jobs", { params: { active: "1" } })).data),
    () => ({ now: new Date().toISOString(), jobs: [] })
  );
  return r.jobs ?? [];
}

/** GET /ai/admin/parse/template.xlsx */
export async function downloadTemplate(): Promise<Blob> {
  try {
    const r = await m6AiQ.get("/admin/parse/template.xlsx", { responseType: "blob" });
    return r.data as Blob;
  } catch (e) {
    throw apiError(e);
  }
}

/* ─────────────────────────────── duplicates ─────────────────────────────── */

export type DupMatch = { questionId: string; similarity: number };

/** questions /admin/duplicates in batches of 100 (advisory: null when it could not run). */
export async function findDuplicates(rows: ImportRowData[]): Promise<Record<string, DupMatch> | null> {
  const items = rows
    .map((r) => ({ key: r.id, text: (r.type === "paragraph" ? r.passage?.en : r.en?.question) ?? "" }))
    .filter((x) => x.text.replace(/<[^>]+>/g, "").trim().length > 8)
    .map((x) => ({ ...x, text: x.text.slice(0, 20000) }));
  const out: Record<string, DupMatch> = {};
  try {
    for (let i = 0; i < items.length; i += 100) {
      const r = await questionsAdmin.duplicates({ items: items.slice(i, i + 100) });
      for (const x of r.results) if (x.matches.length) out[x.key] = { questionId: x.matches[0].questionId, similarity: x.matches[0].similarity };
    }
    return out;
  } catch {
    return null;
  }
}

/* ─────────────────────────────── confirm ─────────────────────────────── */

export type ConfirmRow = ImportConfirmRequestV2["questions"][number];

export interface ConfirmContext {
  /** subject id → name, chapter id → name (the old body and the per-type routes take names) */
  subjectName: (id: string) => string;
  chapterName: (id: string) => string;
}

export interface ConfirmOutcome extends ImportConfirmResponseV2 {
  /** field errors of a 400 VALIDATION_ERROR keyed by row index ("questions.3.answer") */
  rowErrors?: Record<number, string>;
}

const stripText = (html?: string | null) => (html ?? "").replace(/<(?!img)[^>]+>/gi, "").replace(/&nbsp;/g, " ").trim();
function hasHindi(q: ConfirmRow): boolean {
  if (q.type === "paragraph") return !!stripText(q.passage?.hi) || (q.questions ?? []).some((c) => !!stripText(c.hi?.question));
  return !!stripText(q.hi?.question);
}

/** Done-step counts from the rows (when the server answers the old `{created, questionIds}` only). */
export function countsOf(rows: ConfirmRow[], created: number, questionIds: string[], ctx: ConfirmContext): ImportConfirmResponseV2 {
  const by = new Map<string, number>();
  for (const r of rows) {
    const s = ctx.subjectName(r.subjectId) || r.subject || "Other";
    by.set(s, (by.get(s) ?? 0) + 1);
  }
  return {
    created,
    questionIds,
    bySubject: [...by].map(([subject, count]) => ({ subject, count })),
    withoutHindi: rows.filter((r) => !hasHindi(r)).length,
    needsLatex: rows.filter((r) => r.flags.includes("EQUATION_WAS_IMAGE") || /data-needs-latex/i.test(JSON.stringify(r))).length,
  };
}

/** M5 confirm answered the v2 body with its old schema error. */
const isLegacyRefusal = (e: unknown) => {
  if (isMissingRoute(e)) return true;
  const err = apiError(e);
  return err.status === 400 && err.code !== "VALIDATION_ERROR" && /must have required property|must be equal to one of the allowed values|must be object/i.test(err.message);
};

async function legacyConfirm(rows: ConfirmRow[], sourceTag: string | null, ctx: ConfirmContext): Promise<{ created: number; ids: string[] }> {
  const sources = sourceTag ? [sourceTag] : [];
  const chaptersOf = (r: ConfirmRow) => r.chapterIds.map((id) => ({ name: ctx.chapterName(id), topics: r.topics ?? [] }));
  const objective = rows.filter((r) => r.type === "single" || r.type === "multiple");
  let created = 0;
  const ids: string[] = [];
  if (objective.length) {
    const res = await api.aiParsing.confirmQuestions(
      objective.map((r) => ({
        type: r.type as "single" | "multiple",
        difficulty: (r.difficulty ?? "medium") as "easy" | "medium" | "hard",
        en: { question: r.en.question, options: r.en.options ?? [], ...(r.en.solution ? { solution: r.en.solution } : {}) },
        ...(r.hi ? { hi: { question: r.hi.question, options: r.hi.options ?? [], ...(r.hi.solution ? { solution: r.hi.solution } : {}) } } : {}),
        correctAnswers: r.correctAnswers ?? [],
        subject: ctx.subjectName(r.subjectId),
        chapters: chaptersOf(r),
        sources,
      }))
    );
    const d = (res.data as { data?: { created?: number; questionIds?: string[] } })?.data;
    created += d?.created ?? objective.length;
    ids.push(...(d?.questionIds ?? []));
  }
  for (const r of rows.filter((x) => x.type !== "single" && x.type !== "multiple")) {
    const core = { subject: ctx.subjectName(r.subjectId), chapters: chaptersOf(r), difficulty: r.difficulty ?? "medium", sources, isProofRead: false };
    let kind = "numerical";
    let doc: Record<string, unknown>;
    if (r.type === "integer") {
      doc = { ...core, type: "integer", en: { question: r.en.question, solution: r.en.solution ?? "" }, hi: { question: r.hi?.question ?? "", solution: r.hi?.solution ?? "" }, correctAnswer: r.correctAnswer };
    } else if (r.type === "paragraph") {
      kind = "paragraph";
      doc = {
        ...core,
        type: "paragraph",
        paragraph: r.passage?.en ?? "",
        passage: r.passage,
        questions: (r.questions ?? []).map((c) => ({ ...c, hi: c.hi ?? { question: "", options: [], solution: "" } })),
      };
    } else {
      kind = "matrix";
      const m = r.matrix!;
      doc = {
        ...core,
        type: "matrix",
        en: { question: r.en.question, options: [], solution: r.en.solution ?? "" },
        hi: { question: r.hi?.question ?? "", options: [], solution: r.hi?.solution ?? "" },
        matrix: m,
        correctAnswer: m.listI.map((row) => m.listII.map((col) => (m.matches[row.id] ?? []).includes(col.id))),
      };
    }
    const res = await api.questions.create(kind, doc);
    const d = (res.data as { data?: { _id?: string; id?: string } })?.data;
    created += 1;
    if (d?._id || d?.id) ids.push((d._id || d.id)!);
  }
  return { created, ids };
}

/**
 * POST /questions/ai/confirm with the v2 body. An M5 backend refuses it: then the old body / per-type routes run
 * (real writes, not sample data) and the counts are computed here.
 */
export async function confirmImport(body: ImportConfirmRequestV2, ctx: ConfirmContext): Promise<ConfirmOutcome> {
  try {
    const r = await m6Questions.post("/ai/confirm", body, source("Import questions"));
    const d = unwrap<Partial<ImportConfirmResponseV2>>(r.data);
    if (d.bySubject) return d as ImportConfirmResponseV2;
    return countsOf(body.questions, d.created ?? body.questions.length, d.questionIds ?? [], ctx);
  } catch (e) {
    const err = apiError(e);
    if (err.code === "VALIDATION_ERROR") {
      const fields = (err.details as { fields?: Record<string, { message: string }> } | null)?.fields ?? {};
      const rowErrors: Record<number, string> = {};
      for (const [k, v] of Object.entries(fields)) {
        const m = /^questions\.(\d+)\./.exec(k);
        if (m) rowErrors[Number(m[1])] ??= v.message;
      }
      if (Object.keys(rowErrors).length) return { created: 0, questionIds: [], bySubject: [], withoutHindi: 0, needsLatex: 0, rowErrors };
      throw err;
    }
    if (!isLegacyRefusal(e)) throw err;
    legacyUsed = true;
    const { created, ids } = await legacyConfirm(body.questions, body.sourceTag ?? null, ctx);
    return countsOf(body.questions, created, ids, ctx);
  }
}

let legacyUsed = false;
/** True once the confirm ran the old way on this page load (kept for QA; the writes are real). */
export const confirmWasLegacy = () => legacyUsed;
