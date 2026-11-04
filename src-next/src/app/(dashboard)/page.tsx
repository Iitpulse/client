"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import { InkUnderline } from "@iitpulse/ui";
import { api } from "@/lib/api";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { Topbar } from "@/components/admin/Topbar";
import LegacyDashboard from "@/components/student-dashboard-legacy";
import {
  type AdminTest,
  assignedStudents,
  questionCount,
  testState,
  useAllTests,
  useBatches,
  useQuestionBankTotals,
} from "@/lib/queries";

/* Admin-Dashboard board, without its AI parts (summary line, Draft/Translate actions): those arrive with the M5 AI backend. */

interface Submission {
  studentId?: string;
  totalMarks?: number;
}
interface AdminResult {
  submissions: Submission[];
  result?: { averageMarks?: number; totalAppeared?: number };
}

async function fetchResult(testId: string): Promise<AdminResult> {
  const r = await api.tests.getAdminResult(testId);
  const d = r.data?.data ?? {};
  return { submissions: Array.isArray(d.submissions) ? d.submissions : [], result: d.result };
}

function greeting(now = dayjs()) {
  const h = now.hour();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, one: string, many = one + "s") => `${fmt(n)} ${n === 1 ? one : many}`;

function Stat({ label, value, sub, subTone, i }: { label: string; value: React.ReactNode; sub?: React.ReactNode; subTone?: "good"; i: number }) {
  return (
    <article className="card pad col lift rise gap-1" style={{ ["--i" as string]: i }}>
      <span className="sm muted">{label}</span>
      <span className="num text-[28px] font-[650]">{value}</span>
      {sub && <span className={`xs ${subTone === "good" ? "font-semibold text-success" : "muted"}`}>{sub}</span>}
    </article>
  );
}

export default function DashboardPage() {
  const { currentUser, userDetails } = useAuthStore();
  const { hasAccess } = usePermissionsStore();
  if (currentUser?.userType === "student") {
    return (
      <>
        <Topbar title="Dashboard" />
        <main data-legacy="" className="flex-1 p-6">
          <LegacyDashboard />
        </main>
      </>
    );
  }
  return <AdminDashboard name={userDetails?.name || currentUser?.name || ""} instituteId={currentUser?.instituteId} canTests={hasAccess.test} canUsers={hasAccess.user} canQuestions={hasAccess.question} />;
}

function AdminDashboard({
  name,
  instituteId,
  canTests,
  canUsers,
  canQuestions,
}: {
  name: string;
  instituteId?: string;
  canTests: boolean;
  canUsers: boolean;
  canQuestions: boolean;
}) {
  const now = dayjs();
  const tests = useAllTests();
  const batches = useBatches();
  const bank = useQuestionBankTotals(canQuestions);
  const students = useQuery({
    queryKey: ["students", "count"],
    enabled: canUsers,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await api.users.getStudents();
      const rows = Array.isArray(r.data?.data) ? r.data.data : [];
      return rows.length as number;
    },
  });
  const institute = useQuery({
    queryKey: ["institute", instituteId],
    enabled: !!instituteId,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      try {
        const r = await api.institutes.getById(instituteId!);
        return (r.data?.data?.name ?? r.data?.name ?? null) as string | null;
      } catch {
        // Legacy accounts store the institute's name as its id.
        const all = await api.institutes.getAll();
        const list: Array<{ _id: string; name: string }> = Array.isArray(all.data) ? all.data : all.data?.data ?? [];
        return list.find((i) => i._id === instituteId || i.name === instituteId)?.name ?? null;
      }
    },
  });

  const grouped = useMemo(() => {
    const all = tests.data ?? [];
    const byState = { live: [] as AdminTest[], scheduled: [] as AdminTest[], draft: [] as AdminTest[], ended: [] as AdminTest[] };
    for (const t of all) byState[testState(t, now)].push(t);
    const thisMonth = all.filter((t) => t.status !== "draft" && t.validity?.from && dayjs(t.validity.from).isSame(now, "month"));
    const kinds = new Map<string, number>();
    for (const t of thisMonth) {
      const k = (t as { kind?: string }).kind;
      if (k) kinds.set(k, (kinds.get(k) ?? 0) + 1);
    }
    const ended = [...byState.ended].sort((a, b) => dayjs(b.validity?.to).valueOf() - dayjs(a.validity?.to).valueOf());
    const nextWeek = byState.scheduled
      .filter((t) => dayjs(t.validity?.from).isBefore(now.add(7, "day")))
      .sort((a, b) => dayjs(a.validity?.from).valueOf() - dayjs(b.validity?.from).valueOf());
    return { ...byState, ended, thisMonth, kinds, nextWeek };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests.data]);

  // Submissions for the live tests and the three most recently ended ones (the score spread uses the first with any).
  const resultIds = [...grouped.live.map((t) => t._id), ...grouped.ended.slice(0, 3).map((t) => t._id)];
  const results = useQueries({
    queries: resultIds.map((id) => ({ queryKey: ["test-result", id], queryFn: () => fetchResult(id), staleTime: 60_000 })),
  });
  const resultOf = (id: string) => results[resultIds.indexOf(id)]?.data;
  const spreadTest = grouped.ended.slice(0, 3).find((t) => (resultOf(t._id)?.submissions.length ?? 0) > 0);
  const spread = spreadTest ? resultOf(spreadTest._id) : undefined;

  const attention = [
    ...grouped.draft.map((t) => {
      const { filled, needed } = questionCount(t);
      const short = Math.max(needed - filled, 0);
      const opens = t.validity?.from ? `Opens ${dayjs(t.validity.from).format("D MMM")}` : "No dates yet";
      return {
        key: t._id,
        title: `${t.name} is still a draft`,
        sub: short ? `${opens} · ${plural(short, "question")} short` : opens,
        href: `/tests/${t._id}/edit`,
        action: "Open",
      };
    }),
    ...grouped.ended
      .filter((t) => !t.result?.isPublished && !t.result?.publishProps?.isPublished && t.result?.publishProps?.type !== "immediately")
      .slice(0, 3)
      .map((t) => ({
        key: t._id,
        title: `${t.name}: results not published`,
        sub: `Ended ${dayjs(t.validity?.to).format("D MMM")}`,
        href: `/tests/${t._id}/result`,
        action: "Results",
      })),
  ].slice(0, 4);

  const first = name.split(/\s+/)[0];
  const kindLine = [...grouped.kinds.entries()].map(([k, n]) => `${n} ${k}`).join(" · ");

  return (
    <>
      <Topbar
        title="Dashboard"
        actions={
          <>
            {canUsers && (
              <Link href="/users/new" className="btn btn-secondary btn-sm">
                Add student
              </Link>
            )}
            {canTests && (
              <Link href="/tests/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" aria-hidden />
                New test
              </Link>
            )}
          </>
        }
      />
      <main className="col gap-[18px] px-7 pt-6 pb-12">
        <div className="col rise gap-2">
          <h1 className="h1">
            {greeting(now)}
            {first && (
              <>
                , <InkUnderline>{first}</InkUnderline>
              </>
            )}
          </h1>
          <span className="sm muted">{[institute.data, now.format("dddd D MMMM")].filter(Boolean).join(" · ")}</span>
        </div>

        <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Stat
            i={0}
            label="Active students"
            value={students.data !== undefined ? fmt(students.data) : canUsers ? <span className="skel inline-block h-8 w-20" /> : "—"}
            sub={batches.data ? `in ${plural(batches.data.length, "batch", "batches")}` : undefined}
          />
          <Stat
            i={1}
            label="Tests this month"
            value={tests.data ? grouped.thisMonth.length : <span className="skel inline-block h-8 w-12" />}
            sub={kindLine || undefined}
          />
          <Stat
            i={2}
            label={spreadTest ? `Avg score · ${spreadTest.name}` : "Avg score"}
            value={
              spread && spreadTest ? (
                <>
                  {fmt(Math.round(spread.result?.averageMarks ?? 0))}
                  {spreadTest.totalMarks ? <span className="sm muted">/{spreadTest.totalMarks}</span> : null}
                </>
              ) : (
                "—"
              )
            }
            sub={spread ? `${plural(spread.submissions.length, "student")} wrote it` : "No results yet"}
          />
          <Stat
            i={3}
            label="Question bank"
            value={bank.data ? fmt(bank.data.total) : canQuestions ? <span className="skel inline-block h-8 w-20" /> : "—"}
            sub={bank.data ? `${fmt(bank.data.byType.mcq)} MCQ · ${fmt(bank.data.byType.numerical)} numerical` : undefined}
          />
        </section>

        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
          <article className="card col rise xl:col-span-2" style={{ ["--i" as string]: 4 }}>
            <div className="row between pad border-b border-line-2">
              <span className="h3 row gap-2">
                {grouped.live.length > 0 && <span className="live-dot" />}
                Live now
              </span>
              <Link href="/tests" className="sm font-semibold">
                All tests
              </Link>
            </div>
            <div className="col">
              {tests.isLoading && <div className="skel m-4 h-14" />}
              {!tests.isLoading && grouped.live.length === 0 && (
                <p className="sm muted px-4 py-6">
                  No test is live right now.
                  {grouped.nextWeek[0] && ` Next: ${grouped.nextWeek[0].name}, ${dayjs(grouped.nextWeek[0].validity?.from).format("ddd D MMM, h:mm A")}.`}
                </p>
              )}
              {grouped.live.map((t, i) => {
                const submitted = resultOf(t._id)?.submissions.length;
                const assigned = assignedStudents(t, batches.data);
                const rest = assigned !== null && submitted !== undefined ? Math.max(assigned - submitted, 0) : null;
                return (
                  <div key={t._id} className={`row gap-4 px-4 py-3.5 ${i < grouped.live.length - 1 ? "border-b border-line-2" : ""}`}>
                    <div className="col grow gap-1.5">
                      <div className="row between">
                        <span className="sm font-semibold">{t.name}</span>
                        {t.validity?.to && (
                          <span className="xs muted">ends {dayjs(t.validity.to).format(dayjs(t.validity.to).isSame(now, "day") ? "h:mm A" : "ddd h:mm A")}</span>
                        )}
                      </div>
                      {submitted !== undefined && rest !== null ? (
                        <>
                          <div className="mix" role="img" aria-label={`${submitted} submitted, ${rest} yet to submit`}>
                            <span style={{ flex: submitted || 0.0001, background: "var(--green)" }} />
                            <span style={{ flex: rest || 0.0001, background: "var(--line)", animationDelay: ".08s" }} />
                          </div>
                          <div className="row xs muted gap-3.5">
                            <span>
                              <b className="text-success">{fmt(submitted)}</b> submitted
                            </span>
                            <span>
                              <b>{fmt(rest)}</b> yet to submit
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="xs muted">
                          {submitted !== undefined ? `${fmt(submitted)} submitted` : results[resultIds.indexOf(t._id)]?.isError ? "Attempts unavailable" : "Loading attempts…"}
                        </span>
                      )}
                    </div>
                    <Link href={`/tests/${t._id}/result`} className="btn btn-secondary btn-sm">
                      Results
                    </Link>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="card pad col rise gap-2.5" style={{ ["--i" as string]: 5 }}>
            <span className="h3">Needs attention</span>
            {tests.isLoading && <div className="skel h-14" />}
            {!tests.isLoading && attention.length === 0 && <p className="sm muted">Nothing waiting on you.</p>}
            {attention.map((a) => (
              <div key={a.key + a.action} className="row gap-2.5 rounded-control bg-ground p-2.5">
                <span className="col grow gap-0.5">
                  <span className="sm font-semibold">{a.title}</span>
                  <span className="xs muted">{a.sub}</span>
                </span>
                <Link href={a.href} className="btn btn-ghost btn-sm">
                  {a.action}
                </Link>
              </div>
            ))}
          </article>
        </section>

        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
          <article className="card pad col rise gap-3.5 xl:col-span-2" style={{ ["--i" as string]: 6 }}>
            {spreadTest && spread ? (
              <ScoreSpread test={spreadTest} submissions={spread.submissions} average={spread.result?.averageMarks ?? 0} />
            ) : (
              <>
                <span className="h3">Score spread</span>
                <p className="sm muted">{tests.isLoading || results.some((r) => r.isLoading) ? "Loading…" : "Shows here once a test has ended and students have submitted."}</p>
              </>
            )}
          </article>
          <article className="card col rise" style={{ ["--i" as string]: 7 }}>
            <div className="pad border-b border-line-2">
              <span className="h3">Next 7 days</span>
            </div>
            <div className="col py-1.5">
              {!tests.isLoading && grouped.nextWeek.length === 0 && <p className="sm muted px-4 py-2.5">No tests scheduled this week.</p>}
              {grouped.nextWeek.slice(0, 6).map((t) => (
                <Link key={t._id} href={`/tests/${t._id}/edit`} className="row gap-3 px-4 py-2.5 text-ink hover:bg-ground">
                  <span className="mono xs muted w-[52px] shrink-0 uppercase">{dayjs(t.validity?.from).format("ddd D")}</span>
                  <span className="sm grow truncate">{t.name}</span>
                  {t.batches?.[0] && (
                    <span className="badge b-grey min-w-0 max-w-[45%] shrink" title={t.batches.map((b) => b.name).join(", ")}>
                      <span className="truncate">{t.batches[0].name}</span>
                      {t.batches.length > 1 && <span className="shrink-0">+{t.batches.length - 1}</span>}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </article>
        </section>
      </main>
    </>
  );
}

function ScoreSpread({ test, submissions, average }: { test: AdminTest; submissions: Submission[]; average: number }) {
  const max = test.totalMarks || Math.max(...submissions.map((s) => s.totalMarks ?? 0), 1);
  const BINS = 12;
  const width = max / BINS;
  const counts = Array.from({ length: BINS }, () => 0);
  for (const s of submissions) counts[Math.min(BINS - 1, Math.max(0, Math.floor((s.totalMarks ?? 0) / width)))]++;
  const peak = Math.max(...counts, 1);
  const avgPct = Math.min(100, Math.max(0, (average / max) * 100));
  const label = (i: number) => `${Math.round(i * width)}–${Math.round((i + 1) * width)}`;
  return (
    <>
      <div className="row between">
        <div className="col gap-0.5">
          <span className="h3">{test.name} · score spread</span>
          <span className="xs muted">
            {plural(submissions.length, "student")}
            {test.validity?.to ? ` · ended ${dayjs(test.validity.to).format("D MMM")}` : ""}
          </span>
        </div>
        <Link href={`/tests/${test._id}/result`} className="btn btn-ghost btn-sm">
          Full results
        </Link>
      </div>
      <div className="relative pt-[22px]">
        <div
          className="flex h-[120px] items-end gap-1.5"
          role="img"
          aria-label={`Score distribution of ${submissions.length} students out of ${max}; average ${Math.round(average)}`}
        >
          {counts.map((c, i) => (
            <span
              key={i}
              title={`${label(i)}: ${plural(c, "student")}`}
              className="flex-1 rounded-t bg-brand-200 transition-colors hover:bg-brand"
              style={{ height: `${c ? Math.max((c / peak) * 100, 4) : 0}%` }}
            />
          ))}
        </div>
        <span aria-hidden className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-brand" style={{ left: `${avgPct}%` }}>
          <b className="mono absolute top-0 left-1.5 text-xs font-medium whitespace-nowrap text-brand">avg {Math.round(average)}</b>
        </span>
      </div>
      <div className="row between xs muted mono">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f}>{Math.round(max * f)}</span>
        ))}
      </div>
    </>
  );
}
