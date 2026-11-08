"use client";

/*
  Admin-Results board (states published, key-corrected, not-published, publish-confirm, summary-writing / too-few /
  ai-paused / failed, flag-detail, copied, no-submissions, loading, error, no-permission).
  Data (lib/m6/results-admin.ts): GET /tests/admin/tests/:id/results (every row; sorted, filtered and paged here because
  the route sorts by rank/name/score only), results.csv for Export, the test's settings + tests-list row (result mode,
  published / due, live), result-publish-preview + PATCH /tests/test/publish-result for "Publish now" (manual result
  mode only: the backend has no early publish for "After N days" / "At close"), the Monitor student detail for the flag
  drawer. M5: result-insights (appeared / assigned, average vs the previous mock, subject averages, integrity),
  ai batch summary and key check.
  Not built (owner decision pending): "Send to parents", the summary's "Add to schedule" / "Assign practice".
*/

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CircleCheck, Lock, SearchX } from "lucide-react";
import { AiMark, MathText } from "@iitpulse/ui";

import { Topbar } from "@/components/admin/Topbar";
import {
  Banner,
  ConfirmDialog,
  Drawer,
  FilterChip,
  NotFoundState,
  Pagination,
  SearchBox,
  StateBox,
  ToggleChip,
  initials,
  inr,
  notify,
  useFillHeight,
  useUrlState,
} from "@/components/kit";
import { duration, fmt, quantile } from "@/lib/results";
import { deltaTone, m5ErrorCode, useBatchSummary, useKeyCheck, useResultInsights, vsPrevious } from "@/lib/queries-tests-admin";
import type { BatchSummaryResponse } from "@/lib/m5-contract";
import type { KeyCorrection, MonitorStudentDetail, ResultPublishPreview, StudentReportResponse } from "@/lib/m6-contract";
import { apiError, m6Tests, unwrap } from "@/lib/m6/client";
import { istDate, istDateTime, istTime } from "@/lib/m6/shared";
import { useCan } from "@/lib/m6/people";
import {
  downloadResultsCsv,
  fetchResultPublishPreview,
  keyText,
  publishResultsNow,
  useAdminResults,
  useOptionLetters,
  useResultsTestInfo,
  type ResultRow,
} from "@/lib/m6/results-admin";
import "../results.css";
import "./results-board.css";

const PAGE = 25;
const enc = encodeURIComponent;

/* ─────────────────────────────── pieces ─────────────────────────────── */

function Stat({ label, value, sub, tone, i, testId }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" | "flat"; i: number; testId?: string }) {
  const cls = tone === "good" ? "font-semibold text-success" : tone === "bad" ? "font-semibold text-warning" : "muted";
  return (
    <article className="card pad col rise gap-1" style={{ ["--i" as string]: i }} data-testid={testId}>
      <span className="sm muted">{label}</span>
      <span className="num text-[28px] font-[650] tracking-[-.01em]">{value}</span>
      {sub && <span className={`xs truncate ${cls}`}>{sub}</span>}
    </article>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1 ? "g" : rank === 2 ? "s" : rank === 3 ? "b" : "";
  return <span className={`rs-rk ${cls}`}>{rank}</span>;
}

const hasFlag = (r: ResultRow) => (r.fullscreenExits ?? 0) > 0 || !!r.autoSubmitted;

/** Flags column: "3 exits · auto-submitted", "2 fullscreen exits", "Auto-submitted · time ran out". */
function flagOf(r: ResultRow): { text: string; amber: boolean } | null {
  const n = r.fullscreenExits ?? 0;
  if (r.autoSubmitted) {
    if (n > 0) return { text: `${n} ${n === 1 ? "exit" : "exits"} · auto-submitted`, amber: true };
    return { text: r.autoSubmitted.reason === "timeUp" ? "Auto-submitted · time ran out" : "Auto-submitted · exit limit", amber: r.autoSubmitted.reason === "exitLimit" };
  }
  if (n > 0) return { text: `${n} fullscreen ${n === 1 ? "exit" : "exits"}`, amber: r.flagged };
  return null;
}

/** First of next month in IST ("1 Dec"). */
function nextMonthStart(now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  const y = p[0]!;
  const m = p[1]!; // 1–12
  return istDate(new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 6)).toISOString());
}

/** "Batch summary for teachers" (AI), with the board's writing / too-few / AI paused / failed states. */
function BatchSummaryCard({
  data,
  error,
  loading,
  appeared,
  onRetry,
  rewrittenAfterFix,
}: {
  data?: BatchSummaryResponse;
  error: unknown;
  loading: boolean;
  appeared: number;
  onRetry: () => void;
  rewrittenAfterFix: boolean;
}) {
  const s = data?.status === "ready" ? data.summary : null;
  const code = data?.status === "not_applicable" ? data.reason : error ? m5ErrorCode(error) : null;
  const copy = async () => {
    if (!s) return;
    try {
      await navigator.clipboard.writeText(s.text);
      notify.success("Copied for WhatsApp");
    } catch {
      notify.error("Couldn't copy", { description: "Select the text and copy it instead." });
    }
  };
  let body: React.ReactNode;
  let state: string;
  if (s) {
    state = "ready";
    body = (
      <>
        <MathText as="p" className="body m-0" text={s.text} />
        {s.suggestions.length > 0 && (
          <div className="col gap-2">
            {s.suggestions.map((g, i) => (
              <div key={i} className="row gap-2.5 rounded-control border border-brand-100 bg-surface px-3 py-2.5">
                <MathText as="span" className="sm grow" text={g.text} />
              </div>
            ))}
          </div>
        )}
        <span className="xs muted">
          {rewrittenAfterFix ? "Rewritten after the key fix · based on" : "Based on"} {inr(s.basedOn.submissions)} submission{s.basedOn.submissions === 1 ? "" : "s"}
          {s.basedOn.previous ? `, compared with ${s.basedOn.previous.name}` : ""}
        </span>
      </>
    );
  } else if (code === "TOO_FEW_SUBMISSIONS") {
    state = "too-few";
    body = (
      <div className="col gap-1">
        <span className="sm font-semibold">Not enough submissions for a summary yet</span>
        <span className="sm muted">
          It needs at least 5; there {appeared === 1 ? "is" : "are"} {appeared} so far. It&apos;s written by itself once 5 students have submitted.
        </span>
      </div>
    );
  } else if (code === "AI_PAUSED") {
    state = "ai-paused";
    body = (
      <div className="col gap-1">
        <span className="sm font-semibold">AI is paused this month</span>
        <span className="sm muted">So there&apos;s no batch summary. Every number on this page is complete without it. Summaries start again on {nextMonthStart()}, or when your institute tops up AI credits.</span>
      </div>
    );
  } else if (error || (data?.status === "not_applicable" && code !== "NO_SUBMISSIONS")) {
    state = "failed";
    body = (
      <div className="row wrap gap-3">
        <span className="col grow gap-1">
          <span className="sm font-semibold">Couldn&apos;t write the summary</span>
          <span className="sm muted">The AI service didn&apos;t answer. No credits were used.</span>
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  } else {
    state = loading ? "loading" : "writing";
    body = (
      <div className="col gap-2" role="status" aria-busy="true">
        <span className="sm">Writing the summary from {plural(appeared, "submission")}. Usually under a minute; you can leave this page.</span>
        <span className="skel h-4 w-full" />
        <span className="skel h-4 w-[92%]" />
        <span className="skel h-4 w-[64%]" />
      </div>
    );
  }
  return (
    <article className="ai pad-lg col rise gap-3 lg:col-span-2" style={{ ["--i" as string]: 5 }} data-testid="results-summary" data-status={state}>
      <div className="row between">
        <AiMark iconSize={13}>Batch summary for teachers</AiMark>
        {s && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            Copy for WhatsApp
          </button>
        )}
      </div>
      {body}
    </article>
  );
}
const plural = (n: number, one: string) => `${inr(n)} ${n === 1 ? one : `${one}s`}`;

/* ── flag detail drawer (Monitor student detail, readable after close) ── */

function TimelineLine({ ev, nth }: { ev: MonitorStudentDetail["timeline"][number]; nth: number }) {
  const d = ev.data as Record<string, unknown>;
  let text: string;
  let cls = "";
  switch (ev.kind) {
    case "linkOpened":
      text = "Opened the sign-in link";
      break;
    case "started":
      text = "Started";
      break;
    case "fullscreenExit": {
      const s = typeof d.durationSeconds === "number" ? d.durationSeconds : null;
      if (d.action === "submitted") {
        text = `Left a ${ordinal(nth)} time · test submitted with the saved answers`;
        cls = "r";
      } else {
        const dur = s == null ? "" : s < 60 ? ` for ${s} s` : ` for ${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
        text = `Left fullscreen${dur} · warned`;
        cls = "w";
      }
      break;
    }
    case "answerSaved":
      text = `Last answer saved${d.question ? ` (${d.question})` : ""}`;
      break;
    case "noContact":
      text = "No contact since";
      break;
    case "extraTime":
      text = `${d.minutes} more minutes${d.by ? ` from ${d.by}` : ""}${d.reason ? ` · ${d.reason}` : ""}`;
      cls = "x";
      break;
    case "submitted":
      text = "Submitted";
      cls = "s";
      break;
    case "autoSubmitted":
      text = d.reason === "exitLimit" ? "Auto-submitted at the fullscreen exit limit" : "Auto-submitted · time ran out";
      cls = d.reason === "exitLimit" ? "r" : "s";
      break;
    default:
      text = String(ev.kind);
  }
  return (
    <span className={`ev ${cls}`}>
      {istTime(ev.at)} · {text}
    </span>
  );
}
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

function FlagDrawer({
  testId,
  row,
  onClose,
  policy,
}: {
  testId: string;
  row: ResultRow | null;
  onClose: () => void;
  policy: { enabled: boolean; maxExits: number; action: "warn" | "submit" } | null;
}) {
  const sid = row?.student.id ?? null;
  const detail = useQuery({
    queryKey: ["m6", "monitor-student", testId, sid, "after"],
    enabled: !!sid,
    retry: 1,
    queryFn: async () => unwrap<MonitorStudentDetail>((await m6Tests.get(`/admin/tests/${enc(testId)}/monitor/students/${enc(sid!)}`)).data),
  });
  const report = useQuery({
    queryKey: ["m6", "student-report", testId, sid],
    enabled: !!sid,
    retry: 0,
    queryFn: async () => unwrap<StudentReportResponse>((await m6Tests.get(`/admin/tests/${enc(testId)}/students/${enc(sid!)}/report`)).data),
  });
  const d = detail.data;
  const sub = report.data?.submission ?? null;
  const exits = row?.fullscreenExits ?? 0;
  const autoAt = d?.timeline.find((e) => e.kind === "autoSubmitted")?.at ?? (row?.autoSubmitted ? row.submittedAt : null);
  let exitNo = 0;
  return (
    <Drawer
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title={row?.student.name ?? ""}
      aria-label={row ? `${row.student.name}, integrity` : undefined}
      leading={row ? <span className="avatar">{initials(row.student.name)}</span> : undefined}
      subtitle={row ? [row.student.batch?.name, `rank ${row.rank}`, `${fmt(row.score)} / ${fmt(row.maxScore)}`].filter(Boolean).join(" · ") : undefined}
      footer={
        row ? (
          <Link href={`/tests/${testId}/student/${row.student.id}`} className="btn btn-secondary">
            Open full report
          </Link>
        ) : undefined
      }
    >
      {row && (
        <div className="col gap-4" data-testid="results-flag-drawer">
          <div className="row wrap gap-1.5">
            {exits > 0 && <span className={`badge ${row.flagged ? "b-amber" : "b-grey"}`}>{exits} fullscreen {exits === 1 ? "exit" : "exits"}</span>}
            {row.autoSubmitted && (
              <span className={`badge ${row.autoSubmitted.reason === "exitLimit" ? "b-amber" : "b-grey"}`}>
                Auto-submitted {autoAt ? istTime(autoAt) : ""}
              </span>
            )}
          </div>
          <div className="col gap-1.5">
            <span className="sm font-semibold">What happened</span>
            {detail.isLoading ? (
              <span className="col gap-2" aria-hidden>
                <span className="skel block h-2.5 w-56" />
                <span className="skel block h-2.5 w-48" />
                <span className="skel block h-2.5 w-52" />
              </span>
            ) : detail.isError ? (
              <span className="sm text-danger">Couldn&apos;t load what happened. {apiError(detail.error).message}</span>
            ) : d && d.timeline.length ? (
              <div className="rb-tl">
                {d.timeline
                  .filter((ev) => ev.kind !== "answerSaved" && ev.kind !== "noContact")
                  .map((ev, i) => {
                    if (ev.kind === "fullscreenExit") exitNo++;
                    return <TimelineLine key={i} ev={ev} nth={exitNo} />;
                  })}
              </div>
            ) : (
              <span className="sm muted">No events were recorded for this attempt.</span>
            )}
          </div>
          <div className="rb-facts">
            <span className="muted">Answered</span>
            <span className="num">
              {d ? `${d.row.answered}${report.data ? ` of ${report.data.test.questions}` : ""}` : "—"} in {duration(row.timeUsedSeconds)}
            </span>
            {sub?.vsPrevious && (
              <>
                <span className="muted">vs {sub.vsPrevious.test.shortName || sub.vsPrevious.test.name}</span>
                <span className="num">
                  {sub.vsPrevious.scoreDelta > 0 ? "+" : sub.vsPrevious.scoreDelta < 0 ? "−" : ""}
                  {fmt(Math.abs(sub.vsPrevious.scoreDelta))} {sub.vsPrevious.unit === "marks" ? "marks" : "points"}
                  {sub.vsPrevious.rankBefore != null && sub.rank != null ? ` · rank ${sub.vsPrevious.rankBefore} → ${sub.rank}` : ""}
                </span>
              </>
            )}
            <span className="muted">Limit</span>
            <span>
              {!policy || !policy.enabled
                ? "Fullscreen exits aren't limited for this test"
                : `${policy.maxExits} ${policy.maxExits === 1 ? "exit" : "exits"}, then the test ${policy.action === "submit" ? "submits" : "warns again"} (set in the test)`}
            </span>
          </div>
          <span className="xs muted">Flags don&apos;t change scores or ranks. Talk to the student before deciding anything; the score stands unless you change it.</span>
        </div>
      )}
    </Drawer>
  );
}

/* ─────────────────────────────── page ─────────────────────────────── */

type SortKey = string; // "rank" | "score" | "time" | "s<i>"
const DEFAULTS = { q: "", batch: "", flagged: "", sort: "rank", dir: "", page: "1" };

function Th({ k, label, num, sortKey, dir, onSort }: { k: SortKey; label: string; num?: boolean; sortKey: SortKey; dir: "asc" | "desc"; onSort: (k: SortKey) => void }) {
  const on = sortKey === k;
  const Arrow = (dir === "asc") === (k === "rank") ? ArrowDown : ArrowUp;
  return (
    <th className={`${num ? "num" : ""} ${on ? "rb-sorted" : ""}`} aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="rb-sort" onClick={() => onSort(k)}>
        {label}
        {on && <Arrow className="size-3.5" aria-hidden />}
      </button>
    </th>
  );
}

export default function TestResultPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const testId = params.testId as string;
  const { roleName } = useCan();

  const res = useAdminResults(testId);
  const info = useResultsTestInfo(testId);
  const insightsQ = useResultInsights(testId);
  const insights = insightsQ.data;
  const items = React.useMemo(() => res.data?.items ?? [], [res.data]);
  const summaryQ = useBatchSummary(testId, items.length > 0);
  const keyCheckQ = useKeyCheck(testId, items.length > 0);

  const [s, set] = useUrlState(DEFAULTS);
  const sortKey: SortKey = s.sort || "rank";
  const dir: "asc" | "desc" = s.dir === "asc" || s.dir === "desc" ? s.dir : sortKey === "rank" ? "asc" : "desc";
  const page = Math.max(1, Number(s.page) || 1);

  const [flagRow, setFlagRow] = React.useState<ResultRow | null>(null);
  const [publishPreview, setPublishPreview] = React.useState<ResultPublishPreview | null>(null);
  const [asking, setAsking] = React.useState(false);

  const settings = info.data?.settings ?? null;
  const listRow = info.data?.row ?? null;
  const testName = settings?.name ?? insights?.test.name ?? listRow?.name ?? "Results";
  const sectionNames = React.useMemo(() => items[0]?.sections.map((x) => x.name) ?? [], [items]);

  // latest finished key correction ("Key corrected for Q38 on 4 Nov, by …")
  const corrections = res.data?.keyCorrections;
  const lastFix: KeyCorrection | null = React.useMemo(
    () => [...(corrections ?? [])].filter((c) => c.status === "done").sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0] ?? null,
    [corrections]
  );
  const fixLetters = useOptionLetters(testId, lastFix && !lastFix.newKey.range ? lastFix.questionId : null);

  const batchOptions = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of items) if (r.student.batch) m.set(r.student.batch.id, r.student.batch.name);
    return [...m].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);
  const flaggedCount = React.useMemo(() => items.filter(hasFlag).length, [items]);

  const filtered = React.useMemo(() => {
    const needle = s.q.trim().toLowerCase();
    const val = (r: ResultRow): number => {
      if (sortKey === "rank") return r.rank;
      if (sortKey === "score") return r.score;
      if (sortKey === "time") return r.timeUsedSeconds;
      const i = Number(sortKey.slice(1));
      return r.sections[i]?.score ?? -Infinity;
    };
    return items
      .filter((r) => (!needle || r.student.name.toLowerCase().includes(needle) || r.student.id.toLowerCase() === needle) && (!s.batch || r.student.batch?.id === s.batch) && (!s.flagged || hasFlag(r)))
      .sort((a, b) => (val(a) - val(b)) * (dir === "asc" ? 1 : -1) || a.rank - b.rank || a.student.name.localeCompare(b.student.name));
  }, [items, s.q, s.batch, s.flagged, sortKey, dir]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pg = Math.min(page, pageCount);
  const pageRows = filtered.slice((pg - 1) * PAGE, pg * PAGE);

  const [fillRef, fillH] = useFillHeight<HTMLElement>(items.length > 0, 320, 0, "panel");

  const scores = React.useMemo(() => items.map((r) => r.score).sort((a, b) => a - b), [items]);
  const top = React.useMemo(() => [...items].sort((a, b) => a.rank - b.rank)[0], [items]);
  const maxScore = insights?.test.maxScore ?? items[0]?.maxScore ?? 1;
  const integrity = insights?.integrity;
  const threshold = integrity?.threshold ?? settings?.fullscreenPolicy.maxExits ?? 3;

  // publish state
  const state = listRow?.state ?? settings?.state ?? null;
  const mode = listRow?.resultMode ?? settings?.resultMode ?? null;
  const published = !!(listRow?.resultPublishedAt || insights?.test.resultPublished);
  const pending = !published && !!mode && mode !== "immediately" && items.length > 0;
  const canPublishNow = pending && mode === "manual";
  const dueAt = listRow?.resultDueAt ?? (mode === "atTheEndOfTest" ? settings?.closesAt ?? null : null);

  const badge =
    state === "live" ? (
      <span className="badge b-live">Live · closes {istTime(listRow?.closesAt ?? settings?.closesAt)}</span>
    ) : published ? (
      <span className="badge b-green">Published{listRow?.resultPublishedAt ? ` ${istDate(listRow.resultPublishedAt)}` : ""}</span>
    ) : pending ? (
      <span className="badge b-amber">Not published</span>
    ) : null;

  const askPublish = async () => {
    setAsking(true);
    try {
      setPublishPreview(await fetchResultPublishPreview(testId));
    } catch (e) {
      const a = apiError(e);
      notify.error(a.code === "FORBIDDEN" ? "Your role can't publish results" : "Couldn't open publishing", { description: a.message });
    } finally {
      setAsking(false);
    }
  };

  const exportCsv = async () => {
    try {
      await downloadResultsCsv(testId, testName, { batchId: s.batch || undefined, flagged: !!s.flagged });
      notify.success("Exported results.csv");
    } catch (e) {
      const a = apiError(e);
      notify.error(a.code === "FORBIDDEN" ? "Your role can't export results" : "Couldn't export the results", { description: a.message, retry: exportCsv });
    }
  };

  const onSort = (key: SortKey) => {
    if (key === sortKey) set({ sort: key, dir: dir === "asc" ? "desc" : "asc" });
    else set({ sort: key, dir: "" });
  };

  const err = res.error ? apiError(res.error) : null;
  const title = `${testName} · results`;
  const actions = (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!items.length} data-testid="results-export">
        Export .csv
      </button>
      {canPublishNow && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={askPublish} disabled={asking} data-testid="results-publish-top">
          Publish now
        </button>
      )}
      <Link href={`/tests/${testId}/detailed-analysis`} className="btn btn-primary btn-sm">
        Question analysis
      </Link>
    </>
  );

  /* ── whole-page states ── */
  if (err && ["FORBIDDEN", "OUT_OF_SCOPE"].includes(err.code ?? "")) {
    return (
      <>
        <Topbar title={title} back={{ href: "/tests", label: "Tests" }} />
        <main className="col gap-4 px-7 pt-5 pb-10" data-testid="results-no-permission">
          <section className="card">
            <StateBox
              doodle={<Lock className="size-6 text-muted" aria-hidden />}
              title="You can't see these results"
              body={`${roleName ? `Your role, ${roleName}, ` : "Your role "}can't open results for this test${settings?.batches.length ? ` (${settings.batches.map((b) => b.name).join(" and ")})` : ""}. An admin at your institute can give you access.`}
              action={
                <Link href="/tests" className="btn btn-secondary btn-sm">
                  Back to tests
                </Link>
              }
            />
          </section>
        </main>
      </>
    );
  }
  if (err && err.code === "TEST_NOT_FOUND") {
    return (
      <>
        <Topbar title="Results" back={{ href: "/tests", label: "Tests" }} />
        <main className="col gap-4 px-7 pt-5 pb-10">
          <NotFoundState />
        </main>
      </>
    );
  }
  if (err) {
    return (
      <>
        <Topbar title={title} back={{ href: "/tests", label: "Tests" }} />
        <main className="col gap-4 px-7 pt-5 pb-10" data-testid="results-error">
          <section className="card">
            <StateBox
              tone="error"
              title="Couldn't load results"
              body={
                <>
                  Scores are safe. Try again, or share this code with support: <span className="mono">E-{err.status || "NET"}</span>
                </>
              }
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => res.refetch()}>
                  Try again
                </button>
              }
            />
          </section>
        </main>
      </>
    );
  }
  if (res.data && !items.length) {
    const writing = listRow?.attempts ? Math.max(0, listRow.attempts.started - listRow.attempts.submitted) : 0;
    const closes = listRow?.closesAt ?? settings?.closesAt ?? null;
    return (
      <>
        <Topbar title={title} back={{ href: "/tests", label: "Tests" }} badge={badge} actions={actions} />
        <main className="col gap-4 px-7 pt-5 pb-10" data-testid="results-no-submissions">
          <section className="card">
            <StateBox
              title="No one has submitted yet"
              body={
                state === "live"
                  ? `${testName} closes ${istDateTime(closes)}.${writing ? ` ${plural(writing, "student")} ${writing === 1 ? "is" : "are"} writing now.` : ""} Scores, ranks and the batch summary show here as answers come in.`
                  : "Scores, ranks and the batch summary show here as answers come in."
              }
              action={
                state === "live" ? (
                  <Link href={`/tests/${testId}/monitor`} className="btn btn-secondary btn-sm">
                    Open live monitor
                  </Link>
                ) : undefined
              }
            />
          </section>
        </main>
      </>
    );
  }

  const loading = res.isLoading;
  const keyFlag = keyCheckQ.data?.status === "ready" ? keyCheckQ.data.flags.find((f) => f.aiVerdict !== "keyLooksRight") ?? null : null;
  const fixKey = lastFix ? { from: keyText(lastFix.oldKey, fixLetters.data), to: keyText(lastFix.newKey, fixLetters.data) } : null;
  const summaryRewritten = !!(lastFix && summaryQ.data?.generatedAt && Date.parse(summaryQ.data.generatedAt) > Date.parse(lastFix.at));

  const subjectRows = insights?.subjects ?? [];
  const sortProps = { sortKey, dir, onSort };
  const sortLabel = sortKey === "rank" ? "rank" : sortKey === "score" ? "score" : sortKey === "time" ? "time" : (sectionNames[Number(sortKey.slice(1))] ?? "score").toLowerCase();

  return (
    <>
      <Topbar title={title} back={{ href: "/tests", label: "Tests" }} badge={badge} actions={actions} />
      <main className="col gap-4 px-7 pt-5 pb-10">
        {keyFlag && !lastFix && !pending && (
          <Banner
            tone="info"
            dismissKey={`keycheck:${testId}:${keyCheckQ.data?.checkedAt ?? ""}`}
            title={`AI thinks the answer key may be wrong for Q${keyFlag.n}.`}
            action={
              <Link href={`/tests/${testId}/detailed-analysis?q=${keyFlag.n}`} className="btn btn-secondary">
                Check Q{keyFlag.n}
              </Link>
            }
          >
            {Math.round(keyFlag.popular.share * 100)}% of the batch
            {keyFlag.popular.topTenCount ? `, including ${keyFlag.popular.topTenCount} of the top 10,` : ""} chose{" "}
            {keyFlag.popular.letters?.join(", ") ?? keyFlag.popular.value ?? "another answer"}; the key says{" "}
            {keyFlag.key.letters?.join(", ") ?? (keyFlag.key.range ? `${keyFlag.key.range.min}–${keyFlag.key.range.max}` : "something else")}. Nothing changes until you check.
          </Banner>
        )}
        {lastFix && (
          <div className="k-bn round rb-bn-navy" role="status" data-testid="results-key-fixed">
            <CircleCheck className="size-4" aria-hidden />
            <span className="t">
              <b>
                Key corrected for Q{lastFix.n} on {istDate(lastFix.at)}
                {lastFix.by?.name ? `, by ${lastFix.by.name}` : ""}.
              </b>{" "}
              {lastFix.mode === "drop"
                ? "The question was dropped: everyone gets its full marks. "
                : fixKey?.from && fixKey.to
                  ? lastFix.mode === "acceptAlso"
                    ? `${fixKey.from} and ${fixKey.to} both get full marks. `
                    : `${fixKey.from} → ${fixKey.to}. `
                  : ""}
              {inr(lastFix.scoresChanged)} {lastFix.scoresChanged === 1 ? "score" : "scores"} and {inr(lastFix.ranksChanged)} {lastFix.ranksChanged === 1 ? "rank" : "ranks"} changed; those students see a &ldquo;key corrected&rdquo; note on their result.
            </span>
            <Link href={lastFix.auditEventId ? `/audit-logs?event=${enc(lastFix.auditEventId)}` : "/audit-logs"} className="btn btn-ghost">
              See in audit log
            </Link>
          </div>
        )}
        {pending && (
          <Banner
            tone="warn"
            title="Students can't see these results yet."
            action={
              canPublishNow ? (
                <button type="button" className="btn btn-secondary" onClick={askPublish} disabled={asking} data-testid="results-publish">
                  Publish now
                </button>
              ) : undefined
            }
          >
            {mode === "manual"
              ? "Result mode is Manual: they stay hidden until you publish them."
              : mode === "autoAfterXDays"
                ? `Result mode is After ${settings?.resultAfterDays ?? "N"} day${settings?.resultAfterDays === 1 ? "" : "s"}: they publish by themselves${dueAt ? ` on ${istDateTime(dueAt)}` : ""}.`
                : `Result mode is At close: they publish by themselves when the test closes${dueAt ? `, ${istDateTime(dueAt)}` : ""}.`}{" "}
            Until then students see &ldquo;Results coming soon&rdquo;.
          </Banner>
        )}

        <section className="grid grid-cols-3 gap-3 xl:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }, (_, i) => <span key={i} className="skel h-[104px]" />)
          ) : (
            <>
              <Stat
                i={0}
                testId="results-appeared"
                label="Appeared"
                value={
                  <>
                    {inr(insights?.appeared ?? items.length)}
                    {insights?.assigned && insights.assigned >= insights.appeared ? <span className="sm muted"> / {inr(insights.assigned)}</span> : null}
                  </>
                }
                sub={(() => {
                  const auto = items.filter((r) => r.autoSubmitted).length;
                  return auto ? `${auto} auto-submitted` : "No auto-submits";
                })()}
              />
              <Stat
                i={1}
                testId="results-average"
                label="Average"
                value={fmt(insights?.average ?? (scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0))}
                sub={
                  insights?.previous && insights.averageDelta !== null
                    ? vsPrevious(insights.averageDelta, insights.averageDeltaUnit, insights.previous.shortName || insights.previous.name)
                    : `${Math.round(((insights?.average ?? 0) / (maxScore || 1)) * 100)}% of the paper`
                }
                tone={insights?.previous && insights.averageDelta !== null ? deltaTone(insights.averageDelta, maxScore, insights.averageDeltaUnit) : undefined}
              />
              <Stat i={2} label="Highest" value={top ? fmt(top.score) : "—"} sub={top?.student.name} />
              <Stat i={3} label="Median" value={scores.length ? fmt(quantile(scores, 0.5)) : "—"} sub={scores.length ? `Middle half: ${fmt(quantile(scores, 0.25), 0)}–${fmt(quantile(scores, 0.75), 0)}` : undefined} />
              <Stat
                i={4}
                testId="results-integrity"
                label="Integrity flags"
                value={integrity?.recorded || items.some((r) => r.fullscreenExits != null) ? (integrity?.recorded ? integrity.flaggedCount : items.filter((r) => r.flagged).length) : "—"}
                sub={!integrity?.recorded && !items.some((r) => r.fullscreenExits != null) ? "Not recorded for this test" : `${threshold}+ fullscreen exits`}
              />
            </>
          )}
        </section>

        {!loading && (
          <section className="grid items-start gap-3.5 xl:grid-cols-3">
            <BatchSummaryCard
              data={summaryQ.data}
              error={summaryQ.error}
              loading={summaryQ.isLoading}
              appeared={insights?.appeared ?? items.length}
              onRetry={() => summaryQ.refetch()}
              rewrittenAfterFix={summaryRewritten}
            />
            <article className="card pad-lg col rise gap-3" style={{ ["--i" as string]: 6 }} data-testid="results-subjects">
              <span className="h3">Subject averages</span>
              {subjectRows.map((x, i) => {
                const mx = x.maxScore || 1;
                const tone = x.delta !== null ? deltaTone(x.delta, mx, x.deltaUnit) : null;
                return (
                  <div key={x.subject} className="col gap-1.5">
                    <div className="row between sm">
                      <span>{x.subject}</span>
                      <span className="num">
                        {fmt(x.average)} / {fmt(mx)}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="bar">
                        <i style={{ width: `${Math.max(0, Math.min(100, (x.average / mx) * 100))}%`, animationDelay: `${i * 0.1}s` }} />
                      </div>
                      {x.previousAverage !== null && insights?.previous && (
                        <span
                          className="rs-tick"
                          style={{ left: `${Math.max(0, Math.min(100, (x.previousAverage / (x.previousMaxScore || mx)) * 100))}%` }}
                          title={`${insights.previous.shortName || insights.previous.name} average: ${fmt(x.previousAverage)}`}
                        />
                      )}
                    </div>
                    {x.delta !== null && insights?.previous && (
                      <span className={`xs ${tone === "good" ? "font-semibold text-success" : tone === "bad" ? "font-semibold text-warning" : "text-ink-2"}`}>
                        {vsPrevious(x.delta, x.deltaUnit, insights.previous.shortName || insights.previous.name)}
                      </span>
                    )}
                  </div>
                );
              })}
              {!subjectRows.length && <span className="sm muted">{insightsQ.isLoading ? "Loading…" : "Subject averages aren't available for this test."}</span>}
              {insights?.previous && subjectRows.some((x) => x.previousAverage !== null) && (
                <span className="xs muted row gap-1.5">
                  <span className="inline-block h-3 w-0.5 rounded-[1px] bg-ink" />
                  {insights.previous.shortName || insights.previous.name} average
                </span>
              )}
            </article>
          </section>
        )}

        <section
          ref={fillRef}
          className={`card rise ${fillH !== null ? "k-fill k-fill-panel" : "scrollx"}`}
          style={{ ["--i" as string]: 7, height: fillH ?? undefined, overflow: fillH !== null ? "hidden" : undefined }}
          data-testid="results-students"
        >
          <div className="pad row between wrap gap-2 border-b border-line-2">
            <span className="h3">Students</span>
            <div className="row wrap gap-2">
              <SearchBox value={s.q} onChange={(q) => set({ q })} placeholder="Name or student ID" label="Search students" width={240} />
              {batchOptions.length > 0 && (
                <FilterChip label="Batch" noun="batch" options={batchOptions} value={s.batch || null} onChange={(v) => set({ batch: v ?? "" })} />
              )}
              {flaggedCount > 0 && (
                <ToggleChip on={!!s.flagged} onChange={(v) => set({ flagged: v ? "1" : "" })}>
                  Flagged only · {flaggedCount}
                </ToggleChip>
              )}
            </div>
          </div>
          <div className="k-fill-body scrollx">
            <table className="table" aria-label="Students">
              <thead>
                <tr>
                  <Th {...sortProps} k="rank" label="Rank" />
                  <th>Student</th>
                  <Th {...sortProps} k="score" label="Score" num />
                  {sectionNames.map((n, i) => (
                    <Th {...sortProps} key={n + i} k={`s${i}`} label={n} num />
                  ))}
                  <Th {...sortProps} k="time" label="Time" num />
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} aria-hidden>
                      {Array.from({ length: 5 + Math.max(3, sectionNames.length) }, (_, j) => (
                        <td key={j}>
                          <span className="skel block h-3 w-12" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {pageRows.map((r) => {
                  const moved = !!r.before && (r.before.score !== r.score || r.before.rank !== r.rank);
                  const flag = flagOf(r);
                  const href = `/tests/${testId}/student/${r.student.id}`;
                  return (
                    <tr key={r.student.id} className="rb-row" onClick={() => router.push(href)} data-testid="results-row">
                      <td>
                        <RankBadge rank={r.rank} />
                        {moved && <span className="rb-was">was {r.before!.rank}</span>}
                      </td>
                      <td>
                        <span className="col gap-px">
                          <Link href={href} className="sm font-semibold" onClick={(e) => e.stopPropagation()}>
                            {r.student.name}
                          </Link>
                          {r.student.batch && <span className="rb-was">{r.student.batch.name}</span>}
                        </span>
                      </td>
                      <td className="num sm font-[650]">
                        {fmt(r.score)}
                        {moved && <span className="rb-was">was {fmt(r.before!.score)}</span>}
                      </td>
                      {sectionNames.map((n, i) => (
                        <td key={n + i} className="num sm">
                          {r.sections[i] ? fmt(r.sections[i]!.score) : "—"}
                        </td>
                      ))}
                      <td className="num sm">{duration(r.timeUsedSeconds)}</td>
                      <td>
                        {flag && (
                          <button
                            type="button"
                            className={`badge rb-flag ${flag.amber ? "b-amber" : "b-grey"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlagRow(r);
                            }}
                            data-testid="results-flag"
                          >
                            {flag.text}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && !pageRows.length && (
                  <tr>
                    <td colSpan={5 + sectionNames.length}>
                      <StateBox
                        doodle={<SearchX className="size-6 text-muted" aria-hidden />}
                        title="No student matches"
                        body={s.q ? `Nobody called "${s.q}" with these filters.` : "Nobody with these filters."}
                        action={
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ q: "", batch: "", flagged: "" })}>
                            Clear filters
                          </button>
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!loading && (
            <Pagination page={pg} pageSize={PAGE} total={filtered.length} onPage={(p) => set({ page: String(p) })} sortLabel={`${sortLabel} · click a student for their report`} />
          )}
        </section>
      </main>

      <FlagDrawer testId={testId} row={flagRow} onClose={() => setFlagRow(null)} policy={settings?.fullscreenPolicy ?? null} />

      <ConfirmDialog
        open={!!publishPreview}
        onOpenChange={(o) => !o && setPublishPreview(null)}
        tone="navy"
        title={publishPreview ? `Publish results for ${plural(publishPreview.students, "student")}?` : ""}
        description={
          publishPreview
            ? `They see their score, rank and answers${publishPreview.aiReviewUnlocks ? ", and AI reviews start" : ""}.${publishPreview.test.resultDueAt ? ` This replaces the automatic publish on ${istDate(publishPreview.test.resultDueAt)}.` : ""}`
            : undefined
        }
        facts={
          publishPreview
            ? [
                ["Students", `${inr(publishPreview.emailed)} get an email and see it on Home`],
                ["Undo", "You can unpublish later; emails can't be taken back"],
              ]
            : undefined
        }
        confirmLabel={publishPreview ? `Publish to ${plural(publishPreview.students, "student")}` : "Publish"}
        onConfirm={async () => {
          if (!publishPreview) return;
          try {
            await publishResultsNow(testId);
          } catch (e) {
            throw new Error(`Not published. ${apiError(e).message}`);
          }
          const emailed = publishPreview.emailed;
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["m6", "results-test", testId] }),
            qc.invalidateQueries({ queryKey: ["m5", "result-insights", testId] }),
            qc.invalidateQueries({ queryKey: ["m6", "results", testId] }),
          ]);
          notify.success(`Results published · ${inr(emailed)} students emailed`);
        }}
      />
    </>
  );
}
