"use client";

/* Admin-Questions bulk AI: the cost-preview dialog and the job's states in the bulk bar (running with Cancel,
   waiting for midnight, paused, finished → Review drafts, stopped). Contract: docs/m5-api.md "bulk jobs". */
import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { aiAdmin, apiError, BULK_COPY } from "@/lib/ai-admin";
import type { BulkJob, BulkPreview, BulkSkipReason, DraftKind, QuestionFilter } from "@/lib/m5-contract";
import { AlertIcon, BoardDialog, BoardTitle, ClockIcon, Note, Sparkle, TickIcon } from "./parts";

export type Selection = { questionIds: string[] } | { filter: QuestionFilter };

const fmt = (n: number) => n.toLocaleString("en-IN");

function skipLabel(r: BulkSkipReason, kind: DraftKind): string {
  switch (r) {
    case "UNSUPPORTED_TYPE":
      return "paragraph or matrix (not supported yet)";
    case "HAS_HINDI":
    case "HAS_SOLUTION":
    case "ALREADY_TAGGED":
      return BULK_COPY[kind].skip;
    case "DRAFT_GENERATING":
      return "already being drafted";
    default:
      return "no longer in the bank";
  }
}

/* ═════════════ the job ═════════════ */

const ACTIVE = new Set(["queued", "running", "waiting", "paused"]);

/** The bulk job shown in the bar: restored after a reload (GET ?active=1), polled every 2 s while it runs. */
export function useBulkJob() {
  const qc = useQueryClient();
  const [job, setJob] = React.useState<BulkJob | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let live = true;
    aiAdmin
      .jobs(true)
      .then(({ jobs }) => {
        if (live && jobs.length) setJob((j) => j ?? [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!job || !ACTIVE.has(job.status)) return;
    const wait = job.status === "running" || job.status === "queued" ? 2000 : 15000;
    timer.current = setTimeout(async () => {
      try {
        const { job: next } = await aiAdmin.job(job.id);
        setJob((j) => (j && j.id === next.id ? next : j));
        if (!ACTIVE.has(next.status)) qc.invalidateQueries({ queryKey: ["ai", "drafts"] });
      } catch {
        setJob((j) => (j ? { ...j } : j)); // retry on the next tick
      }
    }, wait);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [job, qc]);

  const cancel = async () => {
    if (!job) return;
    try {
      const { job: next } = await aiAdmin.cancel(job.id);
      setJob(next);
    } catch {
      setJob({ ...job, status: "cancelled" });
    }
    qc.invalidateQueries({ queryKey: ["ai", "drafts"] });
  };

  return { job, setJob, cancel, active: !!job && ACTIVE.has(job.status) };
}

/** The bar's content for a job (board states running / waiting / paused / finished / cancelled). */
export function BulkJobStatus({ job, onCancel, onClear }: { job: BulkJob; onCancel: () => void; onClear: () => void }) {
  const c = BULK_COPY[job.kind];
  const { done, ready, failed } = job.progress;
  const pct = job.total ? Math.round((done / job.total) * 100) : 0;
  const review = `/questions/drafts?jobId=${encodeURIComponent(job.id)}`;
  const ghost = "btn btn-ghost h-[34px] text-[13px] text-[#D6D8FA] hover:bg-white/10 hover:text-white";
  const white = "btn btn-primary h-[34px] text-[13px]";
  const whiteStyle = { background: "#fff", color: "#00007E", borderColor: "#fff" };
  const drafts = (n: number) => (n === 1 ? "1 draft" : `${fmt(n)} drafts`);
  if (job.status === "queued" || job.status === "running")
    return (
      <div className="row fade min-w-0 gap-2.5 md:min-w-[460px]">
        <svg className="spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" aria-hidden>
          <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
        </svg>
        <span className="sm whitespace-nowrap">
          {c.running} · {fmt(done)} of {fmt(job.total)}
          {failed > 0 && ` · ${fmt(failed)} failed`}
        </span>
        <div className="bar h-1.5 min-w-20 grow bg-white/15">
          <i style={{ width: `${pct}%`, background: "#fff", animation: "none", transition: "width 300ms" }} />
        </div>
        <button type="button" className={ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  if (job.status === "waiting")
    return (
      <div className="row fade gap-2.5">
        <ClockIcon color="#FFD58A" />
        <span className="sm">
          {fmt(done)} of {fmt(job.total)} done. Today&apos;s limit is reached; the other {fmt(job.total - done)} start after midnight.
        </span>
        <Link href={review} className={ghost}>
          Review {drafts(ready)}
        </Link>
        <button type="button" className={ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  if (job.status === "paused")
    return (
      <div className="row fade gap-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD58A" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="shrink-0">
          <path d="M9 6v12M15 6v12" />
        </svg>
        <span className="sm">
          Paused at {fmt(done)} of {fmt(job.total)}. AI is switched off for now; this carries on by itself.
        </span>
        <Link href={review} className={ghost}>
          Review {drafts(ready)}
        </Link>
        <button type="button" className={ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  if (job.status === "done")
    return (
      <div className="row pop gap-2.5">
        <TickIcon color="#7BE0A6" />
        <span className="sm">
          {drafts(ready)} ready for review
          {failed > 0 && ` · ${fmt(failed)} failed`}
        </span>
        <Link href={review} className={white} style={whiteStyle}>
          Review drafts
        </Link>
        <button type="button" className={ghost} onClick={onClear}>
          Done
        </button>
      </div>
    );
  // cancelled (and failed: the job stopped early)
  return (
    <div className="row pop gap-2.5">
      <span className="sm">
        Stopped at {fmt(done)} of {fmt(job.total)} · {drafts(ready)} ready
      </span>
      <Link href={review} className={white} style={whiteStyle}>
        Review drafts
      </Link>
      <button type="button" className={ghost} onClick={onClear}>
        Done
      </button>
    </div>
  );
}

/* ═════════════ the cost preview ═════════════ */

export function BulkPreviewDialog({
  kind,
  total,
  selection,
  onClose,
  onStarted,
}: {
  kind: DraftKind | null;
  total: number;
  selection: Selection;
  onClose: () => void;
  onStarted: (job: BulkJob) => void;
}) {
  const [redo, setRedo] = React.useState(false);
  const [preview, setPreview] = React.useState<BulkPreview | null>(null);
  const [nothing, setNothing] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [starting, setStarting] = React.useState(false);

  React.useEffect(() => {
    setRedo(false);
  }, [kind]);

  // Keyed by value: callers may pass a new selection object on every render
  const selKey = JSON.stringify(selection);
  React.useEffect(() => {
    if (!kind) return;
    const selection = JSON.parse(selKey) as Selection;
    let live = true;
    setLoading(true);
    setNothing(false);
    setProblem(null);
    aiAdmin
      .preview({ kind, selection, includeExisting: redo })
      .then((p) => {
        if (live) setPreview(p);
      })
      .catch((e) => {
        if (!live) return;
        const err = apiError(e);
        setPreview(null);
        if (err.code === "NOTHING_TO_DO") setNothing(true);
        else if (err.code === "SELECTION_TOO_LARGE") setProblem(`That's more than ${fmt(Number(err.details?.max ?? 500))} questions for one run. Pick fewer questions, or narrow the filters.`);
        else setProblem(err.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [kind, selKey, redo]);

  if (!kind) return null;
  const c = BULK_COPY[kind];
  const count = preview?.count ?? 0;
  const skips = preview ? (Object.entries(preview.skipped) as [BulkSkipReason, number][]).filter(([, n]) => n > 0) : [];
  const merged = new Map<string, number>();
  for (const [r, n] of skips) merged.set(skipLabel(r, kind), (merged.get(skipLabel(r, kind)) ?? 0) + n);
  // A filter selection is narrowed to the questions that need the work before skips are counted (contract, Changes):
  // the rest of the matching questions are the ones that already have it.
  if (preview && "filter" in selection && !redo) {
    const rest = total - count - skips.reduce((a, [, n]) => a + n, 0);
    if (rest > 0) merged.set(c.skip, (merged.get(c.skip) ?? 0) + rest);
  }
  const left = preview ? Math.max(0, preview.quota.perDay - preview.quota.usedToday) : 0;
  const fits = preview?.quota.fitsToday ?? 0;
  const minutes = preview?.estimate.minutes ?? 0;
  const minToday = preview && count ? Math.max(1, Math.ceil((minutes * fits) / count)) : 0;
  const blocked = preview && !preview.canStart ? preview.blockedBy : null;
  const rupees = preview ? (preview.estimate.costPaise > 0 ? Math.max(1, Math.round(preview.estimate.costPaise / 100)) : 0) : 0;

  const start = async () => {
    if (!preview) return;
    setStarting(true);
    try {
      const { job } = await aiAdmin.start(preview.previewId);
      onStarted(job);
    } catch (e) {
      const err = apiError(e);
      if (err.code === "PREVIEW_EXPIRED" || err.code === "PREVIEW_NOT_FOUND") {
        setRedo((r) => r); // re-run the preview with the same options
        setPreview(null);
        setProblem("This estimate is older than 15 minutes. Check the new one and start again.");
        aiAdmin.preview({ kind, selection, includeExisting: redo }).then(setPreview).catch(() => {});
      } else if (err.code === "AI_BUDGET_LOW") {
        setPreview({ ...preview, canStart: false, blockedBy: "AI_BUDGET_LOW" });
      } else setProblem(err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <BoardDialog open onClose={onClose}>
      <div className="col gap-1.5">
        <span className="ai-mark">
          <Sparkle size={12} />
          {c.label}
        </span>
        <BoardTitle>
          {c.label} for {fmt(total)} questions?
        </BoardTitle>
      </div>
      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3.5 gap-y-3 border-y border-line-2 py-3.5">
        <span className="sm muted">Will run</span>
        <span className="sm">{loading ? <span className="skel inline-block h-4 w-24" /> : <><b className="num">{fmt(count)}</b> questions</>}</span>
        <span className="sm muted">Skipped</span>
        <span className="col gap-0.5">
          {loading ? (
            <span className="skel inline-block h-4 w-40" />
          ) : merged.size ? (
            [...merged].map(([label, n]) => (
              <span key={label} className="sm">
                <b className="num">{fmt(n)}</b> {label}
              </span>
            ))
          ) : (
            <span className="sm">{nothing ? `All ${fmt(total)}` : "None"}</span>
          )}
        </span>
        <span className="sm muted">Cost</span>
        <span className="col gap-0.5">
          {loading || !preview ? (
            <span className="sm">{loading ? <span className="skel inline-block h-4 w-36" /> : "—"}</span>
          ) : (
            <>
              <span className="sm">
                <b className="num">{fmt(preview.estimate.credits)}</b> credits · about <b className="num">₹{fmt(rupees)}</b>
              </span>
              <span className="xs muted">
                {preview.estimate.creditsPerQuestion} credits a question · {preview.estimate.basis === "measured" ? "estimate from the last 30 days" : "first estimate, from test runs"}
              </span>
            </>
          )}
        </span>
        <span className="sm muted">Today&apos;s limit</span>
        <span className="col gap-0.5">
          {preview ? (
            <span className="sm">
              <b className="num">{fmt(left)}</b> of {fmt(preview.quota.perDay)} {c.noun} left today
            </span>
          ) : (
            <span className="sm">{loading ? <span className="skel inline-block h-4 w-36" /> : "—"}</span>
          )}
          <span className="xs muted">Resets at midnight</span>
        </span>
      </div>
      <label className="row cursor-pointer gap-2.5">
        <input type="checkbox" className="check" checked={redo} onChange={() => setRedo((r) => !r)} />
        <span className="sm">Also redo questions that {c.redoLabel}</span>
      </label>
      {preview && count > 0 && fits < count && (
        <Note>
          <ClockIcon color="#575C75" />
          <span className="sm">
            <b>{fmt(fits)}</b> run today (about {minToday} min). The other <b>{fmt(count - fits)}</b> start after midnight and finish by themselves.
          </span>
        </Note>
      )}
      {preview && count > 0 && fits >= count && (
        <Note>
          <ClockIcon color="#575C75" />
          <span className="sm">
            All {fmt(count)} run now, about {Math.max(1, minutes)} min.
          </span>
        </Note>
      )}
      {nothing && (
        <Note tone="warn">
          <AlertIcon color="#9A5800" />
          <span className="sm">
            Nothing to run: all {fmt(total)} {c.redoLabel}. Tick &quot;Also redo&quot; to run them again.
          </span>
        </Note>
      )}
      {blocked === "AI_BUDGET_LOW" && (
        <Note tone="warn">
          <AlertIcon color="#9A5800" />
          <span className="sm">Can&apos;t start this one. It would use AI money kept aside for students this month. Pick fewer questions or try next month.</span>
        </Note>
      )}
      {blocked === "AI_PAUSED" && (
        <Note tone="warn">
          <AlertIcon color="#9A5800" />
          <span className="sm">Can&apos;t start this one. AI is switched off for now; try again later.</span>
        </Note>
      )}
      {blocked === "JOB_RUNNING" && (
        <Note tone="warn">
          <AlertIcon color="#9A5800" />
          <span className="sm">Can&apos;t start this one. A {c.label.toLowerCase()} run is already going; wait for it to finish.</span>
        </Note>
      )}
      {problem && (
        <Note tone="warn" role="alert">
          <AlertIcon color="#9A5800" />
          <span className="sm">{problem}</span>
        </Note>
      )}
      <span className="xs muted">Drafts don&apos;t change any question until a teacher accepts them.</span>
      <div className="row justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={!preview || !count || !!blocked || loading || starting} onClick={start}>
          {starting ? "Starting…" : `Start ${fmt(count)}`}
        </button>
      </div>
    </BoardDialog>
  );
}
