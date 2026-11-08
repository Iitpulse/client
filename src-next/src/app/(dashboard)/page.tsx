"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Check, Plus, TriangleAlert } from "lucide-react";
import { AiMark, InkUnderline, MathText } from "@iitpulse/ui";
import { api, apiQuestions, apiTests } from "@/lib/api";
import { useAuthStore, usePermissionsStore } from "@/stores";
import { Topbar } from "@/components/admin/Topbar";
import { Doodle, EmptyState, supportCode } from "@/components/kit";
import { useAdminTests } from "@/lib/m6/tests";
import { deltaTone, useAdminOverview, vsPrevious, useBankCounts, useBatchSummary, useLiveTests, useResultInsights } from "@/lib/queries-tests-admin";
import { useAllBatches, useCan, useMe, useUser } from "@/lib/m6/people";
import { useInstituteState } from "@/components/brand/InstituteBanners";
import { useBrand } from "@/lib/brand";
import { BulkPreviewDialog } from "@/components/questions-admin/bulk-ai";
import type { AdminOverview, DraftKind, LiveTest, QuestionFilter, QuestionSearchResponse, TestKind } from "@/lib/m5-contract";
import type { AdminResultsResponse, AdminTestListItem, TaxonomyTreeResponse } from "@/lib/m6-contract";

/*
  Admin-Dashboard board (canvas: states full, many-live, day-one, teacher, loading, card-errors, ai-paused).
  Numbers: GET /tests/admin/overview (tests this month, avg score + "vs previous", scheduled + drafts, Needs attention),
  GET /tests/admin/live (Live now, polled every 30 s), GET /questions/admin/search?pageSize=0 (bank total, missing
  solutions, Hindi still in English, needs LaTeX), GET /ai/admin/tests/:id/summary (the Summary line). The score spread
  and "Next 7 days" stay client-side (contract).
  - day one (no test yet, admins): the 5-step set-up card (batch / students from GET /users/admin/batches summary,
    questions from the bank total, first test) with empty Live now and Results cards.
  - teacher (userType teacher): their batches and subjects (GET /users/admin/users/:me), the subject's average from
    result-insights, the subject's marks spread from GET /tests/admin/tests/:id/results, their subjects' bank counts;
    buttons by permission (no "Add student" / "New test" without CREATE_USER / CREATE_TEST).
  - per card: skeletons while loading, "Couldn't load …" with Try again and a support code when a card fails.
  - AI paused (institute state or the summary's AI_PAUSED): AI buttons off with a note, the summary line says so. The
    shell's institute banner says why; the page draws its own banner only when that one is absent.
  Not built (no data): the teacher's "weakest chapter in the last test" attention row; the board's "Ask <name>".
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
/** "A", "A and B", "A, B and C" */
const andList = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}` : l[0] ?? "");
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const KIND: Record<TestKind, [string, string]> = {
  full: ["full mock", "full mocks"],
  sectional: ["sectional", "sectionals"],
  custom: ["custom test", "custom tests"],
};

type Kpi = { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: "good" | "bad" | "flat"; loading: boolean };

function Stat({ k, i }: { k: Kpi; i: number }) {
  const tone = k.tone === "good" ? "font-semibold text-success" : k.tone === "bad" ? "font-semibold text-warning" : "muted";
  return (
    <article className="card pad col lift rise gap-1" style={{ ["--i" as string]: i }} data-testid="dash-kpi">
      {k.loading ? (
        <div className="col gap-2.5 py-0.5" aria-busy="true" aria-label={`Loading ${k.label}`}>
          <span className="skel block h-2.5 w-[110px]" />
          <span className="skel block h-[22px] w-[70px]" />
          <span className="skel block h-2 w-[130px]" />
        </div>
      ) : (
        <>
          <span className="sm muted truncate">{k.label}</span>
          <span className="num text-[28px] font-[650]">
            {k.value}
            {k.unit && <span className="sm muted">{k.unit}</span>}
          </span>
          {k.sub && <span className={`xs truncate ${tone}`}>{k.sub}</span>}
        </>
      )}
    </article>
  );
}

/** A card that failed on its own (board card-errors): the rest of the page keeps working. */
function CardError({ title, body, error, onRetry, testId }: { title: string; body?: string; error: unknown; onRetry: () => void; testId?: string }) {
  return (
    <div className="col items-start gap-2 px-4 py-[18px]" role="alert" data-testid={testId}>
      <span className="sm font-semibold">{title}</span>
      {body && (
        <span className="xs muted">
          {body} Code {supportCode("E", error)}.
        </span>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, userDetails } = useAuthStore();
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
  return <AdminDashboard name={userDetails?.name || currentUser?.name || ""} instituteId={currentUser?.instituteId} />;
}

function AdminDashboard({ name, instituteId }: { name: string; instituteId?: string }) {
  const now = dayjs();
  const { hasAccess } = usePermissionsStore();
  const { can, me, roleName } = useCan();
  const { currentUser } = useAuthStore();
  const teacher = (me?.userType ?? currentUser?.userType) === "teacher";
  const canQuestions = hasAccess.question;
  const overview = useAdminOverview();
  const live = useLiveTests();
  const bank = useBankCounts(canQuestions && !teacher);
  // scheduled tests in the caller's scope (the M6 list; the legacy list refuses scoped roles)
  const tests = useAdminTests({ state: "scheduled", pageSize: 100 });
  const tenantName = useMe().data?.tenant.name ?? null;
  const router = useRouter();
  const brand = useBrand();
  const inst = useInstituteState();
  const [bulk, setBulk] = useState<{ kind: DraftKind; filter: QuestionFilter; total: number } | null>(null);
  const bulkSelection = useMemo(() => ({ filter: bulk?.filter ?? {} }), [bulk]);
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
  const instituteName = institute.data || tenantName || (brand.isDefault ? null : brand.name) || null;

  const ov = overview.data;
  const latest = ov?.latestResult ?? null;
  const summary = useBatchSummary(latest?.testId, !!latest);
  const aiOff = !!inst?.aiPaused || summary.data?.reason === "AI_PAUSED";

  // Day one: an institute with no test yet (admins; a teacher's empty dashboard keeps its normal cards).
  const dayOne = !teacher && !!ov && ov.counts.all === 0 && !latest;
  const setupBatches = useAllBatches(dayOne);

  // Teacher: own subjects and batches
  const meDetail = useUser(teacher && me ? me.id : null);
  const subjects = useMemo(() => (meDetail.data?.subjects ?? []).map((s) => s.name), [meDetail.data]);
  const myBatches = meDetail.data?.batches ?? [];
  const batchList = useAllBatches(teacher);
  const taxonomy = useQuery({
    queryKey: ["m6", "taxonomy", ""],
    enabled: teacher,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await apiQuestions.get("/admin/taxonomy");
      return (r.data?.data ?? r.data) as TaxonomyTreeResponse;
    },
  });
  const subjectIds = useMemo(() => {
    if (!teacher || !taxonomy.data) return [];
    return subjects.map((n) => taxonomy.data!.subjects.find((s) => same(s.name, n))).filter((s): s is NonNullable<typeof s> => !!s);
  }, [teacher, taxonomy.data, subjects]);
  // A teacher with no subject sees the bank they can read; otherwise their subjects' counts, summed
  const subjectBank = useQueries({
    queries: (subjectIds.length ? subjectIds.map((s) => s.id) : [null]).map((id) => ({
      queryKey: ["m5", "bank-counts", id],
      enabled: teacher && canQuestions && (!!taxonomy.data || taxonomy.isError),
      staleTime: 2 * 60_000,
      queryFn: async () => {
        const r = await apiQuestions.get("/admin/search", { params: { pageSize: 0, ...(id ? { subjectId: id } : {}) } });
        return (r.data?.data ?? r.data) as QuestionSearchResponse & { counts: { needsLatex?: number } };
      },
    })),
  });
  const teacherBank = useMemo(() => {
    if (!teacher || !subjectBank.length || subjectBank.some((q) => !q.data)) return null;
    return subjectBank.reduce(
      (a, q) => ({ total: a.total + q.data!.total, missingSolution: a.missingSolution + q.data!.counts.missingSolution, hindiMissing: a.hindiMissing + q.data!.counts.hindiMissing, needsLatex: a.needsLatex + (q.data!.counts.needsLatex ?? 0) }),
      { total: 0, missingSolution: 0, hindiMissing: 0, needsLatex: 0 }
    );
  }, [teacher, subjectBank]);
  const teacherBankLoading = teacher && canQuestions && !teacherBank && !subjectBank.some((q) => q.isError);

  // The latest result's subject (teacher): average from insights, marks spread from the M6 results table
  const insights = useResultInsights(teacher ? latest?.testId : undefined);
  const subjectRow = useMemo(() => insights.data?.subjects.find((x) => subjects.some((n) => same(n, x.subject))) ?? null, [insights.data, subjects]);
  const subjectMarks = useQuery({
    queryKey: ["dash", "subject-marks", latest?.testId, subjectRow?.subject],
    enabled: teacher && !!latest && !!subjectRow,
    staleTime: 60_000,
    queryFn: async () => {
      const out: number[] = [];
      for (let page = 1; page <= 10; page++) {
        const r = await apiTests.get(`/admin/tests/${encodeURIComponent(latest!.testId)}/results`, { params: { page, pageSize: 100 } });
        const d = (r.data?.data ?? r.data) as AdminResultsResponse;
        for (const it of d.items) {
          const s = it.sections.find((x) => same(x.name, subjectRow!.subject));
          if (s) out.push(s.score);
        }
        if (page * d.pageInfo.pageSize >= d.pageInfo.total) break;
      }
      return out;
    },
  });

  const spread = useQuery({
    queryKey: ["test-result", latest?.testId],
    enabled: !!latest && !teacher,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await api.tests.getAdminResult(latest!.testId);
      const d = r.data?.data ?? {};
      return (Array.isArray(d.submissions) ? d.submissions : []) as Submission[];
    },
  });

  // "Next 7 days", the empty "Live now" hint and the teacher's next test read the scheduled list, soonest first
  const upcoming = useMemo(
    () => [...(tests.data?.items ?? [])].filter((t) => t.opensAt).sort((a, b) => dayjs(a.opensAt).valueOf() - dayjs(b.opensAt).valueOf()),
    [tests.data]
  );
  const nextWeek = useMemo(() => upcoming.filter((t) => dayjs(t.opensAt).isBefore(now.add(7, "day"))), [upcoming, now]);
  const ofSubject = (t: AdminTestListItem, subj: string) => t.name.toLowerCase().includes(subj.toLowerCase());
  const nextForTeacher = useMemo(() => {
    if (!teacher || !upcoming.length) return null;
    const t = upcoming[0]!;
    return { t, subj: subjects.find((n) => ofSubject(t, n)) ?? null };
  }, [teacher, upcoming, subjects]);

  const first = (me?.name || name).split(/\s+/)[0];
  const kindLine = ov
    ? (Object.keys(KIND) as TestKind[])
        .filter((k) => ov.thisMonth.byKind[k])
        .map((k) => plural(ov.thisMonth.byKind[k], KIND[k][0], KIND[k][1]))
        .join(" · ")
    : "";

  const subLine = teacher
    ? [roleName ?? "Teacher", subjects.join(", "), myBatches.length ? andList(myBatches.map((b) => b.name)) : null, now.format("dddd D MMMM")].filter(Boolean).join(" · ")
    : dayOne
      ? `${instituteName ? `${instituteName} · ` : ""}let's get your first test out`
      : [instituteName, now.format("dddd D MMMM")].filter(Boolean).join(" · ");

  const kpis: Kpi[] = teacher
    ? (() => {
        const students = (batchList.data?.items ?? []).filter((b) => !myBatches.length || myBatches.some((m) => m.id === b.id)).reduce((a, b) => a + b.students, 0);
        const sr = subjectRow;
        return [
          {
            label: "Your batches",
            value: meDetail.data ? fmt(myBatches.length) : "—",
            sub: myBatches.length ? `${plural(students, "student")} · ${andList(myBatches.map((b) => b.name))}` : meDetail.data ? "No batch yet" : undefined,
            loading: meDetail.isLoading,
          },
          {
            label: sr && latest ? `${sr.subject} avg · ${latest.name}` : latest ? `Avg score · ${latest.name}` : "Avg score",
            value: sr ? fmt(Math.round(sr.average * 10) / 10) : latest ? fmt(Math.round(latest.average)) : "—",
            unit: sr ? `/${sr.maxScore}` : latest ? `/${latest.maxScore}` : undefined,
            sub: sr && sr.delta !== null && insights.data?.previous ? vsPrevious(sr.delta, sr.deltaUnit, insights.data.previous.name) : latest ? `${plural(latest.appeared, "student")} wrote it` : ov ? "No results yet" : undefined,
            tone: sr && sr.delta !== null && insights.data?.previous ? deltaTone(sr.delta, sr.maxScore, sr.deltaUnit) : undefined,
            loading: overview.isLoading || (!!latest && insights.isLoading),
          },
          {
            label: "Your questions",
            value: teacherBank ? fmt(teacherBank.total) : "—",
            sub: teacherBank ? plural(teacherBank.missingSolution, "missing solution") : undefined,
            loading: teacherBankLoading,
          },
          {
            label: nextForTeacher?.subj ? `Next ${nextForTeacher.subj} test` : "Next test",
            value: nextForTeacher ? dayjs(nextForTeacher.t.opensAt).format("ddd D") : "—",
            sub: nextForTeacher ? `${nextForTeacher.t.name} · ${dayjs(nextForTeacher.t.opensAt).format("h:mm A")}` : tests.isSuccess ? "Nothing scheduled" : undefined,
            loading: tests.isLoading,
          },
        ];
      })()
    : [
        { label: "Tests this month", value: ov ? fmt(ov.thisMonth.tests) : "—", sub: kindLine || undefined, loading: overview.isLoading },
        {
          label: latest ? `Avg score · ${latest.name}` : "Avg score",
          value: latest ? fmt(Math.round(latest.average)) : "—",
          unit: latest ? `/${latest.maxScore}` : undefined,
          sub: latest
            ? latest.previous && latest.averageDelta !== null
              ? vsPrevious(latest.averageDelta, latest.averageDeltaUnit, latest.previous.name)
              : `${plural(latest.appeared, "student")} wrote it`
            : ov
              ? "No results yet"
              : undefined,
          tone: latest?.previous && latest.averageDelta !== null ? deltaTone(latest.averageDelta, latest.maxScore, latest.averageDeltaUnit) : undefined,
          loading: overview.isLoading,
        },
        { label: "Scheduled tests", value: ov ? fmt(ov.counts.scheduled) : "—", sub: ov && ov.counts.draft ? `${plural(ov.counts.draft, "draft")} in progress` : undefined, loading: overview.isLoading },
        {
          label: "Question bank",
          value: bank.data ? fmt(bank.data.total) : "—",
          sub: bank.data ? plural(bank.data.counts.missingSolution, "missing solution") : undefined,
          loading: canQuestions && bank.isLoading,
        },
      ];

  const subjectFilter: QuestionFilter = subjectIds.length === 1 ? { subjectId: subjectIds[0]!.id } : {};
  const subjectLabel = subjects.length === 1 ? `${subjects[0]} ` : "";
  const attention: AttentionRow[] = teacher
    ? teacherAttention(teacherBank, subjectFilter, subjectLabel, subjectIds.length > 1, can("CREATE_QUESTION", "UPDATE_QUESTION"))
    : attentionRows(ov, bank.data?.counts, canQuestions);
  const attentionLoading = teacher ? teacherBankLoading : overview.isLoading || (canQuestions && bank.isLoading);

  const liveTests = live.data?.tests ?? [];
  const LIVE_ROWS = 3;

  const canAddStudent = !!me && can("CREATE_USER");
  const canNewTest = !!me && can("CREATE_TEST");
  const canNewQuestion = !!me && teacher && can("CREATE_QUESTION");

  return (
    <>
      <Topbar
        title="Dashboard"
        actions={
          <>
            {canAddStudent && (
              <Link href="/users/new" className="btn btn-secondary btn-sm">
                Add student
              </Link>
            )}
            {canNewTest && (
              <Link href="/tests/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" aria-hidden />
                New test
              </Link>
            )}
            {canNewQuestion && (
              <Link href="/questions/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" aria-hidden />
                New question
              </Link>
            )}
          </>
        }
      />
      <main className="col gap-[18px] px-7 pt-6 pb-12" data-testid="dashboard" data-view={dayOne ? "day-one" : teacher ? "teacher" : "full"}>
        <div className="col rise gap-2">
          <h1 className="h1">
            {dayOne ? "Welcome" : greeting(now)}
            {first && (
              <>
                , <InkUnderline>{first}</InkUnderline>
              </>
            )}
          </h1>
          <span className="sm muted">{subLine}</span>
        </div>

        {aiOff && !inst?.aiPaused && (
          <div className="row gap-3 rounded-[12px] border border-[#F1D29A] bg-warning-50 px-4 py-2.5 text-[13px] leading-[1.45] text-[#5C3600]" role="status" data-testid="dash-ai-paused">
            <TriangleAlert className="size-[18px] flex-none" aria-hidden />
            <span className="grow">
              <b className="font-semibold">AI is paused.</b> Solution drafts, translations, summaries and students&rsquo; reviews wait until it&rsquo;s back on. Tests, scores and ranks work as usual.
            </span>
          </div>
        )}

        {dayOne ? (
          <DayOne
            institute={instituteName}
            host={brand.host}
            batches={setupBatches.data?.summary.batches ?? null}
            students={setupBatches.data?.summary.students ?? null}
            questions={bank.data?.total ?? null}
            canTests={canNewTest}
          />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4" data-testid="dash-stats">
              {kpis.map((k, i) => (
                <Stat key={k.label + i} k={k} i={i} />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
              <article className="card col rise xl:col-span-2" style={{ ["--i" as string]: 4 }} data-testid="dash-live">
                <div className="row between pad border-b border-line-2">
                  <span className="h3 row gap-2">
                    {!!liveTests.length && <span className="live-dot" />}
                    Live now
                    {liveTests.length > LIVE_ROWS && <span className="badge b-live h-5">{liveTests.length} tests</span>}
                  </span>
                  <Link href="/tests" className="sm font-semibold">
                    All tests
                  </Link>
                </div>
                <div className="col">
                  {live.isLoading && (
                    <div className="col gap-3 p-4" aria-busy="true" aria-label="Loading live tests">
                      <span className="skel block h-2.5 w-[180px]" />
                      <span className="skel block h-2 w-full" />
                      <span className="skel mt-2 block h-2.5 w-[160px]" />
                      <span className="skel block h-2 w-full" />
                    </div>
                  )}
                  {live.isError && <CardError testId="dash-live-error" title="Couldn't load live tests" body="The tests are running fine; only this card failed." error={live.error} onRetry={() => void live.refetch()} />}
                  {live.data && liveTests.length === 0 && (
                    <p className="sm muted px-4 py-6">
                      No test is live right now.
                      {upcoming[0] && ` Next: ${upcoming[0].name}, ${dayjs(upcoming[0].opensAt).format("ddd D MMM, h:mm A")}.`}
                    </p>
                  )}
                  {liveTests.slice(0, LIVE_ROWS).map((t, i, all) => (
                    <LiveRow key={t.testId} t={t} last={i === all.length - 1 && liveTests.length <= LIVE_ROWS} now={now} />
                  ))}
                  {liveTests.length > LIVE_ROWS && (
                    <Link href="/tests?status=live" className="sm px-4 py-3 font-semibold" data-testid="dash-live-more">
                      {liveTests.length - LIVE_ROWS} more live: {liveTests.slice(LIVE_ROWS).map((t) => t.name).join(", ")}
                    </Link>
                  )}
                </div>
              </article>

              <article className="card pad col rise gap-2.5" style={{ ["--i" as string]: 5 }} data-testid="dash-attention">
                <span className="h3">Needs attention</span>
                {attentionLoading ? (
                  <div className="col gap-2" aria-busy="true" aria-label="Loading">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="skel block h-11 w-full rounded-[10px]" />
                    ))}
                  </div>
                ) : overview.isError && !teacher ? (
                  <CardError title="Couldn't load what needs attention" error={overview.error} onRetry={() => void overview.refetch()} />
                ) : (
                  <>
                    {attention.length === 0 && <p className="sm muted">Nothing waiting on you.</p>}
                    {attention.map((a) => (
                      <div key={a.key} className={`row gap-2.5 rounded-control p-2.5 ${a.warn ? "bg-warning-50" : "bg-ground"}`}>
                        <span className="col min-w-0 grow gap-0.5">
                          <span className="sm font-semibold">{a.title}</span>
                          <span className="xs muted">{a.sub}</span>
                        </span>
                        {a.bulk ? (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={aiOff} onClick={() => setBulk(a.bulk!)}>
                            {a.action}
                          </button>
                        ) : (
                          <Link href={a.href} className={`btn btn-sm ${a.warn ? "btn-secondary" : "btn-ghost"}`}>
                            {a.action}
                          </Link>
                        )}
                      </div>
                    ))}
                    {aiOff && attention.some((a) => a.bulk) && <span className="xs muted">AI buttons are off until AI is back on.</span>}
                  </>
                )}
              </article>
            </section>

            <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
              <article className="card pad col rise gap-3.5 xl:col-span-2" style={{ ["--i" as string]: 6 }} data-testid="dash-spread">
                {(() => {
                  if (overview.isLoading || spread.isLoading || subjectMarks.isLoading || (teacher && !!latest && insights.isLoading))
                    return (
                      <>
                        <span className="h3">Score spread</span>
                        <span className="skel block h-[150px] w-full rounded-[10px]" aria-busy="true" aria-label="Loading the score spread" />
                      </>
                    );
                  if (overview.isError) return <CardError title="Couldn't load the score spread" error={overview.error} onRetry={() => void overview.refetch()} />;
                  if (latest && teacher && subjectRow && subjectMarks.data?.length)
                    return (
                      <ScoreSpread
                        testId={latest.testId}
                        title={`${latest.name} · ${subjectRow.subject} marks`}
                        sub={`${plural(subjectMarks.data.length, "student")}${myBatches.length ? " in your batches" : ""} · out of ${fmt(subjectRow.maxScore)}`}
                        max={subjectRow.maxScore}
                        scores={subjectMarks.data}
                        average={subjectRow.average}
                      />
                    );
                  if (latest && !teacher && spread.data?.length)
                    return (
                      <ScoreSpread
                        testId={latest.testId}
                        title={`${latest.name} · score spread`}
                        sub={`${plural(spread.data.length, "student")} · published ${dayjs(latest.publishedAt).format("D MMM")}`}
                        max={latest.maxScore}
                        scores={spread.data.map((s) => Number(s.obtainedMarks ?? s.totalMarks ?? 0))}
                        average={latest.average}
                      />
                    );
                  return (
                    <>
                      <span className="h3">Score spread</span>
                      <p className="sm muted">Shows here once a result is published and students have submitted.</p>
                    </>
                  );
                })()}
                {latest && (aiOff || (summary.data?.status === "ready" && summary.data.summary?.headline)) && (
                  <div className="ai row gap-2.5 px-3.5 py-3" data-testid="dash-summary">
                    <AiMark iconSize={13} className="flex-none">
                      Summary
                    </AiMark>
                    {aiOff ? (
                      <span className="sm muted">No summary while AI is paused. The chart and averages are complete.</span>
                    ) : (
                      <MathText as="span" className="sm" text={summary.data!.summary!.headline} />
                    )}
                  </div>
                )}
              </article>
              <article className="card col rise" style={{ ["--i" as string]: 7 }} data-testid="dash-week">
                <div className="pad row between border-b border-line-2">
                  <span className="h3">Next 7 days</span>
                  <Link href="/tests/calendar" className="sm font-semibold">
                    Calendar
                  </Link>
                </div>
                {tests.isError ? (
                  <CardError title="Couldn't load the schedule" error={tests.error} onRetry={() => void tests.refetch()} />
                ) : (
                  <div className="col py-1.5">
                    {tests.isLoading && <span className="skel mx-4 my-2.5 block h-10" aria-busy="true" />}
                    {tests.isSuccess && nextWeek.length === 0 && <p className="sm muted px-4 py-2.5">No tests scheduled this week.</p>}
                    {nextWeek
                      .slice(0, 6)
                      .map((t) => (
                        <Link key={t.testId} href={`/tests/${t.testId}/edit`} className="row gap-3 px-4 py-2.5 text-ink hover:bg-ground">
                          <span className="mono xs muted w-[52px] shrink-0 uppercase">{dayjs(t.opensAt).format("ddd D")}</span>
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
                )}
              </article>
            </section>
            {teacher && me && (
              <span className="xs muted" data-testid="dash-teacher-note">
                {teacherNote(myBatches.map((b) => b.name), subjects, can)}
              </span>
            )}
          </>
        )}
      </main>

      <BulkPreviewDialog
        kind={bulk?.kind ?? null}
        total={bulk?.total ?? 0}
        selection={bulkSelection}
        onClose={() => setBulk(null)}
        onStarted={() => {
          setBulk(null);
          router.push("/questions");
        }}
      />
    </>
  );
}

/** "You see your batches (A and B) and Physics only. You can add and edit questions; admins create tests and add students." */
function teacherNote(batches: string[], subjects: string[], can: (...k: string[]) => boolean): string {
  const scope = [batches.length ? `your batches (${andList(batches)})` : null, subjects.length ? andList(subjects) : null].filter(Boolean);
  const parts: string[] = [];
  if (scope.length) parts.push(`You see ${scope.join(" and ")} only.`);
  const mine = can("CREATE_QUESTION") && can("UPDATE_QUESTION") ? "You can add and edit questions" : can("CREATE_QUESTION") ? "You can add questions" : null;
  const theirs = [!can("CREATE_TEST") ? "create tests" : null, !can("CREATE_USER") ? "add students" : null].filter(Boolean) as string[];
  if (mine && theirs.length) parts.push(`${mine}; admins ${andList(theirs)}.`);
  else if (mine) parts.push(`${mine}.`);
  else if (theirs.length) parts.push(`Admins ${andList(theirs)}.`);
  parts.push("Ask an admin at your institute if you need more.");
  return parts.join(" ");
}

const noSub = () => () => {};

/** Board day-one: the 5-step set-up card, with empty Live now and Results cards beside it. */
function DayOne({ institute, host, batches, students, questions, canTests }: { institute: string | null; host: string | null; batches: number | null; students: number | null; questions: number | null; canTests: boolean }) {
  const here = useSyncExternalStore(noSub, () => window.location.host, () => null);
  const steps: Array<{ key: string; title: string; sub: string; done: boolean; href?: string; action?: string }> = [
    { key: "institute", title: "Your institute is ready", sub: `${host ?? here ?? "Your address"}, your logo and colours`, done: true },
    { key: "batch", title: "Make your first batch", sub: "A batch is a group of students who take the same tests", done: !!batches, href: "/setup?tab=batches", action: "Add a batch" },
    { key: "students", title: "Add students", sub: "One by one, or all at once from an Excel sheet", done: !!students, href: "/users/import", action: "Import from Excel" },
    { key: "questions", title: "Add questions", sub: "Upload a Word file; equations become maths and images are kept", done: !!questions, href: "/questions/bulk-upload", action: "Upload a Word file" },
    { key: "test", title: "Make your first test", sub: "Pick a pattern, pick questions, choose batches and a time", done: false, href: canTests ? "/tests/new" : undefined, action: "New test" },
  ];
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done)?.key;
  return (
    <section className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" data-testid="dash-day-one">
      <article className="card pad-lg col rise gap-3.5">
        <div className="row between wrap gap-2">
          <div className="col gap-0.5">
            <span className="h3">Set up {institute ?? "your institute"}</span>
            <span className="xs muted">About 20 minutes. Do them in any order; this card goes away when all are done.</span>
          </div>
          <span className="sm num font-semibold" data-testid="dash-setup-count">
            {done} of {steps.length} done
          </span>
        </div>
        <div className="bar h-1.5">
          <i style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <div className="col gap-2">
          {steps.map((s, i) => (
            <div
              key={s.key}
              data-testid={`dash-step-${s.key}`}
              data-done={s.done ? "1" : "0"}
              className={`row gap-3.5 rounded-[12px] border bg-surface px-3.5 py-3 ${s.key === next ? "border-brand ring-[3px] ring-brand-100" : "border-line"}`}
            >
              <span className={`inline-flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-[650] ${s.done ? "bg-success-50 text-success" : "bg-brand-50 text-brand"}`}>
                {s.done ? <Check className="size-4" aria-label="Done" /> : i + 1}
              </span>
              <span className="col min-w-0 grow gap-0.5">
                <span className={`sm font-semibold ${s.done ? "text-ink-2 line-through decoration-line" : ""}`}>{s.title}</span>
                <span className="xs muted">{s.sub}</span>
              </span>
              {!s.done && s.href && (
                <Link href={s.href} className={`btn btn-sm ${s.key === next ? "btn-primary" : "btn-secondary"}`}>
                  {s.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      </article>
      <div className="col gap-3.5">
        <article className="card col rise">
          <div className="pad border-b border-line-2">
            <span className="h3">Live now</span>
          </div>
          <div className="col items-start gap-1.5 px-4 py-[18px]">
            <span className="sm font-semibold">No test is live</span>
            <span className="xs muted">When one is, you&rsquo;ll see who&rsquo;s writing, who has submitted and who hasn&rsquo;t started.</span>
          </div>
        </article>
        <article className="card col rise">
          <div className="pad border-b border-line-2">
            <span className="h3">Results</span>
          </div>
          <div className="col items-start gap-1.5 px-4 py-[18px]">
            <Doodle size={48} />
            <span className="sm font-semibold">Score spread shows after your first test</span>
            <span className="xs muted">With the batch average, the top 1% and a short summary for teachers.</span>
          </div>
        </article>
      </div>
    </section>
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
          <Link href={`/tests/${t.testId}/monitor`} className="sm truncate font-semibold text-ink hover:text-brand">
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
  /** Opens the bulk cost preview for this selection instead of following href */
  bulk?: { kind: DraftKind; filter: QuestionFilter; total: number };
}

function attentionRows(ov: AdminOverview | undefined, bank: { missingSolution: number; hindiMissing: number } | undefined, canQuestions: boolean): AttentionRow[] {
  const rows: AttentionRow[] = [];
  if (canQuestions && bank?.missingSolution)
    rows.push({
      key: "missing-solution",
      title: `${plural(bank.missingSolution, "question")} without solutions`,
      sub: "Students can't get AI reviews for these",
      href: "/questions?missing=1",
      action: "Draft",
      warn: true,
      bulk: { kind: "solution", filter: { missingSolution: true }, total: bank.missingSolution },
    });
  if (canQuestions && bank?.hindiMissing)
    rows.push({
      key: "hindi-missing",
      title: `${fmt(bank.hindiMissing)} Hindi ${bank.hindiMissing === 1 ? "version" : "versions"} still in English`,
      sub: "Hindi readers see English text",
      href: "/questions?nohindi=1",
      action: "Translate",
      warn: true,
      bulk: { kind: "translation", filter: { hindiMissing: true }, total: bank.hindiMissing },
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

/** Board teacher: the teacher's own subjects' questions without solutions and with image equations. */
function teacherAttention(
  bank: { missingSolution: number; needsLatex: number } | null,
  filter: QuestionFilter,
  subjectLabel: string,
  severalSubjects: boolean,
  canEdit: boolean
): AttentionRow[] {
  if (!bank || !canEdit) return [];
  const rows: AttentionRow[] = [];
  const subjQs = filter.subjectId ? `&subject=${encodeURIComponent(filter.subjectId)}` : "";
  if (bank.missingSolution)
    rows.push({
      key: "missing-solution",
      title: `${fmt(bank.missingSolution)} of your questions ${bank.missingSolution === 1 ? "has" : "have"} no solution`,
      sub: "Students can't get AI reviews for these",
      href: `/questions?missing=1${subjQs}`,
      action: "Draft",
      warn: true,
      // several subjects: one selection cannot name them all, so the row opens the bank instead
      bulk: severalSubjects ? undefined : { kind: "solution", filter: { ...filter, missingSolution: true }, total: bank.missingSolution },
    });
  if (bank.needsLatex)
    rows.push({
      key: "needs-latex",
      title: `${plural(bank.needsLatex, `${subjectLabel}question`)} need LaTeX`,
      sub: "Their equations are images; convert with AI",
      href: `/questions?latex=1${subjQs}`,
      action: "Convert",
      warn: true,
    });
  return rows;
}

function ScoreSpread({ testId, title, sub, max: maxScore, scores, average }: { testId: string; title: string; sub: string; max: number; scores: number[]; average: number }) {
  const max = maxScore || Math.max(...scores, 1);
  const BINS = 12;
  const width = max / BINS;
  const counts = Array.from({ length: BINS }, () => 0);
  for (const s of scores) counts[Math.min(BINS - 1, Math.max(0, Math.floor(s / width)))]++;
  const peak = Math.max(...counts, 1);
  const avgPct = Math.min(100, Math.max(0, (average / max) * 100));
  const label = (i: number) => `${Math.round(i * width)}–${Math.round((i + 1) * width)}`;
  // "Top 1% · 275+": the highest non-empty bin, when it holds a small share of a sizeable batch.
  const topBin = counts.reduce((best, c, i) => (c ? i : best), -1);
  const topShare = topBin >= 0 ? (counts[topBin] / scores.length) * 100 : 100;
  const showTop = scores.length >= 10 && topShare <= 10;
  const avgLabel = Math.round(average * 10) / 10;
  return (
    <>
      <div className="row between">
        <div className="col gap-0.5">
          <span className="h3">{title}</span>
          <span className="xs muted">{sub}</span>
        </div>
        <Link href={`/tests/${testId}/result`} className="btn btn-ghost btn-sm">
          Full results
        </Link>
      </div>
      <div className="relative pt-[22px]">
        <div className="flex h-[120px] items-end gap-1.5" role="img" aria-label={`Score distribution of ${scores.length} students out of ${max}; average ${avgLabel}`}>
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
          <b className="mono absolute top-0 left-1.5 text-xs font-medium whitespace-nowrap text-brand">avg {avgLabel}</b>
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
