"use client";
/*
  Segmented buttons: one pick from 5 or fewer fixed, short options (difficulty, gender, medium, mode, rows per page).
  A radiogroup: arrow keys move and pick. The hint under it explains the picked option, so labels stay short.
*/
import { useRef, type ReactNode } from "react";
import { cx } from "./utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** small count pill (tabs with counts: "Students 8,732") */
  count?: ReactNode;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  size,
  full,
  id,
  className,
  allowNone,
}: {
  options: Array<SegmentedOption<T>>;
  /** null = nothing picked yet */
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** "sm" 26px (table footers), default admin 30px, "lg" student 40px */
  size?: "sm" | "lg";
  /** fill the width, equal parts (drawer forms) */
  full?: boolean;
  id?: string;
  className?: string;
  /** clicking the picked option again clears it (optional fields) */
  allowNone?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const move = (from: number, dir: number) => {
    const pos = enabled.indexOf(from);
    const next = enabled[(pos + dir + enabled.length) % enabled.length];
    if (next == null) return;
    refs.current[next]?.focus();
    onChange(options[next]!.value);
  };
  const cur = options.findIndex((o) => o.value === value);
  return (
    <span
      id={id}
      className={cx("seg k-seg", full && "full", size === "lg" && "k-lg", size === "sm" && "k-sm", className)}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      style={full ? undefined : { alignSelf: "flex-start" }}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (cur < 0 && i === enabled[0]) ? 0 : -1}
            disabled={o.disabled}
            className={cx("tab", on && "on")}
            onClick={() => (on && allowNone ? onChange("" as T) : onChange(o.value))}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
          >
            {o.label}
            {o.count != null && <span className="count">{o.count}</span>}
          </button>
        );
      })}
    </span>
  );
}
