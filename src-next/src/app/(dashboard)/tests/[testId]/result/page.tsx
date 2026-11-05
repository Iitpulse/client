"use client";

/*
  Admin-Results board (canvas v84). Data: GET /test/result/admin (test + submissions), students and batches for names;
  M5: GET /tests/admin/tests/:id/result-insights (appeared / assigned, auto-submitted, average and subject averages vs the
  previous mock, integrity flags) and GET /ai/admin/tests/:id/summary (the batch summary card, polled while generating).
  Not built (no API in M5): "Send to parents", the summary's "Add to schedule" / "Assign practice" buttons.
  When insights are unavailable (an engine still on Mongo) the page falls back to the client-side numbers.
*/

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChevronDown, Search } from "lucide-react";
import { AiMark, MathText } from "@iitpulse/ui";

import { Topbar } from "@/components/admin/Topbar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores";
import { buildRows, duration, fmt, quantile, sectionMax, type Paper, type RawSubmission, type Row } from "@/lib/results";
import { deltaTone, m5ErrorCode, useBatchSummary, useResultInsights, vsPrevious } from "@/lib/queries-tests-admin";
import { toast } from "@/hooks/use-toast";
import type { BatchSummaryResponse, DeltaUnit, IntegrityInsights, ResultInsights } from "@/lib/m5-contract";
import "../results.css";

interface StudentInfo { id?: string; _id?: string; name: string; email?: string; batch?: string }
interface BatchInfo { id?: string; _id?: string; name: string; members?: Array<{ id?: string }> }

const PAGE = 25;

function useResultData(testId: string) {
  return useQuery({
    queryKey: ["test-result-admin", testId],
    queryFn: async () => {
      const [resultResponse, studentsResponse, batchesResponse] = await Promise.all([
        api.tests.getAdminResult(testId),
        api.users.getStudents(),
        api.batches.getAll(),
      ]);
      const data = (resultResponse.data?.data || resultResponse.data) as {
        test?: Paper;
        submissions?: RawSubmission[];
        result?: { totalAppeared?: number; highestMarks?: number; lowestMarks?: number; averageMarks?: number };
      };
      const students = (studentsResponse.data?.data || studentsResponse.data || []) as StudentInfo[];
      const batches = (batchesResponse.data?.data || batchesResponse.data || []) as BatchInfo[];
      return { data, students, batches };
    },
  });
}

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

/** Flags column: "3 fullscreen exits" (amber at the threshold), "1 fullscreen exit", "Auto-submitted". */
function Flags({ exits, threshold, auto }: { exits: number | null | undefined; threshold: number; auto: boolean }) {
  return (
    <span className="row wrap gap-1">
      {!!exits && <span className={`badge ${exits >= threshold ? "b-amber" : "b-grey"}`}>{exits} fullscreen {exits === 1 ? "exit" : "exits"}</span>}
      {auto && <span className="badge b-grey">Auto-submitted</span>}
    </span>
  );
}

/** "Batch summary for teachers" (AI). States the board does not draw render inside the same card. */
function BatchSummaryCard({ data, error, loading, appeared }: { data?: BatchSummaryResponse; error: unknown; loading: boolean; appeared: number }) {
  const s = data?.status === "ready" ? data.summary : null;
  const copy = async () => {
    if (!s) return;
    try {
      await navigator.clipboard.writeText(s.text);
      toast({ title: "Copied", description: "Paste the summary into WhatsApp." });
    } catch {
      toast({ title: "Could not copy", description: "Select the text and copy it instead.", variant: "destructive" });
    }
  };
  let note: string | null = null;
  if (!s && !loading && data?.status !== "generating") {
    const code = data?.reason ?? m5ErrorCode(error);
    note =
      code === "TOO_FEW_SUBMISSIONS"
        ? `The summary needs at least 5 submissions (${appeared} so far).`
        : code === "NO_SUBMISSIONS"
          ? "The summary appears once students submit."
          : "The batch summary is not available right now.";
  }
  return (
    <article className="ai pad-lg col rise gap-3 lg:col-span-2" style={{ ["--i" as string]: 5 }} data-testid="results-summary" data-status={data?.status ?? (error ? "error" : "loading")}>
      <div className="row between">
        <AiMark iconSize={13}>Batch summary for teachers</AiMark>
        {s && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            Copy for WhatsApp
          </button>
        )}
      </div>
      {s ? (
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
            Based on {s.basedOn.submissions} submission{s.basedOn.submissions === 1 ? "" : "s"}
            {s.basedOn.previous ? `, compared with ${s.basedOn.previous.name}` : ""}
          </span>
        </>
      ) : note ? (
        <p className="sm muted m-0">{note}</p>
      ) : (
        <div className="col gap-2" aria-busy="true" aria-label="Writing the batch summary">
          <span className="skel h-4 w-full" />
          <span className="skel h-4 w-[92%]" />
          <span className="skel h-4 w-[64%]" />
        </div>
      )}
    </article>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1 ? "g" : rank === 2 ? "s" : rank === 3 ? "b" : "";
  return <span className={`rs-rk ${cls}`}>{rank}</span>;
}

export default function TestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const { currentUser } = useAuthStore();
  const isStudent = currentUser?.userType === "student";
  const { data: bundle, isLoading } = useResultData(testId);

  const [q, setQ] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("all");
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const insightsQ = useResultInsights(isStudent ? undefined : testId);
  const insights: ResultInsights | undefined = insightsQ.data;
  const summaryQ = useBatchSummary(testId, !isStudent && (insights ? insights.appeared > 0 : !!bundle?.data?.submissions?.length));
  const integrity: IntegrityInsights | undefined = insights?.integrity;
  const flagOf = React.useMemo(() => new Map((integrity?.students ?? []).map((s) => [s.studentId, s])), [integrity]);
  const [page, setPage] = React.useState(0);

  const test = bundle?.data?.test;
  const submissions = React.useMemo(() => bundle?.data?.submissions ?? [], [bundle]);

  const { studentMap, batchMap } = React.useMemo(() => {
    const sMap = new Map<string, StudentInfo>();
    for (const s of bundle?.students ?? []) {
      const id = s.id || s._id;
      if (id) sMap.set(id, s);
    }
    const bMap = new Map<string, string>();
    for (const b of bundle?.batches ?? []) {
      const id = b.id || b._id;
      if (id) bMap.set(id, b.name);
    }
    return { studentMap: sMap, batchMap: bMap };
  }, [bundle]);

  const rows = React.useMemo(
    () =>
      buildRows(submissions, test, (id) => {
        const s = studentMap.get(id);
        return s ? { name: s.name, email: s.email, batch: s.batch ? batchMap.get(s.batch) : undefined } : undefined;
      }),
    [submissions, test, studentMap, batchMap]
  );

  const sections = test?.sections ?? [];
  const marks = React.useMemo(() => rows.map((r) => r.marks).sort((a, b) => a - b), [rows]);
  const summary = bundle?.data?.result;
  const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : summary?.averageMarks ?? 0;
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const autoCount = rows.filter((r) => r.autoSubmitted).length;

  // Students assigned through the test's batches (batch member lists), for "Appeared x / y".
  const assigned = React.useMemo(() => {
    const ids = new Set((test?.batches ?? []).map((b) => b.id));
    if (!ids.size) return null;
    const members = new Set<string>();
    for (const b of bundle?.batches ?? []) if (ids.has(b._id ?? "") || ids.has(b.id ?? "")) for (const m of b.members ?? []) if (m.id) members.add(m.id);
    return members.size || null;
  }, [test, bundle]);

  const batchOptions = React.useMemo(() => [...new Set(rows.map((r) => r.batch).filter(Boolean))] as string[], [rows]);
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle || r.name.toLowerCase().includes(needle) || r.studentId.toLowerCase().includes(needle) || (r.email ?? "").toLowerCase().includes(needle)) &&
        (batchFilter === "all" || r.batch === batchFilter) &&
        (!flaggedOnly || flagOf.has(r.studentId) || r.autoSubmitted)
    );
  }, [rows, q, batchFilter, flaggedOnly, flagOf]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  React.useEffect(() => setPage(0), [q, batchFilter, flaggedOnly]);
  const maxMarks = test?.totalMarks || Math.max(1, ...marks);
  const threshold = integrity?.threshold ?? 3;

  // Subject averages: the insights' (merged by subject, with the previous mock), else per section from the submissions.
  const subjectRows = React.useMemo(() => {
    if (insights?.subjects.length) return insights.subjects.map((x) => ({ key: x.subject, name: x.subject, average: x.average, max: x.maxScore, previous: x.previousAverage, previousMax: x.previousMaxScore ?? x.maxScore, delta: x.delta, unit: x.deltaUnit ?? null }));
    return sections.map((s) => {
      const vals = rows.map((r) => r.bySection[s.id]).filter((v) => typeof v === "number");
      return { key: s.id, name: s.name, average: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0, max: sectionMax(s) || 1, previous: null as number | null, previousMax: 1, delta: null as number | null, unit: null as DeltaUnit | null };
    });
  }, [insights, sections, rows]);

  const exportToCSV = () => {
    if (!test || !rows.length) return;
    const headers = ["Rank", "Student ID", "Name", "Email", "Batch", "Obtained Marks", "Total Marks", "Percentage", ...sections.map((s) => s.name), "Time Taken (sec)", "Auto-submitted", "Submitted At"];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
      [r.rank, r.studentId, r.name, r.email ?? "", r.batch ?? "", r.marks, test.totalMarks ?? "", r.percentage.toFixed(1), ...sections.map((s) => r.bySection[s.id] ?? ""), r.time || "", r.autoSubmitted ? "yes" : "", r.submittedAt ?? ""]
        .map(esc)
        .join(",")
    );
    const csv = [headers.map(esc).join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${test.name || "test"}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const published = !!(test?.result?.isPublished || test?.result?.publishProps?.isPublished);
  const publishDate = test?.result?.publishProps?.publishDate;
  const badge = !test ? null : published ? (
    <span className="badge b-green">Published{publishDate ? ` ${dayjs(publishDate).format("D MMM")}` : ""}</span>
  ) : test.hideResult ? (
    <span className="badge b-grey">Hidden from students</span>
  ) : (
    <span className="badge b-grey">Results not published</span>
  );

  const title = test ? `${test.name} · results` : "Results";

  if (isLoading || !test) {
    return (
      <>
        <Topbar title="Results" back={{ href: "/tests", label: "Tests" }} />
        <main className="col gap-3.5 px-7 pt-5 pb-10">
          {isLoading ? (
            <div className="grid grid-cols-5 gap-3">{Array.from({ length: 5 }, (_, i) => <span key={i} className="skel h-[104px]" />)}</div>
          ) : (
            <div className="card col items-center gap-1.5 p-12 text-center">
              <span className="h3">No results found</span>
              <span className="sm muted">This test has no result data yet.</span>
            </div>
          )}
        </main>
      </>
    );
  }

  if (isStudent) {
    const mine = rows.find((r) => r.studentId === currentUser?.id);
    return (
      <>
        <Topbar title={title} back={{ href: "/tests", label: "Tests" }} badge={badge} />
        <main className="col gap-3.5 px-7 pt-5 pb-10">
          {mine ? (
            <section className="grid gap-3 md:grid-cols-4">
              <Stat i={0} label="Your rank" value={`#${mine.rank}`} sub={`of ${rows.length}`} />
              <Stat i={1} label="Marks" value={<>{fmt(mine.marks)}<span className="sm muted">/{test.totalMarks ?? "—"}</span></>} />
              <Stat i={2} label="Percentage" value={`${mine.percentage.toFixed(1)}%`} />
              <Stat i={3} label="Time" value={duration(mine.time)} />
            </section>
          ) : (
            <div className="card pad sm muted">Your result is not available yet.</div>
          )}
          {mine && (
            <Link href={`/tests/${testId}/student/${currentUser?.id}`} className="btn btn-secondary self-start">
              View detailed analysis
            </Link>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={title}
        back={{ href: "/tests", label: "Tests" }}
        badge={badge}
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={exportToCSV} disabled={!rows.length}>
              Export CSV
            </button>
            <Link href={`/tests/${testId}/detailed-analysis`} className="btn btn-primary btn-sm">
              Question analysis
            </Link>
          </>
        }
      />
      <main className="col gap-4 px-7 pt-5 pb-10">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {(() => {
            const appeared = insights?.appeared ?? rows.length;
            const assignedN = insights ? insights.assigned : assigned;
            const auto = insights?.autoSubmitted ?? autoCount;
            const average = insights?.average ?? avg;
            const prev = insights?.previous ?? null;
            const delta = insights?.averageDelta ?? null;
            return (
              <>
                <Stat
                  i={0}
                  testId="results-appeared"
                  label="Appeared"
                  value={<>{appeared}{assignedN && assignedN >= appeared ? <span className="sm muted"> / {assignedN}</span> : null}</>}
                  sub={auto ? `${auto} auto-submitted` : "No auto-submits"}
                />
                <Stat
                  i={1}
                  testId="results-average"
                  label="Average"
                  value={rows.length || insights?.appeared ? fmt(average) : "—"}
                  sub={prev && delta !== null ? vsPrevious(delta, insights?.averageDeltaUnit, prev.name) : rows.length ? `${((average / maxMarks) * 100).toFixed(0)}% of the paper` : undefined}
                  tone={prev && delta !== null ? deltaTone(delta, insights?.test.maxScore ?? maxMarks, insights?.averageDeltaUnit) : undefined}
                />
                <Stat i={2} label="Highest" value={top ? fmt(top.marks) : "—"} sub={top?.name} />
                <Stat i={3} label="Median" value={rows.length ? fmt(quantile(marks, 0.5)) : "—"} sub={rows.length ? `Middle half: ${fmt(quantile(marks, 0.25), 0)}–${fmt(quantile(marks, 0.75), 0)}` : undefined} />
                <Stat
                  i={4}
                  testId="results-integrity"
                  label="Integrity flags"
                  value={integrity?.recorded ? integrity.flaggedCount : "—"}
                  sub={integrity && !integrity.recorded ? "Not recorded for this test" : `${threshold}+ fullscreen exits`}
                />
              </>
            );
          })()}
        </section>

        {rows.length > 0 && (
          <section className="grid items-start gap-3.5 lg:grid-cols-3">
            <BatchSummaryCard data={summaryQ.data} error={summaryQ.error} loading={summaryQ.isLoading} appeared={insights?.appeared ?? rows.length} />

            <article className="card pad-lg col rise gap-3" style={{ ["--i" as string]: 6 }} data-testid="results-subjects">
              <span className="h3">Subject averages</span>
              {subjectRows.map((x, i) => {
                const mx = x.max || 1;
                const tone = x.delta !== null ? deltaTone(x.delta, mx, x.unit) : null;
                return (
                  <div key={x.key} className="col gap-1.5">
                    <div className="row between sm">
                      <span>{x.name}</span>
                      <span className="num">
                        {fmt(x.average)} / {fmt(mx)}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="bar">
                        <i style={{ width: `${Math.max(0, Math.min(100, (x.average / mx) * 100))}%`, animationDelay: `${i * 0.1}s` }} />
                      </div>
                      {x.previous !== null && insights?.previous && (
                        <span
                          className="rs-tick"
                          style={{ left: `${Math.max(0, Math.min(100, (x.previous / (x.previousMax || mx)) * 100))}%` }}
                          title={`${insights.previous.name} average: ${fmt(x.previous)}${x.previousMax !== mx ? ` / ${fmt(x.previousMax)}` : ""}`}
                        />
                      )}
                    </div>
                    {x.delta !== null && insights?.previous && (
                      <span className={`xs ${tone === "good" ? "font-semibold text-success" : tone === "bad" ? "font-semibold text-warning" : "text-ink-2"}`}>
                        {vsPrevious(x.delta, x.unit, insights.previous.name)}
                      </span>
                    )}
                  </div>
                );
              })}
              {!subjectRows.length && <span className="sm muted">This paper has no sections.</span>}
              {insights?.previous && subjectRows.some((x) => x.previous !== null) && (
                <span className="xs muted row gap-1.5">
                  <span className="inline-block h-3 w-0.5 rounded-[1px] bg-ink" />
                  {insights.previous.name} average
                </span>
              )}
            </article>
          </section>
        )}

        <section className="card scrollx rise" style={{ ["--i" as string]: 7 }}>
          <div className="pad row between wrap gap-2 border-b border-line-2">
            <span className="h3">Students</span>
            <div className="row wrap gap-2">
              <label className="relative w-60">
                <span className="sr-only">Search students</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input className="input h-9 pl-[34px] text-[13px]" placeholder="Search name, email or ID" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              {batchOptions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={`chip h-9 ${batchFilter !== "all" ? "on" : ""}`}>
                      Batch: {batchFilter === "all" ? "all" : batchFilter} <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={batchFilter} onValueChange={setBatchFilter}>
                      <DropdownMenuRadioItem value="all">All batches</DropdownMenuRadioItem>
                      {batchOptions.map((b) => (
                        <DropdownMenuRadioItem key={b} value={b}>{b}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {(flagOf.size > 0 || autoCount > 0) && (
                <button type="button" aria-pressed={flaggedOnly} className={`chip h-9 ${flaggedOnly ? "on" : ""}`} onClick={() => setFlaggedOnly((v) => !v)}>
                  Flagged only
                </button>
              )}
            </div>
          </div>
          {rows.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th className="num">Score</th>
                  {sections.map((s) => (
                    <th key={s.id} className="num">{s.name}</th>
                  ))}
                  <th className="num">Time</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r: Row) => (
                  <tr key={r.studentId}>
                    <td><RankBadge rank={r.rank} /></td>
                    <td>
                      <span className="col gap-px">
                        <Link href={`/tests/${testId}/student/${r.studentId}`} className="sm font-semibold">
                          {r.name}
                        </Link>
                        {(r.batch || r.email) && <span className="xs muted">{[r.batch, r.email].filter(Boolean).join(" · ")}</span>}
                      </span>
                    </td>
                    <td className="num sm font-[650]">{fmt(r.marks)}</td>
                    {sections.map((s) => (
                      <td key={s.id} className="num sm">{r.bySection[s.id] !== undefined ? fmt(r.bySection[s.id]) : "—"}</td>
                    ))}
                    <td className="num sm">{duration(r.time)}</td>
                    <td>
                      <Flags exits={flagOf.get(r.studentId)?.fullscreenExits} threshold={threshold} auto={flagOf.get(r.studentId)?.autoSubmitted ?? r.autoSubmitted} />
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={5 + sections.length} className="sm muted py-8 text-center">No student matches these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="col items-center gap-1 p-12 text-center">
              <span className="h3">No submissions yet</span>
              <span className="sm muted">Students appear here once they submit the test.</span>
            </div>
          )}
          {rows.length > 0 && (
            <div className="row between px-4 py-3">
              <span className="xs muted">
                Showing {filtered.length ? `${page * PAGE + 1}–${Math.min(filtered.length, (page + 1) * PAGE)}` : 0} of {filtered.length}
              </span>
              {pageCount > 1 && (
                <div className="row gap-1.5">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
