"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarClock, ChevronDown, CircleCheck, Hand, MoreHorizontal, Plus, Search, Trash2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores";
import { toast } from "@/hooks/use-toast";
import { Topbar } from "@/components/admin/Topbar";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type AdminTest,
  type TestState,
  assignedStudents,
  questionCount,
  testState,
  useAllTests,
  useBatches,
  windowLabel,
} from "@/lib/queries";

/* Admin-Tests board. "Calendar view" and "Monitor" are not drawn: neither page exists yet. */

const PAGE = 15;
const TABS: { key: "all" | TestState; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "draft", label: "Drafts" },
  { key: "ended", label: "Ended" },
];
const BADGE: Record<TestState, [string, string]> = {
  live: ["b-live", "Live"],
  scheduled: ["b-navy", "Scheduled"],
  draft: ["b-sky", "Draft"],
  ended: ["b-grey", "Ended"],
};

function errorMessage(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message || (e instanceof Error ? e.message : fallback);
}

const RM = "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2 [&_svg]:shrink-0 [&_svg]:text-muted";

/** How results reach students (result.publishProps). */
function ResultMode({ t, state }: { t: AdminTest; state: TestState }) {
  const p = t.result?.publishProps;
  const published = t.result?.isPublished || p?.isPublished;
  if (state === "ended" && published)
    return (
      <span className={`${RM} font-semibold text-success`}>
        <CircleCheck className="size-3.5" aria-hidden />
        Published
      </span>
    );
  if (p?.type === "immediately" || p?.type === "atTheEndOfTest")
    return (
      <span className={RM}>
        <Zap className="size-3.5" aria-hidden />
        {p.type === "immediately" ? "Instant" : "At the end"}
      </span>
    );
  if (p?.type === "autoAfterXDays" && p.publishDate)
    return (
      <span className={RM}>
        <CalendarClock className="size-3.5" aria-hidden />
        On {dayjs(p.publishDate).format("D MMM")}
      </span>
    );
  return (
    <span className={RM}>
      <Hand className="size-3.5" aria-hidden />
      Manual
    </span>
  );
}

function FilterChip({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`chip h-9 ${value ? "on" : ""}`}>
          {label}: {value || "any"}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value="">Any</DropdownMenuRadioItem>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o} value={o}>
              {o}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TestsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const isStudent = useAuthStore((s) => s.currentUser?.userType === "student");
  const tests = useAllTests();
  const batches = useBatches();
  const exams = useQuery({
    queryKey: ["exams"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await api.exams.getAll();
      const rows: Array<{ name: string }> = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
      return rows.map((e) => e.name).filter(Boolean);
    },
  });

  const [tab, setTab] = useState<"all" | TestState>("all");
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("");
  const [exam, setExam] = useState("");
  const [page, setPage] = useState(0);
  const [toDelete, setToDelete] = useState<AdminTest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const now = dayjs();
  const withState = useMemo(
    () =>
      (tests.data ?? [])
        .map((t) => ({ t, state: testState(t, now) }))
        .sort((a, b) => {
          const order: Record<TestState, number> = { live: 0, scheduled: 1, draft: 2, ended: 3 };
          if (order[a.state] !== order[b.state]) return order[a.state] - order[b.state];
          const da = dayjs(a.t.validity?.from ?? a.t.createdAt).valueOf();
          const db = dayjs(b.t.validity?.from ?? b.t.createdAt).valueOf();
          return a.state === "scheduled" ? da - db : db - da;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tests.data]
  );
  const filtered = withState.filter(
    ({ t }) =>
      (!q || t.name.toLowerCase().includes(q.toLowerCase())) &&
      (!batch || t.batches?.some((b) => b.name === batch)) &&
      (!exam || t.exam?.name === exam)
  );
  const counts = { all: filtered.length, live: 0, scheduled: 0, draft: 0, ended: 0 } as Record<"all" | TestState, number>;
  for (const r of filtered) counts[r.state]++;
  const rows = tab === "all" ? filtered : filtered.filter((r) => r.state === tab);
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);

  // Attempts: submissions per live/ended row on this page (one read per test, cached).
  const attemptIds = pageRows.filter((r) => r.state === "live" || r.state === "ended").map((r) => r.t._id);
  const attempts = useQueries({
    queries: attemptIds.map((id) => ({
      queryKey: ["test-result", id],
      staleTime: 60_000,
      queryFn: async () => {
        const r = await api.tests.getAdminResult(id);
        const d = r.data?.data ?? {};
        return { submissions: Array.isArray(d.submissions) ? d.submissions : [], result: d.result };
      },
    })),
  });
  const submittedOf = (id: string) => attempts[attemptIds.indexOf(id)]?.data?.submissions.length;

  const refresh = () => qc.invalidateQueries({ queryKey: ["tests"] });

  const publish = async (t: AdminTest) => {
    setBusy(t._id);
    try {
      await api.tests.publish(t._id);
      toast({ title: "Test published", description: `"${t.name}" is now visible to its batches within its window.` });
      refresh();
    } catch (e) {
      toast({ title: "Could not publish", description: errorMessage(e, "Failed to publish test"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const publishResults = async (t: AdminTest) => {
    setBusy(t._id);
    try {
      await api.tests.publishResult(t._id);
      toast({ title: "Results published", description: `Students can now see their results for "${t.name}".` });
      refresh();
    } catch (e) {
      toast({ title: "Could not publish results", description: errorMessage(e, "Failed to publish results"), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const batchNames = (batches.data ?? []).map((b) => b.name).sort((a, b) => a.localeCompare(b));

  return (
    <>
      <Topbar
        title="Tests"
        actions={
          !isStudent && (
            <Link href="/tests/new" className="btn btn-primary btn-sm">
              <Plus className="size-4" aria-hidden />
              New test
            </Link>
          )
        }
      />
      <main className="col gap-3.5 px-7 pt-5 pb-10">
        <div className="row between wrap gap-2.5">
          <div className="seg" role="tablist" aria-label="Test status">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`tab ${tab === t.key ? "on" : ""}`}
                onClick={() => {
                  setTab(t.key);
                  setPage(0);
                }}
              >
                {t.key === "live" && <span className="live-dot" />}
                {t.label} <span className="count">{counts[t.key]}</span>
              </button>
            ))}
          </div>
          <div className="row gap-2">
            <div className="relative w-60">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <label htmlFor="tq" className="sr-only">
                Search tests
              </label>
              <input
                id="tq"
                className="input h-9 pl-[34px] text-[13px]"
                placeholder="Search tests"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <FilterChip label="Batch" value={batch} options={batchNames} onChange={(v) => (setBatch(v), setPage(0))} />
            <FilterChip label="Exam" value={exam} options={exams.data ?? []} onChange={(v) => (setExam(v), setPage(0))} />
          </div>
        </div>

        <section className="card scrollx rise">
          <table className="table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Status</th>
                <th>Batches</th>
                <th>Window</th>
                <th>Attempts</th>
                <th>Results</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tests.isLoading &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skel h-8" />
                    </td>
                  </tr>
                ))}
              {tests.isError && (
                <tr>
                  <td colSpan={7} className="sm text-danger">
                    Could not load tests. {errorMessage(tests.error, "")}
                  </td>
                </tr>
              )}
              {!tests.isLoading && !tests.isError && pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="sm muted py-10 text-center">
                    {withState.length ? "No tests match these filters." : "No tests yet. Create one from a pattern with New test."}
                  </td>
                </tr>
              )}
              {pageRows.map(({ t, state }) => {
                const { filled, needed } = questionCount(t);
                const meta =
                  state === "draft" && needed && filled < needed
                    ? [`${filled} of ${needed} Qs`, "draft"]
                    : [`${needed || filled} Qs`, t.totalMarks ? `${t.totalMarks} marks` : null, t.pattern?.name ?? null];
                const assigned = assignedStudents(t, batches.data);
                const submitted = submittedOf(t._id);
                const [cls, label] = BADGE[state];
                const published = t.result?.isPublished || t.result?.publishProps?.isPublished;
                const instant = t.result?.publishProps?.type === "immediately" || t.result?.publishProps?.type === "atTheEndOfTest";
                const needsPublish = state === "ended" && !published && !instant;
                const go = () => router.push(isStudent || state === "live" || state === "ended" ? `/tests/${t._id}/result` : `/tests/${t._id}/edit`);
                return (
                  <tr key={t._id} className="cursor-pointer" onClick={go}>
                    <td className="min-w-[240px]">
                      <span className="col">
                        <span className="sm font-semibold">{t.name}</span>
                        <span className="xs muted">{meta.filter(Boolean).join(" · ")}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${cls}`}>
                        {state === "live" && <span className="live-dot" />}
                        {label}
                      </span>
                    </td>
                    <td className="sm">{t.batches?.map((b) => b.name).join(", ") || <span className="muted">—</span>}</td>
                    <td className="sm whitespace-nowrap">{windowLabel(t, now)}</td>
                    <td>
                      {submitted === undefined ? (
                        <span className="sm muted">{state === "live" || state === "ended" ? <span className="skel inline-block h-4 w-14" /> : "—"}</span>
                      ) : state === "live" && assigned && submitted <= assigned ? (
                        <div className="col gap-1">
                          <span className="xs num">
                            {submitted} / {assigned}
                          </span>
                          <div className="bar h-[5px] w-[100px]">
                            <i style={{ width: `${Math.min(100, (submitted / assigned) * 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="sm num">{assigned && submitted <= assigned ? `${submitted} / ${assigned}` : submitted}</span>
                      )}
                    </td>
                    <td>
                      <ResultMode t={t} state={state} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row justify-end gap-1">
                        {isStudent ? (
                          <Link href={`/tests/${t._id}/result`} className="btn btn-ghost btn-sm primary-act">
                            Results
                          </Link>
                        ) : (
                          <>
                            {(state === "live" || state === "ended") && (
                              <Link href={`/tests/${t._id}/result`} className="btn btn-ghost btn-sm primary-act">
                                Results
                              </Link>
                            )}
                            {needsPublish && (
                              <button type="button" className="btn btn-ghost btn-sm" disabled={busy === t._id} onClick={() => publishResults(t)}>
                                Publish now
                              </button>
                            )}
                            {state === "scheduled" && (
                              <Link href={`/tests/${t._id}/edit`} className="btn btn-ghost btn-sm primary-act">
                                Edit
                              </Link>
                            )}
                            {state === "draft" && (
                              <>
                                <Link href={`/tests/${t._id}/edit`} className="btn btn-ghost btn-sm primary-act">
                                  Continue
                                </Link>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={busy === t._id} onClick={() => publish(t)}>
                                  Publish
                                </button>
                              </>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="btn btn-ghost btn-sm w-8 px-0" aria-label={`More actions for ${t.name}`}>
                                  <MoreHorizontal className="size-4" aria-hidden />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {(state === "live" || state === "ended") && (
                                  <DropdownMenuItem onSelect={() => router.push(`/tests/${t._id}/edit`)}>Edit</DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => router.push(`/tests/${t._id}/preview`)}>Preview</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(t)}>
                                  <Trash2 aria-hidden />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > 0 && (
            <div className="row between px-4 py-3">
              <span className="xs muted">
                Showing {page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}
              </span>
              <div className="row gap-1.5">
                <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={(page + 1) * PAGE >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <DeleteConfirmationDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete test"
        description="Are you sure you want to delete this test? This action cannot be undone."
        itemName={toDelete?.name}
        requirePassword
        onConfirm={async () => {
          if (!toDelete) return;
          await api.tests.delete(toDelete._id);
          refresh();
        }}
      />
    </>
  );
}
