"use client";

/*
  Admin-Tests board (canvas v166, states list, row-menu, publish-confirm, delete-blocked, delete-published,
  delete-draft-undo, links, links-email, links-empty, loading, empty, no-match, error; desktop and 1024px).
  Data: GET /tests/admin/tests (AdminTestListResponse: live first, then by window; tab counts). Row menu: Edit,
  Preview as student, Student links, Duplicate, Show in calendar, Move back to drafts, Delete (live: blocked;
  published: password re-auth; draft: soft delete with Undo). "Publish now" on an ended test = publish results with
  the result-publish-preview facts. Sample-data fallback while the M6 routes are not on the backend (lib/m6/client).
*/
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Check, Clock, Copy, Eye, Hand, Link2, Minus, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import {
  BlockedDialog,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FilterChip,
  NoAccess,
  Pagination,
  ReauthDialog,
  SearchBox,
  StateBox,
  notify,
  useUrlState,
  type Column,
  type RowMenuItem,
} from "@/components/kit";
import { SampleDataPill } from "@/components/tests-m6/parts";
import { TestLinksDrawer, type LinksTest } from "@/components/tests-m6/TestLinksDrawer";
import { apiError } from "@/lib/m6/client";
import { examRefs, istDate, istDay, istTime, useM6Batches, useM6Exams } from "@/lib/m6/shared";
import { testsActions, useAdminTests, useInvalidateTests } from "@/lib/m6/tests";
import type { AdminTestListItem, ResultPublishPreview, TestState } from "@/lib/m6-contract";
import { useAuthStore, usePermissionsStore } from "@/stores";

type Tab = "all" | TestState;
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "draft", label: "Drafts" },
  { key: "ended", label: "Ended" },
];
type WindowKey = "" | "week" | "next7" | "month" | "past30";
const WINDOWS: Array<{ value: Exclude<WindowKey, "">; label: string }> = [
  { value: "week", label: "This week" },
  { value: "next7", label: "Next 7 days" },
  { value: "month", label: "This month" },
  { value: "past30", label: "Last 30 days" },
];

const IST_MS = 330 * 60_000;
/** from/to instants of a window filter (IST days) */
function windowRange(w: WindowKey): { from?: string; to?: string } {
  if (!w) return {};
  const now = Date.now();
  const ist = new Date(now + IST_MS);
  const dayStart = (offset: number) => new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + offset) - IST_MS).toISOString();
  if (w === "week") return { from: dayStart(-ist.getUTCDay()), to: dayStart(7 - ist.getUTCDay()) };
  if (w === "next7") return { from: new Date(now).toISOString(), to: dayStart(8) };
  if (w === "month") {
    const from = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_MS).toISOString();
    const to = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1) - IST_MS).toISOString();
    return { from, to };
  }
  return { from: dayStart(-30), to: new Date(now).toISOString() };
}

/** "Indore A, B" from ["JEE 2027 · Indore A", "JEE 2027 · Indore B"]: the shared words once. */
function batchesLabel(names: string[]): string {
  if (names.length < 2) return names[0] ?? "";
  const words = names.map((n) => n.split(" "));
  let k = 0;
  while (words.every((w) => k < w.length - 1 && w[k] === words[0][k])) k++;
  if (!k) return names.join(", ");
  return `${words[0].slice(0, k).join(" ")} ${words.map((w) => w.slice(k).join(" ")).join(", ")}`;
}

function sameDay(a: string, b: string) {
  return istDay(a) === istDay(b);
}
function hm(iso: string) {
  return istTime(iso).replace(":00", "");
}
/** "Today 9 AM – 9 PM" · "Sun 8 Nov, 5 – 6 PM" · ended "1 Nov" */
function windowCell(t: AdminTestListItem): string {
  if (!t.opensAt || !t.closesAt) return "Not set";
  if (t.state === "ended") return istDate(t.opensAt);
  const today = istDay(new Date());
  const a = hm(t.opensAt);
  const b = hm(t.closesAt);
  const range = a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
  if (!sameDay(t.opensAt, t.closesAt)) return `${istDate(t.opensAt)}, ${a} – ${istDate(t.closesAt)}, ${b}`;
  if (istDay(t.opensAt) === today) return `Today ${range}`;
  const wd = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).format(new Date(t.opensAt));
  return `${wd} ${istDate(t.opensAt)}, ${range}`;
}

const N = (n: number) => n.toLocaleString("en-IN");

function statusOf(t: AdminTestListItem): { cls: string; label: string; live?: boolean } {
  if (t.state === "live") return { cls: "b-live", label: "Live", live: true };
  if (t.state === "ended") return { cls: "b-grey", label: "Ended" };
  if (t.publishFailed) return { cls: "b-amber", label: "Not published" };
  if (t.state === "draft") return { cls: "b-sky", label: "Draft" };
  return { cls: "b-navy", label: "Scheduled" };
}

function subLabel(t: AdminTestListItem): { text: string; tone: "amber" | "muted" | "navy" } | null {
  if (t.state === "live" && t.attempts) {
    const parts = [t.attempts.autoSubmitted ? `${N(t.attempts.autoSubmitted)} auto-submitted` : null, t.attempts.flagged ? `${N(t.attempts.flagged)} flagged` : null].filter(Boolean);
    return parts.length ? { text: parts.join(" · "), tone: "amber" } : null;
  }
  if (t.state === "draft" && t.publishFailed) return { text: "Publishing didn't go through", tone: "amber" };
  if (t.state === "draft" && t.questions.filled < t.questions.needed) {
    const left = t.questions.needed - t.questions.filled;
    return { text: `${N(left)} ${left === 1 ? "question" : "questions"} to pick`, tone: "amber" };
  }
  if (t.keyCorrectedAt) return { text: `Key corrected ${istDate(t.keyCorrectedAt)} · re-scored`, tone: "navy" };
  if (t.state === "scheduled" && t.linksMade > 0) return { text: `${N(t.linksMade)} student links made`, tone: "muted" };
  return null;
}

function metaOf(t: AdminTestListItem): string {
  const q = t.questions;
  if (t.state === "draft") return [q.filled < q.needed ? `${N(q.filled)} of ${N(q.needed)} Qs` : `${N(q.needed)} Qs`, t.exam?.name, "draft"].filter(Boolean).join(" · ");
  return [`${N(q.needed)} Qs`, `${N(t.maxMarks)} marks`, t.exam?.name].filter(Boolean).join(" · ");
}

const RM = "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-2 [&_svg]:shrink-0 [&_svg]:text-muted";
function ResultCell({ t }: { t: AdminTestListItem }) {
  if (t.state === "ended" && t.resultPublishedAt)
    return (
      <span className={`${RM} font-semibold !text-success [&_svg]:!text-success`}>
        <Check className="size-3.5" strokeWidth={2.6} aria-hidden />
        Published
      </span>
    );
  if (t.state === "ended" && t.resultMode !== "immediately" && t.resultMode !== "atTheEndOfTest")
    return (
      <span className={RM}>
        <CalendarClock className="size-3.5" aria-hidden />
        {t.resultDueAt ? `Due ${istDate(t.resultDueAt)}` : "Not published"}
      </span>
    );
  const m = t.resultMode;
  return (
    <span className={RM}>
      {m === "immediately" ? <Zap className="size-3.5" aria-hidden /> : m === "atTheEndOfTest" ? <Clock className="size-3.5" aria-hidden /> : m === "autoAfterXDays" ? <CalendarClock className="size-3.5" aria-hidden /> : <Hand className="size-3.5" aria-hidden />}
      {m === "immediately"
        ? "Instant"
        : m === "atTheEndOfTest"
          ? "At close"
          : m === "autoAfterXDays"
            ? t.resultDueAt && t.closesAt
              ? `After ${Math.max(1, Math.round((Date.parse(t.resultDueAt) - Date.parse(t.closesAt)) / 86_400_000))} days`
              : "After N days"
            : "Manual"}
    </span>
  );
}

export default function TestsPage() {
  return (
    <Suspense fallback={null}>
      <Tests />
    </Suspense>
  );
}

type Dialog =
  | { kind: "block"; t: AdminTestListItem; writing: number | null; closesAt: string | null }
  | { kind: "delete"; t: AdminTestListItem }
  | { kind: "results"; t: AdminTestListItem; preview: ResultPublishPreview }
  | null;

const errorToast = (title: string, e: unknown) => notify.error(title, { description: apiError(e).message });

function Tests() {
  const router = useRouter();
  const params = useSearchParams();
  const isStudent = useAuthStore((s) => s.currentUser?.userType === "student");
  const canTests = usePermissionsStore((s) => s.hasAccess.test);
  const [s, set] = useUrlState({ state: "all", q: "", batch: "", exam: "", window: "", page: "1", size: "25" });
  const tab = (TABS.some((x) => x.key === s.state) ? s.state : "all") as Tab;
  const page = Math.max(1, Number(s.page) || 1);
  const pageSize = [25, 50, 100].includes(Number(s.size)) ? Number(s.size) : 25;
  const win = (WINDOWS.some((w) => w.value === s.window) ? s.window : "") as WindowKey;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [linksFor, setLinksFor] = useState<LinksTest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const invalidate = useInvalidateTests();

  const range = useMemo(() => windowRange(win), [win]);
  const list = useAdminTests(
    { state: tab, q: s.q.trim() || undefined, batchId: s.batch || undefined, examId: s.exam || undefined, ...range, page, pageSize },
    !isStudent
  );
  const batches = useM6Batches();
  const exams = useM6Exams();
  const data = list.data;
  const err = list.isError ? apiError(list.error) : null;
  const forbidden = isStudent || err?.code === "FORBIDDEN" || err?.code === "STAFF_ONLY";

  // ?links=<testId> opens the drawer (from the builder or a calendar link)
  const linksParam = params.get("links");
  useEffect(() => {
    if (!linksParam || !data) return;
    const t = data.items.find((x) => x.testId === linksParam);
    if (t) setLinksFor({ testId: t.testId, name: t.name, opensAt: t.opensAt, batches: t.batches });
  }, [linksParam, data]);

  const filters = [s.batch, s.exam, win].filter(Boolean).length;
  const anyFilter = !!(filters || s.q.trim() || tab !== "all");
  const empty = !!data && data.counts.all === 0 && !filters && !s.q.trim();
  const batchName = (batches.data ?? []).find((b) => b.id === s.batch)?.name;

  /* actions */
  const duplicate = async (t: AdminTestListItem) => {
    setBusy(t.testId);
    try {
      const r = await testsActions.duplicate(t.testId);
      invalidate();
      notify.success(`Made a copy: ${r.test.name}`, { action: { label: "Open", href: `/tests/${r.test.id}/edit` } });
    } catch (e) {
      errorToast("Couldn't duplicate the test", e);
    } finally {
      setBusy(null);
    }
  };
  const unpublish = async (t: AdminTestListItem) => {
    setBusy(t.testId);
    try {
      await testsActions.unpublish(t.testId);
      invalidate();
      notify.success(`Moved ${t.name} back to drafts`);
    } catch (e) {
      const a = apiError(e);
      if (a.code === "TEST_LOCKED" || a.code === "NOT_PUBLISHED") notify.error("Couldn't move it back to drafts", { description: a.code === "NOT_PUBLISHED" ? "It's already a draft." : "It has opened, so it stays published." });
      else errorToast("Couldn't move it back to drafts", e);
    } finally {
      setBusy(null);
    }
  };
  const blockFrom = (t: AdminTestListItem, e: unknown) => {
    const d = apiError(e).details as { writing?: number; closesAt?: string } | null;
    setDialog({ kind: "block", t, writing: d?.writing ?? null, closesAt: d?.closesAt ?? t.closesAt });
  };
  const askDelete = async (t: AdminTestListItem) => {
    if (t.state === "live") {
      const a = t.attempts;
      return setDialog({ kind: "block", t, writing: a ? Math.max(0, a.started - a.submitted - a.autoSubmitted) : null, closesAt: t.closesAt });
    }
    if (t.state !== "draft") return setDialog({ kind: "delete", t });
    setBusy(t.testId);
    try {
      const r = await testsActions.remove(t.testId);
      invalidate();
      if (r.undo)
        notify.undo(`Deleted draft ${t.name}`, async () => {
          try {
            await testsActions.undo(r.undo!.path, t.testId);
            invalidate();
            notify.success(`Restored ${t.name}`);
          } catch (e) {
            errorToast("Couldn't restore the draft", e);
          }
        });
      else notify.success(`Deleted draft ${t.name}`);
    } catch (e) {
      const a = apiError(e);
      if (a.code === "TEST_LIVE") blockFrom(t, e);
      else if (a.code === "REAUTH_REQUIRED") setDialog({ kind: "delete", t });
      else errorToast("Couldn't delete the test", e);
    } finally {
      setBusy(null);
    }
  };
  const askResults = async (t: AdminTestListItem) => {
    setBusy(t.testId);
    try {
      const preview = await testsActions.resultPreview(t.testId);
      setDialog({ kind: "results", t, preview });
    } catch (e) {
      errorToast("Couldn't check the results", e);
    } finally {
      setBusy(null);
    }
  };

  const primaryAction = (t: AdminTestListItem) => {
    if (t.state === "live")
      return (
        <Link href={`/tests/${t.testId}/monitor`} className="btn btn-ghost btn-sm">
          Monitor
        </Link>
      );
    if (t.state === "ended") {
      const auto = t.resultMode === "immediately" || t.resultMode === "atTheEndOfTest";
      if (!t.resultPublishedAt && !auto)
        return (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy === t.testId} onClick={() => askResults(t)}>
            Publish now
          </button>
        );
      return (
        <Link href={`/tests/${t.testId}/result`} className="btn btn-ghost btn-sm">
          Results
        </Link>
      );
    }
    const label = t.state === "scheduled" ? "Edit" : t.publishFailed ? "Try again" : "Continue";
    return (
      <Link href={`/tests/${t.testId}/edit`} className="btn btn-ghost btn-sm">
        {label}
      </Link>
    );
  };

  const menu = (t: AdminTestListItem): RowMenuItem[] => [
    { label: "Edit", icon: <Pencil className="size-[15px]" aria-hidden />, onSelect: () => router.push(`/tests/${t.testId}/edit`) },
    { label: "Preview as student", icon: <Eye className="size-[15px]" aria-hidden />, onSelect: () => router.push(`/tests/${t.testId}/edit?preview=student`) },
    ...(t.state !== "ended"
      ? [
          {
            label: t.linksMade > 0 ? `Student links · ${N(t.linksMade)}` : "Student links",
            icon: <Link2 className="size-[15px]" aria-hidden />,
            onSelect: () => setLinksFor({ testId: t.testId, name: t.name, opensAt: t.opensAt, batches: t.batches }),
          },
        ]
      : []),
    { label: "Duplicate", icon: <Copy className="size-[15px]" aria-hidden />, onSelect: () => void duplicate(t), disabled: busy === t.testId },
    ...(t.opensAt
      ? [{ label: "Show in calendar", icon: <CalendarDays className="size-[15px]" aria-hidden />, onSelect: () => router.push(`/tests/calendar?date=${istDay(t.opensAt!)}&test=${t.testId}`) }]
      : []),
    ...(t.state === "scheduled" ? [{ label: "Move back to drafts", icon: <Minus className="size-[15px]" aria-hidden />, onSelect: () => void unpublish(t) }] : []),
    { label: "Delete test…", icon: <Trash2 className="size-[15px]" aria-hidden />, onSelect: () => void askDelete(t), danger: true, disabled: busy === t.testId },
  ];

  const columns: Array<Column<AdminTestListItem>> = [
    {
      key: "test",
      header: "Test",
      render: (t) => (
        <span className="col min-w-0 gap-0.5">
          <span className="sm font-semibold">{t.name}</span>
          <span className="xs muted">{metaOf(t)}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 150,
      tabletWidth: 130,
      render: (t) => {
        const st = statusOf(t);
        const sub = subLabel(t);
        return (
          <span className="col items-start gap-1">
            <span className={`badge ${st.cls}`}>
              {st.live && <span className="live-dot" />}
              {st.label}
            </span>
            {sub && <span className={`xs ${sub.tone === "amber" ? "font-semibold text-[#9A5800]" : sub.tone === "navy" ? "font-semibold text-brand" : "muted"}`}>{sub.text}</span>}
          </span>
        );
      },
    },
    {
      key: "batches",
      header: "Batches",
      width: 150,
      tabletWidth: 120,
      render: (t) =>
        t.batches.length ? (
          <span className="sm [overflow-wrap:anywhere]" title={t.batches.map((b) => b.name).join(", ")}>
            {batchesLabel(t.batches.map((b) => b.name))}
          </span>
        ) : (
          <span className="sm muted">No batch yet</span>
        ),
    },
    { key: "window", header: "Window", width: 170, tabletWidth: 140, render: (t) => <span className="sm num">{windowCell(t)}</span> },
    {
      key: "attempts",
      header: "Attempts",
      align: "num",
      width: 96,
      tabletWidth: 90,
      render: (t) => {
        const a = t.attempts;
        if (!a) return <span className="sm muted">—</span>;
        const live = t.state === "live";
        const att = live ? a.started : a.submitted + a.autoSubmitted;
        const pct = a.assigned ? Math.min(100, Math.round((att / a.assigned) * 100)) : 0;
        return (
          <span className="col items-end gap-1" title={live ? `${N(a.started)} started, ${N(a.submitted)} submitted` : undefined}>
            <span className="xs num">
              {N(att)} / {a.assigned != null ? N(a.assigned) : "—"}
            </span>
            {live && a.assigned != null && (
              <span className="bar h-[5px] w-[90px]">
                <i style={{ width: `${pct}%`, animation: "none" }} />
              </span>
            )}
          </span>
        );
      },
    },
    { key: "results", header: "Results", width: 118, tablet: "hide", render: (t) => <ResultCell t={t} /> },
    { key: "act", header: <span className="sr-only">Action</span>, width: 100, tabletWidth: 92, render: (t) => <div className="row justify-end">{primaryAction(t)}</div> },
  ];

  const tabs = (
    <div className="seg self-start" role="tablist" aria-label="Test status">
      {TABS.map((x) => (
        <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={`tab ${tab === x.key ? "on" : ""}`} onClick={() => set({ state: x.key })}>
          {x.key === "live" && <span className="live-dot" />}
          {x.label} <span className="count">{data ? N(data.counts[x.key]) : "–"}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Topbar
        title="Tests"
        badge={<SampleDataPill areas={["tests", "links"]} />}
        actions={
          !forbidden && (
            <>
              <Link href="/tests/calendar" className="btn btn-secondary btn-sm">
                <CalendarDays className="size-3.5" aria-hidden />
                Calendar
              </Link>
              {canTests && (
                <Link href="/tests/new" className="btn btn-primary btn-sm">
                  <Plus className="size-3.5" aria-hidden />
                  New test
                </Link>
              )}
            </>
          )
        }
      />
      <main className="col gap-3.5 px-7 pt-5 pb-12">
        {forbidden ? (
          <NoAccess what="Tests" />
        ) : (
          <>
            {!empty && (
              <div className="col gap-2.5">
                {tabs}
                <FilterBar
                  activeCount={filters}
                  onClearAll={() => set({ batch: "", exam: "", window: "" })}
                  search={<SearchBox id="tq" value={s.q} onChange={(q) => set({ q })} placeholder="Search tests" label="Search tests" width={240} />}
                >
                  <FilterChip label="Batch" noun="batch" value={s.batch || null} onChange={(v) => set({ batch: v ?? "" })} options={(batches.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
                  <FilterChip label="Exam" noun="exam" value={s.exam || null} onChange={(v) => set({ exam: v ?? "" })} options={examRefs(exams.data).map((e) => ({ value: e.id, label: e.name }))} />
                  <FilterChip label="Window" noun="window" anyLabel="Any time" value={win || null} onChange={(v) => set({ window: v ?? "" })} options={WINDOWS} />
                </FilterBar>
              </div>
            )}
            <DataTable
              ariaLabel="Tests"
              columns={columns}
              rows={data?.items}
              rowKey={(t) => t.testId}
              status={list.isLoading ? "loading" : err ? "error" : "ready"}
              rowMenu={menu}
              rowMenuLabel={(t) => `More for ${t.name}`}
              scrollX
              minWidth={860}
              skeletonRows={3}
              filtered={anyFilter}
              empty={
                <StateBox
                  doodle={
                    <svg className="text-[rgba(0,0,126,.13)]" width="84" height="60" viewBox="0 0 84 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="18" y="6" width="40" height="50" rx="4" />
                      <path d="M28 6v-2h20v2M27 24l4 4 7-8M27 40h22" />
                      <path d="M62 46l10-10 4 4-10 10h-4z" />
                    </svg>
                  }
                  title="No tests yet"
                  body="Make your first test from a pattern. Students see it on their Tests page when it opens."
                  action={
                    <div className="row gap-2">
                      <Link href="/patterns" className="btn btn-secondary">
                        See patterns
                      </Link>
                      {canTests && (
                        <Link href="/tests/new" className="btn btn-primary">
                          New test
                        </Link>
                      )}
                    </div>
                  }
                />
              }
              noMatch={
                <StateBox
                  title={s.q.trim() ? `No tests match "${s.q.trim()}"` : "No tests match these filters"}
                  body={`in ${batchName ?? "any batch"}, ${tab === "all" ? "any status" : TABS.find((x) => x.key === tab)!.label.toLowerCase()}`}
                  action={
                    <div className="row gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => set({ q: "", batch: "", exam: "", window: "", state: "all" })}>
                        Clear filters
                      </button>
                      {s.batch && (
                        <button type="button" className="btn btn-ghost" onClick={() => set({ batch: "" })}>
                          Search all batches
                        </button>
                      )}
                    </div>
                  }
                />
              }
              error={{ title: "Couldn't load tests", body: "Check your connection and try again.", code: err?.code ?? undefined, onRetry: () => list.refetch() }}
              footer={
                data && data.pageInfo.total > 0 ? (
                  <Pagination
                    page={data.pageInfo.page}
                    pageSize={data.pageInfo.pageSize}
                    total={data.pageInfo.total}
                    onPage={(p) => set({ page: String(p) })}
                    onPageSize={(n) => set({ size: String(n) })}
                    sortLabel="live first, then window"
                  />
                ) : undefined
              }
            />
          </>
        )}
      </main>

      <BlockedDialog
        open={dialog?.kind === "block"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "block" ? `Can't delete ${dialog.t.name} yet` : ""}
        description={
          dialog?.kind === "block"
            ? `${dialog.writing != null ? `${N(dialog.writing)} ${dialog.writing === 1 ? "student is" : "students are"} writing it now.` : "Students are writing it now."} You can delete it after it closes${dialog.closesAt ? ` at ${istTime(dialog.closesAt)}` : ""}.`
            : ""
        }
        action={
          dialog?.kind === "block" ? (
            <Link href={`/tests/${dialog.t.testId}/monitor`} className="btn btn-secondary btn-sm">
              Watch it live
            </Link>
          ) : undefined
        }
      />
      <ReauthDialog
        open={dialog?.kind === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "delete" ? `Delete ${dialog.t.name}?` : ""}
        description={
          dialog?.kind === "delete"
            ? dialog.t.state === "ended"
              ? `It has ended: ${dialog.t.attempts ? `${N(dialog.t.attempts.submitted + dialog.t.attempts.autoSubmitted)} students' ` : "students' "}scores and results go with it. This can't be undone.`
              : `It's published: students in ${batchesLabel(dialog.t.batches.map((b) => b.name)) || "its batches"} were told it opens ${dialog.t.opensAt ? istDate(dialog.t.opensAt) : "soon"}. It disappears from their Tests page. This can't be undone.`
            : ""
        }
        passwordHint="Deleting a published test needs your password."
        confirmLabel="Delete test"
        onConfirm={async (token) => {
          if (dialog?.kind !== "delete") return;
          const t = dialog.t;
          let r;
          try {
            r = await testsActions.remove(t.testId, token);
          } catch (e) {
            if (apiError(e).code === "TEST_LIVE") {
              blockFrom(t, e);
              return;
            }
            throw e;
          }
          invalidate();
          const undo = r.undo;
          if (undo)
            notify.undo(`Deleted ${t.name}`, async () => {
              try {
                await testsActions.undo(undo.path, t.testId);
                invalidate();
                notify.success(`Restored ${t.name}`);
              } catch (e) {
                errorToast("Couldn't restore the test", e);
              }
            });
          else notify.success(`Deleted ${t.name}`);
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "results"}
        onOpenChange={(o) => !o && setDialog(null)}
        tone="navy"
        title={dialog?.kind === "results" ? `Publish results for ${dialog.t.name}?` : ""}
        description={
          dialog?.kind === "results"
            ? dialog.preview.test.resultDueAt
              ? `It was set to publish on ${istDate(dialog.preview.test.resultDueAt)}. Publishing now can't be taken back.`
              : "Publishing can't be taken back."
            : undefined
        }
        facts={
          dialog?.kind === "results"
            ? [
                ["Students", `${N(dialog.preview.students)} see their score and rank`],
                ["Email", dialog.preview.emailed >= dialog.preview.students ? "Sent to them" : `Sent to ${N(dialog.preview.emailed)} of them (the rest turned result emails off)`],
                ...(dialog.preview.aiReviewUnlocks ? ([["AI review", "Unlocks for every student"]] as Array<[string, string]>) : []),
                ...(dialog.preview.absent > 0 ? ([[`${N(dialog.preview.absent)} absent`, 'See "Not attempted"']] as Array<[string, string]>) : []),
              ]
            : undefined
        }
        confirmLabel="Publish results"
        onConfirm={async () => {
          if (dialog?.kind !== "results") return;
          await testsActions.publishResults(dialog.t.testId);
          invalidate();
          notify.success(`Results published · ${N(dialog.preview.emailed)} students emailed`);
        }}
      />
      <TestLinksDrawer test={linksFor} onClose={() => setLinksFor(null)} />
    </>
  );
}
