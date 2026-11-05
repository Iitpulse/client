"use client";
/*
  K10 Numbers and marks (Kit-Forms): stepper (the + stops at the limit), signed marks (type the size; the row fixes the
  sign: +4 / −1 with a true minus), units suffix, and From–To ranges whose error sits under the second field.
  Numbers are left-aligned in fields, tabular figures always.
*/
import { AffixInput, FieldError } from "./Field";
import { cx } from "./utils";

export function NumberStepper({
  id,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  invalid,
  of,
  width = 132,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  /** "of 25" after the field */
  of?: number;
  width?: number;
  "aria-label"?: string;
}) {
  const v = value ?? 0;
  return (
    <div className="row" style={{ gap: 8 }}>
      <div className={cx("k-affix", invalid && "e")} style={{ width }}>
        <button type="button" className="sb" aria-label="One less" disabled={v <= min} onClick={() => onChange(Math.max(min, v - step))}>
          −
        </button>
        <input
          id={id}
          className="c"
          inputMode="numeric"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid && id ? `${id}-e` : undefined}
          value={value ?? ""}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d-]/g, "");
            onChange(t === "" ? null : Number(t));
          }}
        />
        <button type="button" className="sb" aria-label="One more" disabled={max != null && v >= max} onClick={() => onChange(max != null ? Math.min(max, v + step) : v + step)}>
          +
        </button>
      </div>
      {of != null && <span className="sm muted">of {of}</span>}
    </div>
  );
}

/** Marks with a fixed sign: tone "plus" (+4) or "minus" (−1); the value is the size (≥ 0). */
export function SignedMarks({
  id,
  value,
  onChange,
  tone,
  "aria-label": ariaLabel,
  width = 96,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  tone: "plus" | "minus" | "zero";
  "aria-label"?: string;
  width?: number;
}) {
  return (
    <AffixInput
      id={id}
      width={width}
      prefix={tone === "plus" ? "+" : tone === "minus" ? "−" : "±"}
      tone={tone === "zero" ? undefined : tone}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={value == null ? "" : String(Math.abs(value))}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.]/g, "");
        onChange(t === "" ? null : Number(t));
      }}
    />
  );
}

/** From–To pair (numerical answers, ranges). The error ("To must be more than From") sits under the second field. */
export function RangeFields({
  idPrefix,
  from,
  to,
  onChange,
  fromLabel = "From",
  toLabel = "To",
  error,
}: {
  idPrefix: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  fromLabel?: string;
  toLabel?: string;
  /** shown under the second field; defaults to the order check */
  error?: string | null;
}) {
  const bad = error ?? (from !== "" && to !== "" && Number(to) < Number(from) ? `${toLabel} must be more than ${fromLabel}` : null);
  return (
    <div className="col" style={{ gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div className="field">
          <label className="label" htmlFor={`${idPrefix}-from`}>
            {fromLabel}
          </label>
          <input id={`${idPrefix}-from`} className="k-input num" inputMode="decimal" value={from} onChange={(e) => onChange(e.target.value, to)} />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${idPrefix}-to`}>
            {toLabel}
          </label>
          <input
            id={`${idPrefix}-to`}
            className={cx("k-input num", bad && "e")}
            inputMode="decimal"
            aria-invalid={!!bad || undefined}
            aria-describedby={bad ? `${idPrefix}-to-e` : undefined}
            value={to}
            onChange={(e) => onChange(from, e.target.value)}
          />
        </div>
      </div>
      {bad && <FieldError id={`${idPrefix}-to-e`}>{bad}</FieldError>}
    </div>
  );
}
