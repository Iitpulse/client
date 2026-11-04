"use client";

/*
  Admin-Results board. Data: GET /test/result/admin (test + submissions), students and batches for names.
  Not drawn (no API yet): the AI batch summary (M5 backend), "Send to parents" (out of scope, hidden),
  integrity flags (fullscreen exits are not in the result payload) and the "vs previous mock" deltas.
*/

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChevronDown, Search } from "lucide-react";

import { Topbar } from "@/components/admin/Topbar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores";
import { buildRows, duration, fmt, quantile, sectionMax, type Paper, type RawSubmission, type Row } from "@/lib/results";
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

function Stat({ label, value, sub, i }: { label: string; value: React.ReactNode; sub?: React.ReactNode; i: number }) {
  return (
    <article className="card pad col rise gap-1" style={{ ["--i" as string]: i }}>
      <span className="sm muted">{label}</span>
      <span className="num text-[28px] font-[650] tracking-[-.01em]">{value}</span>
      {sub && <span className="xs muted truncate">{sub}</span>}
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
  const [autoOnly, setAutoOnly] = React.useState(false);
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
        (!autoOnly || r.autoSubmitted)
    );
  }, [rows, q, batchFilter, autoOnly]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  React.useEffect(() => setPage(0), [q, batchFilter, autoOnly]);

  // Score spread: 12 equal bins over the paper's marks (negatives fall in the first bin).
  const maxMarks = test?.totalMarks || Math.max(1, ...marks);
  const bins = React.useMemo(() => {
    const out = Array.from({ length: 12 }, () => 0);
    for (const m of marks) out[Math.min(11, Math.max(0, Math.floor((m / maxMarks) * 12)))]++;
    return out;
  }, [marks, maxMarks]);
  const peak = Math.max(1, ...bins);

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
          <Stat i={0} label="Appeared" value={<>{rows.length}{assigned && assigned >= rows.length ? <span className="sm muted"> / {assigned}</span> : null}</>} sub={autoCount ? `${autoCount} auto-submitted` : "No auto-submits"} />
          <Stat i={1} label="Average" value={<>{fmt(avg)}<span className="sm muted">/{test.totalMarks ?? "—"}</span></>} sub={rows.length ? `${((avg / maxMarks) * 100).toFixed(0)}% of the paper` : undefined} />
          <Stat i={2} label="Highest" value={top ? fmt(top.marks) : "—"} sub={top?.name} />
          <Stat i={3} label="Median" value={rows.length ? fmt(quantile(marks, 0.5)) : "—"} sub={rows.length ? `Middle half: ${fmt(quantile(marks, 0.25), 0)}–${fmt(quantile(marks, 0.75), 0)}` : undefined} />
          <Stat i={4} label="Lowest" value={bottom ? fmt(bottom.marks) : "—"} sub={bottom?.name} />
        </section>

        {rows.length > 0 && (
          <section className="grid items-start gap-3.5 lg:grid-cols-3">
            <article className="card pad-lg col rise gap-3.5 lg:col-span-2" style={{ ["--i" as string]: 5 }}>
              <div className="row between">
                <div className="col gap-0.5">
                  <span className="h3">Score spread</span>
                  <span className="xs muted">{rows.length} students · {test.totalMarks ?? "—"} marks</span>
                </div>
              </div>
              <div className="relative pt-[22px]">
                <div className="rs-hist" role="img" aria-label={`Score distribution of ${rows.length} students; average ${fmt(avg)}`}>
                  {bins.map((c, i) => {
                    const lo = Math.round((i * maxMarks) / 12);
                    const hi = Math.round(((i + 1) * maxMarks) / 12);
                    return <span key={i} style={{ height: `${Math.max(c ? 4 : 0, (c / peak) * 100)}%`, animationDelay: `${i * 40}ms` }} title={`${lo}–${hi}: ${c} student${c === 1 ? "" : "s"}`} />;
                  })}
                </div>
                <span className="rs-avg" aria-hidden style={{ left: `${Math.min(100, Math.max(0, (avg / maxMarks) * 100))}%` }}>
                  <b>avg {fmt(avg, 0)}</b>
                </span>
              </div>
              <div className="row between xs muted mono">
                {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                  <span key={p}>{Math.round(p * maxMarks)}</span>
                ))}
              </div>
            </article>

            <article className="card pad-lg col rise gap-3" style={{ ["--i" as string]: 6 }}>
              <span className="h3">Subject averages</span>
              {sections.map((s, i) => {
                const vals = rows.map((r) => r.bySection[s.id]).filter((v) => typeof v === "number");
                const a = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
                const mx = sectionMax(s) || 1;
                return (
                  <div key={s.id} className="col gap-1.5">
                    <div className="row between sm">
                      <span>{s.name}</span>
                      <span className="num">
                        {fmt(a)} / {mx}
                      </span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${Math.max(0, Math.min(100, (a / mx) * 100))}%`, animationDelay: `${i * 0.1}s` }} />
                    </div>
                  </div>
                );
              })}
              {!sections.length && <span className="sm muted">This paper has no sections.</span>}
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
              {autoCount > 0 && (
                <button type="button" aria-pressed={autoOnly} className={`chip h-9 ${autoOnly ? "on" : ""}`} onClick={() => setAutoOnly((v) => !v)}>
                  Auto-submitted only
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
                    <td>{r.autoSubmitted && <span className="badge b-grey">Auto-submitted</span>}</td>
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
