"use client";

/*
  Admin-Calendar board (canvas v166): month and week views of every test with a window (IST), result markers,
  same-batch clashes, a popover per test, and drag to move with a confirmation (owner: every test that has not opened
  may be dragged; live and ended tests cannot). Data: GET /tests/admin/calendar, POST /tests/admin/tests/:id/reschedule
  (confirm=false = the impact for the dialog, then confirm=true). At 1024px the month shows dots and a tapped day's
  tests are listed under the grid.
*/
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { ConfirmDialog, FilterChip, NoAccess, StateBox, notify, useFillHeight, useTablet } from "@/components/kit";
import { SampleDataPill } from "@/components/tests-m6/parts";
import { TestLinksDrawer } from "@/components/tests-m6/TestLinksDrawer";
import { reschedule, useCalendar } from "@/lib/m6/calendar";
import { apiError } from "@/lib/m6/client";
import { examRefs, useM6Batches, useM6Exams } from "@/lib/m6/shared";
import type { CalendarResponse, RescheduleResponse, ResultMode } from "@/lib/m6-contract";
import { useInvalidateTests } from "@/lib/m6/tests";

type CalTest = CalendarResponse["tests"][number];
type View = "month" | "week";

/* ───────────── IST date math (dates are "YYYY-MM-DD" IST calendar days) ───────────── */
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON3 = MONTHS.map((m) => m.slice(0, 3));

function parts(iso: string | number) {
  const s = new Date(new Date(iso).getTime() + IST_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate(), h: s.getUTCHours(), min: s.getUTCMinutes(), dow: s.getUTCDay() };
}
function ymd(y: number, m: number, d: number) {
  const t = new Date(Date.UTC(y, m, d));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
function dayOf(iso: string | number) {
  const p = parts(iso);
  return ymd(p.y, p.m, p.d);
}
function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return ymd(y, m - 1, d + n);
}
function dow(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
/** Minutes since IST midnight of `date` → UTC ISO */
function atIst(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_MS + minutes * 60_000).toISOString();
}
function minutesOfDay(iso: string) {
  const p = parts(iso);
  return p.h * 60 + p.min;
}
function hourLabel(h: number) {
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${h < 12 || h === 24 ? "AM" : "PM"}`;
}
function timeShort(iso: string) {
  const p = parts(iso);
  const hh = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${hh}${p.min ? `:${String(p.min).padStart(2, "0")}` : ""} ${p.h < 12 ? "AM" : "PM"}`;
}
function timeLong(iso: string) {
  const p = parts(iso);
  const hh = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${hh}:${String(p.min).padStart(2, "0")} ${p.h < 12 ? "AM" : "PM"}`;
}
function dayLabel(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${DOW[dow(date)]} ${d} ${MON3[m - 1]}`;
}
/** "Thu 5 Nov · 9:00 AM – 9:00 PM" (adds the close day when it differs) */
function windowLabel(opensAt: string, closesAt: string, ist = false) {
  const a = dayOf(opensAt);
  const b = dayOf(closesAt);
  const end = a === b ? timeLong(closesAt) : `${dayLabel(b)}, ${timeLong(closesAt)}`;
  return `${dayLabel(a)} · ${timeLong(opensAt)} – ${end}${ist ? " IST" : ""}`;
}
function timeRange(opensAt: string, closesAt: string) {
  const a = timeShort(opensAt);
  const b = timeShort(closesAt);
  const sa = a.slice(-2);
  const sb = b.slice(-2);
  return sa === sb ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

const RESULT_LABEL: Record<ResultMode, string> = { immediately: "Instant", atTheEndOfTest: "At close", autoAfterXDays: "After N days", manual: "Manual" };

function kind(t: CalTest): "live" | "sched" | "draft" | "fail" | "ended" {
  if (t.state === "live") return "live";
  if (t.state === "ended") return "ended";
  if (t.publishFailed) return "fail";
  return t.state === "draft" ? "draft" : "sched";
}
const DOT: Record<ReturnType<typeof kind>, string> = { live: "var(--red-600)", sched: "var(--navy)", draft: "#A9ACC0", fail: "#E3B25C", ended: "#C3C6CF" };

function batchesShort(t: CalTest) {
  return t.batches.map((b) => b.name).join(", ") || "No batch yet";
}

/* ───────────── page ───────────── */

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <Calendar />
    </Suspense>
  );
}

interface Pending {
  test: CalTest;
  opensAt: string;
  closesAt: string;
  impact: RescheduleResponse;
}

function Calendar() {
  const router = useRouter();
  const params = useSearchParams();
  const tablet = useTablet();
  const [today] = useState(() => dayOf(Date.now()));
  const [view, setView] = useState<View>(params.get("view") === "week" ? "week" : "month");
  const [anchor, setAnchor] = useState<string>(params.get("date") ?? today);
  const [batchId, setBatchId] = useState<string>("");
  const batchIds = useMemo(() => (batchId ? [batchId] : []), [batchId]);
  const [examId, setExamId] = useState<string>("");
  const [open, setOpen] = useState<{ id: string; x: number; y: number } | null>(params.get("test") ? { id: params.get("test")!, x: -1, y: -1 } : null);
  const [picked, setPicked] = useState<string>(today);
  const [pending, setPending] = useState<Pending | null>(null);
  const [linksFor, setLinksFor] = useState<CalTest | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  // Owner rule (6 Nov): the page never scrolls; the month grid / week hours take the height left and scroll inside.
  // On a tablet the month grid keeps its compact height (dots) and the picked day's list below takes the rest.
  const [fillRef, fillH] = useFillHeight<HTMLDivElement>(!tablet || view === "week", 320);
  const [agRef, agH] = useFillHeight<HTMLDivElement>(tablet && view === "month", 140);
  const invalidate = useInvalidateTests();

  const batches = useM6Batches();
  const exams = useM6Exams();

  // visible range
  const range = useMemo(() => {
    const [y, m] = anchor.split("-").map(Number);
    if (view === "week") {
      const start = addDays(anchor, -dow(anchor));
      return { from: start, to: addDays(start, 6), days: Array.from({ length: 7 }, (_, i) => addDays(start, i)), month: m - 1, year: y };
    }
    const first = ymd(y, m - 1, 1);
    const start = addDays(first, -dow(first));
    const last = ymd(y, m, 0);
    const end = addDays(last, 6 - dow(last));
    const n = Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
    return { from: start, to: end, days: Array.from({ length: n }, (_, i) => addDays(start, i)), month: m - 1, year: y };
  }, [anchor, view]);

  const cal = useCalendar({ from: range.from, to: range.to, batchIds, examId: examId || undefined });
  const data = cal.data;
  const forbidden = apiError(cal.error).code === "FORBIDDEN";

  const byDay = useMemo(() => {
    const m = new Map<string, CalTest[]>();
    for (const t of data?.tests ?? []) {
      const d = dayOf(t.opensAt);
      m.set(d, [...(m.get(d) ?? []), t]);
    }
    for (const v of m.values()) v.sort((a, b) => a.opensAt.localeCompare(b.opensAt));
    return m;
  }, [data]);
  const resultsByDay = useMemo(() => {
    const m = new Map<string, CalendarResponse["resultEvents"]>();
    for (const e of data?.resultEvents ?? []) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [data]);
  const clashByDay = useMemo(() => {
    const m = new Map<string, CalendarResponse["clashes"]>();
    for (const c of data?.clashes ?? []) m.set(c.date, [...(m.get(c.date) ?? []), c]);
    return m;
  }, [data]);

  const openTest = data?.tests.find((t) => t.testId === open?.id) ?? null;
  useEffect(() => {
    if (open && open.x < 0 && openTest) {
      // opened from "Show in calendar": centre the popover over the grid
      setOpen({ id: open.id, x: (cardRef.current?.clientWidth ?? 800) / 2 - 170, y: 120 });
      setPicked(dayOf(openTest.opensAt));
    }
  }, [open, openTest]);

  const step = (n: number) => {
    setOpen(null);
    if (view === "week") setAnchor(addDays(anchor, 7 * n));
    else {
      const [y, m] = anchor.split("-").map(Number);
      setAnchor(ymd(y, m - 1 + n, 1));
    }
  };

  const rangeLabel =
    view === "week"
      ? (() => {
          const [, am, ad] = range.from.split("-").map(Number);
          const [by, bm, bd] = range.to.split("-").map(Number);
          return am === bm ? `${ad} – ${bd} ${MON3[bm - 1]} ${by}` : `${ad} ${MON3[am - 1]} – ${bd} ${MON3[bm - 1]} ${by}`;
        })()
      : `${MONTHS[range.month]} ${range.year}`;

  const openPopover = (t: CalTest, el: HTMLElement) => {
    const card = cardRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!card) return;
    const w = 340;
    let x = r.left - card.left;
    if (x + w > card.width - 8) x = Math.max(8, r.right - card.left - w);
    setOpen({ id: t.testId, x, y: r.bottom - card.top + 6 });
  };

  /* drag to move */
  const startDrag = (t: CalTest) => (e: DragEvent) => {
    if (!t.movable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", t.testId);
    e.dataTransfer.effectAllowed = "move";
    setDragId(t.testId);
    setOpen(null);
  };
  const ask = async (t: CalTest, opensAt: string) => {
    const dur = Date.parse(t.closesAt) - Date.parse(t.opensAt);
    const closesAt = new Date(Date.parse(opensAt) + dur).toISOString();
    if (opensAt === t.opensAt) return;
    try {
      const impact = await reschedule(t.testId, { opensAt, closesAt, confirm: false });
      setPending({ test: t, opensAt, closesAt, impact });
    } catch (err) {
      const e = apiError(err);
      const msg =
        e.code === "TEST_LIVE" ? "Live tests can't be moved." : e.code === "TEST_ENDED" ? "Ended tests can't be moved." : e.code === "VALIDATION_ERROR" ? "Pick a time in the future." : e.message;
      notify.error(`Couldn't move ${t.name}`, { description: msg });
    }
  };
  const dropOnDay = (date: string) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    const t = data?.tests.find((x) => x.testId === id);
    if (!t || !t.movable) return;
    void ask(t, atIst(date, minutesOfDay(t.opensAt)));
  };
  const confirmMove = async () => {
    if (!pending) return;
    const r = await reschedule(pending.test.testId, { opensAt: pending.opensAt, closesAt: pending.closesAt, confirm: true });
    setPending(null);
    invalidate();
    notify.success(r.notify > 0 ? `Moved ${pending.test.name} · ${r.notify.toLocaleString("en-IN")} students told` : `Moved ${pending.test.name}`);
  };
  const batchOptions = (batches.data ?? []).map((b) => ({ value: b.id, label: b.name }));
  const examOptions = examRefs(exams.data).map((e) => ({ value: e.id, label: e.name }));
  const batchFilterLabel = (batches.data ?? []).find((b) => b.id === batchId)?.name ?? "";

  const ok = !cal.isLoading && !cal.isError;
  const empty = ok && (data?.tests.length ?? 0) === 0;
  const agendaDay = tablet ? picked : null;

  return (
    <>
      <Topbar
        title="Calendar"
        back={{ href: "/tests", label: "Tests" }}
        badge={<SampleDataPill areas={["calendar"]} />}
        actions={
          <Link href="/tests/new" className="btn btn-primary btn-sm">
            <Plus className="size-3.5" aria-hidden />
            New test
          </Link>
        }
      />
      <main className="col gap-3.5 px-7 pt-[18px] pb-12">
        {forbidden ? (
          <NoAccess what="the calendar" />
        ) : (
          <>
            <div className="row between wrap gap-2.5">
              <div className="row wrap gap-2">
                <button type="button" className="btn btn-ghost btn-icon btn-sm w-9" aria-label={view === "week" ? "Previous week" : "Previous month"} onClick={() => step(-1)}>
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <span className="h3 num min-w-[150px] text-center" aria-live="polite">
                  {rangeLabel}
                </span>
                <button type="button" className="btn btn-ghost btn-icon btn-sm w-9" aria-label={view === "week" ? "Next week" : "Next month"} onClick={() => step(1)}>
                  <ChevronRight className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setAnchor(today);
                    setPicked(today);
                    setOpen(null);
                  }}
                >
                  Today
                </button>
                <span className="seg" role="radiogroup" aria-label="Calendar view">
                  {(["month", "week"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={view === v}
                      className={`tab ${view === v ? "on" : ""}`}
                      onClick={() => {
                        setView(v);
                        setOpen(null);
                      }}
                    >
                      {v === "month" ? "Month" : "Week"}
                    </button>
                  ))}
                </span>
              </div>
              <div className="row wrap gap-2">
                <FilterChip label="Batch" noun="batch" value={batchId || null} onChange={(v) => setBatchId(v ?? "")} options={batchOptions} />
                <FilterChip label="Exam" noun="exam" value={examId || null} onChange={(v) => setExamId(v ?? "")} options={examOptions} />
                <span className="cal-ist">IST</span>
              </div>
            </div>

            <div className="row wrap gap-4" aria-label="Legend">
              <span className="cal-lg"><i className="ev-live" />Live</span>
              <span className="cal-lg"><i className="ev-sched" />Scheduled</span>
              <span className="cal-lg"><i className="ev-draft" />Draft</span>
              <span className="cal-lg"><i className="ev-fail" />Not published</span>
              <span className="cal-lg"><i className="ev-ended" />Ended</span>
              <span className="cal-lg font-semibold text-success">
                <Check className="size-3" strokeWidth={2.6} aria-hidden />
                Results out
              </span>
            </div>

            <section ref={cardRef} className="card relative overflow-visible">
              {cal.isLoading && (
                <div className="col gap-2.5 p-4" aria-busy="true">
                  <div className="skel h-[22px] w-2/5 rounded-md" />
                  <div className="skel h-[520px] rounded-xl" />
                </div>
              )}
              {cal.isError && !forbidden && (
                <div className="min-h-[360px] content-center">
                  <StateBox
                    tone="error"
                    title="Couldn't load the calendar"
                    body="Check your connection and try again."
                    code={apiError(cal.error).code ?? undefined}
                    action={
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => cal.refetch()}>
                        Try again
                      </button>
                    }
                  />
                </div>
              )}

              {ok && view === "month" && (
                <div ref={fillRef} className={`cal-fill ${fillH ? "fill" : ""}`} style={{ height: fillH ?? undefined }} onScroll={() => setOpen(null)}>
                <div className="cal-mon" role="grid" aria-label={`${MONTHS[range.month]} ${range.year}`} style={{ gridTemplateRows: tablet ? `auto repeat(${range.days.length / 7}, 64px)` : `auto repeat(${range.days.length / 7}, minmax(104px, 1fr))` }}>
                  <div role="row" style={{ display: "contents" }}>
                    {DOW.map((d) => (
                      <span key={d} className="dw" role="columnheader">
                        {d}
                      </span>
                    ))}
                  </div>
                  {/* weeks are ARIA rows (display: contents keeps the CSS grid): axe aria-required-children */}
                  {Array.from({ length: range.days.length / 7 }, (_, w) => (
                    <div key={w} role="row" style={{ display: "contents" }}>
                      {range.days.slice(w * 7, w * 7 + 7).map((date) => {
                    const [, m, d] = date.split("-").map(Number);
                    const off = m - 1 !== range.month;
                    const evs = byDay.get(date) ?? [];
                    const res = resultsByDay.get(date) ?? [];
                    const clashes = clashByDay.get(date) ?? [];
                    const cls = ["day", off && "off", date === today && "today", tablet && agendaDay === date && "sel", dragId && "drop"].filter(Boolean).join(" ");
                    return (
                      <div
                        key={date}
                        className={cls}
                        role="gridcell"
                        onDragOver={(e) => {
                          if (dragId) e.preventDefault();
                        }}
                        onDrop={dropOnDay(date)}
                        onClick={tablet ? () => setPicked(date) : undefined}
                      >
                        <span className="dn">
                          {d}
                          <span className="sr-only"> {MONTHS[m - 1]}{evs.length ? `, ${evs.length} ${evs.length === 1 ? "test" : "tests"}` : ""}</span>
                        </span>
                        {!tablet &&
                          evs.map((t) => (
                            <button
                              key={t.testId}
                              type="button"
                              className={`ev ${kind(t)} ${open?.id === t.testId ? "on" : ""} ${t.movable ? "movable" : ""}`}
                              title={`${t.name} · ${timeShort(t.opensAt)}${t.movable ? " · drag to move" : ""}`}
                              draggable={t.movable}
                              onDragStart={startDrag(t)}
                              onDragEnd={() => setDragId(null)}
                              onClick={(e) => openPopover(t, e.currentTarget)}
                            >
                              <span className="t">{timeShort(t.opensAt)}</span>
                              <span className="ell">{t.name}</span>
                            </button>
                          ))}
                        {tablet && evs.length > 0 && (
                          <span className="dots" aria-hidden>
                            {evs.map((t) => (
                              <i key={t.testId} style={{ background: DOT[kind(t)] }} />
                            ))}
                          </span>
                        )}
                        {res.map((r) => (
                          <span key={`${r.kind}-${r.test.testId}`} className="res">
                            <Check className="size-[11px] shrink-0" strokeWidth={2.8} aria-hidden />
                            <span className="ell">{r.kind === "published" ? `Results: ${r.test.shortName ?? r.test.name}` : `${r.test.shortName ?? r.test.name} key corrected`}</span>
                          </span>
                        ))}
                        {clashes.slice(0, 1).map((c) => (
                          <span key={c.batch.id} className="clash" title={`${c.batch.name} has two tests at the same time`}>
                            <AlertTriangle className="size-[11px] shrink-0" aria-hidden />
                            <span className="ell">Clash · {c.batch.name}</span>
                          </span>
                        ))}
                      </div>
                    );
                      })}
                    </div>
                  ))}
                </div>
                </div>
              )}

              {ok && view === "week" && (
                <WeekGrid
                  fillRef={fillRef}
                  bodyHeight={fillH}
                  onScroll={() => setOpen(null)}
                  days={range.days}
                  today={today}
                  tests={data?.tests ?? []}
                  openId={open?.id ?? null}
                  dragId={dragId}
                  onOpen={openPopover}
                  onDragStart={startDrag}
                  onDragEnd={() => setDragId(null)}
                  onDropAt={(t, iso) => {
                    setDragId(null);
                    if (t.movable) void ask(t, iso);
                  }}
                />
              )}

              {open && openTest && open.x >= 0 && (
                <Popover
                  t={openTest}
                  x={open.x}
                  y={open.y}
                  onClose={() => setOpen(null)}
                  onLinks={() => {
                    setLinksFor(openTest);
                    setOpen(null);
                  }}
                />
              )}
            </section>

            {empty && (
              <div className="row between wrap gap-2.5 rounded-xl border border-dashed border-line-2 bg-surface px-3.5 py-3">
                <span className="sm">
                  No tests{batchFilterLabel ? ` for ${batchFilterLabel}` : ""} in {view === "week" ? `the week of ${dayLabel(range.from)}` : MONTHS[range.month]} yet.
                </span>
                <Link href="/tests/new" className="btn btn-secondary btn-sm">
                  Plan a test
                </Link>
              </div>
            )}

            {tablet && ok && view === "month" && agendaDay && (
              <section className="col gap-2" aria-label="Tests on the picked day">
                <span className="sm font-semibold">
                  {dayLabel(agendaDay)}
                  {agendaDay === today ? " · today" : ""}
                </span>
                <div ref={agRef} className="col gap-2 overflow-y-auto" style={{ height: agH ?? undefined }}>
                  {(byDay.get(agendaDay) ?? []).length === 0 && <span className="xs muted">No tests on this day.</span>}
                  {(byDay.get(agendaDay) ?? []).map((t) => (
                    <button key={t.testId} type="button" className="cal-ag" onClick={(e) => openPopover(t, e.currentTarget)}>
                      <StateBadge t={t} />
                      <span className="col grow min-w-0 gap-px text-left">
                        <span className="sm ell font-semibold">{t.name}</span>
                        <span className="xs muted">
                          {timeRange(t.opensAt, t.closesAt)} · {batchesShort(t)}
                        </span>
                      </span>
                      {t.attempts && (
                        <span className="xs num muted">
                          {t.attempts.submitted} / {t.attempts.assigned ?? "—"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <span className="xs muted">Tap a day to list its tests here.</span>
              </section>
            )}
          </>
        )}
      </main>

      <MoveDialog p={pending} onClose={() => setPending(null)} onConfirm={confirmMove} />
      <TestLinksDrawer test={linksFor} onClose={() => setLinksFor(null)} />
      <style>{CAL_CSS}</style>
    </>
  );
}

/* ───────────── week ───────────── */

const HOUR_PX = 48;

function WeekGrid({
  fillRef,
  bodyHeight,
  onScroll,
  days,
  today,
  tests,
  openId,
  dragId,
  onOpen,
  onDragStart,
  onDragEnd,
  onDropAt,
}: {
  /** fills the viewport height left (header row stays above, hours scroll) */
  fillRef: (el: HTMLDivElement | null) => void;
  bodyHeight: number | null;
  onScroll: () => void;
  days: string[];
  today: string;
  tests: CalTest[];
  openId: string | null;
  dragId: string | null;
  onOpen: (t: CalTest, el: HTMLElement) => void;
  onDragStart: (t: CalTest) => (e: DragEvent) => void;
  onDragEnd: () => void;
  onDropAt: (t: CalTest, opensAtIso: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);
  // blocks per day (a window crossing midnight is drawn on each day it covers)
  const segs = days.map((date) => {
    const start = Date.parse(atIst(date, 0));
    const end = start + DAY_MS;
    return tests
      .filter((t) => Date.parse(t.opensAt) < end && Date.parse(t.closesAt) > start)
      .map((t) => {
        const a = Math.max(Date.parse(t.opensAt), start);
        const b = Math.min(Date.parse(t.closesAt), end);
        return { t, from: (a - start) / 60_000, to: (b - start) / 60_000, lane: 0, lanes: 1 };
      })
      .sort((x, y) => x.from - y.from)
      .reduce<Array<{ t: CalTest; from: number; to: number; lane: number; lanes: number }>>((acc, seg) => {
        // side by side when windows overlap: first free lane
        const ends: number[] = [];
        for (const p of acc) if (p.to > seg.from) ends[p.lane] = Math.max(ends[p.lane] ?? 0, p.to);
        let lane = 0;
        while (ends[lane] !== undefined) lane++;
        acc.push({ ...seg, lane });
        const n = Math.max(...acc.filter((p) => p.to > seg.from || p === acc[acc.length - 1]).map((p) => p.lane)) + 1;
        for (const p of acc) if (p.to > seg.from) p.lanes = Math.max(p.lanes, n);
        return acc;
      }, []);
  });
  let minH = 8;
  let maxH = 22;
  segs.flat().forEach((s) => {
    minH = Math.min(minH, Math.floor(s.from / 60));
    maxH = Math.max(maxH, Math.ceil(s.to / 60));
  });
  const hours = Array.from({ length: maxH - minH }, (_, i) => minH + i);
  const grab = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const first = Math.min(8 * 60, ...segs.flat().map((x) => x.from));
  useEffect(() => {
    // open the day at 8 AM (or the first test, when earlier)
    if (scroller.current) scroller.current.scrollTop = Math.max(0, ((first - minH * 60) / 60) * HOUR_PX - 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]]);

  return (
    <div>
      <div className="cal-wk border-t-0">
        <span />
        {days.map((d) => (
          <span key={d} className={`wh ${d === today ? "today" : ""}`}>
            <span>{DOW[dow(d)]}</span>
            <b>{Number(d.slice(8))}</b>
          </span>
        ))}
      </div>
      <div
        ref={(el) => {
          scroller.current = el;
          fillRef(el);
        }}
        className="overflow-y-auto"
        style={{ height: bodyHeight ?? 640 }}
        onScroll={onScroll}
      >
        <div className="cal-wk">
          <div>
            {hours.map((h) => (
              <div key={h} className="hh">
                {hourLabel(h)}
              </div>
            ))}
          </div>
          {days.map((date, i) => (
            <div
              key={date}
              className={`wcol ${dragId ? "drop" : ""}`}
              onDragOver={(e) => {
                if (dragId) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                const t = tests.find((x) => x.testId === id);
                if (!t) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = e.clientY - rect.top - grab.current;
                const mins = Math.max(0, Math.min(24 * 60 - 15, Math.round(((y / HOUR_PX) * 60 + minH * 60) / 15) * 15));
                onDropAt(t, atIst(date, mins));
              }}
            >
              {hours.map((h) => (
                <div key={h} className="slot" />
              ))}
              {segs[i].map(({ t, from, to, lane, lanes }) => (
                <button
                  key={t.testId}
                  type="button"
                  className={`blk ${kind(t)} ${openId === t.testId ? "on" : ""} ${t.movable ? "movable" : ""}`}
                  style={{
                    top: ((from - minH * 60) / 60) * HOUR_PX + 2,
                    height: Math.max(22, ((to - from) / 60) * HOUR_PX - 4),
                    left: `calc(${(lane * 100) / lanes}% + 4px)`,
                    right: "auto",
                    width: `calc(${100 / lanes}% - 8px)`,
                  }}
                  draggable={t.movable}
                  onDragStart={(e) => {
                    grab.current = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
                    onDragStart(t)(e);
                  }}
                  onDragEnd={onDragEnd}
                  onClick={(e) => onOpen(t, e.currentTarget)}
                  title={t.movable ? "Drag to move" : undefined}
                >
                  <span className="ell font-semibold">{t.name}</span>
                  <span className="num">
                    {timeRange(t.opensAt, t.closesAt)}
                    {t.state === "live" ? " · live" : ""}
                  </span>
                  <span className="ell">
                    {batchesShort(t)}
                    {t.state === "live" && t.attempts ? ` · ${t.attempts.submitted} / ${t.attempts.assigned ?? "—"}` : ""}
                  </span>
                </button>
              ))}
              {date === today && (() => {
                const m = minutesOfDay(new Date(now).toISOString());
                if (m < minH * 60 || m > maxH * 60) return null;
                return <span className="now" style={{ top: ((m - minH * 60) / 60) * HOUR_PX }} aria-label={`Now, ${timeLong(new Date(now).toISOString())}`} />;
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── popover, badge, move dialog ───────────── */

function StateBadge({ t, long }: { t: CalTest; long?: boolean }) {
  const k = kind(t);
  const att = t.attempts ? ` · ${t.attempts.submitted.toLocaleString("en-IN")} of ${t.attempts.assigned?.toLocaleString("en-IN") ?? "—"} submitted` : "";
  if (k === "live")
    return (
      <span className="badge b-live self-start">
        <span className="live-dot" />
        Live{long ? att : ""}
      </span>
    );
  if (k === "ended") return <span className="badge b-grey self-start">Ended{long ? att : ""}</span>;
  if (k === "fail") return <span className="badge b-amber self-start">Not published</span>;
  if (k === "draft") return <span className="badge b-sky self-start">Draft</span>;
  return <span className="badge b-navy self-start">Scheduled</span>;
}

function Popover({ t, x, y, onClose, onLinks }: { t: CalTest; x: number; y: number; onClose: () => void; onLinks: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.(".ev,.blk,.cal-ag")) onClose();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [onClose]);
  const k = kind(t);
  const edit = `/tests/${t.testId}/edit`;
  return (
    <div ref={ref} tabIndex={-1} className="card cal-pv pop" role="dialog" aria-labelledby="pv-t" style={{ left: x, top: y }}>
      <div className="row between items-start">
        <div className="col gap-1">
          <span id="pv-t" className="h3">
            {t.name}
          </span>
          <StateBadge t={t} long />
        </div>
        <button type="button" className="cal-x" aria-label="Close" onClick={onClose}>
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <div className="cal-facts">
        <span className="muted">When</span>
        <span className="num">{windowLabel(t.opensAt, t.closesAt)}</span>
        <span className="muted">Batches</span>
        <span>{batchesShort(t)}</span>
        <span className="muted">Pattern</span>
        <span>{t.pattern ? `${t.pattern.name} · ${t.pattern.durationMinutes} min` : "—"}</span>
        <span className="muted">Results</span>
        <span>{RESULT_LABEL[t.resultMode]}</span>
      </div>
      <div className="row gap-2">
        {k === "live" && (
          <Link href={`/tests/${t.testId}/monitor`} className="btn btn-primary btn-sm">
            Monitor
          </Link>
        )}
        {k === "ended" && (
          <Link href={`/tests/${t.testId}/result`} className="btn btn-primary btn-sm">
            Results
          </Link>
        )}
        {(k === "sched" || k === "draft" || k === "fail") && (
          <Link href={edit} className="btn btn-primary btn-sm">
            {k === "draft" ? "Continue" : k === "fail" ? "Try again" : "Edit"}
          </Link>
        )}
        {k !== "draft" && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLinks}>
            Student links
          </button>
        )}
        {(k === "live" || k === "ended") && (
          <Link href={edit} className="btn btn-ghost btn-sm">
            Details
          </Link>
        )}
      </div>
      <span className="xs muted">
        {k === "live" ? "Live tests can't be moved. Drag a scheduled or draft test to another day." : k === "ended" ? "Ended tests can't be moved." : "Drag it to another day to move it. You'll see who gets told before anything changes."}
      </span>
    </div>
  );
}

function MoveDialog({ p, onClose, onConfirm }: { p: Pending | null; onClose: () => void; onConfirm: () => Promise<void> }) {
  const published = p?.test.state === "scheduled";
  const notify = p?.impact.notify ?? 0;
  const clashes = p ? p.impact.clashes.filter((c) => c.testIds.includes(p.test.testId)) : [];
  const exp = p?.impact.linksExpireAt ?? null;
  const facts: Array<[string, string]> = p
    ? [
        ["From", windowLabel(p.test.opensAt, p.test.closesAt)],
        ["To", windowLabel(p.opensAt, p.closesAt, true)],
        ["Students", notify > 0 ? `${notify.toLocaleString("en-IN")} in ${batchesShort(p.test)} get a new notice` : "Nobody is told: it isn't published"],
        ...(exp ? ([["Links", `Still work; they now close at ${timeLong(exp)} on ${Number(dayOf(exp).slice(8))} ${MON3[Number(dayOf(exp).slice(5, 7)) - 1]}`]] as Array<[string, string]>) : []),
        ...(clashes.length ? ([["Clash", `${clashes.map((c) => c.batch.name).join(", ")} ${clashes.length === 1 ? "has" : "have"} another test at that time`]] as Array<[string, string]>) : []),
      ]
    : [];
  return (
    <ConfirmDialog
      open={!!p}
      onOpenChange={(o) => !o && onClose()}
      tone="navy"
      title={p ? `Move ${p.test.name}?` : ""}
      description={published ? "It's published, so students were told the old time." : "It's a draft, so nobody has been told yet."}
      facts={facts}
      confirmLabel={published && notify > 0 ? `Move and tell ${notify.toLocaleString("en-IN")} students` : "Move test"}
      onConfirm={onConfirm}
    />
  );
}

const CAL_CSS = `
.cal-ist{font:600 10px/1 var(--mono);padding:4px 5px;border-radius:4px;background:var(--line-2);color:var(--muted);align-self:center}
.cal-lg{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2)}
.cal-lg i{width:12px;height:12px;border-radius:4px;display:inline-block}
.cal-lg i.ev-live{background:var(--red-50);border:1px solid #F2B1B1}
.cal-lg i.ev-sched{background:var(--navy-50);border:1px solid var(--navy-200)}
.cal-lg i.ev-draft{background:var(--surface);border:1px dashed #A9ACC0}
.cal-lg i.ev-fail{background:var(--amber-50);border:1px solid #F1D29A}
.cal-lg i.ev-ended{background:var(--ground);border:1px solid var(--line)}
.cal-mon{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line);border-radius:inherit;overflow:hidden}
.cal-fill{overflow-y:auto;min-height:0;border-radius:inherit}
.cal-fill .cal-mon{min-height:100%;overflow:visible}
.cal-fill.fill .cal-mon{height:100%}
.cal-mon .dw{position:sticky;top:0;z-index:1;padding:8px 10px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#FAFBFD}
.cal-mon .day{min-height:0;overflow-y:auto;scrollbar-width:thin;padding:6px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;gap:4px;min-width:0}
.cal-mon .day.off{background:#FAFBFD}
.cal-mon .day.off .dn{color:#A9ACC0}
.cal-mon .day.today .dn{background:var(--navy);color:#fff}
.cal-mon .day.sel{box-shadow:inset 0 0 0 2px var(--navy)}
.cal-mon .day.drop:hover,.cal-mon .day.drop:focus-within{background:var(--navy-50)}
.cal-mon .dn{align-self:flex-start;min-width:24px;height:24px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:600 12px var(--font);color:var(--ink-2);font-variant-numeric:tabular-nums;padding:0 4px}
.cal-mon .ev{display:flex;align-items:center;gap:6px;width:100%;min-height:24px;padding:2px 6px;border-radius:6px;border:1px solid transparent;font:500 12px var(--font);text-align:left;cursor:pointer;box-sizing:border-box}
.cal-mon .ev .t{font-variant-numeric:tabular-nums;opacity:.8;flex:none}
.ev.live,.blk.live{background:var(--red-50);color:#7A1010;border-color:#F2B1B1}
.ev.sched,.blk.sched{background:var(--navy-50);color:var(--navy);border-color:var(--navy-200)}
.ev.draft,.blk.draft{background:var(--surface);color:var(--ink-2);border:1px dashed #A9ACC0}
.ev.fail,.blk.fail{background:var(--amber-50);color:#5C3600;border-color:#F1D29A}
.ev.ended,.blk.ended{background:var(--ground);color:var(--muted);border-color:var(--line-2)}
.ev.on,.blk.on{box-shadow:0 0 0 2px var(--navy)}
.ev.movable,.blk.movable{cursor:grab}
.ev:focus-visible,.blk:focus-visible{outline:2px solid var(--navy);outline-offset:1px}
.cal-mon .res{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--green);font-weight:600;padding:0 4px;min-width:0}
.cal-mon .clash{display:flex;align-items:center;gap:5px;font-size:11px;color:#9A5800;font-weight:600;padding:0 4px;min-width:0}
.cal-mon .dots{display:flex;gap:3px;flex-wrap:wrap;padding:0 4px}
.cal-mon .dots i{width:8px;height:8px;border-radius:50%}
.cal-mon .ell,.cal-pv .ell,.blk .ell,.cal-ag .ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.cal-wk{display:grid;grid-template-columns:56px repeat(7,minmax(0,1fr));border-top:1px solid var(--line)}
.cal-wk .hh{font:500 11px var(--mono);color:var(--muted);text-align:right;padding-right:8px;height:48px;box-sizing:border-box;transform:translateY(-7px)}
.cal-wk .hh:first-child{transform:none}
.cal-wk .wcol{position:relative;border-left:1px solid var(--line)}
.cal-wk .wcol.drop:hover{background:var(--navy-50)}
.cal-wk .slot{height:48px;border-top:1px solid #F0F1F6;box-sizing:border-box}
.cal-wk .blk{position:absolute;left:4px;right:4px;border-radius:8px;padding:6px 8px;font-size:12px;display:flex;flex-direction:column;gap:2px;overflow:hidden;box-sizing:border-box;border:1px solid;text-align:left;cursor:pointer}
.cal-wk .now{position:absolute;left:0;right:0;height:2px;background:var(--red-600)}
.cal-wk .now::before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--red-600)}
.cal-wk .wh{padding:8px 10px;border-left:1px solid var(--line);font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:2px}
.cal-wk .wh b{font-size:15px;color:var(--ink);font-variant-numeric:tabular-nums}
.cal-wk .wh.today b{color:var(--navy)}
.cal-pv{position:absolute;z-index:8;width:340px;max-width:calc(100% - 16px);padding:14px;display:flex;flex-direction:column;gap:10px;border-color:var(--line-3,#D3D6E2);outline:none}
.cal-facts{display:grid;grid-template-columns:90px minmax(0,1fr);row-gap:6px;column-gap:10px;font-size:13px}
.cal-x{width:28px;height:28px;border:0;background:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);cursor:pointer;flex:none}
.cal-x:hover{background:var(--ground)}
.cal-ag{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);width:100%;cursor:pointer;font:inherit;color:inherit}
.cal-ag:hover{border-color:var(--navy-200)}
`;
