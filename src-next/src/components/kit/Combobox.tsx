"use client";
/*
  K01 Combobox: searchable single select (Kit-Pickers). Every list that can grow is one of these; 5 or fewer fixed
  choices are <Segmented>. Type to filter (matched letters bold, first match focused so Enter picks it), up to 8
  rows then the list scrolls, groups get a small header, "×" only on optional fields (`clearable`), picking closes
  the list and returns focus to the field. Server lists (`onSearch`) search after 250 ms and keep the last results
  visible while loading. "+ Create …" only where people may add (`creatable`). The list keeps the field's width
  (at least 280px) and opens upward when there is no room below.
*/
import { Popover as P } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { cx, highlight, inr, useDebounced } from "./utils";

export interface ComboOption<V extends string = string> {
  value: V;
  label: string;
  /** group header (Subject over chapters) */
  group?: string;
  /** right-hand muted text ("Class 11", "Live", "Madhya Pradesh") */
  end?: ReactNode;
  /** second line under the label (email under a name) */
  sub?: ReactNode;
  /** leading node (avatar) */
  icon?: ReactNode;
  disabled?: boolean;
  /** extra words that match the search */
  keywords?: string[];
}

export function Hl({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlight(text, q).map((p, i) => (p.hit ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}
    </>
  );
}

type Item<V extends string> = { kind: "opt"; opt: ComboOption<V> } | { kind: "create"; label: string };

/** Local filter: label and keywords contain the query (case-insensitive). */
export function filterOptions<V extends string>(options: Array<ComboOption<V>>, q: string): Array<ComboOption<V>> {
  const s = q.trim().toLowerCase();
  if (!s) return options;
  return options.filter((o) => o.label.toLowerCase().includes(s) || o.keywords?.some((k) => k.toLowerCase().includes(s)));
}

export interface ListEngineProps<V extends string> {
  options: Array<ComboOption<V>>;
  query: string;
  /** server search: options are already the results, no local filter */
  serverSide?: boolean;
  creatable?: { label: (q: string) => string; onCreate: (q: string) => void };
  onPick: (o: ComboOption<V>) => void;
  isSelected: (v: V) => boolean;
  /** "chapter" → `No chapter called "…"` */
  noun?: string;
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  multi?: boolean;
  total?: number;
  size?: "md" | "lg";
  /** selected values float to the top (multi-select "+N" opens the list with the picked ones on top) */
  pickedFirst?: boolean;
  footer?: ReactNode;
  onSelectGroup?: (values: V[], on: boolean) => void;
}

/** The list engine shared by Combobox, MultiSelect and FilterChip: items, active row, keys and the list markup. */
export function useListEngine<V extends string>(p: ListEngineProps<V>) {
  const listId = useId();
  const shown = useMemo(() => {
    let rows = p.serverSide ? p.options : filterOptions(p.options, p.query);
    if (p.pickedFirst) rows = [...rows.filter((o) => p.isSelected(o.value)), ...rows.filter((o) => !p.isSelected(o.value))];
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.options, p.query, p.serverSide, p.pickedFirst]);
  const q = p.query.trim();
  const exact = shown.some((o) => o.label.toLowerCase() === q.toLowerCase());
  const items: Array<Item<V>> = useMemo(() => {
    const it: Array<Item<V>> = shown.map((opt) => ({ kind: "opt", opt }));
    if (p.creatable && q && !exact) it.push({ kind: "create", label: p.creatable.label(q) });
    return it;
  }, [shown, p.creatable, q, exact]);
  const enabledIdx = items.map((it, i) => (it.kind === "opt" && it.opt.disabled ? -1 : i)).filter((i) => i >= 0);
  const [active, setActive] = useState(0);
  useEffect(() => {
    setActive(enabledIdx[0] ?? -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.query, items.length]);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (i: number) => {
    const it = items[i];
    if (!it) return;
    if (it.kind === "create") p.creatable?.onCreate(q);
    else if (!it.opt.disabled) p.onPick(it.opt);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!enabledIdx.length) return;
      const pos = enabledIdx.indexOf(active);
      const next = e.key === "ArrowDown" ? enabledIdx[Math.min(pos + 1, enabledIdx.length - 1)] : enabledIdx[Math.max(pos - 1, 0)];
      setActive(next ?? enabledIdx[0]!);
    } else if (e.key === "Enter" || (p.multi && e.key === " " && !q)) {
      if (active >= 0) {
        e.preventDefault();
        pick(active);
      }
    } else if (e.key === "Home") setActive(enabledIdx[0] ?? -1);
    else if (e.key === "End") setActive(enabledIdx[enabledIdx.length - 1] ?? -1);
  };

  const groups = new Map<string, number[]>();
  items.forEach((it, i) => {
    if (it.kind === "opt" && it.opt.group) groups.set(it.opt.group, [...(groups.get(it.opt.group) ?? []), i]);
  });
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;
  const lg = p.size === "lg";

  const list = (
    <>
      {p.loadError ? (
        <div className="col" style={{ gap: 8, padding: 10 }} role="alert">
          <span className="sm" style={{ fontWeight: 600 }}>
            {p.loadError}
          </span>
          <span className="xs muted">Check your connection and try again.</span>
          {p.onRetry && (
            <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start", height: 30 }} onClick={p.onRetry}>
              Try again
            </button>
          )}
        </div>
      ) : (
        <>
          {p.loading && (
            <>
              <div className="k-li muted-row" role="status">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {p.noun ? `Searching ${p.noun}s…` : "Searching…"}
              </div>
              {items.length > 0 && <div className="k-sep" />}
            </>
          )}
          <div ref={listRef} id={listId} className="k-pop-list" role="listbox" aria-multiselectable={p.multi || undefined}>
            {items.length === 0 && !p.loading && (
              <div className="k-li muted-row">{q ? `No ${p.noun ?? "match"} called "${q}"` : `Nothing to pick yet`}</div>
            )}
            {items.map((it, i) => {
              if (it.kind === "create")
                return (
                  <div key="create" className="col">
                    {shown.length === 0 && <div className="k-li muted-row">No {p.noun ?? "match"} called &ldquo;{q}&rdquo;</div>}
                    <div className="k-sep" />
                    <button
                      type="button"
                      id={`${listId}-${i}`}
                      data-i={i}
                      role="option"
                      aria-selected={false}
                      className={cx("k-li create", lg && "k-lg", active === i && "focus")}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(i)}
                    >
                      <Plus className="size-4" aria-hidden style={{ color: "var(--navy)" }} />
                      <span className="lbl">{it.label}</span>
                    </button>
                  </div>
                );
              const o = it.opt;
              const g = o.group;
              const first = g && groups.get(g)?.[0] === i;
              const sel = p.isSelected(o.value);
              const groupVals = g ? (groups.get(g) ?? []).map((gi) => (items[gi] as { opt: ComboOption<V> }).opt).filter((x) => !x.disabled).map((x) => x.value) : [];
              const allOn = groupVals.length > 0 && groupVals.every((v) => p.isSelected(v));
              return (
                <div key={o.value} className="col" role="presentation">
                  {first &&
                    (p.multi && p.onSelectGroup && groupVals.length > 1 ? (
                      <div className="row between" style={{ padding: "6px 10px 2px" }}>
                        <span className="k-grp" style={{ padding: 0 }}>
                          {g}
                        </span>
                        <button type="button" className="k-linkbtn xs" style={{ textDecoration: "none" }} onMouseDown={(e) => e.preventDefault()} onClick={() => p.onSelectGroup!(groupVals, !allOn)}>
                          {allOn ? "Clear" : `Select all ${groupVals.length}`}
                        </button>
                      </div>
                    ) : (
                      <span className="k-grp">{g}</span>
                    ))}
                  <button
                    type="button"
                    id={`${listId}-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={sel}
                    aria-disabled={o.disabled || undefined}
                    disabled={o.disabled}
                    className={cx("k-li", lg && "k-lg", active === i && "focus", o.disabled && "muted-row")}
                    onMouseEnter={() => !o.disabled && setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(i)}
                  >
                    {p.multi && <MiniBox on={sel} />}
                    {o.icon}
                    {o.sub ? (
                      <span className="lbl2">
                        <span className="lbl">
                          <Hl text={o.label} q={q} />
                        </span>
                        <span className="xs muted">{o.sub}</span>
                      </span>
                    ) : (
                      <span className="lbl" title={o.label.length > 40 ? o.label : undefined}>
                        <Hl text={o.label} q={q} />
                      </span>
                    )}
                    {o.end != null && <span className="end">{o.end}</span>}
                    {!p.multi && sel && <Check className="tick size-4" aria-hidden />}
                  </button>
                </div>
              );
            })}
          </div>
          {p.footer}
        </>
      )}
    </>
  );
  return { list, onKeyDown, activeId, listId, shownCount: shown.length, items };
}

function MiniBox({ on }: { on: boolean }) {
  return (
    <span className={cx("k-cbx", on && "on")} aria-hidden>
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}

export function KeyHints({ shown, total, multi, selected, onClear }: { shown: number; total?: number; multi?: boolean; selected?: number; onClear?: () => void }) {
  return (
    <div className="k-kh">
      {multi ? (
        <span>{selected ?? 0} selected</span>
      ) : (
        <span className="num">
          {inr(shown)}
          {total != null && total !== shown ? ` of ${inr(total)}` : ""}
        </span>
      )}
      {multi && onClear && (selected ?? 0) > 0 && (
        <button type="button" className="lnk" style={{ marginLeft: "auto" }} onMouseDown={(e) => e.preventDefault()} onClick={onClear}>
          Clear
        </button>
      )}
      <span style={multi && onClear && (selected ?? 0) > 0 ? undefined : { marginLeft: "auto" }}>
        <span className="kbd">↑</span> <span className="kbd">↓</span> move
      </span>
      <span>
        <span className="kbd">{multi ? "Space" : "↵"}</span> {multi ? "tick" : "pick"}
      </span>
      <span>
        <span className="kbd">Esc</span> {multi ? "done" : "close"}
      </span>
    </div>
  );
}

export interface ComboboxProps<V extends string> {
  id?: string;
  value: V | null;
  onChange: (v: V | null, option: ComboOption<V> | null) => void;
  options: Array<ComboOption<V>>;
  placeholder?: string;
  /** optional field: shows × to clear */
  clearable?: boolean;
  disabled?: boolean;
  /** shown in the field while disabled ("Pick a subject first") */
  disabledText?: string;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  /** server search (debounced 250 ms); `options` are the current results */
  onSearch?: (q: string) => void;
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  creatable?: { label: (q: string) => string; onCreate: (q: string) => void };
  /** "chapter" → `No chapter called "…"`, "Searching chapters…" */
  noun?: string;
  /** label of the current value when it is not among `options` (server lists) */
  valueLabel?: string;
  /** total size of the list for the footer ("4 of 92") */
  total?: number;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
  /** leading icon inside the field (calendar, search) */
  icon?: ReactNode;
}

export function Combobox<V extends string = string>(props: ComboboxProps<V>) {
  const { id, value, onChange, options, placeholder = "Pick one", clearable, disabled, disabledText, invalid, size, onSearch, noun } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;
  const label = selected?.label ?? (value ? props.valueLabel ?? value : null);

  useEffect(() => {
    if (open && onSearch) onSearch(dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, open]);
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    setQ("");
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const engine = useListEngine<V>({
    options,
    query: q,
    serverSide: !!onSearch,
    creatable: props.creatable
      ? {
          label: props.creatable.label,
          onCreate: (s) => {
            props.creatable!.onCreate(s);
            close();
          },
        }
      : undefined,
    onPick: (o) => {
      onChange(o.value, o);
      close();
    },
    isSelected: (v) => v === value,
    noun,
    loading: props.loading,
    loadError: props.loadError,
    onRetry: props.onRetry,
    size: size === "lg" ? "lg" : "md",
    footer: options.length > 8 || (props.total ?? 0) > 8 ? <KeyHints shown={filterOptions(options, onSearch ? "" : q).length} total={props.total ?? options.length} /> : undefined,
  });
  const sizeCls = size === "lg" ? "k-lg" : size === "sm" ? "k-sm" : undefined;

  return (
    <P.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close(false))}>
      <P.Anchor asChild>
        <div ref={anchorRef} className="relative w-full min-w-0">
          {open ? (
            <div className={cx("k-cb open", sizeCls)}>
              <Search className="size-4 shrink-0" aria-hidden style={{ color: "var(--muted)" }} />
              <input
                ref={inputRef}
                id={id}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                role="combobox"
                aria-expanded
                aria-controls={engine.listId}
                aria-activedescendant={engine.activeId}
                aria-autocomplete="list"
                aria-busy={props.loading || undefined}
                aria-label={props["aria-label"]}
                placeholder={label ?? placeholder}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    close();
                  } else if (e.key === "Tab") close(false);
                  else engine.onKeyDown(e);
                }}
              />
              {props.loading && <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden style={{ color: "var(--muted)" }} />}
            </div>
          ) : (
            <button
              ref={triggerRef}
              id={id}
              type="button"
              disabled={disabled}
              className={cx("k-cb", sizeCls, disabled && "dis", invalid && "e", props.className)}
              aria-haspopup="listbox"
              aria-expanded={false}
              aria-invalid={invalid || undefined}
              aria-label={props["aria-label"]}
              aria-describedby={props["aria-describedby"] ?? (invalid && id ? `${id}-e` : undefined)}
              title={label && label.length > 32 ? label : undefined}
              onClick={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || (e.key.length === 1 && !e.metaKey && !e.ctrlKey && e.key !== " ")) {
                  e.preventDefault();
                  if (e.key.length === 1) setQ(e.key);
                  setOpen(true);
                }
              }}
            >
              {props.icon}
              <span className={cx("v", !label && "ph")}>{disabled && disabledText ? disabledText : label ?? placeholder}</span>
              {clearable && value && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  className="k-x"
                  aria-label={`Clear ${props["aria-label"] ?? "value"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null, null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(null, null);
                    }
                  }}
                >
                  <X className="size-3.5" aria-hidden />
                </span>
              )}
              <ChevronDown className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </P.Anchor>
      <P.Portal>
        <P.Content
          className="k-pop fit"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          {engine.list}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
