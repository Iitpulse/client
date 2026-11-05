/*
  M6 admin API for the questions area (contract: api-ai docs/m6-api.md "questions" + "ai", types ../m6-contract).
  Gateway routes: /questions/* (bank, media, taxonomy, deletes) and /ai/admin/* (assist incl. latex, parse v2).

  Sample-data fallback, the same switch as ./client (localStorage "iitp.m6.fixtures" = auto | on | off, env
  NEXT_PUBLIC_M6_FIXTURES): in "auto" a route that is not on this backend yet (404 route-not-found, 501) answers from
  the typed fixture for this page load and the page shows a "Sample data" pill (useQuestionsSource). Two M5 answers
  also mean "not built yet" for an M6 feature: 400 VALIDATION_ERROR about `kind` (assist kind "latex") and 409
  UNSUPPORTED_TYPE (assist on paragraph/matrix). Sample AI drafts have ids starting "sample-": accept/discard of those
  never reach the server (the editor's Save writes the fields through the normal update).
*/
import axios, { type AxiosInstance, type AxiosProgressEvent } from "axios";
import { useSyncExternalStore } from "react";
import { AdminApiError, API_GATEWAY, apiError } from "../ai-admin";
import { fixtureMode, isMissingRoute, postStream, source, unwrap } from "./client";
import type {
  AssistRequestM6,
  ChildType,
  LatexPayload,
  MediaUploadResponse,
  QuestionInLiveTestDetails,
  QuestionUsageM6,
  SoftDeleteResponse,
  TaxonomyTreeResponse,
} from "../m6-contract";
import type { AiDraft, AssistStreamEvent, DraftKind } from "../m5-contract";

export { AdminApiError, apiError, source };

const AUTH_TOKEN_KEY = "auth_token";

function client(base: string): AxiosInstance {
  const c = axios.create({ baseURL: base, headers: { "Content-Type": "application/json" }, paramsSerializer: { indexes: null } });
  c.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem(AUTH_TOKEN_KEY);
      if (t) config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
  c.interceptors.response.use(
    (r) => r,
    (e) => {
      if (e?.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = "/login";
      }
      return Promise.reject(e);
    }
  );
  return c;
}

/** /questions/* */
export const m6Questions = client(`${API_GATEWAY}/questions`);
/** /ai/* */
export const m6AiQ = client(`${API_GATEWAY}/ai`);
/** gateway root (Undo paths in SoftDeleteResponse are full gateway paths: "/questions/mcq/restore/QS_1") */
const gateway = client(API_GATEWAY);

/* ─────────────────────────────── sample data ─────────────────────────────── */

export type QArea =
  | "media" // POST /questions/admin/media
  | "delete" // soft delete with Undo
  | "taxonomy" // GET /questions/admin/taxonomy
  | "search" // needsLatex filter and counts
  | "latex" // assist kind latex ("Convert with AI")
  | "assistPM" // assist on paragraph / matrix
  | "parseV2" // .docx direct, jobs list, cancel
  | "templateV2" // Excel template v2
  | "confirmV2"; // import confirm, all 5 types

const sampleAreas = new Set<QArea>();
const listeners = new Set<() => void>();
export function markSample(area: QArea) {
  if (sampleAreas.has(area)) return;
  sampleAreas.add(area);
  listeners.forEach((l) => l());
}
export function isSample(area: QArea): boolean {
  return fixtureMode() === "on" || sampleAreas.has(area);
}

/** "sample" when any of these areas answered from sample data on this page load (draws the "Sample data" pill). */
export function useQuestionsSource(...areas: QArea[]): "sample" | "live" {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => (areas.some((a) => isSample(a)) ? "sample" : "live"),
    () => "live"
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** M6 feature missing on a backend that answers in M5 terms (see header). */
export function isMissingFeature(e: unknown): boolean {
  if (isMissingRoute(e)) return true;
  const err = apiError(e);
  if (err.code === "UNSUPPORTED_TYPE") return true;
  if (err.status === 400 && err.code === "VALIDATION_ERROR" && /\bkind\b/i.test(err.message)) return true;
  return false;
}

/** Real call, or the typed fixture when the route/feature is not on this backend yet. Errors are AdminApiError. */
export async function qCall<T>(area: QArea, real: () => Promise<T>, fixture: () => T | Promise<T>, opts: { missing?: (e: unknown) => boolean } = {}): Promise<T> {
  const mode = fixtureMode();
  if (mode === "on" || sampleAreas.has(area)) {
    if (mode !== "on") markSample(area);
    await delay(200);
    return fixture();
  }
  try {
    return await real();
  } catch (e) {
    if (mode === "auto" && (opts.missing ?? isMissingRoute)(e)) {
      markSample(area);
      await delay(200);
      return fixture();
    }
    throw apiError(e);
  }
}

/* ─────────────────────────────── kinds ─────────────────────────────── */

/** The questions API keeps one route family per kind. */
export type QuestionKind = "mcq" | "numerical" | "paragraph" | "matrix";
export function kindOfType(t: string): QuestionKind {
  if (t === "integer" || t === "numerical") return "numerical";
  if (t === "paragraph") return "paragraph";
  if (t === "matrix") return "matrix";
  return "mcq";
}

/* ─────────────────────────────── media ─────────────────────────────── */

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Client-side check before upload (the server answers the same codes). */
export function checkImage(file: File): AdminApiError | null {
  const okType = IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|svg)$/i.test(file.name);
  if (!okType) return new AdminApiError(400, "UNSUPPORTED_IMAGE", "Couldn't add it: use PNG, JPG or SVG, up to 2 MB.");
  if (file.size > IMAGE_MAX_BYTES) return new AdminApiError(413, "IMAGE_TOO_LARGE", "Couldn't add it: use PNG, JPG or SVG, up to 2 MB.");
  return null;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

function imageSize(url: string): Promise<{ width: number | null; height: number | null }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ width: img.naturalWidth || null, height: img.naturalHeight || null });
    img.onerror = () => res({ width: null, height: null });
    img.src = url;
  });
}

/**
 * POST /questions/admin/media (multipart `file`) → url. Sample mode answers a data: URL (the image still shows; the
 * questions service moves inline images to storage when it lands).
 */
export async function uploadMedia(file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<MediaUploadResponse> {
  const bad = checkImage(file);
  if (bad) throw bad;
  return qCall<MediaUploadResponse>(
    "media",
    async () => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await m6Questions.post("/admin/media", fd, {
        headers: { "Content-Type": "multipart/form-data", ...source("Question editor").headers },
        signal,
        onUploadProgress: (e: AxiosProgressEvent) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 50),
      });
      return unwrap<MediaUploadResponse>(r.data);
    },
    async () => {
      for (const p of [20, 45, 70, 90]) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        onProgress?.(p);
        await delay(90);
      }
      const url = await readDataUrl(file);
      const { width, height } = await imageSize(url);
      return { now: new Date().toISOString(), url, key: `sample/${file.name}`, width, height };
    }
  );
}

/* ─────────────────────────────── delete / restore / Undo ─────────────────────────────── */

/**
 * Soft delete (every type, M6). 409 QUESTION_IN_LIVE_TEST {test, writing} passes through as AdminApiError.
 * A backend that answers the M5 `{message}` only still gets an Undo: the kind's restore route.
 */
export async function deleteQuestion(kind: QuestionKind, id: string, where = "Question editor"): Promise<SoftDeleteResponse> {
  try {
    const r = await m6Questions.delete(`/${kind}/delete`, { data: { id }, ...source(where) });
    const body = r.data as { data?: SoftDeleteResponse };
    if (body?.data?.deleted) return body.data;
    const now = new Date();
    return {
      now: now.toISOString(),
      deleted: { type: "question", id },
      undo: { method: "POST", path: `/questions/${kind}/restore/${encodeURIComponent(id)}`, until: new Date(now.getTime() + 6000).toISOString() },
    };
  } catch (e) {
    throw apiError(e);
  }
}

export async function restoreQuestion(kind: QuestionKind, id: string, where = "Question editor"): Promise<void> {
  try {
    await m6Questions.post(`/${kind}/restore/${encodeURIComponent(id)}`, {}, source(where));
  } catch (e) {
    throw apiError(e);
  }
}

/** POST the Undo path of a SoftDeleteResponse (a gateway path). */
export async function undoDelete(path: string, where = "Question editor"): Promise<void> {
  try {
    await gateway.post(path, {}, source(where));
  } catch (e) {
    throw apiError(e);
  }
}

export function liveTestDetails(e: unknown): QuestionInLiveTestDetails | null {
  const err = apiError(e);
  return err.code === "QUESTION_IN_LIVE_TEST" ? (err.details as unknown as QuestionInLiveTestDetails) : null;
}

/* ─────────────────────────────── usage (tests) ─────────────────────────────── */

/** M5 usage + M6 live/scheduled (both default to [] on a backend without them). */
export async function questionUsage(ids: string[]): Promise<Record<string, QuestionUsageM6>> {
  if (!ids.length) return {};
  try {
    const r = await axios.post(`${API_GATEWAY}/tests/admin/question-usage`, { questionIds: ids.slice(0, 200) }, {
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : ""}` },
    });
    const usage = (unwrap<{ usage: Record<string, Partial<QuestionUsageM6>> }>(r.data).usage ?? {}) as Record<string, Partial<QuestionUsageM6>>;
    const out: Record<string, QuestionUsageM6> = {};
    for (const id of ids) {
      const u = usage[id] ?? {};
      out[id] = { tests: u.tests ?? 0, lastUsedAt: u.lastUsedAt ?? null, live: u.live ?? [], scheduled: u.scheduled ?? [] };
    }
    return out;
  } catch (e) {
    throw apiError(e);
  }
}

/* ─────────────────────────────── taxonomy ─────────────────────────────── */

/**
 * GET /questions/admin/taxonomy?q= (tree with question counts). Sample: the subjects list with counts 0 (the
 * pickers then show no count).
 */
export async function taxonomy(q?: string): Promise<TaxonomyTreeResponse> {
  return qCall<TaxonomyTreeResponse>(
    "taxonomy",
    async () => unwrap<TaxonomyTreeResponse>((await m6Questions.get("/admin/taxonomy", { params: q ? { q } : {} })).data),
    async () => {
      const r = await m6Questions.get("/subject/subjects");
      const d = r.data as { data?: unknown[] } | unknown[];
      const subjects = (Array.isArray(d) ? d : (d?.data ?? [])) as Array<{ _id: string; id?: string; name: string; chapters?: Array<{ _id?: string; id?: string; name: string; topics?: string[] }> }>;
      const needle = (q ?? "").trim().toLowerCase();
      const tree = subjects.map((s) => ({
        id: s.id || s._id,
        name: s.name,
        questions: 0,
        chapters: (s.chapters ?? [])
          .filter((c) => c.name && (!needle || c.name.toLowerCase().includes(needle) || (c.topics ?? []).some((t) => t.toLowerCase().includes(needle))))
          .map((c) => ({ id: c.id || c._id || c.name, name: c.name, questions: 0, topics: (c.topics ?? []).map((t) => ({ id: t, name: t, questions: 0 })) })),
      }));
      return { now: new Date().toISOString(), totals: { subjects: tree.length, chapters: tree.reduce((n, s) => n + s.chapters.length, 0), questions: 0 }, subjects: tree };
    }
  );
}

/* ─────────────────────────────── AI assist (M6: latex, paragraph/matrix) ─────────────────────────────── */

export type DraftKindM6 = DraftKind | "latex";
/** A draft as the editor holds it (M5 AiDraft with the M6 kind). */
export type AiDraftM6 = Omit<AiDraft, "kind" | "payload"> & { kind: DraftKindM6; payload: AiDraft["payload"] | LatexPayload | Record<string, unknown> | null };

export const isSampleDraft = (id: string) => id.startsWith("sample-");

export interface AssistHandlers {
  onStart?: (draft: AiDraftM6) => void;
  onDelta?: (part: string, text: string) => void;
}

/**
 * POST /ai/admin/questions/:id/assist with the M6 body (SSE). Resolves with the finished draft (polls when the stream
 * dropped). `sample` builds the fixture draft for areas that are not on this backend yet.
 */
export async function assistM6(
  questionId: string,
  body: AssistRequestM6,
  area: "latex" | "assistPM" | null,
  sample: () => AiDraftM6,
  h: AssistHandlers = {},
  signal?: AbortSignal
): Promise<AiDraftM6> {
  const fromSample = async () => {
    if (area) markSample(area);
    const d = sample();
    h.onStart?.({ ...d, status: "generating" });
    await delay(700);
    return d;
  };
  if (area && isSample(area)) return fromSample();
  let start: AiDraftM6 | null = null;
  let done: AiDraftM6 | null = null;
  try {
    await postStream(
      `/ai/admin/questions/${encodeURIComponent(questionId)}/assist`,
      body,
      (event, data) => {
        const e = { event, data } as AssistStreamEvent;
        if (e.event === "start") {
          start = e.data.draft as unknown as AiDraftM6;
          h.onStart?.(start);
        } else if (e.event === "delta") h.onDelta?.(e.data.part, e.data.text);
        else if (e.event === "done") done = e.data.draft as unknown as AiDraftM6;
      },
      signal
    );
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    if (area && fixtureMode() === "auto" && isMissingFeature(e)) return fromSample();
    throw apiError(e);
  }
  if (done) return done;
  const s = start as AiDraftM6 | null;
  if (s) {
    for (let i = 0; i < 40; i++) {
      await delay(1500);
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      const r = await m6AiQ.get(`/admin/drafts/${encodeURIComponent(s.id)}`).catch(() => null);
      const d = r ? unwrap<{ draft: AiDraftM6 }>(r.data).draft : null;
      if (d && d.status !== "generating") return d;
    }
  }
  throw new AdminApiError(0, "AI_UNAVAILABLE", "The AI did not answer. Try again in a minute.");
}

/** Accept a draft (sample drafts: nothing to send). `payload` = the form's edited version. */
export async function acceptDraft(id: string, payload?: unknown): Promise<void> {
  if (isSampleDraft(id)) return;
  try {
    await m6AiQ.post(`/admin/drafts/${encodeURIComponent(id)}/accept`, payload ? { payload } : {});
  } catch (e) {
    throw apiError(e);
  }
}
export async function discardDraft(id: string): Promise<void> {
  if (isSampleDraft(id)) return;
  await m6AiQ.post(`/admin/drafts/${encodeURIComponent(id)}/discard`, {}).catch(() => {});
}

/** A sample draft shell (fixtures). */
export function sampleDraft(questionId: string, kind: DraftKindM6, payload: AiDraftM6["payload"], extra: Partial<AiDraftM6> = {}): AiDraftM6 {
  const now = new Date().toISOString();
  return {
    id: `sample-${kind}-${Math.random().toString(36).slice(2, 9)}`,
    questionId,
    kind,
    status: "ready",
    payload,
    checks: null,
    error: null,
    jobId: null,
    createdAt: now,
    updatedAt: now,
    ...extra,
  } as unknown as AiDraftM6;
}

/* ─────────────────────────────── labels ─────────────────────────────── */

export const TYPE_LABEL_M6: Record<string, string> = { single: "Single", multiple: "Multiple", integer: "Numerical", paragraph: "Paragraph", matrix: "Matrix" };
export const CHILD_TYPES: { key: ChildType; label: string }[] = [
  { key: "single", label: "Single" },
  { key: "multiple", label: "Multiple" },
  { key: "integer", label: "Numerical" },
];
