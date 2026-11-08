"use client";
/*
  K03 Date, time and range (Kit-Pickers). Stored in UTC (times) or "YYYY-MM-DD" (IST dates), always shown in India
  time with one small "IST" tag per field. Format "Sun 15 Nov 2026 · 9:00 AM", 12-hour clock. Quick picks first;
  typing works ("15/11 9am" reads as a date, the hint repeats it before saving). The second field of a range can't go
  before the first (the error sits under the second field). Read-only after a test opens (lock + reason).
  Birthdays use three fields (`BirthdayField`), never a calendar paging back 17 years.
*/
import { Popover as P } from "radix-ui";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Combobox } from "./Combobox";
import { ReadOnlyValue } from "./Field";
import { Segmented } from "./Segmented";
import {
  MONTHS,
  MONTHS_LONG,
  addDays,
  cx,
  fmtDate,
  fmtDateTime,
  fromIst,
  isoDate,
  istParts,
  istToday,
  parseIsoDate,
} from "./utils";

/* ---------------- calendar grid ---------------- */

export function Calendar({
  month,
  onMonth,
  selected,
  range,
  isDisabled,
  onPick,
  label,
}: {
  /** first day of the shown month, "YYYY-MM-01" */
  month: string;
  onMonth?: (m: string) => void;
  selected?: string | null;
  range?: { from: string; to: string } | null;
  isDisabled?: (d: string) => boolean;
  onPick: (d: string) => void;
  label?: string;
}) {
  const p = parseIsoDate(month)!;
  const first = new Date(Date.UTC(p.y, p.m, 1));
  const start = addDays(isoDate(p.y, p.m, 1), -first.getUTCDay());
  const today = istToday();
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days.slice(35).every((d) => parseIsoDate(d)!.m !== p.m) ? days.slice(0, 35) : days;
  const step = (n: number) => {
    const t = new Date(Date.UTC(p.y, p.m + n, 1));
    onMonth?.(isoDate(t.getUTCFullYear(), t.getUTCMonth(), 1));
  };
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="row between">
        {onMonth ? (
          <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ width: 32 }} aria-label="Previous month" onClick={() => step(-1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        ) : (
          <span />
        )}
        <span className="sm" style={{ fontWeight: 600 }}>
          {label ?? `${MONTHS_LONG[p.m]} ${p.y}`}
        </span>
        {onMonth ? (
          <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ width: 32 }} aria-label="Next month" onClick={() => step(1)}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="k-cal" role="grid" aria-label={`${MONTHS_LONG[p.m]} ${p.y}`}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="dw" aria-hidden>
            {d}
          </span>
        ))}
        {weeks.map((d) => {
          const dp = parseIsoDate(d)!;
          const inBand = range && d >= range.from && d <= range.to;
          const dis = isDisabled?.(d);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              disabled={dis}
              aria-selected={selected === d || !!inBand}
              aria-label={fmtDate(d, true)}
              className={cx(
                "d",
                dp.m !== p.m && "out",
                d === today && "today",
                selected === d && "on",
                inBand && "band",
                inBand && d === range!.from && "s",
                inBand && d === range!.to && "e"
              )}
              onClick={() => onPick(d)}
            >
              {dp.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const monthOf = (d: string) => {
  const p = parseIsoDate(d)!;
  return isoDate(p.y, p.m, 1);
};

/* ---------------- typing: "15/11 9am", "20/11 5pm", "15 Nov 2026 9:30 am" ---------------- */

export function parseTyped(s: string, now = istParts(Date.now())): { date: string; h: number | null; min: number } | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  let y = now.y,
    m: number | null = null,
    d: number | null = null,
    rest = t;
  const num = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\s*(.*)$/.exec(t);
  const word = /^(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{4}))?\s*(.*)$/.exec(t);
  if (num) {
    d = +num[1];
    m = +num[2] - 1;
    if (num[3]) y = num[3].length === 2 ? 2000 + +num[3] : +num[3];
    rest = num[4];
  } else if (word) {
    const mi = MONTHS.findIndex((x) => word[2].startsWith(x.toLowerCase()));
    if (mi < 0) return null;
    d = +word[1];
    m = mi;
    if (word[3]) y = +word[3];
    rest = word[4];
  } else return null;
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  let h: number | null = null,
    min = 0;
  const tm = /^(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(rest.replace(/[·,]/g, "").trim());
  if (rest.trim()) {
    if (!tm) return null;
    h = +tm[1];
    min = tm[2] ? +tm[2] : 0;
    if (tm[3] === "pm" && h < 12) h += 12;
    if (tm[3] === "am" && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
  }
  return { date: isoDate(y, m, d), h, min };
}

/* ---------------- date + time ---------------- */

export interface QuickPick {
  label: ReactNode;
  /** UTC ISO */
  value: string;
  /** right-hand muted text ("9:00 AM") */
  end?: ReactNode;
}

/** Common quick picks for a test's start: tomorrow and the next few days at 9:00 AM IST. */
export function defaultQuickPicks(hour = 9): QuickPick[] {
  const today = istToday();
  const at = (d: string) => {
    const p = parseIsoDate(d)!;
    return fromIst(p.y, p.m, p.d, hour, 0);
  };
  const tm = addDays(today, 1);
  const label = (d: string) => fmtDate(d, true).split(" ").slice(0, 3).join(" ");
  const ends = (iso: string) => fmtDateTime(iso).split(" · ")[1];
  return [
    { label: "Tomorrow", value: at(tm), end: ends(at(tm)) },
    ...[2, 4, 10].map((n) => {
      const d = addDays(today, n);
      return { label: label(d), value: at(d), end: ends(at(d)) };
    }),
  ];
}

export function DateTimeField({
  id,
  value,
  onChange,
  invalid,
  readOnly,
  readOnlyHint,
  minDate,
  quickPicks = defaultQuickPicks(),
  slots = [9 * 60, 10 * 60, 14 * 60, 17 * 60],
  placeholder = "Pick a date and time",
  "aria-label": ariaLabel,
  dialogLabel,
}: {
  id?: string;
  value: string | null;
  onChange: (iso: string) => void;
  invalid?: boolean;
  readOnly?: boolean;
  readOnlyHint?: string;
  /** earliest IST date allowed ("YYYY-MM-DD"); days before are off */
  minDate?: string;
  quickPicks?: QuickPick[];
  /** time slots in minutes after midnight IST */
  slots?: number[];
  placeholder?: string;
  "aria-label"?: string;
  dialogLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const cur = value ? istParts(value) : null;
  const [date, setDate] = useState<string | null>(cur ? isoDate(cur.y, cur.m, cur.d) : null);
  const [mins, setMins] = useState<number>(cur ? cur.h * 60 + cur.min : 9 * 60);
  const [month, setMonth] = useState(monthOf(date ?? istToday()));
  const [timeText, setTimeText] = useState("");
  useEffect(() => {
    if (!open) return;
    const c = value ? istParts(value) : null;
    const d = c ? isoDate(c.y, c.m, c.d) : null;
    setDate(d);
    setMins(c ? c.h * 60 + c.min : 9 * 60);
    setMonth(monthOf(d ?? minDate ?? istToday()));
    setTyped(null);
  }, [open, value, minDate]);
  useEffect(() => {
    const h = Math.floor(mins / 60),
      m = mins % 60;
    setTimeText(`${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`);
  }, [mins]);

  if (readOnly)
    return (
      <ReadOnlyValue>
        <span className="num">{value ? `${fmtDateTime(value)} IST` : "—"}</span>
        {readOnlyHint && <span className="sr-only">{readOnlyHint}</span>}
      </ReadOnlyValue>
    );

  const parsed = typed != null ? parseTyped(typed) : null;
  const commit = (d: string, m: number) => {
    const p = parseIsoDate(d)!;
    onChange(fromIst(p.y, p.m, p.d, Math.floor(m / 60), m % 60));
    setOpen(false);
  };
  const pm = mins >= 12 * 60;
  const setFromText = (t: string) => {
    const r = /^(\d{1,2})(?::(\d{2}))?$/.exec(t.trim());
    if (!r) return;
    let h = +r[1] % 12;
    const m = r[2] ? Math.min(59, +r[2]) : 0;
    if (pm) h += 12;
    setMins(h * 60 + m);
  };
  const slotLabel = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${m >= 720 ? "PM" : "AM"}`;

  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger asChild>
        {open ? (
          <div className="k-cb open" onClick={(e) => e.preventDefault()}>
            <CalendarDays className="size-4 shrink-0" aria-hidden style={{ color: "var(--muted)" }} />
            <input
              id={id}
              autoFocus
              value={typed ?? ""}
              placeholder={value ? fmtDateTime(value) : "Type 15/11 9am or pick"}
              aria-label={ariaLabel}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && parsed) {
                  e.preventDefault();
                  commit(parsed.date, parsed.h != null ? parsed.h * 60 + parsed.min : mins);
                }
              }}
            />
            <span className="k-ist">IST</span>
          </div>
        ) : (
          <button id={id} type="button" className={cx("k-cb", invalid && "e")} aria-invalid={invalid || undefined} aria-label={ariaLabel} aria-describedby={invalid && id ? `${id}-e` : undefined}>
            <CalendarDays className="size-4 shrink-0" aria-hidden style={{ color: "var(--muted)" }} />
            <span className={cx("v num", !value && "ph")}>{value ? fmtDateTime(value) : placeholder}</span>
            <span className="k-ist">IST</span>
          </button>
        )}
      </P.Trigger>
      <P.Portal>
        <P.Content className="k-pop k-dp wide" align="start" sideOffset={6} collisionPadding={12} aria-label={dialogLabel ?? "Pick a date and time"} onOpenAutoFocus={(e) => e.preventDefault()}>
          {typed != null && typed.trim() && (
            <span className="sr-only" role="status">
              {parsed ? `Reads as ${fmtDate(parsed.date, true)}` : "Can't read that date yet"}
            </span>
          )}
          {quickPicks.length > 0 && (
            <div className="side">
              <span className="k-grp">Quick picks</span>
              {quickPicks.map((q, i) => (
                <button key={i} type="button" className={cx("k-qp", value === q.value && "on")} onClick={() => (onChange(q.value), setOpen(false))}>
                  {q.label}
                  {q.end && <span className="xs num">{q.end}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="calp">
            <Calendar
              month={month}
              onMonth={setMonth}
              selected={parsed?.date ?? date}
              isDisabled={minDate ? (d) => d < minDate : undefined}
              onPick={(d) => {
                setDate(d);
                setTyped(null);
              }}
            />
            {typed != null && typed.trim() && (
              <span className="xs" style={{ color: parsed ? "var(--muted)" : "var(--red-600)" }}>
                {parsed ? `Reads as ${fmtDate(parsed.date, true)}${parsed.h != null ? ` · ${slotLabel(parsed.h * 60 + parsed.min)}` : ""}` : "Type a date like 15/11 9am"}
              </span>
            )}
          </div>
          <div className="timep">
            <span className="label">Time</span>
            <div className="row" style={{ gap: 8 }}>
              <input className="k-input num" style={{ width: 84 }} aria-label="Time" value={timeText} onChange={(e) => setTimeText(e.target.value)} onBlur={(e) => setFromText(e.target.value)} />
              <Segmented
                ariaLabel="AM or PM"
                value={pm ? "PM" : "AM"}
                onChange={(v) => setMins((m) => (v === "PM" ? (m % 720) + 720 : m % 720))}
                options={[
                  { value: "AM", label: "AM" },
                  { value: "PM", label: "PM" },
                ]}
              />
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {slots.map((s) => (
                <button key={s} type="button" className={cx("k-slot", mins === s && "on")} onClick={() => setMins(s)}>
                  {slotLabel(s)}
                </button>
              ))}
            </div>
            <span className="xs muted" style={{ marginTop: "auto" }}>
              India time (IST)
            </span>
            <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!(parsed?.date ?? date) || (!!minDate && (parsed?.date ?? date)! < minDate)}
                onClick={() => commit(parsed?.date ?? date!, parsed?.h != null ? parsed.h * 60 + parsed.min : mins)}
              >
                Set
              </button>
            </div>
          </div>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/* ---------------- date only ---------------- */

export function DateField({
  id,
  value,
  onChange,
  invalid,
  clearable,
  minDate,
  maxDate,
  placeholder = "Pick a date",
  "aria-label": ariaLabel,
  ist = true,
}: {
  id?: string;
  /** "YYYY-MM-DD" */
  value: string | null;
  onChange: (d: string | null) => void;
  invalid?: boolean;
  clearable?: boolean;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  "aria-label"?: string;
  /** show the IST tag (validity dates) */
  ist?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(value ?? istToday()));
  useEffect(() => {
    if (open) setMonth(monthOf(value ?? minDate ?? istToday()));
  }, [open, value, minDate]);
  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <div className="relative w-full min-w-0">
      <P.Trigger asChild>
        <button id={id} type="button" className={cx("k-cb", invalid && "e", open && "open")} aria-invalid={invalid || undefined} aria-label={ariaLabel} aria-describedby={invalid && id ? `${id}-e` : undefined}>
          <span className={cx("v num", !value && "ph")}>{value ? fmtDate(value) : placeholder}</span>
          {/* room for the clear button, which sits over this spot outside the trigger (no button in a button) */}
          {clearable && value && <span className="k-x" aria-hidden style={{ visibility: "hidden" }} />}
          {ist ? <span className="k-ist">IST</span> : <ChevronDown className="size-4" aria-hidden />}
        </button>
      </P.Trigger>
        {clearable && value && !open && (
          <button
            type="button"
            className="k-x"
            aria-label={`Clear ${ariaLabel ?? "date"}`}
            style={{ position: "absolute", top: "50%", right: ist ? 44 : 32, transform: "translateY(-50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <P.Portal>
        <P.Content className="k-pop" style={{ padding: "14px 16px" }} align="start" sideOffset={6} collisionPadding={12}>
          <Calendar
            month={month}
            onMonth={setMonth}
            selected={value}
            isDisabled={(d) => (!!minDate && d < minDate) || (!!maxDate && d > maxDate)}
            onPick={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/* ---------------- ranges with presets (filters, exports) ---------------- */

export type RangePreset = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";
export interface DateRange {
  from: string;
  to: string;
  preset: RangePreset;
}
export const RANGE_LABEL: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  custom: "Custom",
};
export function presetRange(preset: Exclude<RangePreset, "custom">): DateRange {
  const t = istToday();
  const p = parseIsoDate(t)!;
  switch (preset) {
    case "today":
      return { from: t, to: t, preset };
    case "yesterday":
      return { from: addDays(t, -1), to: addDays(t, -1), preset };
    case "7d":
      return { from: addDays(t, -6), to: t, preset };
    case "30d":
      return { from: addDays(t, -29), to: t, preset };
    case "month":
      return { from: isoDate(p.y, p.m, 1), to: t, preset };
  }
}
/** "30 Oct – 5 Nov 2026" */
export function fmtRange(r: { from: string; to: string }): string {
  const a = parseIsoDate(r.from)!,
    b = parseIsoDate(r.to)!;
  if (r.from === r.to) return fmtDate(r.from);
  return `${a.d} ${MONTHS[a.m]}${a.y !== b.y ? ` ${a.y}` : ""} – ${b.d} ${MONTHS[b.m]} ${b.y}`;
}
export const rangeLabel = (r: DateRange) => (r.preset === "custom" ? fmtRange(r) : RANGE_LABEL[r.preset]);
/** IST day bounds of a range as UTC instants (API `from`/`to`). */
export function rangeInstants(r: { from: string; to: string }): { from: string; to: string } {
  const a = parseIsoDate(r.from)!,
    b = parseIsoDate(addDays(r.to, 1))!;
  return { from: fromIst(a.y, a.m, a.d), to: new Date(new Date(fromIst(b.y, b.m, b.d)).getTime() - 1).toISOString() };
}

/** The range picker body (presets on the left, a calendar band on the right). Future days are off. */
export function RangePanel({ value, onChange, allowFuture }: { value: DateRange; onChange: (r: DateRange) => void; allowFuture?: boolean }) {
  const [month, setMonth] = useState(monthOf(value.to));
  const [anchor, setAnchor] = useState<string | null>(null);
  const today = istToday();
  const presets: RangePreset[] = ["today", "yesterday", "7d", "30d", "month", "custom"];
  return (
    <div className="row" style={{ alignItems: "stretch", gap: 0 }}>
      <div className="col" style={{ width: 150, padding: 10, gap: 2, borderRight: "1px solid var(--line-2)" }}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={cx("k-qp", value.preset === p && "on")}
            onClick={() => {
              if (p === "custom") onChange({ ...value, preset: "custom" });
              else {
                const r = presetRange(p);
                onChange(r);
                setMonth(monthOf(r.to));
              }
              setAnchor(null);
            }}
          >
            {RANGE_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="col" style={{ padding: "14px 16px", gap: 10 }}>
        <span className="sm num" style={{ fontWeight: 600 }}>
          {anchor ? `${fmtDate(anchor)} – pick the last day` : fmtRange(value)}
        </span>
        <Calendar
          month={month}
          onMonth={setMonth}
          range={anchor ? { from: anchor, to: anchor } : value}
          isDisabled={allowFuture ? undefined : (d) => d > today}
          onPick={(d) => {
            if (!anchor) setAnchor(d);
            else {
              const [from, to] = d < anchor ? [d, anchor] : [anchor, d];
              onChange({ from, to, preset: "custom" });
              setAnchor(null);
            }
          }}
        />
        {!allowFuture && <span className="xs muted">Future days are off for audit ranges.</span>}
      </div>
    </div>
  );
}

/* ---------------- birthday: three fields ---------------- */

export function BirthdayField({
  value,
  onChange,
  invalid,
  idPrefix = "dob",
  size,
  compact,
}: {
  value: string | null;
  onChange: (d: string | null) => void;
  invalid?: boolean;
  idPrefix?: string;
  size?: "md" | "lg";
  /** half-width columns (drawers): short month names, narrower day/year */
  compact?: boolean;
}) {
  const p = parseIsoDate(value);
  const [day, setDay] = useState(p ? String(p.d) : "");
  const [mon, setMon] = useState<string | null>(p ? String(p.m) : null);
  const [year, setYear] = useState(p ? String(p.y) : "");
  const last = useRef(value);
  useEffect(() => {
    if (value === last.current) return;
    last.current = value;
    const q = parseIsoDate(value);
    setDay(q ? String(q.d) : "");
    setMon(q ? String(q.m) : null);
    setYear(q ? String(q.y) : "");
  }, [value]);
  const emit = (d: string, m: string | null, y: string) => {
    const dd = +d,
      yy = +y;
    let next: string | null = null;
    if (d && m != null && y.length === 4 && dd >= 1 && dd <= 31 && yy > 1900) {
      const t = new Date(Date.UTC(yy, +m, dd));
      if (t.getUTCMonth() === +m) next = isoDate(yy, +m, dd);
    }
    last.current = next;
    onChange(next);
  };
  const months = useMemo(() => (compact ? MONTHS : MONTHS_LONG).map((label, i) => ({ value: String(i), label, keywords: [MONTHS_LONG[i]!] })), [compact]);
  const cls = cx("k-input num", size === "lg" && "k-lg", invalid && "e");
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "46px minmax(76px, 1fr) 62px" : "64px minmax(0, 1fr) 84px", gap: compact ? 6 : 8 }}>
      <input
        id={`${idPrefix}-d`}
        className={cls}
        inputMode="numeric"
        aria-label="Day"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          setDay(v);
          emit(v, mon, year);
        }}
      />
      <Combobox
        id={`${idPrefix}-m`}
        aria-label="Month"
        placeholder={compact ? "MM" : "Month"}
        size={size}
        invalid={invalid}
        options={months}
        value={mon}
        onChange={(v) => {
          setMon(v);
          emit(day, v, year);
        }}
      />
      <input
        id={`${idPrefix}-y`}
        className={cls}
        inputMode="numeric"
        aria-label="Year"
        placeholder="YYYY"
        maxLength={4}
        value={year}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          setYear(v);
          emit(day, mon, v);
        }}
      />
    </div>
  );
}
