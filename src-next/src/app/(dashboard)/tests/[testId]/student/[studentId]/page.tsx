"use client";

/*
  Admin-StudentReport (board Admin-StudentReport, canvas batch 4, approved 6 Nov): one student's result for staff.
  Header + score vs batch, Overview (subjects, time use, last 5 tests, AI review, chapters weakest first, integrity
  timeline), Question by question (filters, answer grid, rows that open the question with both answers, time, visits
  and how the batch answered), previous / next student by rank, Print / PDF (the browser's print of the same data).
  States: loading, error, no permission, not written, key corrected, auto-submitted after exits, AI writing / paused.
  Data: lib/m6/report.ts (M6 routes only, no sample data).
*/

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Info, Lock, Printer, TriangleAlert, UserX } from "lucide-react";
import { AiMark, MathText } from "@iitpulse/ui";

import { Topbar } from "@/components/admin/Topbar";
import { FilterChip, NotFoundState, apiError, fmtDate, fmtPhone, fmtTime, initials, istParts, MONTHS, supportCode, useFillHeight, useTablet } from "@/components/kit";
import { useBrand } from "@/lib/brand";
import { useCan } from "@/lib/m6/people";
import { useQuestionInsight } from "@/lib/queries-tests-admin";
import { m6Tests, unwrap } from "@/lib/m6/client";
import type { StudentReportResponse } from "@/lib/m6-contract";
import {
  TYPE_LABEL,
  hMin,
  keyText,
  marksText,
  matrixText,
  minSec,
  mmss,
  optionLetters,
  useOptionOrder,
  useRankNeighbours,
  useReportQuestion,
  useReportQuestions,
  useStudentAiReview,
  useStudentReport,
  yoursText,
  type ReportQuestion,
  type ReportQuestionDetail,
} from "@/lib/m6/report";
import "./report.css";

type Report = StudentReportResponse;
type Sub = NonNullable<Report["submission"]>;

const first = (name: string) => name.split(/\s+/)[0] || name;
const r1 = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1));
const pct = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0);
const ord = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const dayMonth = (iso: string) => {
  const p = istParts(iso);
  return `${p.d} ${MONTHS[p.m]}`;
};
const dayMonthYear = (iso: string) => {
  const p = istParts(iso);
  return `${p.d} ${MONTHS[p.m]} ${p.y}`;
};
const SUBJECT_COLORS = ["#00007E", "#5D60C9", "#A9ACE6", "#7B7FD6", "#3B3FA8", "#C9CBF0"];

/* ═══════════════════════════════ page ═══════════════════════════════ */

export default function StudentReportPage() {
  const { testId, studentId } = useParams() as { testId: string; studentId: string };
  const router = useRouter();
  const search = useSearchParams();
  const tablet = useTablet();
  const report = useStudentReport(testId, studentId);
  const r = report.data;
  const sub = r?.submission ?? null;
  const neighbours = useRankNeighbours(testId, studentId, sub?.rank ?? null);
  const view = search.get("view") === "questions" ? "qs" : "ov";
  const [print, setPrint] = React.useState(false);
  const setView = (v: "ov" | "qs") => {
    const p = new URLSearchParams(search.toString());
    if (v === "qs") p.set("view", "questions");
    else p.delete("view");
    router.replace(`?${p.toString()}`, { scroll: false });
  };

  const err = report.error ? apiError(report.error) : null;
  const noPerm = err && (err.status === 403 || err.code === "OUT_OF_SCOPE");
  const notFound = err && err.status === 404;
  const special = report.isLoading || !!err || (!!r && !sub);
  const testName = r?.test.name ?? "Student report";
  const nb = neighbours.data;
  const go = (sid: string | undefined) => sid && router.push(`/tests/${testId}/student/${sid}${view === "qs" ? "?view=questions" : ""}`);

  const tools = !special ? (
    print ? (
      <div className="row gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrint(false)}>
          Back to report
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()} data-testid="sr-print-now">
          Print or save as PDF
        </button>
      </div>
    ) : (
      <div className="row gap-2.5">
        <div className="row gap-1.5">
          <button
            type="button"
            className="btn btn-secondary btn-sm sr-iconbtn"
            disabled={!nb?.prev}
            onClick={() => go(nb?.prev?.student.id)}
            aria-label={nb?.prev ? `Previous student, rank ${nb.prev.rank}: ${nb.prev.student.name}` : "No previous student"}
            data-testid="sr-prev"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <span className="xs muted num" data-testid="sr-step">
            {sub?.rank ? `Rank ${sub.rank} of ${sub.of}` : ""}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm sr-iconbtn"
            disabled={!nb?.next}
            onClick={() => go(nb?.next?.student.id)}
            aria-label={nb?.next ? `Next student, rank ${nb.next.rank}: ${nb.next.student.name}` : "No next student"}
            data-testid="sr-next"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPrint(true)} data-testid="sr-print">
          <Printer className="size-4" aria-hidden />
          Print / PDF
        </button>
      </div>
    )
  ) : null;

  return (
    <div className={tablet ? "sr-tab" : undefined}>
      <Topbar
        title={testName}
        back={{ href: `/tests/${testId}/result`, label: "Results" }}
        badge={
          <div className="seg" aria-label="Analysis views">
            <Link href={`/tests/${testId}/detailed-analysis`} className="tab">
              Questions
            </Link>
            <span className="tab on" aria-current="page">
              Student report
            </span>
          </div>
        }
        actions={tools}
      />
      <main className="col gap-4 px-7 pt-5 pb-10" data-testid="student-report">
        {report.isLoading ? (
          <Skeleton />
        ) : notFound && !noPerm ? (
          <NotFoundState />
        ) : noPerm ? (
          <NoPermission testId={testId} />
        ) : err ? (
          <section className="card" data-testid="sr-error">
            <div className="sr-stbox" role="alert">
              <span className="h3">Couldn&rsquo;t load this report</span>
              <span className="sm muted">
                The answers and score are safe. Try again, or share this code with support: <span className="mono">{supportCode("E", report.error)}</span>
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => report.refetch()}>
                Try again
              </button>
            </div>
          </section>
        ) : r && !sub ? (
          <NotWritten r={r} />
        ) : r && sub ? (
          print ? (
            <PrintView r={r} sub={sub} testId={testId} studentId={studentId} />
          ) : (
            <ReportBody r={r} sub={sub} testId={testId} studentId={studentId} view={view} setView={setView} />
          )
        ) : null}
      </main>
    </div>
  );
}

/* ═══════════════════════════════ states ═══════════════════════════════ */

function Skeleton() {
  return (
    <div className="col gap-4" aria-busy="true" aria-label="Loading the report">
      <div className="card pad-lg row gap-3.5">
        <span className="skel size-[52px] rounded-full" />
        <div className="col grow gap-2">
          <span className="skel h-6 w-[220px]" />
          <span className="skel h-4 w-[320px]" />
        </div>
      </div>
      <div className="sr-grid3">
        <div className="card pad-lg col sr-span2 gap-3">
          <span className="skel h-4 w-full" />
          <span className="skel h-4 w-[90%]" />
          <span className="skel h-4 w-[70%]" />
        </div>
        <div className="card pad-lg col gap-3">
          <span className="skel h-4 w-full" />
          <span className="skel h-4 w-[60%]" />
        </div>
      </div>
    </div>
  );
}

function NoPermission({ testId }: { testId: string }) {
  const { roleName } = useCan();
  return (
    <section className="card" data-testid="sr-no-permission">
      <div className="sr-stbox">
        <Lock className="size-6 text-muted" aria-hidden />
        <span className="h3">You can&rsquo;t open this report</span>
        <span className="sm muted max-w-[480px]">
          {roleName ? `Your role, ${roleName}, ` : "Your role "}shows results for your batches only, and this student is not in them. An admin at your institute can give you access.
        </span>
        <Link href={`/tests/${testId}/result`} className="btn btn-secondary">
          Back to results
        </Link>
      </div>
    </section>
  );
}

function StudentMeta({ r, phone = true }: { r: Report; phone?: boolean }) {
  return <>{[r.student.batch?.name, phone && r.student.phone ? fmtPhone(r.student.phone) : null].filter(Boolean).join(" · ")}</>;
}

function NotWritten({ r }: { r: Report }) {
  const f = first(r.student.name);
  const nw = r.notWritten;
  const closed = nw?.closedAt ?? null;
  return (
    <>
      <section className="card pad-lg row wrap gap-3.5" data-testid="sr-not-written">
        <span className="avatar size-[52px] flex-none text-[16px]">{initials(r.student.name)}</span>
        <div className="col gap-1.5">
          <h1 className="h1 m-0">{r.student.removed ? "Removed student" : r.student.name}</h1>
          <span className="sm muted">
            <StudentMeta r={r} />
          </span>
        </div>
      </section>
      <section className="card">
        <div className="sr-stbox">
          <UserX className="size-6 text-muted" aria-hidden />
          <span className="h3">{f} didn&rsquo;t write this test</span>
          <span className="sm muted max-w-[520px]">
            {nw?.linkOpened ? `${f} opened the link but never started.` : `${f} never opened the link.`}{" "}
            {closed ? `The test closed on ${dayMonth(closed)} at ${fmtTime(closed)}, so there is no score, rank or AI review.` : "The test is still open."} {f} is not counted in the batch average.
          </span>
          {!r.student.removed && (
            <div className="row gap-2">
              <Link href={`/users/${r.student.id}`} className="btn btn-secondary">
                Open the profile
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════ report ═══════════════════════════════ */

function howBadge(sub: Sub): { text: string; cls: string } {
  const t = fmtTime(sub.submittedAt);
  if (sub.how === "self") return { text: `Submitted · ${t}`, cls: "b-green" };
  if (sub.how === "timeUp") return { text: `Auto-submitted at time up · ${t}`, cls: "b-amber" };
  return { text: `Auto-submitted · ${t}`, cls: "b-amber" };
}
function exitsBadge(sub: Sub): { text: string; cls: string } | null {
  if (sub.fullscreenExits === null) return null;
  const n = sub.fullscreenExits;
  return { text: n ? `${n} fullscreen ${n === 1 ? "exit" : "exits"}` : "No fullscreen exits", cls: sub.how === "exitLimit" ? "b-amber" : "b-grey" };
}

function Header({ r, sub }: { r: Report; sub: Sub }) {
  const how = howBadge(sub);
  const ex = exitsBadge(sub);
  const answered = sub.counts.correct + sub.counts.partial + sub.counts.wrong;
  const vp = sub.vsPrevious;
  const deltaTxt = vp ? `${vp.scoreDelta > 0 ? "+" : vp.scoreDelta < 0 ? "−" : ""}${r1(Math.abs(vp.scoreDelta))}${vp.unit === "percentPoints" ? " pts" : ""}` : "—";
  const prevScore = vp && vp.unit === "marks" ? sub.score - vp.scoreDelta : null;
  const prevSub = vp
    ? [prevScore !== null ? `${r1(prevScore)} then` : null, vp.rankBefore && sub.rank ? `rank ${vp.rankBefore} → ${sub.rank}` : null].filter(Boolean).join(" · ") || vp.test.name
    : "No earlier test to compare";
  return (
    <section className="card pad-lg sr-head" data-testid="sr-header">
      <div className="row min-w-0 gap-3.5">
        <span className="avatar size-[52px] flex-none text-[16px]">{initials(r.student.removed ? "Removed student" : r.student.name)}</span>
        <div className="col min-w-0 gap-1.5">
          <h1 className="h1 m-0">{r.student.removed ? "Removed student" : r.student.name}</h1>
          <span className="sm muted">
            <StudentMeta r={r} />
          </span>
          <div className="row wrap gap-1.5">
            <span className={`badge ${how.cls}`}>{how.text}</span>
            {ex && <span className={`badge ${ex.cls}`}>{ex.text}</span>}
          </div>
        </div>
      </div>
      <div className="sr-kpis">
        <div className="sr-kpi" data-testid="sr-kpi-score">
          <span className="l">Score</span>
          <b>
            {r1(sub.score)}
            <span className="sm muted font-medium"> / {r1(r.test.maxScore)}</span>
          </b>
          <span className="xs muted">Batch average {r1(sub.batchAverage)}</span>
        </div>
        <div className="sr-kpi" data-testid="sr-kpi-rank">
          <span className="l">Rank</span>
          <b>
            {sub.rank ?? "—"}
            <span className="sm muted font-medium"> of {sub.of}</span>
          </b>
          <span className="xs muted">{sub.topPercent !== null ? `Top ${sub.topPercent}% of the batch` : sub.rank === null ? "Final after the test closes" : ""}</span>
        </div>
        <div className="sr-kpi">
          <span className="l">Accuracy</span>
          <b>{sub.accuracyPercent}%</b>
          <span className="xs muted">
            {sub.counts.correct} right{sub.counts.partial ? `, ${sub.counts.partial} partly,` : ""} of {answered} answered
          </span>
        </div>
        <div className="sr-kpi" data-testid="sr-kpi-prev">
          <span className="l">{vp ? `vs ${vp.test.shortName || vp.test.name}` : "vs previous"}</span>
          <b className={vp ? (vp.scoreDelta > 0 ? "sr-up" : vp.scoreDelta < 0 ? "sr-down" : "") : "muted"}>{deltaTxt}</b>
          <span className="xs muted truncate">{prevSub}</span>
        </div>
      </div>
    </section>
  );
}

function KeyNotes({ r, testId }: { r: Report; testId: string }) {
  const f = first(r.student.name);
  if (!r.keyCorrections.length) return null;
  return (
    <>
      {r.keyCorrections.map((k) => (
        <div key={`${k.questionId}-${k.correctedAt}`} className="sr-bn navy" role="note" data-testid="sr-key-note">
          <Info className="size-4" aria-hidden />
          <span className="t">
            <b>
              {k.mode === "drop" ? `Q${k.n} was dropped on ${dayMonth(k.correctedAt)}.` : k.mode === "acceptAlso" ? `A second answer was accepted for Q${k.n} on ${dayMonth(k.correctedAt)}.` : `Answer key corrected for Q${k.n} on ${dayMonth(k.correctedAt)}.`}
            </b>{" "}
            {k.yourScore.before !== k.yourScore.after
              ? `${f}'s score went from ${r1(k.yourScore.before)} to ${r1(k.yourScore.after)}${k.yourRank.before && k.yourRank.after && k.yourRank.before !== k.yourRank.after ? ` and the rank from ${k.yourRank.before} to ${k.yourRank.after}` : ""}.`
              : `${f}'s score did not change.`}{" "}
            {k.yourMarks.before !== k.yourMarks.after ? `${f} sees a "key corrected" note on the result.` : ""}
          </span>
          <Link href={`/audit-logs?involving=${encodeURIComponent(testId)}&range=30d`} className="btn btn-ghost">
            See in audit log
          </Link>
        </div>
      ))}
    </>
  );
}

function ExitBanner({ r, sub }: { r: Report; sub: Sub }) {
  if (sub.how !== "exitLimit") return null;
  const n = sub.fullscreenExits;
  return (
    <div className="sr-bn warn" role="note" data-testid="sr-exit-banner">
      <TriangleAlert className="size-4" aria-hidden />
      <span className="t">
        <b>
          Auto-submitted at {fmtTime(sub.submittedAt)}
          {n ? ` after the ${ord(n)} fullscreen exit` : " after too many fullscreen exits"}.
        </b>{" "}
        {first(r.student.name)}&rsquo;s answers up to then count. The score stands unless you decide otherwise; nothing changes automatically.
      </span>
      <a href="#integrity" className="btn btn-ghost">
        See what happened
      </a>
    </div>
  );
}

function ReportBody({ r, sub, testId, studentId, view, setView }: { r: Report; sub: Sub; testId: string; studentId: string; view: "ov" | "qs"; setView: (v: "ov" | "qs") => void }) {
  const qs = useReportQuestions(testId, studentId, true);
  return (
    <div className="col gap-4">
      <KeyNotes r={r} testId={testId} />
      <ExitBanner r={r} sub={sub} />
      <Header r={r} sub={sub} />
      <div className="row between wrap gap-2.5">
        <div className="seg" role="tablist" aria-label="View">
          <button type="button" className={`tab ${view === "ov" ? "on" : ""}`} role="tab" aria-selected={view === "ov"} onClick={() => setView("ov")}>
            Overview
          </button>
          <button type="button" className={`tab ${view === "qs" ? "on" : ""}`} role="tab" aria-selected={view === "qs"} onClick={() => setView("qs")} data-testid="sr-tab-questions">
            Question by question
          </button>
        </div>
        <span className="xs muted">
          Submitted {dayMonth(sub.submittedAt)}, {fmtTime(sub.submittedAt)}
          {sub.how !== "self" ? " (auto)" : ""} · time used {hMin(sub.timeUsedSeconds)} of {hMin(r.test.durationMinutes * 60)}
        </span>
      </div>
      {view === "ov" ? <Overview r={r} sub={sub} testId={testId} studentId={studentId} questions={qs.data} /> : <Questions r={r} testId={testId} studentId={studentId} q={qs} />}
    </div>
  );
}

/* ───────────── overview ───────────── */

function Overview({ r, sub, testId, studentId, questions }: { r: Report; sub: Sub; testId: string; studentId: string; questions?: ReportQuestion[] }) {
  const f = first(r.student.name);
  return (
    <div className="col gap-4">
      <div className="sr-grid3">
        <Subjects r={r} />
        <TimeUse r={r} sub={sub} questions={questions} />
      </div>
      <div className="sr-grid3">
        <LastTests r={r} />
        <AiReview testId={testId} studentId={studentId} name={f} />
      </div>
      {/* Integrity first in the DOM so the chapters panel ends the page (owner table rule); the grid puts it back on the
          right on desktop as the board draws it, and above the chapters on tablet */}
      <div className="sr-grid3">
        <Integrity r={r} sub={sub} />
        <Chapters r={r} />
      </div>
    </div>
  );
}

function Subjects({ r }: { r: Report }) {
  return (
    <article className="card pad-lg col sr-span2 gap-3.5" data-testid="sr-subjects">
      <div className="row between">
        <span className="h3">Subjects</span>
        <span className="xs muted row gap-1.5">
          <span className="inline-block h-3 w-0.5 rounded-[1px] bg-ink" />
          Batch average
        </span>
      </div>
      {r.subjects.map((s) => (
        <div key={s.name} className="col gap-1.5">
          <div className="row between sm">
            <span className="font-semibold">{s.name}</span>
            <span className="num">
              <b>{r1(s.score)}</b> / {r1(s.maxScore)}
            </span>
          </div>
          <div className="sr-tickw">
            <div className="bar">
              <i style={{ width: `${pct(s.score, s.maxScore)}%` }} />
            </div>
            <span className="sr-tick" style={{ left: `${pct(s.batchAverage, s.maxScore)}%` }} title={`Batch average ${r1(s.batchAverage)}`} />
          </div>
          <span className="xs muted num">
            {s.right} right · {s.wrong} wrong · {s.skipped} skipped · {hMin(s.timeSeconds)}
          </span>
        </div>
      ))}
      {!r.subjects.length && <span className="sm muted">This paper has no subjects.</span>}
    </article>
  );
}

function TimeUse({ r, sub, questions }: { r: Report; sub: Sub; questions?: ReportQuestion[] }) {
  const tu = r.timeUse;
  const mins = (s: number) => Math.round(s / 60);
  const leftWord = tu.leftReason === "cutOff" ? "cut off" : "left";
  const aria = [...tu.bySubject.map((s) => `${s.name} ${mins(s.seconds)} min`), `${mins(tu.leftSeconds)} min ${tu.leftReason === "cutOff" ? "cut off by the auto-submit" : "unused"}`].join(", ");
  const lines: string[] = [];
  if (tu.leftReason === "cutOff") lines.push(`The test ended at ${fmtTime(sub.submittedAt)}, ${hMin(sub.timeUsedSeconds)} in${sub.how === "exitLimit" && sub.fullscreenExits ? `, on the ${ord(sub.fullscreenExits)} exit` : ""}.`);
  if (questions?.length) {
    const slow = questions.filter((q) => q.timeSeconds > 300);
    if (slow.length) {
      const w = slow.filter((q) => q.outcome === "wrong").length;
      const s = slow.filter((q) => q.outcome === "skipped").length;
      lines.push(`${slow.length} ${slow.length === 1 ? "question" : "questions"} took over 5 min${w || s ? `; ${[w ? `${w} wrong` : null, s ? `${s} skipped` : null].filter(Boolean).join(", ")}` : ""}.`);
    }
    const longest = [...questions].sort((a, b) => b.timeSeconds - a.timeSeconds)[0];
    if (longest && longest.timeSeconds > 0)
      lines.push(
        `Longest: Q${longest.n}, ${minSec(longest.timeSeconds)}${longest.outcome === "skipped" ? ", then skipped" : longest.outcome === "wrong" ? ", then wrong" : ""}.${longest.batchAverageSeconds !== null ? ` Batch average ${minSec(longest.batchAverageSeconds)}.` : ""}`
      );
  }
  return (
    <article className="card pad-lg col gap-3" data-testid="sr-time">
      <span className="h3">Time use</span>
      <div className="sr-stack" role="img" aria-label={aria}>
        {tu.bySubject.map((s, i) => (
          <span key={s.name} style={{ flex: Math.max(1, s.seconds), background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
        ))}
        {tu.leftSeconds > 0 && <span style={{ flex: tu.leftSeconds, background: "#EEF0F5" }} />}
      </div>
      <div className="row wrap xs gap-3">
        {tu.bySubject.map((s, i) => (
          <span key={s.name} className="row gap-[5px]">
            <span className="sr-sw" style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
            {s.name} {mins(s.seconds)} min
          </span>
        ))}
        <span className="row muted gap-[5px]">
          <span className="sr-sw border border-line" style={{ background: "#EEF0F5" }} />
          {mins(tu.leftSeconds)} min {leftWord}
        </span>
      </div>
      {lines.length > 0 && (
        <div className="col gap-2 border-t border-line-2 pt-1">
          {lines.map((l) => (
            <span key={l} className="sm">
              {l}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function LastTests({ r }: { r: Report }) {
  const t = r.lastTests;
  const firstT = t[0];
  const last = t[t.length - 1];
  const label = (x: (typeof t)[number]) => x.shortName || x.name;
  let caption = "Score above each bar, rank below.";
  if (t.length > 1 && firstT && last) {
    const d = last.score - firstT.score;
    const places = firstT.rank && last.rank ? firstT.rank - last.rank : null;
    caption += ` ${d >= 0 ? "Up" : "Down"} ${r1(Math.abs(d))} marks${places ? ` and ${places > 0 ? "up" : "down"} ${Math.abs(places)} ${Math.abs(places) === 1 ? "place" : "places"}` : ""} since ${label(firstT)}.`;
  }
  const aria = `Scores: ${t.map((x) => `${label(x)} ${r1(x.score)}`).join(", ")}.`;
  return (
    <article className="card pad-lg col gap-2" data-testid="sr-last-tests">
      <div className="row between">
        <span className="h3">Last {t.length > 1 ? t.length : ""} tests</span>
        <span className="xs muted">Same exam and kind</span>
      </div>
      {t.length > 1 ? (
        <>
          <div className="sr-trend" role="img" aria-label={aria}>
            {t.map((x, i) => (
              <div key={x.testId} className={`c ${i === t.length - 1 ? "now" : ""}`} title={x.name}>
                <span className="v">{r1(x.score)}</span>
                <span className="b" style={{ height: `${pct(x.score, x.maxScore)}%` }} />
                <span className="xs muted max-w-full truncate whitespace-nowrap">{label(x)}</span>
                <span className="xs num text-muted">{x.rank ? `#${x.rank}` : "—"}</span>
              </div>
            ))}
          </div>
          <span className="xs muted">{caption}</span>
        </>
      ) : (
        <span className="sm muted">This is the first test of its kind, so there is nothing to compare yet.</span>
      )}
    </article>
  );
}

function AiReview({ testId, studentId, name }: { testId: string; studentId: string; name: string }) {
  const q = useStudentAiReview(testId, studentId, true);
  const { name: institute } = useBrand();
  const d = q.data;
  const kindLabel: Record<string, string> = { concept: "Concept", time: "Time", skip: "Skip", careless: "Careless" };
  return (
    <article className="ai pad-lg col sr-span2 gap-3" data-testid="sr-ai" data-status={d?.status ?? (q.isError ? "error" : "loading")}>
      <div className="row between wrap gap-2">
        <AiMark iconSize={13}>AI review · where marks went</AiMark>
        <span className="xs muted">The same review {name} sees on the result</span>
      </div>
      {q.isLoading ? (
        <div className="col gap-2.5" aria-busy="true">
          <span className="skel block h-11 w-full rounded-[10px]" />
          <span className="skel block h-11 w-full rounded-[10px]" />
        </div>
      ) : q.isError ? (
        <div className="row gap-2.5">
          <span className="sm">Couldn&rsquo;t load the AI review.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => q.refetch()}>
            Try again
          </button>
        </div>
      ) : d?.status === "ready" ? (
        <div className="col gap-2">
          <span className="sm">
            {name} lost {r1(d.marksLost)} marks.
            {d.leaks.length ? ` ${d.leaks.length === 1 ? "One cause explains" : `${d.leaks.length === 2 ? "Two" : d.leaks.length === 3 ? "Three" : d.leaks.length} causes explain`} ${r1(d.marksExplained)} of them:` : ""}
          </span>
          {d.leaks.map((k, i) => (
            <div key={i} className="sr-leak">
              <span className="m">−{r1(k.marksLost)}</span>
              <span className="col grow min-w-0 gap-0.5">
                <MathText as="span" className="sm font-semibold" text={k.title} />
                <MathText as="span" className="xs text-ink-2" text={k.note} />
              </span>
              <span className="badge b-grey flex-none">{kindLabel[k.kind] ?? k.kind}</span>
              <span className="xs mono muted flex-none whitespace-nowrap">{k.questionNs.map((n) => `Q${n}`).join(", ")}</span>
            </div>
          ))}
          {d.other && <MathText as="span" className="xs muted" text={d.other.note} />}
        </div>
      ) : d?.status === "generating" ? (
        <div className="col gap-2.5" role="status">
          <span className="sm">Writing {name}&rsquo;s review. It&rsquo;s usually ready in under a minute.</span>
          <span className="skel block h-11 w-full rounded-[10px]" />
          <span className="skel block h-11 w-full rounded-[10px]" />
        </div>
      ) : d?.reason === "AI_PAUSED" ? (
        <div className="col gap-1.5">
          <span className="sm font-semibold">No AI review for this test</span>
          <span className="sm text-ink-2">AI is paused for {institute}, so no reviews are being written. Scores, ranks and everything else on this page are unaffected.</span>
        </div>
      ) : (
        <div className="col gap-1.5">
          <span className="sm font-semibold">No AI review yet</span>
          <span className="sm text-ink-2">The review is written when {name} opens the result. It shows here after that.</span>
        </div>
      )}
    </article>
  );
}

function Chapters({ r }: { r: Report }) {
  const [all, setAll] = React.useState(false);
  const rows = all ? r.chapters : r.chapters.slice(0, 6);
  const [ref, h] = useFillHeight<HTMLElement>(all, 320, 0, "panel"); // owner table rule: expanded, the chapters are a one-screen panel
  const fname = first(r.student.name);
  return (
    <section ref={ref} className={`card sr-span2 sr-ch-cell ${h !== null ? "k-fill k-fill-panel" : "scrollx"}`} style={{ height: h ?? undefined }} data-testid="sr-chapters">
      <div className="pad row between border-b border-line-2">
        <span className="h3">Chapters, weakest first</span>
        <span className="xs muted">
          {rows.length} of {r.chapters.length}
        </span>
      </div>
      <div className={h !== null ? "k-fill-body scrollx" : undefined}>
        <table className="table min-w-[600px]">
          <thead>
            <tr>
              <th>Chapter</th>
              <th className="num">Questions</th>
              <th className="num">Right</th>
              <th className="num">Wrong</th>
              <th className="num">Skipped</th>
              <th className="num">Marks</th>
              <th className="num">{fname}</th>
              <th className="num">Batch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={`${c.subject}-${c.chapter}`}>
                <td>
                  <span className="col">
                    <span className="sm">{c.chapter}</span>
                    <span className="xs muted">{c.subject}</span>
                  </span>
                </td>
                <td className="num sm">{c.questions}</td>
                <td className="num sm">{c.right}</td>
                <td className="num sm">{c.wrong}</td>
                <td className="num sm">{c.skipped}</td>
                <td className="num sm">{r1(c.marks)}</td>
                <td className={`num sm font-semibold ${c.accuracyPercent < c.batchAccuracyPercent ? "text-warning" : ""}`}>{c.accuracyPercent}%</td>
                <td className="num sm muted">{c.batchAccuracyPercent}%</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="sm muted py-6 text-center">
                  No chapters are tagged on this paper.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="row between px-4 py-3">
        <span className="xs muted">Accuracy = right answers out of the questions in that chapter.</span>
        {r.chapters.length > 6 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll((v) => !v)}>
            {all ? "Show 6" : `Show all ${r.chapters.length}`}
          </button>
        )}
      </div>
    </section>
  );
}

type Ev = Report["timeline"][number];
function eventLine(e: Ev, r: Report, sub: Sub): { t: string; cls: string } | null {
  const at = fmtTime(e.at);
  const d = e.data as { durationSeconds?: number | null; action?: string; minutes?: number; by?: { name?: string } | string; reason?: string };
  switch (e.kind) {
    case "linkOpened":
      return { t: `${at} · Opened the link`, cls: "ev" };
    case "started":
      return { t: `${at} · Started`, cls: "ev" };
    case "fullscreenExit":
      return d.action === "submitted"
        ? { t: `${at} · Left fullscreen${d.durationSeconds ? ` for ${minSec(d.durationSeconds)}` : ""} · test submitted`, cls: "ev r" }
        : { t: `${at} · Left fullscreen${d.durationSeconds ? ` for ${minSec(d.durationSeconds)}` : ""} · warned`, cls: "ev w" };
    case "extraTime": {
      const by = typeof d.by === "string" ? d.by : d.by?.name;
      return { t: `${at} · Given ${d.minutes ?? "?"} min extra${by ? ` by ${by}` : ""}${d.reason ? `: ${d.reason}` : ""}`, cls: "ev" };
    }
    case "noContact":
      return { t: `${at} · No contact from the device`, cls: "ev w" };
    case "submitted": {
      const early = Math.round((r.test.durationMinutes * 60 - sub.timeUsedSeconds) / 60);
      return { t: `${at} · Submitted${early > 0 ? `, ${early} min early` : ""}`, cls: "ev s" };
    }
    case "autoSubmitted":
      return { t: `${at} · ${sub.how === "exitLimit" ? "Submitted after the last fullscreen exit" : "Time up · submitted automatically"}`, cls: "ev r" };
    default:
      return null;
  }
}

function Integrity({ r, sub }: { r: Report; sub: Sub }) {
  const ex = exitsBadge(sub);
  const events = r.timeline.map((e) => eventLine(e, r, sub)).filter((x): x is { t: string; cls: string } => !!x);
  return (
    <article id="integrity" className="card pad-lg col sr-int-cell scroll-mt-20 gap-3" data-testid="sr-integrity">
      <div className="row between">
        <span className="h3">Integrity</span>
        {ex && <span className={`badge ${ex.cls}`}>{ex.text}</span>}
      </div>
      {events.length ? (
        <div className="sr-tl">
          {events.map((e, i) => (
            <span key={i} className={e.cls}>
              {e.t}
            </span>
          ))}
        </div>
      ) : (
        <span className="sm muted">No events were recorded for this attempt.</span>
      )}
      <span className="xs muted">{sub.fullscreenExits === null ? "Fullscreen exits were not recorded for this test." : "Exits are counted when the student leaves fullscreen."}</span>
    </article>
  );
}

/* ───────────── question by question ───────────── */

type Filter = "all" | "w" | "p" | "s" | "slow" | "k";
const st = (q: ReportQuestion) => (q.outcome === "correct" ? "r" : q.outcome === "wrong" ? "w" : q.outcome === "partial" ? "p" : "s");
const MKC = { r: "sr-mk pos", w: "sr-mk neg", s: "sr-mk zero", p: "sr-mk part" } as const;
const ANC = { r: "sr-ans ok", w: "sr-ans bad", s: "sr-ans", p: "sr-ans" } as const;

function Questions({ r, testId, studentId, q }: { r: Report; testId: string; studentId: string; q: ReturnType<typeof useReportQuestions> }) {
  const fname = first(r.student.name);
  const order = useOptionOrder(testId).data;
  const [filter, setFilter] = React.useState<Filter>("all");
  const [subject, setSubject] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<number | null>(null);
  const items = React.useMemo(() => q.data ?? [], [q.data]);
  const mixed = items.some((x) => x.type === "multiple" || x.type === "matrix" || !!x.set);
  const subjects = React.useMemo(() => [...new Set(items.map((x) => x.subject).filter(Boolean))], [items]);
  const bySubject = subject ? items.filter((x) => x.subject === subject) : items;
  const count = (f: Filter) => bySubject.filter((x) => keep(x, f)).length;
  const filters: Array<[Filter, string]> = [
    ["all", "All"],
    ["w", "Wrong"],
    ...(bySubject.some((x) => x.outcome === "partial") ? ([["p", "Partly"]] as Array<[Filter, string]>) : []),
    ["s", "Skipped"],
    ...(bySubject.some((x) => x.timeSeconds > 300) ? ([["slow", "Over 5 min"]] as Array<[Filter, string]>) : []),
    ...(bySubject.some((x) => x.keyCorrected) ? ([["k", "Key corrected"]] as Array<[Filter, string]>) : []),
  ];
  const shown = bySubject.filter((x) => keep(x, filter));
  const [ref, h] = useFillHeight<HTMLElement>(shown.length > 0, 320, 0, "panel");

  if (q.isLoading)
    return (
      <section className="card pad col gap-2" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="skel h-9 w-full" />
        ))}
      </section>
    );
  if (q.isError)
    return (
      <section className="card">
        <div className="sr-stbox" role="alert">
          <span className="h3">Couldn&rsquo;t load the questions</span>
          <span className="sm muted">
            Try again, or share this code with support: <span className="mono">{supportCode("E", q.error)}</span>
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => q.refetch()}>
            Try again
          </button>
        </div>
      </section>
    );

  const counts = { r: bySubject.filter((x) => x.outcome === "correct").length, w: count("w"), p: count("p"), s: count("s") };
  const paletteAria = `All ${bySubject.length} questions: ${counts.r} right, ${counts.w} wrong${counts.p ? `, ${counts.p} partly` : ""}, ${counts.s} skipped.`;
  // paragraph sets: a head row over the set's questions (board, mixed types)
  const rows: Array<{ kind: "head"; key: string; set: { nFrom: number; nTo: number }; kids: ReportQuestion[] } | { kind: "q"; q: ReportQuestion; kid: boolean }> = [];
  const seen = new Set<string>();
  for (const x of shown) {
    if (x.set) {
      const k = `${x.set.nFrom}-${x.set.nTo}`;
      if (!seen.has(k)) {
        seen.add(k);
        rows.push({ kind: "head", key: k, set: x.set, kids: items.filter((y) => y.set && y.set.nFrom === x.set!.nFrom) });
      }
    }
    rows.push({ kind: "q", q: x, kid: !!x.set });
  }

  return (
    <section ref={ref} className={`card ${h !== null ? "k-fill k-fill-panel" : ""}`} style={{ height: h ?? undefined }} data-testid="sr-questions">
      <div className="pad col gap-3 border-b border-line-2">
        <div className="row between wrap gap-2.5">
          <div className="seg" role="tablist" aria-label="Show">
            {filters.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                className={`tab ${filter === id ? "on" : ""}`}
                onClick={() => {
                  setFilter(id);
                  setOpen(null);
                }}
              >
                {label} <span className="count">{id === "all" ? bySubject.length : count(id)}</span>
              </button>
            ))}
          </div>
          {subjects.length > 1 && (
            <FilterChip label="Subject" noun="subject" value={subject} onChange={(v) => setSubject(v)} options={subjects.map((s) => ({ value: s, label: s }))} />
          )}
        </div>
        {!mixed ? (
          <div className="col gap-2">
            <div className="sr-qpal" role="img" aria-label={paletteAria} data-testid="sr-palette">
              {bySubject.map((x) => (
                <span key={x.n} className={`sr-qc ${st(x) === "r" ? "c" : st(x)} ${x.keyCorrected ? "k" : ""}`}>
                  {x.n}
                </span>
              ))}
            </div>
            <div className="row wrap sr-legend xs muted gap-3.5">
              <span className="row gap-1.5">
                <span className="sr-qc c" />
                Right {counts.r}
              </span>
              <span className="row gap-1.5">
                <span className="sr-qc w" />
                Wrong {counts.w}
              </span>
              <span className="row gap-1.5">
                <span className="sr-qc s" />
                Skipped {counts.s}
              </span>
              {bySubject.some((x) => x.keyCorrected) && (
                <span className="row gap-1.5">
                  <span className="sr-qc k" />
                  Key corrected
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="xs muted">Mixed types: multiple correct can get part marks; a paragraph shows its questions under the passage; a matrix shows each row&rsquo;s match.</span>
        )}
      </div>
      <div className={h !== null ? "k-fill-body scrollx" : "scrollx"}>
        <table className="table sr-qt">
          <thead>
            <tr>
              <th>Q</th>
              <th>Chapter</th>
              <th>Type</th>
              <th>{fname}&rsquo;s answer</th>
              <th>Key</th>
              <th className="num">Marks</th>
              <th className="num">Time</th>
              <th className="num">Batch avg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (row.kind === "head") {
                const k = row.kids;
                const right = k.filter((x) => x.outcome === "correct").length;
                const wrong = k.filter((x) => x.outcome === "wrong").length;
                const skipped = k.filter((x) => x.outcome === "skipped").length;
                const marks = k.reduce((a, x) => a + x.marks, 0);
                const t = k.reduce((a, x) => a + x.timeSeconds, 0);
                const avg = k.every((x) => x.batchAverageSeconds !== null) ? k.reduce((a, x) => a + (x.batchAverageSeconds ?? 0), 0) : null;
                return (
                  <tr key={`h-${row.key}`} className="head">
                    <td className="mono sm">
                      Q{row.set.nFrom}–{row.set.nTo}
                    </td>
                    <td>
                      <span className="sm">Passage</span>
                    </td>
                    <td>
                      <span className="badge b-grey">Paragraph</span>
                    </td>
                    <td>
                      <span className="sm">{[right ? `${right} right` : null, wrong ? `${wrong} wrong` : null, skipped ? `${skipped} skipped` : null].filter(Boolean).join(", ")}</span>
                    </td>
                    <td>
                      <span className="sm">{k.length} questions</span>
                    </td>
                    <td className="num">
                      <span className={marks > 0 ? "sr-mk part" : marks < 0 ? "sr-mk neg" : "sr-mk zero"}>{marksText(marks)}</span>
                    </td>
                    <td className="num sm">{mmss(t)}</td>
                    <td className="num sm muted">{avg !== null ? mmss(avg) : "—"}</td>
                  </tr>
                );
              }
              const x = row.q;
              const s = st(x);
              const isOpen = open === x.n;
              return (
                <React.Fragment key={x.n}>
                  <tr
                    className={`qr ${row.kid ? "kid" : ""} ${isOpen ? "on" : ""}`}
                    onClick={() => setOpen(isOpen ? null : x.n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(isOpen ? null : x.n);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={isOpen}
                    data-testid={`sr-q-${x.n}`}
                  >
                    <td className="mono sm">Q{x.n}</td>
                    <td>
                      <span className="col">
                        <span className="sm">{x.chapter ?? "—"}</span>
                        <span className="xs muted">{x.subject}</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge b-grey">{TYPE_LABEL[x.type] ?? x.type}</span>
                    </td>
                    <td>
                      <span className={ANC[s]}>{yoursText(x, order?.get(x.questionId))}</span>
                    </td>
                    <td>
                      <span className="sr-ans">{x.dropped ? "Dropped" : x.keyLabel || keyText(x.type, x.key, order?.get(x.questionId))}</span>
                      {x.keyCorrected && <span className="badge b-navy ml-1.5">Key corrected</span>}
                    </td>
                    <td className="num">
                      <span className={MKC[s]}>{marksText(x.marks)}</span>
                    </td>
                    <td className="num sm">
                      <span className={x.timeSeconds > 300 ? "sr-slow" : ""}>{mmss(x.timeSeconds)}</span>
                    </td>
                    <td className="num sm muted">{mmss(x.batchAverageSeconds)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <QuestionDetail testId={testId} studentId={studentId} item={x} name={fname} order={order?.get(x.questionId)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="sm muted py-8 text-center">
                  No question matches this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="row between wrap gap-2 px-4 py-3">
        <span className="xs muted">
          Showing {shown.length} of {bySubject.length}
        </span>
        <span className="xs muted">Click a row to see the question, both answers and how the batch did.</span>
      </div>
    </section>
  );
}

function keep(q: ReportQuestion, f: Filter) {
  if (f === "all") return true;
  if (f === "slow") return q.timeSeconds > 300;
  if (f === "k") return q.keyCorrected;
  return st(q) === f;
}

const LETTER = (i: number) => String.fromCharCode(65 + i);
const Html = ({ text, className = "" }: { text: string; className?: string }) => (
  <MathText html as="span" className={`min-w-0 [&_img]:max-w-full [&_p]:m-0 ${className}`} text={text || ""} />
);

function QuestionDetail({ testId, studentId, item, name, order }: { testId: string; studentId: string; item: ReportQuestion; name: string; order?: string[] }) {
  const d = useReportQuestion(testId, studentId, item.n);
  const [sol, setSol] = React.useState(false);
  const q = d.data?.question;
  const mine = new Set(item.yours?.optionIds ?? []);
  const keyIds = new Set(item.key.optionIds ?? []);
  const myLetter = item.yours?.optionIds?.length === 1 ? optionLetters(item.yours.optionIds, q?.en.options?.map((o) => o.id) ?? order) : null;
  const insight = useQuestionInsight(testId, item.questionId, !!myLetter && item.outcome === "wrong");
  const ins = insight.data?.status === "ready" ? insight.data.insight : null;

  if (d.isLoading)
    return (
      <div className="sr-detail" aria-busy="true">
        <div className="col gap-2">
          <span className="skel h-4 w-full" />
          <span className="skel h-4 w-[80%]" />
        </div>
        <div className="col gap-2">
          <span className="skel h-4 w-full" />
        </div>
      </div>
    );
  if (d.isError || !d.data || !q)
    return (
      <div className="sr-detail">
        <span className="sm muted">
          Couldn&rsquo;t load this question.{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => d.refetch()}>
            Try again
          </button>
        </span>
      </div>
    );
  const dd = d.data as ReportQuestionDetail;
  const opts = q.en.options ?? [];
  const shareRows = shareList(dd, item, opts, name);
  const solution = (q.en as { solution?: string }).solution;
  const passage = (q as { set?: { passage?: { en?: string } } | null }).set?.passage?.en ?? (q as { passage?: { en?: string } }).passage?.en;
  return (
    <div className="sr-detail" data-testid="sr-detail" onClick={(e) => e.stopPropagation()}>
      <div className="col gap-3">
        {passage && (
          <div className="rounded-control border border-line-2 bg-surface p-3">
            <Html className="font-serif text-[14px] leading-[1.55]" text={passage} />
          </div>
        )}
        <Html className="block font-serif text-[15px] leading-[1.55]" text={q.en.question} />
        {q.matrix ? (
          <div className="col gap-2">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
              <span className="xs font-semibold text-muted">List I</span>
              <span className="xs font-semibold text-muted">List II</span>
              {Array.from({ length: Math.max(q.matrix.listI.length, q.matrix.listII.length) }, (_, i) => (
                <span key={i} className="contents">
                  <span className="row items-baseline gap-1.5">
                    {q.matrix!.listI[i] && (
                      <>
                        <b className="mono">{q.matrix!.listI[i].id}</b>
                        <Html className="font-serif" text={q.matrix!.listI[i].en} />
                      </>
                    )}
                  </span>
                  <span className="row items-baseline gap-1.5">
                    {q.matrix!.listII[i] && (
                      <>
                        <b className="mono">{q.matrix!.listII[i].id}</b>
                        <Html className="font-serif" text={q.matrix!.listII[i].en} />
                      </>
                    )}
                  </span>
                </span>
              ))}
            </div>
            <span className="xs">
              <b>{name}:</b> <span className="mono">{matrixText(item.yours?.matrix as Record<string, string[]> | undefined) || "Skipped"}</span> · <b>Key:</b>{" "}
              <span className="mono">{matrixText(item.key.matches)}</span>
            </span>
            {item.rowOutcomes && (
              <span className="xs muted">
                {Object.entries(item.rowOutcomes)
                  .map(([row, o]) => `${row} ${o === "right" ? "✓" : o === "wrong" ? "✗" : "–"}`)
                  .join(" · ")}
              </span>
            )}
          </div>
        ) : opts.length ? (
          <div className="col gap-1.5">
            {opts.map((o, i) => {
              const isKey = keyIds.has(o.id);
              const isMine = mine.has(o.id);
              return (
                <div key={o.id} className={`opt ${isKey ? "correct" : ""} ${isMine && !isKey ? "mine" : ""}`}>
                  <span className="key">{LETTER(i)}</span>
                  <Html className="font-serif" text={o.value} />
                  {(isKey || isMine) && <span className="sr-otag">{isKey && isMine ? `Key · ${name}'s answer` : isKey ? "Key" : `${name}'s answer`}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="sm">
            <b>{name}:</b> <span className="mono">{yoursText(item, order)}</span> · <b>Key:</b> <span className="mono">{keyText(item.type, item.key, order)}</span>
          </span>
        )}
        {solution && (
          <>
            <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => setSol((v) => !v)}>
              {sol ? "Hide solution" : "Show solution"}
            </button>
            {sol && <Html className="block font-serif text-[14px] leading-[1.55]" text={solution} />}
          </>
        )}
      </div>
      <div className="col gap-3.5">
        <div className="sr-facts">
          <span className="muted">Marks</span>
          <span className={MKC[st(item)]}>
            {marksText(dd.marks)} of {r1(dd.maxMarks)}
          </span>
          <span className="muted">Time</span>
          <span className="num">
            {minSec(dd.timeSeconds)}
            {dd.batchAverageSeconds !== null ? ` · batch ${minSec(dd.batchAverageSeconds)}` : ""}
          </span>
          {dd.visits !== null && (
            <>
              <span className="muted">Visits</span>
              <span className="num">
                {dd.visits}
                {dd.changes?.length
                  ? ` · ${dd.changes
                      .map((c) => `changed ${changeLabel(c.from, opts)} → ${changeLabel(c.to, opts)} at ${fmtTime(c.at)}`)
                      .join(", ")}`
                  : ""}
              </span>
            </>
          )}
        </div>
        {shareRows.length > 0 && (
          <div className="col gap-1.5">
            <span className="xs font-semibold">How the batch answered</span>
            {shareRows.map((s) => (
              <div key={s.label} className="row xs gap-2">
                <span className="mono w-16 flex-none truncate">{s.label}</span>
                <span className={`sr-ob ${s.cls}`} style={{ width: `${Math.max(2, s.share * 100) * 1.4}px` }} />
                <span className="num">
                  {Math.round(s.share * 100)}%{s.note}
                </span>
              </div>
            ))}
          </div>
        )}
        {ins && ins.option.letter === myLetter && (
          <div className="ai row gap-2 rounded-control p-2.5">
            <span className="ai-mark whitespace-nowrap">✦ Why {ins.option.letter}</span>
            <MathText as="span" className="xs" text={ins.text} />
          </div>
        )}
      </div>
    </div>
  );
}

/** an answer-log value ("OP_…_B", "12.5", "P-2") as the student saw it */
function changeLabel(v: string | null, opts: Array<{ id: string }>): string {
  if (v === null || v === "") return "blank";
  const parts = v.split(",").map((p) => {
    const i = opts.findIndex((o) => o.id === p.trim());
    return i >= 0 ? LETTER(i) : p.trim();
  });
  return parts.join(", ");
}

function shareList(d: ReportQuestionDetail, item: ReportQuestion, opts: Array<{ id: string }>, name: string) {
  const sh = d.shares ?? {};
  const keyIds = new Set(item.key.optionIds ?? []);
  const mine = new Set(item.yours?.optionIds ?? []);
  const rows: Array<{ label: string; share: number; note: string; cls: string }> = [];
  if (opts.length && Object.keys(sh).some((k) => opts.some((o) => o.id === k))) {
    opts.forEach((o, i) => {
      const isKey = keyIds.has(o.id);
      const isMine = mine.has(o.id);
      rows.push({ label: LETTER(i), share: sh[o.id] ?? 0, note: [isKey ? " · key" : "", isMine ? ` · ${name}` : ""].join(""), cls: isKey ? "key" : isMine ? "mine" : "" });
    });
  } else {
    const yours = typeof item.yours?.value === "number" ? String(item.yours.value) : null;
    for (const [k, v] of Object.entries(sh)) {
      if (k === "skipped") continue;
      rows.push({ label: k, share: v, note: yours === k ? ` · ${name}` : "", cls: yours === k ? "mine" : "" });
    }
    rows.sort((a, b) => b.share - a.share);
    rows.splice(6);
  }
  if (typeof sh.skipped === "number" && sh.skipped > 0) rows.push({ label: "Skipped", share: sh.skipped, note: item.yours ? "" : ` · ${name}`, cls: item.yours ? "" : "mine" });
  return rows;
}

/* ═══════════════════════════════ print / PDF ═══════════════════════════════ */

interface PrintOpts {
  subjects: boolean;
  last: boolean;
  ai: boolean;
  grid: boolean;
  full: boolean;
  phone: boolean;
}

function PrintView({ r, sub, testId, studentId }: { r: Report; sub: Sub; testId: string; studentId: string }) {
  const [o, setO] = React.useState<PrintOpts>({ subjects: true, last: true, ai: true, grid: true, full: false, phone: false });
  const qs = useReportQuestions(testId, studentId, true);
  const ai = useStudentAiReview(testId, studentId, o.ai);
  const { me } = useCan();
  const brand = useBrand();
  const order = useOptionOrder(testId).data;
  const items = React.useMemo(() => qs.data ?? [], [qs.data]);
  const missed = items.filter((x) => x.outcome === "wrong" || x.outcome === "skipped");
  const fullQ = useQueries({
    queries: (o.full ? missed : []).map((x) => ({
      queryKey: ["m6", "report-question", testId, studentId, x.n],
      staleTime: 5 * 60_000,
      queryFn: async () => unwrap<ReportQuestionDetail>((await m6Tests.get(`/admin/tests/${encodeURIComponent(testId)}/students/${encodeURIComponent(studentId)}/report/questions/${x.n}`)).data),
    })),
  });
  const toggle = (k: keyof PrintOpts) => setO((p) => ({ ...p, [k]: !p[k] }));
  const vp = sub.vsPrevious;
  // "Written 1 Nov 2026 · 9:00 AM": when this student started (timeline), else when the test opened
  const opened = r.timeline.find((e) => e.kind === "started")?.at ?? r.test.opensAt;
  const leaks = ai.data?.status === "ready" ? ai.data.leaks : [];
  const corrected = r.keyCorrections;
  const MARK = { correct: "✓", wrong: "✗", skipped: "–", partial: "½" } as const;
  return (
    <div className="sr-printcols" data-testid="sr-print-view">
      <aside className="card pad-lg col gap-3">
        <span className="h3">Print or save as PDF</span>
        <span className="sm muted">A4, portrait, black and white friendly. Your browser&rsquo;s print window opens; pick &ldquo;Save as PDF&rdquo; there.</span>
        <div className="col gap-2">
          <span className="xs font-semibold">Include</span>
          {(
            [
              ["subjects", "Subjects and chapters"],
              ["last", "Last 5 tests"],
              ["ai", "AI review"],
              ["grid", `Answer grid (${items.length || r.test.questions} questions)`],
              ["full", `Wrong and skipped questions in full${missed.length ? ` (${missed.length})` : ""}`],
              ["phone", "Phone number"],
            ] as Array<[keyof PrintOpts, string]>
          ).map(([k, label]) => (
            <label key={k} className="k-chk row gap-2 sm">
              <input type="checkbox" checked={o[k]} onChange={() => toggle(k)} />
              {label}
            </label>
          ))}
        </div>
        <span className="xs muted">For parents&rsquo; meetings, print a whole batch from Results › Export.</span>
      </aside>
      <div className="sr-ground">
        <article className="sr-sheet" aria-label="Print preview">
          <div className="row between items-start">
            <div className="col gap-1">
              <span className="lbl">{brand.name} · Student report</span>
              <h2>{r.student.removed ? "Removed student" : r.student.name}</h2>
              <span>
                <StudentMeta r={r} phone={o.phone} />
              </span>
            </div>
            <div className="col items-end gap-1 text-right">
              <span className="font-semibold">{r.test.name}</span>
              {opened && (
                <span>
                  Written {dayMonthYear(opened)} · {fmtTime(opened)}
                </span>
              )}
              <span>
                {hMin(r.test.durationMinutes * 60)} · {r.test.questions} questions · {r1(r.test.maxScore)} marks
              </span>
            </div>
          </div>
          <div className="kp">
            <div className="col">
              <span className="lbl">Score</span>
              <b>
                {r1(sub.score)} / {r1(r.test.maxScore)}
              </b>
            </div>
            <div className="col">
              <span className="lbl">Rank</span>
              <b>{sub.rank ? `${sub.rank} of ${sub.of}` : "—"}</b>
            </div>
            <div className="col">
              <span className="lbl">Batch average</span>
              <b>{r1(sub.batchAverage)}</b>
            </div>
            <div className="col">
              <span className="lbl">{vp ? `vs ${vp.test.shortName || vp.test.name}` : "vs previous"}</span>
              <b>{vp ? `${vp.scoreDelta >= 0 ? "+" : "−"}${r1(Math.abs(vp.scoreDelta))} ${vp.unit === "percentPoints" ? "pts" : "marks"}` : "—"}</b>
            </div>
          </div>
          {o.subjects && (
            <table className="st">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th className="r">Marks</th>
                  <th className="r">Right</th>
                  <th className="r">Wrong</th>
                  <th className="r">Skipped</th>
                  <th className="r">Time</th>
                  <th className="r">Batch avg</th>
                </tr>
              </thead>
              <tbody>
                {r.subjects.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td className="r">
                      {r1(s.score)} / {r1(s.maxScore)}
                    </td>
                    <td className="r">{s.right}</td>
                    <td className="r">{s.wrong}</td>
                    <td className="r">{s.skipped}</td>
                    <td className="r">{hMin(s.timeSeconds)}</td>
                    <td className="r">{r1(s.batchAverage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(o.subjects || o.last) && (
            <div className="two">
              {o.subjects && (
                <div className="col gap-1.5">
                  <span className="lbl">Weakest chapters</span>
                  <table className="st">
                    <tbody>
                      {r.chapters.slice(0, 3).map((c) => (
                        <tr key={`${c.subject}-${c.chapter}`}>
                          <td>{c.chapter}</td>
                          <td className="r">
                            {c.right} of {c.questions} right
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {o.last && r.lastTests.length > 0 && (
                <div className="col gap-1.5">
                  <span className="lbl">Last {r.lastTests.length} tests</span>
                  <table className="st">
                    <tbody>
                      {r.lastTests.map((t) => (
                        <tr key={t.testId}>
                          <td>
                            {t.shortName || t.name} · {r1(t.score)}
                          </td>
                          <td className="r">{t.rank ? `rank ${t.rank}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {o.ai && leaks.length > 0 && (
            <div className="col gap-1">
              <span className="lbl">Where marks went (AI review)</span>
              <span>{leaks.map((k) => `${k.title} −${r1(k.marksLost)} (${k.questionNs.map((n) => `Q${n}`).join(", ")})`).join(" · ")}.</span>
            </div>
          )}
          {o.grid && items.length > 0 && (
            <div className="col gap-1.5">
              <span className="lbl">Answer grid · ✓ right · ✗ wrong · – skipped{items.some((x) => x.outcome === "partial") ? " · ½ partly" : ""}</span>
              <div className="sr-pgrid">
                {items.map((x) => (
                  <span key={x.n}>
                    {x.n} {MARK[x.outcome]}
                  </span>
                ))}
              </div>
              {corrected.length > 0 && (
                <span>
                  {corrected.map((k) => `Q${k.n}'s key was corrected on ${dayMonth(k.correctedAt)}`).join("; ")}; this report uses the corrected key.
                </span>
              )}
            </div>
          )}
          {o.full &&
            missed.map((x, i) => {
              const d = fullQ[i]?.data;
              const qq = d?.question;
              const ids = qq?.en.options?.map((op) => op.id) ?? order?.get(x.questionId);
              return (
                <div key={x.n} className="full col gap-1.5">
                  <span className="lbl">
                    Q{x.n} · {x.subject}
                    {x.chapter ? ` · ${x.chapter}` : ""} · {x.outcome === "wrong" ? "wrong" : "skipped"}
                  </span>
                  {qq ? <Html className="block font-serif text-[12.5px]" text={qq.en.question} /> : <span className="muted">Loading…</span>}
                  {qq?.en.options?.length ? (
                    <span className="font-serif">
                      {qq.en.options.map((op, j) => (
                        <span key={op.id} className="mr-3.5 inline-flex items-baseline gap-1">
                          ({LETTER(j)}) <Html text={op.value} />
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span>
                    Answer: <b className="mono">{yoursText(x, ids)}</b> · Key: <b className="mono">{keyText(x.type, x.key, ids)}</b>
                  </span>
                </div>
              );
            })}
          <div className="row between muted">
            <span>
              Printed {fmtDate(new Date().toISOString())}
              {me?.name ? ` by ${me.name}` : ""}
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}
