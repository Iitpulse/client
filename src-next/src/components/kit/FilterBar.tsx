"use client";
/*
  K04 Filter bar (Kit-Data): search, chips, "N filters · Clear all", sort on the right. The URL is the state of the
  list (useUrlState): search, filters, sort, page and page size live in the address, so Back and a shared link return
  the same rows. Chip label = "Field: value"; unset shows "any" and the chevron; set turns navy-tint with ×. Every chip
  opens a combobox (or a date range). Changing a filter resets to page 1 and keeps the sort. Search doesn't count as a
  filter. Under 1180px: search, one "Filters · N" button and a drawer of full-width fields; set filters still show as
  chips under the bar.
*/
import { Popover as P } from "radix-ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Combobox, useListEngine, type ComboOption } from "./Combobox";
import { RangePanel, rangeLabel, type DateRange } from "./DatePicker";
import { Drawer } from "./Overlay";
import { cx, useDebounced, useTablet } from "./utils";

/* ---------------- URL state ---------------- */

/**
 * List state in the URL. `defaults` are omitted from the address. Setting anything but `page`/`sort` resets `page`.
 *   const [s, set] = useUrlState({ tab: "student", q: "", batch: "", page: "1", size: "25", sort: "name" });
 *   set({ batch: "b1" })  // → ?batch=b1 (page back to 1)
 */
export function useUrlState<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dkey = JSON.stringify(defaults);
  const state = useMemo(() => {
    const d = JSON.parse(dkey) as T;
    const out = { ...d };
    (Object.keys(d) as Array<keyof T>).forEach((k) => {
      const v = sp.get(k as string);
      if (v != null) out[k] = v as T[keyof T];
    });
    return out;
  }, [sp, dkey]);
  const set = useCallback(
    (patch: Partial<T>) => {
      const d = JSON.parse(dkey) as T;
      const next = new URLSearchParams(sp.toString());
      const keys = Object.keys(patch);
      for (const k of keys) {
        const v = patch[k as keyof T] as string | undefined;
        if (v == null || v === d[k as keyof T]) next.delete(k);
        else next.set(k, v);
      }
      if ("page" in d && !keys.some((k) => k === "page" || k === "sort" || k === "size")) next.delete("page");
      if ("page" in d && keys.includes("size")) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname, dkey]
  );
  return [state, set];
}

/* ---------------- bar ---------------- */

type Mode = "chip" | "field" | "setOnly";
const ModeCtx = createContext<Mode>("chip");

export function FilterBar({
  search,
  activeCount,
  onClearAll,
  children,
  right,
  showLabel,
}: {
  search?: ReactNode;
  /** number of set filters (search excluded) */
  activeCount: number;
  onClearAll: () => void;
  /** FilterChip / DateRangeChip / ToggleChip elements */
  children: ReactNode;
  /** sort chip or a count on the right */
  right?: ReactNode;
  /** tablet drawer button: "Show 128 students" */
  showLabel?: string;
}) {
  const tablet = useTablet();
  const [open, setOpen] = useState(false);
  if (tablet)
    return (
      <div className="col" style={{ gap: 8 }}>
        <div className="row between wrap" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            {search}
            <button type="button" className={cx("k-fc", activeCount > 0 && "set")} style={activeCount ? { paddingRight: 12 } : undefined} onClick={() => setOpen(true)}>
              <SlidersHorizontal className="size-4" aria-hidden />
              <b>Filters{activeCount ? ` · ${activeCount}` : ""}</b>
            </button>
          </div>
          {right}
        </div>
        {activeCount > 0 && (
          <div className="row wrap" style={{ gap: 6 }}>
            <ModeCtx.Provider value="setOnly">{children}</ModeCtx.Provider>
          </div>
        )}
        <Drawer
          open={open}
          onOpenChange={setOpen}
          title="Filters"
          aria-label="Filters"
          footer={
            <div className="row between" style={{ width: "100%" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClearAll} disabled={!activeCount}>
                Clear all
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                {showLabel ?? "Show results"}
              </button>
            </div>
          }
        >
          <ModeCtx.Provider value="field">{children}</ModeCtx.Provider>
        </Drawer>
      </div>
    );
  return (
    <div className="row between wrap" style={{ gap: 10 }}>
      <div className="row wrap" style={{ gap: 8 }}>
        {search}
        <ModeCtx.Provider value="chip">{children}</ModeCtx.Provider>
        {activeCount > 0 && (
          <span className="sm muted row" style={{ gap: 4, marginLeft: 4 }}>
            {activeCount === 1 ? "1 filter" : `${activeCount} filters`} ·{" "}
            <button type="button" className="k-linkbtn" style={{ textDecoration: "none" }} onClick={onClearAll}>
              Clear all
            </button>
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

/** Search box; writes after 250 ms (pass the URL setter). */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  width,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** screen-reader label ("Search users") */
  label: string;
  width?: number;
  id?: string;
}) {
  const [v, setV] = useState(value);
  const dv = useDebounced(v, 250);
  const first = useRef(true);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (dv !== value) onChange(dv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dv]);
  return (
    <label className="k-srch" style={width ? { width } : undefined}>
      <span className="sr-only">{label}</span>
      <Search className="size-4" aria-hidden />
      <input id={id} className="k-input" type="search" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
    </label>
  );
}

/* ---------------- chips ---------------- */

export function FilterChip<V extends string = string>({
  label,
  value,
  onChange,
  options,
  noun,
  anyLabel,
  onSearch,
  loading,
  valueLabel,
  clearable = true,
}: {
  /** "Batch" */
  label: string;
  value: V | null;
  onChange: (v: V | null) => void;
  options: Array<ComboOption<V>>;
  /** "batch" → "Any batch", "No batch called …" */
  noun: string;
  /** label of the "any" row (default "Any {noun}") */
  anyLabel?: string;
  onSearch?: (q: string) => void;
  loading?: boolean;
  valueLabel?: string;
  /** false for filters that always have a value (Status: active); shows no × */
  clearable?: boolean;
}) {
  const mode = useContext(ModeCtx);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  useEffect(() => {
    if (open && onSearch) onSearch(dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, open]);
  const sel = options.find((o) => o.value === value);
  const shown = sel?.label ?? (value ? valueLabel ?? value : null);
  const engine = useListEngine<V>({
    options,
    query: q,
    serverSide: !!onSearch,
    onPick: (o) => {
      onChange(o.value);
      setOpen(false);
      setQ("");
    },
    isSelected: (v) => v === value,
    noun,
    loading,
    footer: clearable ? (
      <>
        <div className="k-sep" />
        <button
          type="button"
          className="k-li"
          onClick={() => {
            onChange(null);
            setOpen(false);
            setQ("");
          }}
        >
          <span className="muted">{anyLabel ?? `Any ${noun}`}</span>
        </button>
      </>
    ) : undefined,
  });
  if (mode === "field")
    return (
      <div className="field">
        <span className="label">{label}</span>
        <Combobox aria-label={label} options={options} value={value} onChange={(v) => onChange(v)} clearable={clearable} placeholder={anyLabel ?? `Any ${noun}`} noun={noun} onSearch={onSearch} loading={loading} valueLabel={valueLabel} />
      </div>
    );
  if (mode === "setOnly" && (!value || !clearable)) return null;
  const set = !!value && clearable;
  return (
    <P.Root open={open} onOpenChange={(o) => (setOpen(o), !o && setQ(""))}>
      <P.Trigger asChild>
        <button type="button" className={cx("k-fc", set && "set", open && "open")} aria-label={`${label}: ${shown ?? "any"}`}>
          <span className="k">{label}:</span>
          {set ? <b>{shown}</b> : <span>{shown ?? "any"}</span>}
          {set ? (
            <span
              role="button"
              tabIndex={0}
              className="k-x"
              aria-label={`Clear ${label.toLowerCase()} filter`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
            >
              <X className="size-3.5" aria-hidden />
            </span>
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </button>
      </P.Trigger>
      <P.Portal>
        <P.Content className="k-pop" style={{ width: 280 }} align="start" sideOffset={6} collisionPadding={12}>
          <div className="k-pop-search">
            <Search className="size-4" aria-hidden />
            <input
              className="k-input"
              autoFocus
              value={q}
              placeholder={`Search ${noun}s`}
              aria-label={`Search ${noun}s`}
              role="combobox"
              aria-expanded
              aria-controls={engine.listId}
              aria-activedescendant={engine.activeId}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={engine.onKeyDown}
            />
          </div>
          {engine.list}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

/** Quick yes/no filter with its count ("Missing solution · 214"). At most 4 on a page. */
export function ToggleChip({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const mode = useContext(ModeCtx);
  if (mode === "setOnly" && !on) return null;
  return (
    <button type="button" className={cx("k-fc tg", on && "on")} aria-pressed={on} onClick={() => onChange(!on)}>
      {children}
    </button>
  );
}

/** "When: Last 7 days IST" chip with presets and a calendar range. `isDefault` = no × (the default range). */
export function DateRangeChip({
  label = "When",
  value,
  onChange,
  isDefault,
  onReset,
  allowFuture,
}: {
  label?: string;
  value: DateRange;
  onChange: (r: DateRange) => void;
  isDefault?: boolean;
  onReset?: () => void;
  allowFuture?: boolean;
}) {
  const mode = useContext(ModeCtx);
  const [open, setOpen] = useState(false);
  if (mode === "setOnly" && isDefault) return null;
  const body = <RangePanel value={value} allowFuture={allowFuture} onChange={(r) => (onChange(r), r.preset !== "custom" && setOpen(false))} />;
  if (mode === "field")
    return (
      <div className="field">
        <span className="label">{label}</span>
        <div className="card" style={{ overflow: "clip" }}>
          {body}
        </div>
      </div>
    );
  return (
    <P.Root open={open} onOpenChange={setOpen}>
      <P.Trigger asChild>
        <button type="button" className={cx("k-fc set", open && "open")} style={!isDefault && onReset ? undefined : { paddingRight: 10 }}>
          <span className="k">{label}:</span>
          <b>{rangeLabel(value)}</b>
          <span className="k-ist">IST</span>
          {!isDefault && onReset ? (
            <span
              role="button"
              tabIndex={0}
              className="k-x"
              aria-label={`Reset ${label.toLowerCase()}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onReset();
              }}
            >
              <X className="size-3.5" aria-hidden />
            </span>
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </button>
      </P.Trigger>
      <P.Portal>
        <P.Content className="k-pop" style={{ padding: 0 }} align="start" sideOffset={6} collisionPadding={12} aria-label="Pick a date range">
          {body}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
