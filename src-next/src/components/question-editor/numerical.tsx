"use client";
/* Numerical answer (board: "Answer · Exact | Range"): an exact value (up to 2 decimals) or From–To, "Any answer from
   23.9 to 24.1 is marked right", "To must be more than From (24.1)". */
import * as React from "react";
import { Segmented } from "@/components/kit/Segmented";
import type { NumMode } from "./form";
import { useEditor } from "./context";
import { FieldErr } from "./ui";

export function NumericalAnswer({
  mode,
  exact,
  from,
  to,
  onChange,
  error,
}: {
  mode: NumMode;
  exact: string;
  from: string;
  to: string;
  onChange: (p: { numMode?: NumMode; exact?: string; from?: string; to?: string }) => void;
  error?: string;
}) {
  const { ro } = useEditor();
  const ok = mode === "range" && from.trim() && to.trim() && Number(to) > Number(from);
  return (
    <div className="col gap-2.5" id="f-num" tabIndex={-1}>
      <div className="row wrap gap-3">
        <span id="ansl" className="label m-0">
          Answer
        </span>
        <Segmented<NumMode>
          size="sm"
          ariaLabelledBy="ansl"
          value={mode}
          onChange={(m) => {
            if (m === mode) return;
            // carry the value across: exact 24 → range 24–24 is not useful, so From only
            if (m === "range") onChange({ numMode: m, from: from || exact, to });
            else onChange({ numMode: m, exact: exact || from });
          }}
          options={[
            { value: "exact", label: "Exact" },
            { value: "range", label: "Range" },
          ]}
        />
      </div>
      {mode === "exact" ? (
        <div className="field max-w-[240px]">
          <label className="sr-only" htmlFor="nx">
            Exact answer
          </label>
          <div className={`k-affix ${error ? "e" : ""}`}>
            <input id="nx" value={exact} inputMode="decimal" placeholder="e.g. 24" disabled={ro} aria-invalid={!!error || undefined} onChange={(e) => onChange({ exact: e.target.value })} />
          </div>
          {!error && <span className="hint">Students type a number. Up to 2 decimals.</span>}
        </div>
      ) : (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 160px))" }}>
          <div className="field">
            <label className="label" htmlFor="nf">
              From
            </label>
            <input id="nf" className="k-input num" value={from} inputMode="decimal" disabled={ro} onChange={(e) => onChange({ from: e.target.value })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="nt">
              To
            </label>
            <input id="nt" className={`k-input num ${error ? "e" : ""}`} value={to} inputMode="decimal" disabled={ro} aria-invalid={!!error || undefined} onChange={(e) => onChange({ to: e.target.value })} />
          </div>
        </div>
      )}
      {error ? <FieldErr>{error}</FieldErr> : ok ? <span className="hint">Any answer from {from.trim()} to {to.trim()} is marked right.</span> : null}
    </div>
  );
}
