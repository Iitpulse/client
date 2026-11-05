"use client";
/*
  K02 Multi-select (Kit-Pickers): chips in the field, checkboxes in the list. The list stays open while ticking;
  Esc or a click outside closes it. Chips past `maxChips` fold into "+N" (clicking it opens the list with the picked
  ones on top). "Select all N" acts on what the search shows, per group. Backspace in an empty box focuses the last
  chip; again removes it. Creatable only for topics, sources and tags (never batches, roles or people).
*/
import { Popover as P } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { KeyHints, useListEngine, type ComboOption } from "./Combobox";
import { cx, useDebounced } from "./utils";

export interface MultiSelectProps<V extends string> {
  id?: string;
  value: V[];
  onChange: (v: V[]) => void;
  options: Array<ComboOption<V>>;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** chips shown before "+N" (default 3) */
  maxChips?: number;
  creatable?: { label: (q: string) => string; onCreate: (q: string) => void };
  onSearch?: (q: string) => void;
  loading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  noun?: string;
  /** labels for picked values not among `options` (server lists) */
  valueLabels?: Record<string, string>;
  /** chip text (defaults to the option label) */
  chipLabel?: (o: ComboOption<V>) => string;
  "aria-label"?: string;
  size?: "md" | "lg";
  className?: string;
  /** extra node at the end of the field */
  after?: ReactNode;
}

export function MultiSelect<V extends string = string>(props: MultiSelectProps<V>) {
  const { id, value, onChange, options, placeholder = "Pick some", disabled, invalid, maxChips = 3, noun } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pickedFirst, setPickedFirst] = useState(false);
  const [chipFocus, setChipFocus] = useState<number | null>(null);
  const dq = useDebounced(q, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const byValue = new Map(options.map((o) => [o.value, o]));
  const labelOf = (v: V) => {
    const o = byValue.get(v);
    return o ? (props.chipLabel ? props.chipLabel(o) : o.label) : props.valueLabels?.[v] ?? v;
  };

  useEffect(() => {
    if (open && props.onSearch) props.onSearch(dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, open]);

  const toggle = (v: V) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const engine = useListEngine<V>({
    options,
    query: q,
    serverSide: !!props.onSearch,
    multi: true,
    pickedFirst,
    creatable: props.creatable
      ? {
          label: props.creatable.label,
          onCreate: (s) => {
            props.creatable!.onCreate(s);
            setQ("");
          },
        }
      : undefined,
    onPick: (o) => toggle(o.value),
    isSelected: (v) => value.includes(v),
    onSelectGroup: (vals, on) => onChange(on ? Array.from(new Set([...value, ...vals])) : value.filter((v) => !vals.includes(v))),
    noun,
    loading: props.loading,
    loadError: props.loadError,
    onRetry: props.onRetry,
    size: props.size,
    footer: <KeyHints shown={0} multi selected={value.length} onClear={() => onChange([])} />,
  });

  const visible = value.slice(0, maxChips);
  const more = value.length - visible.length;

  return (
    <P.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQ("");
          setPickedFirst(false);
        }
      }}
    >
      <P.Anchor asChild>
        <div
          ref={anchorRef}
          className={cx("k-ms", open && "open", invalid && "e", disabled && "dis", props.className)}
          onClick={() => {
            if (disabled) return;
            inputRef.current?.focus();
            setOpen(true);
          }}
        >
          {visible.map((v, i) => (
            <span key={v} className={cx("k-mchip", chipFocus === i && "focus")} title={labelOf(v)}>
              <span>{labelOf(v)}</span>
              {!disabled && (
                <button
                  type="button"
                  className="k-x"
                  aria-label={`Remove ${labelOf(v)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                >
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </span>
          ))}
          {more > 0 && (
            <button
              type="button"
              className="k-mchip more"
              aria-label={`Show ${more} more`}
              onClick={(e) => {
                e.stopPropagation();
                setPickedFirst(true);
                setOpen(true);
                inputRef.current?.focus();
              }}
            >
              +{more}
            </button>
          )}
          <input
            ref={inputRef}
            id={id}
            value={q}
            disabled={disabled}
            placeholder={value.length ? "" : placeholder}
            aria-label={props["aria-label"]}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid && id ? `${id}-e` : undefined}
            role="combobox"
            aria-expanded={open}
            aria-controls={engine.listId}
            aria-activedescendant={open ? engine.activeId : undefined}
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setChipFocus(null);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                return;
              }
              if (e.key === "Backspace" && !q && value.length) {
                e.preventDefault();
                const last = Math.min(value.length, maxChips) - 1;
                if (chipFocus === last) {
                  onChange(value.filter((v) => v !== value[last]));
                  setChipFocus(null);
                } else setChipFocus(last);
                return;
              }
              setChipFocus(null);
              if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
                setOpen(true);
                return;
              }
              engine.onKeyDown(e);
            }}
          />
          {props.after}
          <ChevronDown className="size-4" aria-hidden style={{ marginLeft: "auto", color: "var(--muted)", flex: "none" }} />
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
