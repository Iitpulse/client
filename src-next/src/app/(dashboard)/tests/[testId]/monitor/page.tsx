"use client";

/*
  Admin-Monitor board (states live, row-menu, student-detail, extra-time, extra-time-no-reason, before-open, closed,
  offline, loading, empty, error; desktop + tablet) + Kit-States "No permission" / not found.
  Data: src/lib/m6/monitor.ts (GET …/monitor every 15 s; the time left ticks locally between polls on each student's
  own clock). Extra time: 5/10/15/30 min, reason required (owner; the board's "optional" label is wrong). No force-submit.
  Filters (tile, search, batch, page) live in the URL (kit useUrlState).
*/

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, CircleUserRound, Link2, Phone } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import {
  Banner,
  cx,
  DataTable,
  FilterBar,
  FilterChip,
  fmtPhone,
  initials,
  NoAccess,
  NotFoundState,
  notify,
  Pagination,
  SearchBox,
  StateBox,
  useUrlState,
  type Column,
  type RowMenuItem,
} from "@/components/kit";
import type { MonitorResponse, MonitorRow, ResultMode } from "@/lib/m6-contract";
import { apiError, useM6Source } from "@/lib/m6/client";
import { fetchMonitorCsv, fetchStudentLink, useMonitor, type MonitorFilter } from "@/lib/m6/monitor";
import { istDate, istDay, istTime, plural } from "@/lib/m6/shared";
import { clock, reasonText, seenLabel, STATUS_LABEL } from "./format";
import { ExtraTimeDialog, StudentDrawer } from "./parts";
import "./monitor.css";

const PAGE_SIZE = 100;

/** "Today 9 AM – 9 PM" (IST) */
function windowLabel(opensAt: string | null, closesAt: string | null): string {
  if (!opensAt || !closesAt) return "No time set";
  const today = istDay(new Date());
  const tomorrow = istDay(new Date(Date.now() + 86_400_000));
  const d = istDay(opensAt);
  const day = d === today ? "Today" : d === tomorrow ? "Tomorrow" : istDate(opensAt);
  const short = (iso: string) => istTime(iso).replace(":00 ", " ");
  return `${day} ${short(opensAt)} – ${short(closesAt)}`;
}

function inLabel(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${Math.round(m / 1440)} days`;
}

function resultsLine(mode: ResultMode): string {
  switch (mode) {
    case "manual":
      return "Results are set to Manual: publish them from Results.";
    case "immediately":
      return "Students saw their results as they submitted.";
    case "atTheEndOfTest":
      return "Results went out to students at the close.";
    case "autoAfterXDays":
      return "Results go out on their set day.";
  }
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    setOn(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return on;
}

type Tile = { key: MonitorFilter; label: string; n: number; sub: string };

function tilesOf(d: MonitorResponse, before: boolean): Tile[] {
  const t = d.tiles;
  return [
    { key: "writing", label: "Writing", n: t.writing, sub: "now" },
    { key: "submitted", label: "Submitted", n: t.submitted, sub: d.assigned != null ? `of ${d.assigned.toLocaleString("en-IN")}` : "" },
    { key: "notStarted", label: "Not started", n: t.notStarted, sub: before ? `${t.waiting} waiting` : `${t.neverOpened} never opened` },
    { key: "autoSubmitted", label: "Auto-submitted", n: t.autoSubmitted, sub: "time or exits" },
    { key: "offline", label: "Offline now", n: t.offline, sub: "over 2 min" },
    { key: "flagged", label: `${d.exitsFlagAt}+ fullscreen exits`, n: t.exitsFlagged, sub: d.exitsLimit != null ? `limit is ${d.exitsLimit}` : "no limit set" },
  ];
}

const DOT: Record<MonitorFilter, string> = {
  all: "",
  writing: "writing",
  submitted: "submitted",
  notStarted: "notStarted",
  autoSubmitted: "autoSubmitted",
  offline: "offline",
  flagged: "flagged",
};

const FILTERS: MonitorFilter[] = ["all", "writing", "submitted", "notStarted", "autoSubmitted", "offline", "flagged"];

export default function MonitorPage() {
  const { testId } = useParams<{ testId: string }>();
  const [u, setU] = useUrlState({ show: "all", q: "", batch: "", page: "1" });
  const filter = (FILTERS.includes(u.show as MonitorFilter) ? u.show : "all") as MonitorFilter;
  const page = Math.max(1, Number(u.page) || 1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [extraFor, setExtraFor] = useState<MonitorRow | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);

  const mon = useMonitor(testId, { filter, q: u.q, batchId: u.batch, page, pageSize: PAGE_SIZE });
  const sample = useM6Source("monitor") === "sample";
  const now = useNow();
  const online = useOnline();
  const d = mon.data;
  const err = mon.error ? apiError(mon.error) : null;

  const state = d?.test.state;
  const before = state === "scheduled" || state === "draft";
  const closed = state === "ended";
  const live = state === "live";
  const stale = !!d && (!online || mon.isError);
  const since = Math.max(0, Math.round((now - mon.dataUpdatedAt) / 1000));
  const updatedAt = istTime(new Date(mon.dataUpdatedAt || Date.now()).toISOString());
  const updated = !d ? "" : stale ? `Not updated since ${updatedAt}` : `Updated ${since < 60 ? `${since} s` : `${Math.floor(since / 60)} min`} ago`;

  /** seconds left right now, on the student's own clock */
  const leftNow = (r: MonitorRow) => (r.secondsLeft == null ? null : r.secondsLeft - Math.max(0, (now - mon.dataUpdatedAt) / 1000));
  const rows = d?.items ?? [];
  const detailRow = rows.find((r) => r.student.id === detailId) ?? null;

  const exportCsv = async () => {
    setCsvBusy(true);
    try {
      const csv = await fetchMonitorCsv(testId);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(d?.test.shortName || d?.test.name || "test").replace(/[^\w.-]+/g, "-")}-monitor.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      notify.error("Couldn't export the list", { description: apiError(e).message });
    } finally {
      setCsvBusy(false);
    }
  };

  const copyLink = async (r: MonitorRow) => {
    try {
      const url = await fetchStudentLink(testId, r.student.batch?.id ?? null, r.student.id);
      if (!url) {
        notify.error(`${r.student.name} has no link yet`, { description: "Make links from Student links on the Tests page." });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify.success(`Copied ${r.student.name}'s sign-in link`);
    } catch (e) {
      notify.error("Couldn't copy the link", { description: apiError(e).message });
    }
  };

  /* ───────── whole-page states: no permission, not found ───────── */
  if (!d && err && (err.code === "FORBIDDEN" || err.status === 403))
    return (
      <>
        <Topbar title="Live monitor" back={{ href: "/tests", label: "Tests" }} />
        <main className="col px-7 pt-5 pb-10">
          <NoAccess what="the Monitor" />
        </main>
      </>
    );
  if (!d && err && (err.code === "TEST_NOT_FOUND" || err.status === 404))
    return (
      <>
        <Topbar title="Live monitor" back={{ href: "/tests", label: "Tests" }} />
        <main className="col px-7 pt-5 pb-10">
          <NotFoundState deleted="This test doesn't exist or was deleted" />
        </main>
      </>
    );

  const tiles = d ? tilesOf(d, before) : [];
  const empty = !!d && d.assigned === 0;
  const loading = !d && mon.isLoading;
  const batches = d?.test.batches ?? [];
  const t = d?.test;
  const total = t?.questions ?? 0;
  const filtered = filter !== "all" || !!u.q || !!u.batch;
  const windowText = !t
    ? ""
    : before
      ? windowLabel(t.opensAt, t.closesAt)
      : closed
        ? `${windowLabel(t.opensAt, t.closesAt)}${d!.assigned ? ` · ${plural(d!.assigned, "student")}` : ""}`
        : `Closes ${istTime(t.closesAt)}${d!.assigned ? ` · ${plural(d!.assigned, "student")} in ${plural(batches.length, "batch", "batches")}` : ""}`;

  const columns: Array<Column<MonitorRow>> = [
    {
      key: "student",
      width: "24%",
      header: "Student",
      render: (r) => (
        <span className="mo-who">
          <span className="avatar">{initials(r.student.name)}</span>
          <span className="col min-w-0 gap-0">
            <span className="sm truncate font-semibold">{r.student.name}</span>
            <span className="xs muted truncate">{r.student.batch?.name ?? "—"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "status",
      width: "19%",
      header: "Status",
      render: (r) => {
        const why = reasonText(r, d!.exitsLimit);
        return (
          <span className="col gap-0.5">
            <span className="mo-stat">
              <span className={cx("mo-dot", r.status)} />
              {STATUS_LABEL[r.status]}
            </span>
            {why && <span className="xs muted">{why}</span>}
          </span>
        );
      },
    },
    { key: "started", width: 96, header: "Started", tablet: "hide", render: (r) => <span className="sm num">{r.startedAt ? istTime(r.startedAt) : "—"}</span> },
    {
      key: "answered",
      width: 150,
      header: "Answered",
      render: (r) =>
        r.answered > 0 ? (
          <span className="col gap-1">
            <span className="xs num">
              {r.answered} of {total}
            </span>
            <span className="bar block h-[5px] w-[100px]">
              <i style={{ width: `${Math.round((100 * r.answered) / Math.max(1, total))}%`, animation: "none" }} />
            </span>
          </span>
        ) : (
          <span className="sm muted">—</span>
        ),
    },
    {
      key: "left",
      width: 110,
      header: "Time left",
      align: "num",
      tablet: "hide",
      render: (r) => <span className="sm num">{r.status === "writing" || r.status === "offline" ? clock(leftNow(r)) : "—"}</span>,
    },
    {
      key: "exits",
      width: 130,
      header: "Fullscreen exits",
      align: "num",
      render: (r) => {
        const atLimit = d!.exitsLimit != null && r.fullscreenExits >= d!.exitsLimit;
        return <span className={cx("mo-ex", atLimit ? "max" : r.fullscreenExits >= d!.exitsFlagAt && "warn")}>{atLimit ? `${r.fullscreenExits} · limit` : r.fullscreenExits}</span>;
      },
    },
    {
      key: "seen",
      width: 120,
      header: "Last seen",
      render: (r) => (
        <span className={cx("sm mo-seen whitespace-nowrap", r.status === "offline" && "off")}>{seenLabel(r.lastSeenAt, now, r.status === "writing" || r.status === "offline")}</span>
      ),
    },
  ];

  const menu = (r: MonitorRow): RowMenuItem[] => {
    const items: RowMenuItem[] = [
      { label: "See details", icon: <CircleUserRound className="size-[15px]" aria-hidden />, onSelect: () => setDetailId(r.student.id) },
      { label: "Copy their sign-in link", icon: <Link2 className="size-[15px]" aria-hidden />, onSelect: () => copyLink(r) },
    ];
    if (r.student.phone)
      items.push({
        label: `Call ${fmtPhone(r.student.phone)}`,
        icon: <Phone className="size-[15px]" aria-hidden />,
        onSelect: () => {
          window.location.href = `tel:+91${r.student.phone!.replace(/\D/g, "").slice(-10)}`;
        },
      });
    if (r.status === "writing" || r.status === "offline")
      items.push({ label: "Give extra time…", icon: <Clock className="size-[15px]" aria-hidden />, onSelect: () => setExtraFor(r) });
    return items;
  };

  return (
    <>
      <Topbar
        title={t ? t.name : loading ? <span className="skel inline-block h-5 w-56 align-middle" /> : "Live monitor"}
        back={{ href: "/tests", label: "Tests" }}
        badge={
          t && (
            <span className="row wrap gap-2.5">
              <span className={cx("badge", before ? "b-navy" : closed ? "b-grey" : "b-live")}>
                {live && <span className="live-dot" />}
                {before ? (state === "draft" ? "Draft" : "Scheduled") : closed ? "Ended" : "Live"}
              </span>
              <span className="sm muted num whitespace-nowrap">{windowText}</span>
              {sample && <span className="badge b-amber">Sample data</span>}
            </span>
          )
        }
        actions={
          <>
            {d && (
              <span className="xs muted num" role="status" aria-live="polite">
                {updated}
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!d || csvBusy || empty}>
              {csvBusy ? "Exporting…" : "Export .csv"}
            </button>
            {closed && (
              <Link href={`/tests/${testId}/result`} className="btn btn-primary btn-sm">
                Open results
              </Link>
            )}
          </>
        }
      />
      <main className="col gap-3.5 px-7 pt-5 pb-12">
        {stale && !online && (
          <Banner tone="warn" title="You're offline.">
            Showing what we had at {updatedAt}. Students can keep writing; their answers are saved on their side.
          </Banner>
        )}
        {stale && online && (
          <Banner tone="warn" title="Couldn't refresh.">
            Showing what we had at {updatedAt}. We&apos;ll keep trying every 15 s.
          </Banner>
        )}
        {d && before && !empty && (
          <Banner
            tone="info"
            title={
              t!.opensAt
                ? `Opens at ${istTime(t!.opensAt)}${istDay(t!.opensAt) !== istDay(new Date()) ? ` on ${istDate(t!.opensAt)}` : ""}, in ${inLabel(Date.parse(t!.opensAt) - now)}.`
                : "Not open yet."
            }
            action={
              <Link href={`/tests?links=${encodeURIComponent(testId)}`} className="btn btn-secondary">
                Student links
              </Link>
            }
          >
            {d.tiles.waiting === 1 ? "1 student has" : `${d.tiles.waiting} students have`} opened their link and wait on the instructions page.
          </Banner>
        )}
        {d && closed && !empty && (
          <Banner tone="info" title={`Closed at ${istTime(t!.closesAt)}${t!.closesAt && istDay(t!.closesAt) !== istDay(new Date()) ? ` on ${istDate(t!.closesAt)}` : ""}.`}>
            {d.tiles.submitted + d.tiles.autoSubmitted} submitted{d.tiles.autoSubmitted ? `, ${d.tiles.autoSubmitted} of them auto-submitted` : ""}; {d.tiles.notStarted} never started.{" "}
            {resultsLine(t!.resultMode)}
          </Banner>
        )}

        {(d || loading) && !empty && (
          <>
            <div className="mo-tiles" role="group" aria-label="Students by status">
              {loading
                ? Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="mo-tile" aria-hidden>
                      <span className="skel block h-2.5 w-20" />
                      <span className="skel mt-2 block h-6 w-12" />
                      <span className="skel mt-1 block h-2.5 w-16" />
                    </div>
                  ))
                : tiles.map((x) => (
                    <button
                      key={x.key}
                      type="button"
                      className={cx("mo-tile", filter === x.key && "on")}
                      aria-pressed={filter === x.key}
                      onClick={() => setU({ show: filter === x.key ? "all" : x.key, page: "1" })}
                    >
                      <span className="l">
                        <span className={cx("mo-dot", DOT[x.key])} />
                        {x.label}
                      </span>
                      <b>{x.n.toLocaleString("en-IN")}</b>
                      <span className="xs muted">{x.sub}</span>
                    </button>
                  ))}
            </div>
            <FilterBar
              activeCount={u.batch ? 1 : 0}
              onClearAll={() => setU({ batch: "", page: "1" })}
              search={<SearchBox id="mo-q" value={u.q} onChange={(q) => setU({ q, page: "1" })} placeholder="Name or phone" label="Search students" />}
              right={<span className="xs muted">Refreshes every 15 s · sorted by who needs a look first</span>}
            >
              {batches.length > 1 && (
                <FilterChip
                  label="Batch"
                  noun="batch"
                  anyLabel={batches.length === 2 ? "Both batches" : "All batches"}
                  options={batches.map((b) => ({ value: b.id, label: b.name }))}
                  value={u.batch || null}
                  onChange={(v) => setU({ batch: v ?? "", page: "1" })}
                />
              )}
              <span className="sm muted">{filter === "all" ? "Pick a box above to filter" : "Filtered by the box above · tap it again to clear"}</span>
            </FilterBar>
          </>
        )}

        {empty ? (
          <section className="card">
            <StateBox
              title="No students in this test's batches"
              body={`${batches.length ? `${batches.map((b) => b.name).join(" and ")} ${batches.length === 1 ? "has" : "have"} no students yet.` : "This test has no batches yet."} Add students to a batch, or pick other batches in the test.`}
              action={
                <>
                  <Link href="/users" className="btn btn-secondary">
                    Add students
                  </Link>
                  <Link href={`/tests/${testId}/edit`} className="btn btn-ghost">
                    Change batches
                  </Link>
                </>
              }
            />
          </section>
        ) : (
          <DataTable<MonitorRow>
            ariaLabel="Students in this test"
            columns={columns}
            rows={d ? rows : undefined}
            rowKey={(r) => r.student.id}
            status={d ? "ready" : loading ? "loading" : "error"}
            skeletonRows={3}
            onRowClick={(r) => setDetailId(r.student.id)}
            rowClass={(r) => (detailId === r.student.id ? "hov" : undefined)}
            rowMenu={menu}
            rowMenuLabel={(r) => `More for ${r.student.name}`}
            filtered={filtered}
            noMatch={
              <StateBox
                compact
                title={`No students match${u.q ? ` "${u.q}"` : ""}`}
                action={
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setU({ show: "all", q: "", batch: "", page: "1" })}>
                    Clear filters
                  </button>
                }
              />
            }
            error={{
              title: "Couldn't load who's writing",
              body: "The test itself is fine: students keep writing. Try again, or share this code with support:",
              code: `MON-${err?.status || "NET"}`,
              onRetry: () => mon.refetch(),
            }}
            footer={
              <div className="col">
                {d && d.pageInfo.total > PAGE_SIZE && (
                  <Pagination page={page} pageSize={PAGE_SIZE} total={d.pageInfo.total} sizes={[PAGE_SIZE]} onPage={(p) => setU({ page: String(p) })} />
                )}
                <div className="row between wrap gap-3 px-3.5 py-2.5">
                  <span className="xs muted num">
                    {d ? `Showing ${rows.length.toLocaleString("en-IN")} of ${(filtered ? d.pageInfo.total : (d.assigned ?? d.pageInfo.total)).toLocaleString("en-IN")}` : " "}
                  </span>
                  <span className="xs muted">Last seen = the last time their answers were saved. Over 2 min counts as offline.</span>
                </div>
              </div>
            }
          />
        )}
      </main>

      {d && (
        <StudentDrawer
          testId={testId}
          open={!!detailId}
          studentId={detailId}
          fallbackRow={detailRow}
          total={total}
          exitsFlagAt={d.exitsFlagAt}
          exitsLimit={d.exitsLimit}
          now={now}
          onClose={() => setDetailId(null)}
          onCopyLink={copyLink}
          onExtraTime={(r) => {
            setDetailId(null);
            setExtraFor(r);
          }}
        />
      )}
      {d && extraFor && (
        <ExtraTimeDialog
          testId={testId}
          row={extraFor}
          secondsLeft={leftNow(rows.find((r) => r.student.id === extraFor.student.id) ?? extraFor)}
          closesAt={t!.closesAt}
          onClose={() => setExtraFor(null)}
        />
      )}
    </>
  );
}
