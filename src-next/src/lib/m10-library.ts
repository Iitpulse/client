/*
  M10: the shared IIT-PULSE question library, admin side (contract: api-questions docs/m10-library.md).
    GET  /questions/admin/search                 + source=all|mine|library, hideCopied=1; items add source, library,
                                                   copied, licence, published; the answer adds `library`
    GET  /questions/admin/library/status         entitlement, branding, label, owner flags, counts, addOnEnded,
                                                   addOnEndedAt (IST "YYYY-MM-DD"), price (from the platform)
    POST /questions/admin/library/copy-plan      { questionIds ≤ 100 } → chapter mapping
    POST /questions/admin/library/copy           { questionIds, chapterMap } → { copies }
    POST /questions/admin/library/publish-check  IIT-PULSE staff: { questionIds ≤ 200 } → per-question status
    POST /questions/admin/library/publish        IIT-PULSE staff: publish (skips blocked ones)
  Every field is optional on the client: before the backend lands, search answers without `library` and the status
  route is missing (404), and the bank page then behaves exactly as before.
*/
import { useQuery } from "@tanstack/react-query";
import { apiError, m6Questions, source } from "./m6/questions";
import { unwrap } from "./m6/client";
import type { BankListItem, QuestionSearchResponse } from "./m5-contract";

/* ─────────────── search additions ─────────────── */

export type QuestionSource = "mine" | "library" | "copy";
/** The bank's source tabs (URL `source`; absent = all). */
export type SourceTab = "all" | "mine" | "library";

export interface LibraryRef {
  id: string;
  version: number;
  updatedAt: string;
}
export interface LicenceRef {
  sourceQuestionId: string;
  sourceVersion: number;
  grantedAt: string;
  usable: boolean;
}
export interface PublishedRef {
  libraryId: string;
  version: number;
  publishedAt: string;
  editedSince: boolean;
}

/** A bank row with the M10 fields (all optional: an older backend sends none). */
export type LibraryRow = BankListItem & {
  source?: QuestionSource;
  library?: LibraryRef | null;
  /** library rows: id of this institute's copy */
  copied?: string | null;
  licence?: LicenceRef | null;
  /** tnt_iitpulse only */
  published?: PublishedRef | null;
  /** the exams a question is written for (row meta "JEE Main · …", preview badge) */
  exams?: Array<{ id: string; name: string }>;
};

export interface SearchLibrary {
  entitled: boolean;
  branding: boolean;
  label: string;
  counts: { all: number; mine: number; library: number };
}

/** M10 search counts (optional: an older backend sends none, and the page then hides their parts). */
export interface SearchCountsM10 {
  /** Exam filter chip: count per own exam id, every other filter applied (filter with `examId=`) */
  byExam?: Record<string, number>;
  /**
   * IIT-PULSE publish tabs "All · N / In the library · N / Can be published · N" (filter with `published=in|can`).
   * canPublish is null when tests can't answer the embargo check (the tab shows no count).
   */
  publish?: { all?: number; inLibrary: number; canPublish: number | null };
}

export type SearchResponseM10 = QuestionSearchResponse & { library?: SearchLibrary | null; counts: QuestionSearchResponse["counts"] & SearchCountsM10 };

export const isLibraryId = (id: string | null | undefined) => !!id && id.startsWith("LIB-");
export const isLibraryRow = (r: Pick<LibraryRow, "id" | "source">) => r.source === "library" || (r.source === undefined && isLibraryId(r.id));
/** A licensed copy whose licence ended with the add-on: no edit, no new tests (delete still works). */
export const licenceEnded = (r: Pick<LibraryRow, "licence">) => r.licence?.usable === false;

/* ─────────────── status ─────────────── */

export interface LibraryStatus {
  entitled: boolean;
  branding: boolean;
  label: string;
  isLibraryOwner: boolean;
  canPublish: boolean;
  counts: { library: number; copies: number; usableCopies: number };
  addOnEnded: boolean;
  /** IST date "YYYY-MM-DD" the add-on ended ("ended on 30 Nov"), or null */
  addOnEndedAt?: string | null;
  /** the add-on price line from the platform ("₹10 per active student per month, before GST"); null = no price line */
  price?: string | null;
  /** IIT-PULSE only */
  institutes?: Array<{ id: string; displayName: string }>;
}

/* ─────────────── copy ─────────────── */

export interface CopyPlan {
  questions: Array<{ id: string; type: string; chapter: string | null; subject: string | null; copied: string | null }>;
  chapters: Array<{
    librarySubject: string;
    libraryChapter: string;
    count: number;
    match: { subjectId: string; subjectName: string; chapterId: string; chapterName: string } | null;
  }>;
}
export interface ChapterMapping {
  librarySubject: string;
  libraryChapter: string;
  chapterId: string;
}
export interface CopyResult {
  copies: Array<{ sourceId: string; id: string }>;
}

/* ─────────────── publish (IIT-PULSE staff) ─────────────── */

export type PublishStatus = "new" | "update" | "current" | "blocked";
export interface BlockedBy {
  testId: string;
  name: string;
  state: "live" | "scheduled" | "results_pending";
  at: string | null;
}
export interface PublishCheckItem {
  questionId: string;
  chapter: string | null;
  status: PublishStatus;
  libraryId: string | null;
  version: number | null;
  blockedBy: BlockedBy[];
}
export interface PublishCheck {
  items: PublishCheckItem[];
  institutes?: Array<{ id: string; displayName: string }>;
}
export interface PublishResult {
  published: Array<{ questionId: string; libraryId: string; version: number; created: boolean }>;
  blocked: PublishCheckItem[];
  unchanged: string[];
}

/* ─────────────── calls ─────────────── */

const WHERE = "Question bank · Library";

export const libraryApi = {
  status: async () => unwrap<LibraryStatus>((await m6Questions.get("/admin/library/status")).data),
  copyPlan: async (questionIds: string[]) => unwrap<CopyPlan>((await m6Questions.post("/admin/library/copy-plan", { questionIds }, source(WHERE))).data),
  copy: async (questionIds: string[], chapterMap: ChapterMapping[]) =>
    unwrap<CopyResult>((await m6Questions.post("/admin/library/copy", { questionIds, chapterMap }, source(WHERE))).data),
  publishCheck: async (questionIds: string[]) => unwrap<PublishCheck>((await m6Questions.post("/admin/library/publish-check", { questionIds }, source(WHERE))).data),
  publish: async (questionIds: string[]) => unwrap<PublishResult>((await m6Questions.post("/admin/library/publish", { questionIds }, source(WHERE))).data),
};

/** The library status; null while the backend has no M10 (route missing) or the call fails. */
export function useLibraryStatus() {
  return useQuery({
    queryKey: ["questions", "library", "status"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<LibraryStatus | null> => {
      try {
        return await libraryApi.status();
      } catch (e) {
        const a = apiError(e);
        if (a.status === 404 || a.status === 501 || a.status === 403) return null;
        throw e;
      }
    },
  });
}

/** Publish state of the rows on screen (IIT-PULSE staff who can publish): "Blocked" needs the embargo check. */
export function usePublishCheck(ids: string[], enabled: boolean) {
  const key = [...ids].sort();
  return useQuery({
    queryKey: ["questions", "library", "publish-check", key],
    enabled: enabled && key.length > 0,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const r = await libraryApi.publishCheck(key.slice(0, 200));
      return Object.fromEntries(r.items.map((i) => [i.questionId, i])) as Record<string, PublishCheckItem>;
    },
  });
}

/* ─────────────── copy shared by the page and its parts ─────────────── */

/** Board Library-Branding: branded "IIT-PULSE library", unbranded "Library". */
export const libraryLabel = (branding: boolean | undefined, label?: string | null) => label || (branding === false ? "Library" : "IIT-PULSE library");
export const solutionBy = (branding: boolean | undefined) => (branding === false ? "Library solution" : "Solution by IIT-PULSE faculty");

export const SUPPORT_MAIL = "support@iitpulse.in";

/** "30 Nov" (IST) from an ISO time or an IST date "YYYY-MM-DD" */
const day = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00+05:30`) : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
};
export const fmtDay = day;

/** "In JEE Main Mock 14 · scheduled 29 Nov" */
export function blockedWhy(b: BlockedBy): string {
  const d = day(b.at);
  if (b.state === "live") return `In ${b.name} · live now`;
  if (b.state === "scheduled") return `In ${b.name} · scheduled${d ? ` ${d}` : ""}`;
  return `In ${b.name} · closed, results ${d ? `publish ${d}` : "not out yet"}`;
}
/** "Can be published after Mock 14 results are out" / "after 12 Nov" */
export function blockedUntil(b: BlockedBy): string {
  if (b.state === "results_pending" && b.at) return `Can be published after ${day(b.at)}`;
  return `Can be published after ${b.name} results are out`;
}

/* ─────────────── licence-free copies (409 LIBRARY_LICENCE_REQUIRED) ─────────────── */

/**
 * Editor save / import refusal when a new question's text equals a library question or a licensed copy: the
 * toast's title and text (branding off says "library", never "IIT-PULSE"); null for any other error.
 */
export function licenceRequiredCopy(err: { code: string | null; message: string; details?: Record<string, unknown> | null }, branding?: boolean): { title: string; description: string } | null {
  if (err.code !== "LIBRARY_LICENCE_REQUIRED") return null;
  const id = typeof err.details?.questionId === "string" ? (err.details.questionId as string) : null;
  const lib = branding === false ? "library" : "IIT-PULSE library";
  return {
    title: `This question is already in the ${lib}`,
    description: id
      ? `It matches ${id}. Open it in the ${lib} and choose "Copy to my bank": that copy carries its licence and is yours to edit.`
      : `It matches ${branding === false ? "a library" : "an IIT-PULSE library"} question you already copied to your bank. Edit that copy instead, or copy it again from the ${lib}.`,
  };
}
