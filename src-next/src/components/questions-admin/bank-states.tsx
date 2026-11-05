"use client";

/*
  Question bank page states and the delete-blocked dialog (board Admin-Questions, canvas v166), built from the kit:
  empty bank, no match and search error (K13 StateBox), "Delete 2 of 3 questions?" / "Can't delete … yet"
  (ConfirmDialog / BlockedDialog). The Undo toast is the kit's notify.undo.
*/
import Link from "next/link";
import { BlockedDialog, ConfirmDialog, Doodle, StateBox } from "@/components/kit";
import type { QuestionInLiveTestDetails } from "@/lib/m6-contract";

export function EmptyBank({ newHref }: { newHref: string }) {
  return (
    <StateBox
      doodle={<Doodle />}
      title="No questions yet"
      body="Upload a Word file of questions: equations become maths and images are kept. Or write one yourself."
      action={
        <>
          <Link href="/questions/bulk-upload" className="btn btn-primary">
            Upload a Word file
          </Link>
          <Link href={newHref} className="btn btn-secondary">
            New question
          </Link>
        </>
      }
    />
  );
}

export function NoMatch({ query, detail, onClear, onAllChapters }: { query: string; detail: string; onClear: () => void; onAllChapters?: () => void }) {
  return (
    <StateBox
      title={query ? `No questions match "${query}"` : "No questions match"}
      body={detail || undefined}
      action={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClear}>
            Clear filters
          </button>
          {onAllChapters && (
            <button type="button" className="btn btn-ghost" onClick={onAllChapters}>
              Search all chapters
            </button>
          )}
        </>
      }
    />
  );
}

export function SearchError({ code, onRetry, onClear }: { code: string; onRetry: () => void; onClear?: () => void }) {
  return (
    <StateBox
      tone="error"
      title={onClear ? "Search isn't working right now" : "Couldn't load the question bank"}
      body={
        <>
          {onClear ? "Filters and the list still work; only text search is off. " : ""}Try again in a minute, or share this code with support: <span className="mono">{code}</span>
        </>
      }
      action={
        <>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
          {onClear && (
            <button type="button" className="btn btn-ghost" onClick={onClear}>
              Clear search
            </button>
          )}
        </>
      }
    />
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();

/** "Delete 2 of 3 questions?" when some of the picked questions are in a live test (they can't be deleted until it closes). */
export function DeleteBlockedDialog({
  open,
  total,
  blocked,
  onCancel,
  onDelete,
}: {
  open: boolean;
  total: number;
  blocked: Array<{ id: string; live: QuestionInLiveTestDetails["test"] }>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const rest = total - blocked.length;
  const first = blocked[0];
  const why = first ? (
    blocked.length === 1 ? (
      <>
        <span className="mono">{first.id}</span> can&apos;t be deleted now: it&apos;s in {first.live.name}, which is live. Try again after it closes at {time(first.live.closesAt)}.
      </>
    ) : (
      <>
        {blocked.length} of them can&apos;t be deleted now: they&apos;re in {first.live.name}, which is live. Try again after it closes at {time(first.live.closesAt)}.
      </>
    )
  ) : null;
  if (rest <= 0)
    return (
      <BlockedDialog
        open={open}
        onOpenChange={(o) => !o && onCancel()}
        title={blocked.length === 1 ? `Can't delete ${first?.id} yet` : `Can't delete these ${blocked.length} questions yet`}
        description={why}
      />
    );
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title={`Delete ${rest} of ${total} questions?`}
      description={why}
      confirmLabel={`Delete ${rest}`}
      onConfirm={onDelete}
    >
      <div className="row items-start gap-2.5 rounded-[10px] bg-ground px-3 py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#575C75" strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <span className="sm">
          The other {rest === 1 ? "one is" : `${rest} are`} not in a live test. Tests that used {rest === 1 ? "it" : "them"} keep their copy, so results don&apos;t change. You can undo for a few seconds.
        </span>
      </div>
    </ConfirmDialog>
  );
}
