"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import { AiMark, InkUnderline, MathText } from "@iitpulse/ui";
import { api } from "@/lib/api";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { Topbar } from "@/components/admin/Topbar";
import { EmptyState } from "@/components/kit";
import { type AdminTest, testState, useAllTests } from "@/lib/queries";
import { deltaTone, useAdminOverview, vsPrevious, useBankCounts, useBatchSummary, useLiveTests } from "@/lib/queries-tests-admin";
import { BulkPreviewDialog } from "@/components/questions-admin/bulk-ai";
import type { AdminOverview, DraftKind, LiveTest, TestKind } from "@/lib/m5-contract";

/*
  Admin-Dashboard board (canvas v84). Numbers: GET /tests/admin/overview (tests this month, avg score + "vs previous",
  scheduled + drafts, Needs attention), GET /tests/admin/live (Live now, polled every 30 s), GET /questions/admin/search
  ?pageSize=0 (bank total, missing solutions, Hindi still in English), GET /ai/admin/tests/:id/summary (the Summary line
  under the score spread). The score spread and "Next 7 days" stay client-side (contract).
  Not built (no board / not M5): "Active students", "Monitor".
  Draft / Translate open the same bulk cost preview as Admin-Questions (filter missingSolution / hindiMissing); once a
  job starts, the question bank shows its progress (its bulk bar restores the active job).
*/

interface Submission {
  studentId?: string;
  totalMarks?: number;
  obtainedMarks?: number;
}

function greeting(now = dayjs()) {
  const h = now.hour();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const STUDENT_PORTAL = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "https://tests.iitpulse.in";

const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, one: string, many = one + "s") => `${fmt(n)} ${n === 1 ? one : many}`;
const KIND: Record<TestKind, [string, string]> = {
  full: ["full mock", "full mocks"],
  sectional: ["sectional", "sectionals"],
  custom: ["custom test", "custom tests"],
};

function Stat({ label, value, sub, subTone, i }: { label: string; value: React.ReactNode; sub?: React.ReactNode; subTone?: "good" | "bad" | "flat"; i: number }) {
  const tone = subTone === "good" ? "font-semibold text-success" : subTone === "bad" ? "font-semibold text-warning" : "muted";
  return (
    <article className="card pad col lift rise gap-1" style={{ ["--i" as string]: i }}>
      <span className="sm muted truncate">{label}</span>
      <span className="num text-[28px] font-[650]">{value}</span>
      {sub && <span className={`xs truncate ${tone}`}>{sub}</span>}
    </article>
  );
}

const Skel = ({ w }: { w: string }) => <span className={`skel inline-block h-8 ${w}`} />;

export default function DashboardPage() {
  const { currentUser, userDetails } = useAuthStore();
  const { hasAccess } = usePermissionsStore();
  // Students sign in to the student app (the staff sign-in refuses them with STUDENT_ACCOUNT); an old student session
  // that still lands here gets a pointer there instead of the pre-M1 student dashboard.
  if (currentUser?.userType === "student") {
    return (
      <>
        <Topbar title="Dashboard" />
        <main className="col" style={{ padding: "22px 28px 40px" }}>
          <EmptyState
            title="This is the staff app"
            body="Your tests, results and progress are in the student app."
            actions={<a href={STUDENT_PORTAL} className="btn btn-primary btn-sm">Open the student app</a>}
          />
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
  const overview = useAdminOverview();
  const live = useLiveTests();
  const bank = useBankCounts(canQuestions);
  const tests = useAllTests();
  const router = useRouter();
  const [bulkKind, setBulkKind] = useState<DraftKind | null>(null);
  // Stable per kind: the dialog asks for a new preview whenever the selection object changes.
  const bulkSelection = useMemo(() => ({ filter: bulkKind === "solution" ? { missingSolution: true } : { hindiMissing: true } }), [bulkKind]);
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

  const ov = overview.data;
  const latest = ov?.latestResult ?? null;
  const spread = useQuery({
    queryKey: ["test-result", latest?.testId],
    enabled: !!latest,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await api.tests.getAdminResult(latest!.testId);
      const d = r.data?.data ?? {};
      return (Array.isArray(d.submissions) ? d.submissions : []) as Submission[];
    },
  });
  const summary = useBatchSummary(latest?.testId, !!latest);

  // "Next 7 days" and the empty "Live now" hint read the test list (client-side, as before).
  const nextWeek = useMemo(
    () =>
      (tests.data ?? [])
        .filter((t) => testState(t, now) === "scheduled" && dayjs(t.validity?.from).isBefore(now.add(7, "day")))
        .sort((a, b) => dayjs(a.validity?.from).valueOf() - dayjs(b.validity?.from).valueOf()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tests.data]
  );

  const attention = attentionRows(ov, bank.data?.counts, canQuestions);
  const first = name.split(/\s+/)[0];
  const kindLine = ov
    ? (Object.keys(KIND) as TestKind[])
        .filter((k) => ov.thisMonth.byKind[k])
        .map((k) => plural(ov.thisMonth.byKind[k], KIND[k][0], KIND[k][1]))
        .join(" · ")
    : "";
  const ovMissing = overview.isError ? "—" : null;

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

        <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4" data-testid="dash-stats">
          <Stat i={0} label="Tests this month" value={ov ? fmt(ov.thisMonth.tests) : ovMissing ?? <Skel w="w-12" />} sub={kindLine || undefined} />
          <Stat
            i={1}
            label={latest ? `Avg score · ${latest.name}` : "Avg score"}
            value={
              latest ? (
                <>
                  {fmt(Math.round(latest.average))}
                  <span className="sm muted">/{latest.maxScore}</span>
                </>
              ) : ov || overview.isError ? (
                "—"
              ) : (
                <Skel w="w-20" />
              )
            }
            sub={
              latest
                ? latest.previous && latest.averageDelta !== null
                  ? vsPrevious(latest.averageDelta, latest.averageDeltaUnit, latest.previous.name)
                  : `${plural(latest.appeared, "student")} wrote it`
                : ov
                  ? "No results yet"
                  : undefined
            }
            subTone={latest?.previous && latest.averageDelta !== null ? deltaTone(latest.averageDelta, latest.maxScore, latest.averageDeltaUnit) : undefined}
          />
          <Stat
            i={2}
            label="Scheduled tests"
            value={ov ? fmt(ov.counts.scheduled) : ovMissing ?? <Skel w="w-12" />}
            sub={ov && ov.counts.draft ? `${plural(ov.counts.draft, "draft")} in progress` : undefined}
          />
          <Stat
            i={3}
            label="Question bank"
            value={bank.data ? fmt(bank.data.total) : canQuestions && !bank.isError ? <Skel w="w-20" /> : "—"}
            sub={bank.data ? `${plural(bank.data.counts.missingSolution, "missing solution")}` : undefined}
          />
        </section>

        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
          <article className="card col rise xl:col-span-2" style={{ ["--i" as string]: 4 }} data-testid="dash-live">
            <div className="row between pad border-b border-line-2">
              <span className="h3 row gap-2">
                {!!live.data?.tests.length && <span className="live-dot" />}
                Live now
              </span>
              <Link href="/tests" className="sm font-semibold">
                All tests
              </Link>
            </div>
            <div className="col">
              {live.isLoading && <div className="skel m-4 h-14" />}
              {live.isError && <p className="sm muted px-4 py-6">Live attempts could not be loaded.</p>}
              {live.data && live.data.tests.length === 0 && (
                <p className="sm muted px-4 py-6">
                  No test is live right now.
                  {nextWeek[0] && ` Next: ${nextWeek[0].name}, ${dayjs(nextWeek[0].validity?.from).format("ddd D MMM, h:mm A")}.`}
                </p>
              )}
              {live.data?.tests.map((t, i, all) => (
                <LiveRow key={t.testId} t={t} last={i === all.length - 1} now={now} />
              ))}
            </div>
          </article>

          <article className="card pad col rise gap-2.5" style={{ ["--i" as string]: 5 }} data-testid="dash-attention">
            <span className="h3">Needs attention</span>
            {overview.isLoading && <div className="skel h-14" />}
            {!overview.isLoading && attention.length === 0 && <p className="sm muted">Nothing waiting on you.</p>}
            {attention.map((a) => (
              <div key={a.key} className={`row gap-2.5 rounded-control p-2.5 ${a.warn ? "bg-warning-50" : "bg-ground"}`}>
                <span className="col grow gap-0.5">
                  <span className="sm font-semibold">{a.title}</span>
                  <span className="xs muted">{a.sub}</span>
                </span>
                {a.bulk ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBulkKind(a.bulk!)}>
                    {a.action}
                  </button>
                ) : (
                  <Link href={a.href} className={`btn btn-sm ${a.warn ? "btn-secondary" : "btn-ghost"}`}>
                    {a.action}
                  </Link>
                )}
              </div>
            ))}
          </article>
        </section>

        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
          <article className="card pad col rise gap-3.5 xl:col-span-2" style={{ ["--i" as string]: 6 }} data-testid="dash-spread">
            {latest && spread.data?.length ? (
              <ScoreSpread
                testId={latest.testId}
                name={latest.name}
                max={latest.maxScore}
                publishedAt={latest.publishedAt}
                submissions={spread.data}
                average={latest.average}
              />
            ) : (
              <>
                <span className="h3">Score spread</span>
                <p className="sm muted">{overview.isLoading || spread.isLoading ? "Loading…" : "Shows here once a result is published and students have submitted."}</p>
              </>
            )}
            {summary.data?.status === "ready" && summary.data.summary?.headline && (
              <div className="ai row gap-2.5 px-3.5 py-3" data-testid="dash-summary">
                <AiMark iconSize={13} className="flex-none">
                  Summary
                </AiMark>
                <MathText as="span" className="sm" text={summary.data.summary.headline} />
              </div>
            )}
          </article>
          <article className="card col rise" style={{ ["--i" as string]: 7 }}>
            <div className="pad border-b border-line-2">
              <span className="h3">Next 7 days</span>
            </div>
            <div className="col py-1.5">
              {!tests.isLoading && nextWeek.length === 0 && <p className="sm muted px-4 py-2.5">No tests scheduled this week.</p>}
              {nextWeek.slice(0, 6).map((t: AdminTest) => (
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

      <BulkPreviewDialog
        kind={bulkKind}
        total={bulkKind === "solution" ? bank.data?.counts.missingSolution ?? 0 : bank.data?.counts.hindiMissing ?? 0}
        selection={bulkSelection}
        onClose={() => setBulkKind(null)}
        onStarted={() => {
          setBulkKind(null);
          router.push("/questions");
        }}
      />
    </>
  );
}

/** Live now row: submitted / writing now / not started, and the auto-submitted count. */
function LiveRow({ t, last, now }: { t: LiveTest; last: boolean; now: dayjs.Dayjs }) {
  const ends = dayjs(t.closesAt);
  const parts: Array<[number, string, string]> = [
    [t.submitted, "var(--green)", `${t.submitted} submitted`],
    [t.writing, "var(--navy)", `${t.writing} writing`],
    [t.notStarted ?? 0, "var(--line)", `${t.notStarted ?? "unknown"} not started`],
  ];
  return (
    <div className={`row gap-4 px-4 py-3.5 ${last ? "" : "border-b border-line-2"}`} data-testid="dash-live-row">
      <div className="col grow gap-1.5">
        <div className="row between gap-3">
          <Link href={`/tests/${t.testId}/result`} className="sm truncate font-semibold text-ink hover:text-brand">
            {t.name}
          </Link>
          <span className="xs muted shrink-0">ends {ends.format(ends.isSame(now, "day") ? "h:mm A" : "ddd h:mm A")}</span>
        </div>
        <div className="mix" role="img" aria-label={parts.map((p) => p[2]).join(", ")}>
          {parts.map(([n, bg], i) => (
            <span key={i} style={{ flex: n || 0.0001, background: bg, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
        <div className="row wrap xs muted gap-x-3.5 gap-y-1">
          <span>
            <b className="text-success">{fmt(t.submitted)}</b> submitted
          </span>
          <span>
            <b className="text-brand">{fmt(t.writing)}</b> writing now
          </span>
          <span>
            <b>{t.notStarted === null ? "—" : fmt(t.notStarted)}</b> not started
          </span>
          {t.autoSubmitted > 0 && <span>{fmt(t.autoSubmitted)} auto-submitted</span>}
        </div>
      </div>
    </div>
  );
}

interface AttentionRow {
  key: string;
  title: string;
  sub: string;
  href: string;
  action: string;
  warn?: boolean;
  /** Opens the bulk cost preview for this kind instead of following href */
  bulk?: DraftKind;
}

function attentionRows(ov: AdminOverview | undefined, bank: { missingSolution: number; hindiMissing: number } | undefined, canQuestions: boolean): AttentionRow[] {
  const rows: AttentionRow[] = [];
  if (canQuestions && bank?.missingSolution)
    rows.push({
      key: "missing-solution",
      title: `${plural(bank.missingSolution, "question")} without solutions`,
      sub: "Students can't get AI reviews for these",
      href: "/questions",
      action: "Draft",
      warn: true,
      bulk: "solution",
    });
  if (canQuestions && bank?.hindiMissing)
    rows.push({
      key: "hindi-missing",
      title: `${fmt(bank.hindiMissing)} Hindi ${bank.hindiMissing === 1 ? "version" : "versions"} still in English`,
      sub: "Hindi readers see English text",
      href: "/questions",
      action: "Translate",
      warn: true,
      bulk: "translation",
    });
  for (const t of ov?.attention.draftTests ?? []) {
    const opens = t.opensAt ? `Opens ${dayjs(t.opensAt).format("D MMM")}` : "No dates yet";
    rows.push({
      key: `draft-${t.testId}`,
      title: `${t.name} is still a draft`,
      sub: t.short ? `${opens} · ${plural(t.short, "question")} short` : opens,
      href: `/tests/${t.testId}/edit`,
      action: "Open",
    });
  }
  const results = (ov?.attention.unpublishedResults ?? []).map((t) => ({
    key: `result-${t.testId}`,
    title: `${t.name} results not published`,
    sub: `Ended ${dayjs(t.closedAt).format("D MMM")}`,
    href: `/tests/${t.testId}/result`,
    action: "Open",
  }));
  // Board: four rows. Keep one unpublished result visible when drafts are many.
  const head = rows.slice(0, results.length ? 3 : 4);
  return [...head, ...results].slice(0, 4);
}

function ScoreSpread({
  testId,
  name,
  max: maxScore,
  publishedAt,
  submissions,
  average,
}: {
  testId: string;
  name: string;
  max: number;
  publishedAt: string;
  submissions: Submission[];
  average: number;
}) {
  const score = (s: Submission) => Number(s.obtainedMarks ?? s.totalMarks ?? 0);
  const max = maxScore || Math.max(...submissions.map(score), 1);
  const BINS = 12;
  const width = max / BINS;
  const counts = Array.from({ length: BINS }, () => 0);
  for (const s of submissions) counts[Math.min(BINS - 1, Math.max(0, Math.floor(score(s) / width)))]++;
  const peak = Math.max(...counts, 1);
  const avgPct = Math.min(100, Math.max(0, (average / max) * 100));
  const label = (i: number) => `${Math.round(i * width)}–${Math.round((i + 1) * width)}`;
  // "Top 1% · 275+": the highest non-empty bin, when it holds a small share of a sizeable batch.
  const topBin = counts.reduce((best, c, i) => (c ? i : best), -1);
  const topShare = topBin >= 0 ? (counts[topBin] / submissions.length) * 100 : 100;
  const showTop = submissions.length >= 10 && topShare <= 10;
  return (
    <>
      <div className="row between">
        <div className="col gap-0.5">
          <span className="h3">{name} · score spread</span>
          <span className="xs muted">
            {plural(submissions.length, "student")} · published {dayjs(publishedAt).format("D MMM")}
          </span>
        </div>
        <Link href={`/tests/${testId}/result`} className="btn btn-ghost btn-sm">
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
              className={`flex-1 rounded-t transition-colors hover:bg-brand ${showTop && i === topBin ? "bg-brand" : "bg-brand-200"}`}
              style={{ height: `${c ? Math.max((c / peak) * 100, 4) : 0}%` }}
            />
          ))}
        </div>
        <span aria-hidden className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-brand" style={{ left: `${avgPct}%` }}>
          <b className="mono absolute top-0 left-1.5 text-xs font-medium whitespace-nowrap text-brand">avg {Math.round(average)}</b>
        </span>
        {showTop && (
          <span aria-hidden className="absolute right-0 bottom-[30px] text-xs font-semibold whitespace-nowrap text-brand">
            Top {Math.max(1, Math.round(topShare))}% · {Math.round(topBin * width)}+
          </span>
        )}
      </div>
      <div className="row between xs muted mono">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f}>{Math.round(max * f)}</span>
        ))}
      </div>
    </>
  );
}
