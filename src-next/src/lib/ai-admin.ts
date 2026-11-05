/*
  M5 question-side admin API (contract: api-ai docs/m5-api.md, types ./m5-contract): bank search and duplicate check
  (questions), question usage and Add to test (tests), AI assist (SSE), drafts and bulk jobs (ai).
  Everything goes through the gateway: /questions/admin/*, /tests/admin/*, /ai/admin/*.
*/
import axios, { AxiosError, type AxiosInstance } from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  AddToTestResponse,
  AiDraft,
  AssistStreamEvent,
  BulkJob,
  BulkPreview,
  BulkPreviewRequest,
  DraftAcceptRequest,
  DraftAcceptResponse,
  DraftDecideRequest,
  DraftDecideResponse,
  DraftKind,
  DraftListResponse,
  DraftStatus,
  DuplicateCheckRequest,
  DuplicateCheckResponse,
  QuestionFilter,
  QuestionSearchResponse,
  QuestionUsageResponse,
} from "./m5-contract";

const AUTH_TOKEN_KEY = "auth_token";
export const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

function client(prefix: "ai" | "questions" | "tests"): AxiosInstance {
  const c = axios.create({ baseURL: `${API_GATEWAY}/${prefix}`, headers: { "Content-Type": "application/json" } });
  c.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem(AUTH_TOKEN_KEY);
      if (t) config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
  c.interceptors.response.use(
    (r) => r,
    (e: AxiosError) => {
      if (e.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = "/login";
      }
      return Promise.reject(e);
    }
  );
  return c;
}

const apiAi = client("ai");
const apiQ = client("questions");
const apiT = client("tests");

/** An API error as the contract sends it ({ success:false, error, message, code, details }). */
export class AdminApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
    public details: Record<string, unknown> | null = null
  ) {
    super(message);
  }
}

export function apiError(e: unknown): AdminApiError {
  if (e instanceof AdminApiError) return e;
  const ax = e as AxiosError<{ code?: string; message?: string; error?: string | { message?: string }; details?: Record<string, unknown> }>;
  if (ax?.isAxiosError) {
    const d = ax.response?.data;
    const msg = d?.message || (typeof d?.error === "string" ? d.error : d?.error?.message) || (ax.response ? "Something went wrong. Please try again." : "You seem to be offline. Check your connection and try again.");
    return new AdminApiError(ax.response?.status ?? 0, d?.code ?? null, msg, d?.details ?? null);
  }
  return new AdminApiError(0, null, e instanceof Error ? e.message : "Something went wrong. Please try again.");
}

const data = <T>(p: Promise<{ data: { data: T } }>) =>
  p.then((r) => r.data.data).catch((e) => {
    throw apiError(e);
  });

/* ═════════════ questions ═════════════ */

export type SearchSort = "updated" | "created" | "id";
export interface SearchParams extends QuestionFilter {
  page?: number;
  pageSize?: number;
  sort?: SearchSort;
}

export function searchParams(p: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    out[k] = v === true ? "1" : String(v);
  }
  return out;
}

export const questionsAdmin = {
  search: (p: SearchParams) => data<QuestionSearchResponse>(apiQ.get("/admin/search", { params: searchParams(p) })),
  duplicates: (body: DuplicateCheckRequest) => data<DuplicateCheckResponse>(apiQ.post("/admin/duplicates", body)),
};

export function useQuestionSearch(p: SearchParams) {
  return useQuery({
    queryKey: ["questions", "admin-search", searchParams(p)],
    queryFn: () => questionsAdmin.search(p),
    placeholderData: keepPreviousData,
  });
}

/* ═════════════ tests ═════════════ */

export const testsAdmin = {
  usage: (questionIds: string[]) => data<QuestionUsageResponse>(apiT.post("/admin/question-usage", { questionIds })),
  addToTest: (testId: string, questionIds: string[], sectionId?: string | null) =>
    data<AddToTestResponse>(apiT.post(`/admin/tests/${encodeURIComponent(testId)}/questions`, { questionIds, ...(sectionId ? { sectionId } : {}) })),
};

/** "used in N tests" for the rows on screen (1–200 ids per call). */
export function useQuestionUsage(ids: string[]) {
  const key = [...ids].sort();
  return useQuery({
    queryKey: ["tests", "question-usage", key],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => (await testsAdmin.usage(key.slice(0, 200))).usage,
  });
}

/* ═════════════ ai: drafts ═════════════ */

export interface DraftQuery {
  questionId?: string;
  jobId?: string;
  kind?: DraftKind;
  status?: DraftStatus;
  cursor?: string;
}

export const aiAdmin = {
  drafts: (q: DraftQuery) => data<DraftListResponse>(apiAi.get("/admin/drafts", { params: searchParams(q as Record<string, string>) })),
  draft: (id: string) => data<{ now: string; draft: AiDraft }>(apiAi.get(`/admin/drafts/${encodeURIComponent(id)}`)),
  accept: (id: string, body: DraftAcceptRequest = {}) => data<DraftAcceptResponse>(apiAi.post(`/admin/drafts/${encodeURIComponent(id)}/accept`, body)),
  discard: (id: string) => data<{ now: string; draft: AiDraft }>(apiAi.post(`/admin/drafts/${encodeURIComponent(id)}/discard`, {})),
  decide: (body: DraftDecideRequest) => data<DraftDecideResponse>(apiAi.post("/admin/drafts/decide", body)),
  preview: (body: BulkPreviewRequest) => data<BulkPreview>(apiAi.post("/admin/bulk/preview", body)),
  start: (previewId: string) => data<{ now: string; job: BulkJob }>(apiAi.post("/admin/bulk/jobs", { previewId })),
  job: (id: string) => data<{ now: string; job: BulkJob }>(apiAi.get(`/admin/bulk/jobs/${encodeURIComponent(id)}`)),
  jobs: (active = false) => data<{ now: string; jobs: BulkJob[] }>(apiAi.get("/admin/bulk/jobs", { params: active ? { active: "1" } : {} })),
  cancel: (id: string) => data<{ now: string; job: BulkJob }>(apiAi.post(`/admin/bulk/jobs/${encodeURIComponent(id)}/cancel`, {})),
  /** The Excel template for BulkUpload (a Blob). */
  template: () =>
    apiAi
      .get("/admin/parse/template.xlsx", { responseType: "blob" })
      .then((r) => r.data as Blob)
      .catch((e) => {
        throw apiError(e);
      }),
};

/** Ready drafts count for the "AI drafts N" button. */
export function useReadyDraftCount() {
  return useQuery({
    queryKey: ["ai", "drafts", "count"],
    staleTime: 30_000,
    queryFn: async () => {
      const r = await aiAdmin.drafts({ status: "ready" });
      return r.counts.ready ?? r.items.length;
    },
    retry: false,
  });
}

/* ═════════════ ai: assist (SSE) ═════════════ */

export type StreamEnd = "done" | "dropped";

/**
 * POST /ai/admin/questions/:id/assist, read with fetch() and a stream reader (the token stays in the Authorization
 * header, as the M4 doubt stream in client-test). A JSON answer is an error from before the stream started: it
 * rejects with AdminApiError (UNSUPPORTED_TYPE, ADMIN_AI_DAILY_LIMIT, AI_RATE_LIMITED, AI_PAUSED, ...). Resolves
 * "done" after the done event, "dropped" when the connection ended first (then poll GET /drafts/:id).
 */
export async function streamAssist(
  questionId: string,
  kind: DraftKind,
  onEvent: (e: AssistStreamEvent) => void,
  signal?: AbortSignal
): Promise<StreamEnd> {
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  let res: Response;
  try {
    res = await fetch(`${API_GATEWAY}/ai/admin/questions/${encodeURIComponent(questionId)}/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ kind }),
      cache: "no-store",
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new AdminApiError(0, null, "You seem to be offline. Check your connection and try again.");
  }
  if (res.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = "/login";
    throw new AdminApiError(401, null, "Please sign in again.");
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("text/event-stream") || !res.body) {
    const json = (await res.json().catch(() => null)) as { code?: string; message?: string; details?: Record<string, unknown> } | null;
    throw new AdminApiError(res.status, json?.code ?? null, json?.message || "AI assist is not available right now.", json?.details ?? null);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = nextBreak(buf)) >= 0) {
        const block = buf.slice(0, cut);
        buf = buf.slice(cut).replace(/^(\r?\n){2}/, "");
        const ev = parseBlock(block);
        if (!ev) continue;
        onEvent(ev);
        if (ev.event === "done") finished = true;
      }
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return "dropped";
  } finally {
    reader.releaseLock?.();
  }
  return finished ? "done" : "dropped";
}

function nextBreak(s: string): number {
  const a = s.indexOf("\n\n");
  const b = s.indexOf("\r\n\r\n");
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

function parseBlock(block: string): AssistStreamEvent | null {
  let event = "message";
  const lines: string[] = [];
  for (const raw of block.split(/\r?\n/)) {
    if (!raw || raw.startsWith(":")) continue;
    const i = raw.indexOf(":");
    const field = i < 0 ? raw : raw.slice(0, i);
    const val = i < 0 ? "" : raw.slice(i + 1).replace(/^ /, "");
    if (field === "event") event = val;
    else if (field === "data") lines.push(val);
  }
  if (!lines.length || !["start", "delta", "done"].includes(event)) return null;
  try {
    return { event, data: JSON.parse(lines.join("\n")) } as AssistStreamEvent;
  } catch {
    return null;
  }
}

/** After a dropped stream: GET the draft every 2 s until it leaves "generating" (the server fails it after 3 min). */
export async function pollDraft(id: string, signal?: AbortSignal): Promise<AiDraft> {
  for (let i = 0; i < 120; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const { draft } = await aiAdmin.draft(id);
    if (draft.status !== "generating") return draft;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new AdminApiError(0, "AI_UNAVAILABLE", "The draft is taking too long. Try again in a minute.");
}

/* ═════════════ copy shared by the pages ═════════════ */

export const KIND_LABEL: Record<DraftKind, string> = { tags: "Tags", translation: "Hindi", solution: "Solution" };

/** Board copy per bulk kind (Admin-Questions preview dialog and progress bar). */
export const BULK_COPY: Record<DraftKind, { label: string; running: string; skip: string; redoLabel: string; noun: string }> = {
  tags: { label: "Auto-tag", running: "Tagging chapter & difficulty", skip: "already tagged", redoLabel: "are already tagged", noun: "tagging runs" },
  translation: { label: "Translate to Hindi", running: "Translating to Hindi", skip: "already have Hindi", redoLabel: "already have Hindi", noun: "translations" },
  solution: { label: "Draft solutions", running: "Drafting solutions", skip: "already have a solution", redoLabel: "already have a solution", noun: "solution drafts" },
};

export const TYPE_LABEL: Record<string, string> = { single: "Single", multiple: "Multiple", integer: "Numerical", paragraph: "Paragraph", matrix: "Matrix" };

/** Legacy editor kind for a contract question type (routes /questions/:id/edit?type=…). */
export function editorKind(type: string): "mcq" | "numerical" | "paragraph" | "matrix" {
  if (type === "integer") return "numerical";
  if (type === "paragraph" || type === "matrix") return type;
  return "mcq";
}

/** Downloads a Blob as a file. */
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
