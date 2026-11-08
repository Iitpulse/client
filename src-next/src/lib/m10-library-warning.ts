/*
  M10 "Already in the library" warning (board Admin-LibraryPublish, state added-to-test-warning; contract api-ai
  docs/m6-api.md "Paper, picker, fill by rule"). On IIT-PULSE's own papers a paper write that adds questions IIT-PULSE
  already published to the shared library answers
    409 QUESTIONS_IN_LIBRARY { details: { questions: [{ questionId, libraryId, publishedAt }], test: { testId, name, opensAt } } }
  `withLibraryWarning` wraps such a write: it asks once (the dialog in components/questions-admin/library-warning.tsx,
  mounted in the dashboard layout) and then
    - "Add all M anyway"  → the same body again with `acknowledgeLibrary: true` (the paper change's audit lists them)
    - "Swap these N…"     → the same write without the flagged ids (the user picks others); the answer carries
                            `librarySkipped` so the caller's toast can say so
    - Cancel              → throws LIBRARY_WARNING_CANCELLED (callers stay quiet: nothing was changed)
  Every caller of lib/m6/paper.ts putSubsection gets it (picker add / replace / bulk add, fill by rule).
*/
import { useSyncExternalStore } from "react";
import { AdminApiError, apiError } from "./ai-admin";

export interface LibraryWarningQuestion {
  questionId: string;
  libraryId: string;
  publishedAt: string | null;
}
export interface LibraryWarningDetails {
  questions: LibraryWarningQuestion[];
  test: { testId: string; name: string; opensAt: string | null } | null;
}
export interface LibraryWarningRequest extends LibraryWarningDetails {
  /** how many questions this write adds (M in "Add all M anyway"); null when the caller doesn't know */
  picked: number | null;
}
export type LibraryWarningChoice = "add" | "swap" | "cancel";

export const LIBRARY_WARNING_CANCELLED = "LIBRARY_WARNING_CANCELLED";
/** True for the error a cancelled warning throws (nothing was written: show nothing). */
export const isLibraryWarningCancel = (e: unknown) => apiError(e).code === LIBRARY_WARNING_CANCELLED;

/* ─────────────── the one open warning (a promise-based confirm) ─────────────── */

type Pending = { req: LibraryWarningRequest; resolve: (c: LibraryWarningChoice) => void };
let pending: Pending | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
/** Is a dialog mounted to answer? (Without one the write is cancelled rather than adding silently.) */
let hosts = 0;

export function askLibraryWarning(req: LibraryWarningRequest): Promise<LibraryWarningChoice> {
  if (!hosts) return Promise.resolve("cancel");
  pending?.resolve("cancel");
  return new Promise((resolve) => {
    pending = { req, resolve };
    emit();
  });
}

export function answerLibraryWarning(choice: LibraryWarningChoice) {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(choice);
}

function subscribeHost(l: () => void) {
  subs.add(l);
  hosts++;
  return () => {
    subs.delete(l);
    hosts--;
  };
}
const snapshot = () => pending?.req ?? null;
const serverSnapshot = () => null;

/** The dialog's view of the store; registers the dialog as the host while mounted. */
export function useLibraryWarning(): LibraryWarningRequest | null {
  return useSyncExternalStore(subscribeHost, snapshot, serverSnapshot);
}

/* ─────────────── the wrapper ─────────────── */

function detailsOf(e: unknown): LibraryWarningDetails | null {
  const err = apiError(e);
  if (err.status !== 409 || err.code !== "QUESTIONS_IN_LIBRARY") return null;
  const d = (err.details ?? {}) as Partial<LibraryWarningDetails>;
  const questions = Array.isArray(d.questions) ? d.questions.filter((q) => q && typeof q.questionId === "string") : [];
  return questions.length ? { questions, test: d.test ?? null } : null;
}

/**
 * Runs `attempt(ids, false)`; on 409 QUESTIONS_IN_LIBRARY asks the user and retries as they chose (see header).
 * `added` = the ids this write adds (the dialog's "M"); unknown when omitted.
 */
export async function withLibraryWarning<T extends object>(
  ids: string[],
  added: string[] | undefined,
  attempt: (ids: string[], acknowledge: boolean) => Promise<T>
): Promise<T & { librarySkipped?: string[] }> {
  try {
    return await attempt(ids, false);
  } catch (e) {
    const d = detailsOf(e);
    if (!d) throw e;
    const flagged = new Set(d.questions.map((q) => q.questionId));
    const choice = await askLibraryWarning({ ...d, picked: added ? added.length : null });
    if (choice === "add") return attempt(ids, true);
    if (choice === "swap") {
      const rest = ids.filter((id) => !flagged.has(id));
      const restAdded = added?.filter((id) => !flagged.has(id));
      // nothing new left to add: nothing to write (the dialog tells them to pick others)
      if (restAdded ? restAdded.length === 0 : rest.length === ids.length) throw new AdminApiError(0, LIBRARY_WARNING_CANCELLED, "Nothing was added");
      const r = await withLibraryWarning(rest, restAdded, attempt);
      return { ...r, librarySkipped: [...new Set([...(r.librarySkipped ?? []), ...flagged])] };
    }
    throw new AdminApiError(0, LIBRARY_WARNING_CANCELLED, "Nothing was added");
  }
}

/** "Left out 2 questions already in the library. Pick others in their place." (the caller's toast after a swap) */
export function swappedNote(n: number): string {
  return `Left out ${n === 1 ? "1 question" : `${n} questions`} already in the library. Pick ${n === 1 ? "another" : "others"} in ${n === 1 ? "its" : "their"} place.`;
}
