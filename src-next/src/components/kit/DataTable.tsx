"use client";
/*
  K05 Data table (Kit-Data): sort, select, act, page. Text left, numbers right (tabular), IDs in mono, empty cells
  "—". Click a header to sort (one sort at a time; the footer says it). Sticky header under the top bar. Long text
  cuts with … and shows in full in a tooltip (<Truncate>). Row click opens the drawer; the checkbox and ⋯ don't.
  The row menu lists safe actions first, then red ones after a line. Bulk bar rises on the first tick (ink, centred
  at the bottom). Pages: 25 by default, 25 / 50 / 100 segmented. States: loading (header stays, skeleton rows after
  300 ms), empty (teaches, first action), no match (names the search, offers Clear), error (inside the table, Try
  again and a short code). Tablet 1024: columns marked `tablet: "hide"` fold away.
  Fill (owner rule, 6 Nov): a page table fills the viewport height left below it and never makes the page scroll.
  Page header, filters, the table's header row and the pagination stay put; only the body scrolls inside the card
  (sticky header row, footer pinned under the body). Minimum 320px (about 6 rows): only on very short screens may
  the page scroll. `fill={false}` for a table inside a drawer, dialog or a section that grows with its content.
*/
import { DropdownMenu as DM, Tooltip as T } from "radix-ui";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CircleAlert, MoreHorizontal, X } from "lucide-react";
import { CheckBox } from "./Field";
import { Segmented } from "./Segmented";
import { useToastLift } from "./Toast";
import { cx, inr, useAfter, useTablet } from "./utils";

export interface Column<R> {
  key: string;
  header: ReactNode;
  /** px or CSS width */
  width?: number | string;
  align?: "num";
  /** sortable: the sort key sent to the API */
  sortKey?: string;
  render: (r: R) => ReactNode;
  /** hidden under 1180px (low-priority columns fold away) */
  tablet?: "hide";
  /** width under 1180px */
  tabletWidth?: number | string;
  tdClass?: string;
}

export interface RowMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DataTableProps<R> {
  ariaLabel: string;
  columns: Array<Column<R>>;
  rows: R[] | undefined;
  rowKey: (r: R) => string;
  status: "loading" | "error" | "ready";
  onRowClick?: (r: R) => void;
  rowClass?: (r: R) => string | undefined;
  selection?: { selected: Set<string>; onChange: (s: Set<string>) => void; label: (r: R) => string };
  sort?: { key: string; dir: "asc" | "desc"; onSort: (key: string) => void };
  rowMenu?: (r: R) => RowMenuItem[];
  rowMenuLabel?: (r: R) => string;
  /** rows === [] and nothing is filtered */
  empty?: ReactNode;
  /** rows === [] with a search or filter */
  noMatch?: ReactNode;
  filtered?: boolean;
  error?: { title: string; body?: ReactNode; code?: string; onRetry?: () => void };
  footer?: ReactNode;
  skeletonRows?: number;
  /** horizontal scroll for wide grids */
  scrollX?: boolean;
  minWidth?: number;
  /** fill the viewport height left below the table, body scrolls inside (default true; false in drawers/dialogs) */
  fill?: boolean;
  /** minimum height when filling (px, default 320 ≈ 6 rows) */
  minHeight?: number;
}

const px = (v: string) => parseFloat(v) || 0;
/** Height of everything laid out below `el` down to the end of the page (following siblings, paddings, gaps). */
function spaceBelow(el: HTMLElement) {
  let below = 0;
  let n: HTMLElement = el;
  while (n.parentElement && n !== document.body) {
    const parent: HTMLElement = n.parentElement;
    const pcs = getComputedStyle(parent);
    const bottom = n.getBoundingClientRect().bottom;
    below += px(getComputedStyle(n).marginBottom);
    for (let s = n.nextElementSibling; s; s = s.nextElementSibling) {
      if (!(s instanceof HTMLElement)) continue;
      const cs = getComputedStyle(s);
      if (cs.display === "none" || cs.position === "fixed" || cs.position === "absolute") continue;
      const r = s.getBoundingClientRect();
      if (r.top < bottom - 1) continue; // beside, not below (row layouts)
      below += r.height + px(cs.marginTop) + px(cs.marginBottom) + (pcs.display.includes("flex") || pcs.display.includes("grid") ? px(pcs.rowGap) : 0);
    }
    below += px(pcs.paddingBottom) + px(pcs.borderBottomWidth);
    n = parent;
  }
  return below;
}

/**
 * Owner rule (6 Nov): size an element to the viewport height left below its top (minus what sits under it), at
 * least `min` px, so the page itself doesn't scroll. `reserve` keeps room for a fixed bar at the bottom (the bulk bar).
 * Returns a ref and the height (null until measured or when off).
 */
export function useFillHeight<T extends HTMLElement>(on = true, min = 320, reserve = 0) {
  const [el, ref] = useState<T | null>(null); // callback ref: works when the element mounts later
  const [h, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    // inside a drawer or dialog the table grows with its content (the overlay scrolls)
    if (!on || !el || el.closest('[role="dialog"], [role="alertdialog"]')) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const next = Math.max(min, Math.floor(window.innerHeight - top - spaceBelow(el) - reserve));
        setH((prev) => (prev === next ? prev : next));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [el, on, min, reserve]);
  return [ref, on && el ? h : null] as const;
}

export function DataTable<R>(p: DataTableProps<R>) {
  const tablet = useTablet();
  const fill = p.fill !== false;
  // while the bulk bar shows (fixed, 24px from the bottom), keep the pagination clear of it
  const bulkOn = !!p.selection && p.selection.selected.size > 0;
  const [fillRef, fillH] = useFillHeight<HTMLElement>(fill, p.minHeight ?? 320, bulkOn ? 80 : 0);
  const showSkel = useAfter(p.status === "loading", 300);
  const cols = p.columns.filter((c) => !(tablet && c.tablet === "hide"));
  const rows = p.rows ?? [];
  const sel = p.selection;
  const pageKeys = rows.map(p.rowKey);
  const ticked = sel ? pageKeys.filter((k) => sel.selected.has(k)).length : 0;
  const allOn = ticked > 0 && ticked === pageKeys.length;
  const span = cols.length + (sel ? 1 : 0) + (p.rowMenu ? 1 : 0);
  const body = () => {
    if (p.status === "loading")
      return showSkel
        ? Array.from({ length: p.skeletonRows ?? 6 }, (_, i) => (
            <tr key={i} className="skr" aria-hidden>
              {sel && <td className="chk" />}
              {cols.map((c, ci) => (
                <td key={c.key} className={cx(c.align === "num" && "num")}>
                  {ci === 0 ? (
                    <div className="row" style={{ gap: 10 }}>
                      <span className="skel" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                      <span className="skel" style={{ width: 90 + ((i * 23) % 50), height: 10 }} />
                    </div>
                  ) : (
                    <span className="skel" style={{ display: "inline-block", width: c.align === "num" ? 44 : 70 + ((i * 17 + ci * 11) % 50), height: 10 }} />
                  )}
                </td>
              ))}
              {p.rowMenu && <td className="act" />}
            </tr>
          ))
        : [
            <tr key="wait" aria-hidden>
              <td colSpan={span} style={{ height: 240 }} />
            </tr>,
          ];
    if (p.status === "error" && p.error)
      return [
        <tr key="err">
          <td colSpan={span} style={{ padding: 0 }}>
            <StateBox tone="error" title={p.error.title} body={p.error.body ?? "Check your connection and try again."} code={p.error.code} action={p.error.onRetry ? <button type="button" className="btn btn-secondary btn-sm" onClick={p.error.onRetry}>Try again</button> : undefined} />
          </td>
        </tr>,
      ];
    if (!rows.length)
      return [
        <tr key="none">
          <td colSpan={span} style={{ padding: 0 }}>
            {p.filtered ? p.noMatch : p.empty}
          </td>
        </tr>,
      ];
    return rows.map((r) => {
      const k = p.rowKey(r);
      const on = sel?.selected.has(k);
      return (
        <tr
          key={k}
          className={cx(p.onRowClick && "click", on && "sel", p.rowClass?.(r))}
          onClick={p.onRowClick ? () => p.onRowClick!(r) : undefined}
          tabIndex={p.onRowClick ? 0 : undefined}
          onKeyDown={
            p.onRowClick
              ? (e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) p.onRowClick!(r);
                }
              : undefined
          }
        >
          {sel && (
            <td className="chk" onClick={(e) => e.stopPropagation()}>
              <label className="k-check" style={{ minHeight: 0 }}>
                <input
                  type="checkbox"
                  checked={!!on}
                  aria-label={`Select ${sel.label(r)}`}
                  onChange={() => {
                    const n = new Set(sel.selected);
                    if (on) n.delete(k);
                    else n.add(k);
                    sel.onChange(n);
                  }}
                />
                <CheckBox on={on} />
              </label>
            </td>
          )}
          {cols.map((c) => (
            <td key={c.key} className={cx(c.align === "num" && "num", c.tdClass)}>
              {c.render(r)}
            </td>
          ))}
          {p.rowMenu && (
            <td className="act" onClick={(e) => e.stopPropagation()}>
              <RowMenu items={p.rowMenu(r)} label={p.rowMenuLabel?.(r) ?? "More"} />
            </td>
          )}
        </tr>
      );
    });
  };
  const table = (
    <table className="k-table" aria-label={p.ariaLabel} aria-busy={p.status === "loading" || undefined} style={p.minWidth ? { minWidth: p.minWidth } : undefined}>
      <colgroup>
        {sel && <col style={{ width: 44 }} />}
        {cols.map((c) => (
          <col key={c.key} style={{ width: tablet && c.tabletWidth ? c.tabletWidth : c.width }} />
        ))}
        {p.rowMenu && <col style={{ width: 52 }} />}
      </colgroup>
      <thead>
        <tr>
          {sel && (
            <th className="chk">
              <label className="k-check" style={{ minHeight: 0 }}>
                <input
                  type="checkbox"
                  checked={allOn}
                  aria-checked={ticked > 0 && !allOn ? "mixed" : allOn}
                  aria-label="Select all on this page"
                  disabled={!rows.length}
                  onChange={() => {
                    const n = new Set(sel.selected);
                    if (allOn) pageKeys.forEach((k) => n.delete(k));
                    else pageKeys.forEach((k) => n.add(k));
                    sel.onChange(n);
                  }}
                />
                <CheckBox on={allOn} mixed={ticked > 0 && !allOn} />
              </label>
            </th>
          )}
          {cols.map((c) => {
            const sorted = p.sort && c.sortKey && p.sort.key === c.sortKey;
            return (
              <th key={c.key} className={cx(c.align === "num" && "num", sorted && "sorted")} aria-sort={sorted ? (p.sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                {c.sortKey && p.sort ? (
                  <button type="button" className="sort" onClick={() => p.sort!.onSort(c.sortKey!)}>
                    {c.header}
                    {sorted && p.sort.dir === "desc" ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            );
          })}
          {p.rowMenu && (
            <th className="act">
              <span className="sr-only">Actions</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>{body()}</tbody>
    </table>
  );
  return (
    <section
      ref={fillRef}
      className={cx("card k-dt", fillH !== null && "fill")}
      style={{ overflow: p.scrollX || fillH !== null ? "hidden" : "clip", height: fillH ?? undefined }}
    >
      {p.scrollX || fill ? (
        <div className="k-dt-scroll" style={{ ["--k-sticky-top" as string]: "0px", overflowX: p.scrollX ? "auto" : "hidden" }}>
          {table}
        </div>
      ) : (
        table
      )}
      {p.footer}
    </section>
  );
}

/** Long text cut with … and shown in full in a tooltip on hover and focus. */
export function Truncate({ children, text, className }: { children?: ReactNode; text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <T.Provider delayDuration={300}>
      <T.Root open={open} onOpenChange={(o) => setOpen(o && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)}>
        <T.Trigger asChild>
          <span ref={ref} className={cx("k-ell", className)} style={{ display: "block" }}>
            {children ?? text}
          </span>
        </T.Trigger>
        <T.Portal>
          <T.Content className="k-tip" sideOffset={4}>
            {text}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

export function RowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
  const safe = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button type="button" className="k-rm" aria-label={label}>
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content className="k-pop" style={{ minWidth: 230 }} align="end" sideOffset={4} collisionPadding={12}>
          {safe.map((i) => (
            <DM.Item key={i.label} className="k-li" disabled={i.disabled} onSelect={i.onSelect} style={{ outline: "none" }}>
              {i.icon}
              {i.label}
            </DM.Item>
          ))}
          {safe.length > 0 && danger.length > 0 && <DM.Separator className="k-sep" />}
          {danger.map((i) => (
            <DM.Item key={i.label} className="k-li danger" disabled={i.disabled} onSelect={i.onSelect} style={{ outline: "none" }}>
              {i.icon}
              {i.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

/** Table footer: rows per page, "Showing 1–25 of 128 · sorted by name", page buttons. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  sortLabel,
  extra,
  sizes = [25, 50, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
  sortLabel?: string;
  /** a note in the middle ("1 code can't be used") */
  extra?: ReactNode;
  sizes?: number[];
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const a = total ? (page - 1) * pageSize + 1 : 0;
  const b = Math.min(total, page * pageSize);
  const nums: Array<number | "gap"> = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "gap") nums.push("gap");
  }
  return (
    <div className="k-tfoot">
      {onPageSize && total > sizes[0]! ? (
        <div className="row" style={{ gap: 8 }}>
          <span id="k-rpp" className="xs muted">
            Rows per page
          </span>
          <Segmented size="sm" ariaLabelledBy="k-rpp" value={String(pageSize)} onChange={(v) => onPageSize(Number(v))} options={sizes.map((s) => ({ value: String(s), label: String(s) }))} />
        </div>
      ) : (
        <span />
      )}
      <span className="xs muted num">
        {total ? `Showing ${inr(a)}–${inr(b)} of ${inr(total)}` : "Nothing to show"}
        {sortLabel ? ` · sorted by ${sortLabel}` : ""}
      </span>
      {extra}
      <nav className="k-pg" aria-label="Pages">
        <button type="button" className="p" disabled={page <= 1} aria-label="Previous page" onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        {nums.map((n, i) =>
          n === "gap" ? (
            <span key={`g${i}`} className="p gap">
              …
            </span>
          ) : (
            <button key={n} type="button" className={cx("p", n === page && "on")} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>
              {n}
            </button>
          )
        )}
        <button type="button" className="p" disabled={page >= pages} aria-label="Next page" onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
}

/** Bulk bar: rises on the first tick, centred at the bottom; toasts sit above it. */
export function BulkBar({ count, children, onClear, selectAll }: { count: number; children: ReactNode; onClear: () => void; selectAll?: { label: string; onClick: () => void } }) {
  useToastLift(48, count > 0);
  if (!count) return null;
  return (
    <div className="k-bulk" role="toolbar" aria-label={`${count} selected`}>
      <span className="sm" style={{ fontWeight: 600 }}>
        {inr(count)} selected
      </span>
      {selectAll && (
        <button type="button" className="btn btn-ghost" style={{ textDecoration: "underline" }} onClick={selectAll.onClick}>
          {selectAll.label}
        </button>
      )}
      <span className="vr" aria-hidden />
      {children}
      <button type="button" className="btn btn-ghost btn-icon" style={{ width: 32 }} aria-label="Clear selection" onClick={onClear}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** The state block used inside tables and cards (empty, no match, error). */
export function StateBox({
  tone,
  title,
  body,
  action,
  code,
  doodle,
  compact,
}: {
  tone?: "error" | "none";
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  code?: string;
  doodle?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx("k-st-box", compact && "compact")} role={tone === "error" ? "alert" : undefined}>
      {tone === "error" ? (
        <span className="ico red">
          <CircleAlert className="size-5" aria-hidden />
        </span>
      ) : (
        doodle
      )}
      <span className="h3">{title}</span>
      {body && (
        <span className="sm muted" style={{ maxWidth: 460 }}>
          {body}
        </span>
      )}
      {action && (
        <div className="row" style={{ gap: 8, marginTop: 4, justifyContent: "center", flexWrap: "wrap" }}>
          {action}
        </div>
      )}
      {code && <span className="mono xs muted">Code {code}</span>}
    </div>
  );
}
