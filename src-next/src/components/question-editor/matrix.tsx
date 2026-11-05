"use client";
/*
  Matrix (board: "Lists" with List I rows / List II rows steppers, the two lists side by side, "Correct matches ·
  tick every match, a row can have more than one" grid, "Row C has no match. Tick one.", "4 matches: A–P, B–Q, …").
  Rows A, B, C… and columns P, Q, R… (2–6 each); each row has English and Hindi text.
*/
import * as React from "react";
import { MathField } from "@/components/kit/math-field";
import { NumberStepper } from "@/components/kit/NumberField";
import { COL, KEY, type RowF } from "./form";
import { useEditor, useFieldProps } from "./context";
import { FieldErr, HindiMissing, I } from "./ui";

function RowField({ r, list, onText, hiMissing }: { r: RowF; list: "listI" | "listII"; onText: (v: string) => void; hiMissing: boolean }) {
  const { lang } = useEditor();
  const hi = lang === "hi";
  const fp = useFieldProps(`matrix.${list}.${r.id}.${lang}`);
  return (
    <div className="row gap-2">
      <span className="mono xs muted w-3.5 shrink-0">{r.id}</span>
      <MathField
        {...fp}
        variant="inline"
        boxed
        value={hi ? r.hi : r.en}
        onChange={onText}
        label={`${list === "listI" ? "List I" : "List II"} row ${r.id}${hi ? " in Hindi" : ""}`}
        placeholder={hi ? `पंक्ति ${r.id} हिन्दी में` : `Row ${r.id}`}
      />
      {hi && hiMissing && <HindiMissing />}
    </div>
  );
}

export function MatrixEditor({
  listI,
  listII,
  matches,
  onChange,
  hiMissing,
  rowError,
  listError,
}: {
  listI: RowF[];
  listII: RowF[];
  matches: Record<string, string[]>;
  onChange: (p: { listI?: RowF[]; listII?: RowF[]; matches?: Record<string, string[]> }) => void;
  hiMissing: Set<string>;
  rowError?: string;
  listError?: string;
}) {
  const { ro, lang } = useEditor();
  const resize = (list: "listI" | "listII", n: number) => {
    const cur = list === "listI" ? listI : listII;
    const label = list === "listI" ? KEY : COL;
    const next = n > cur.length ? [...cur, ...Array.from({ length: n - cur.length }, (_, j) => ({ id: label(cur.length + j), en: "", hi: "" }))] : cur.slice(0, n);
    const ids = new Set(next.map((r) => r.id));
    const m: Record<string, string[]> = {};
    for (const [row, cols] of Object.entries(matches)) {
      if (list === "listI" && !ids.has(row)) continue;
      m[row] = list === "listII" ? cols.filter((c) => ids.has(c)) : cols;
    }
    onChange({ [list]: next, matches: m });
  };
  const toggle = (row: string, col: string) => {
    const cur = matches[row] ?? [];
    const next = cur.includes(col) ? cur.filter((c) => c !== col) : [...cur, col].sort();
    onChange({ matches: { ...matches, [row]: next } });
  };
  const ticks = listI.flatMap((r) => listII.filter((c) => (matches[r.id] ?? []).includes(c.id)).map((c) => `${r.id}–${c.id}`));
  return (
    <div className="col gap-3" id="f-mx" tabIndex={-1}>
      <div className="row between wrap gap-2.5">
        <span className="label m-0">Lists</span>
        {!ro && (
          <div className="row wrap gap-3">
            <span className="xs muted">List I rows</span>
            <NumberStepper value={listI.length} min={2} max={6} width={112} onChange={(n) => n != null && resize("listI", n)} aria-label="Rows in List I" />
            <span className="xs muted">List II rows</span>
            <NumberStepper value={listII.length} min={2} max={6} width={112} onChange={(n) => n != null && resize("listII", n)} aria-label="Rows in List II" />
          </div>
        )}
      </div>
      <div className="qe-lists">
        <div className="col gap-1.5">
          <span className="xs font-semibold">List I</span>
          {listI.map((r) => (
            <RowField key={r.id} r={r} list="listI" hiMissing={hiMissing.has(r.id)} onText={(v) => onChange({ listI: listI.map((x) => (x.id === r.id ? { ...x, [lang]: v } : x)) })} />
          ))}
        </div>
        <div className="col gap-1.5">
          <span className="xs font-semibold">List II</span>
          {listII.map((r) => (
            <RowField key={r.id} r={r} list="listII" hiMissing={hiMissing.has(r.id)} onText={(v) => onChange({ listII: listII.map((x) => (x.id === r.id ? { ...x, [lang]: v } : x)) })} />
          ))}
        </div>
      </div>
      {listError && <FieldErr>{listError}</FieldErr>}
      <div className="col gap-1.5" id="f-mxr" tabIndex={-1}>
        <span className="label">Correct matches · tick every match, a row can have more than one</span>
        <div className="card max-w-full self-start overflow-x-auto" style={{ padding: "8px 12px" }}>
          <table className="qe-mx">
            <thead>
              <tr>
                <th className="rh">
                  <span className="sr-only">List I</span>
                </th>
                {listII.map((c) => (
                  <th key={c.id} scope="col">
                    {c.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listI.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="rh">
                    {r.id}
                  </th>
                  {listII.map((c) => {
                    const on = (matches[r.id] ?? []).includes(c.id);
                    return (
                      <td key={c.id}>
                        <button type="button" className={`qe-mxc ${on ? "on" : ""}`} aria-pressed={on} aria-label={`${r.id} matches ${c.id}`} onClick={() => toggle(r.id, c.id)} disabled={ro}>
                          {I.tick()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rowError ? <FieldErr>{rowError}</FieldErr> : <span className="hint">{ticks.length === 1 ? "1 match" : `${ticks.length} matches`}{ticks.length ? `: ${ticks.join(", ")}` : ""}</span>}
      </div>
    </div>
  );

}
