"use client";

import * as React from "react";
import { MathText } from "@/components/math-text";
import { paragraphHtml, stripHtml, type BankChild, type BankQuestion } from "@/lib/question-queries";

const KEY = (i: number) => String.fromCharCode(65 + i);
const COL = (i: number) => String.fromCharCode(80 + i);

export interface MatrixView {
  listI: Array<{ id: string; en: string; hi: string | null }>;
  listII: Array<{ id: string; en: string; hi: string | null }>;
  matches: Record<string, string[]>;
}

/**
 * A matrix question's lists and key (M6 `matrix {listI, listII, matches}`), or the same read from an older question:
 * `correctAnswer` as a boolean grid (rows A…, columns P…) or as rows of column ids, with empty row texts.
 */
export function matrixOf(q: Pick<BankQuestion, "matrix" | "correctAnswer">): MatrixView | null {
  if (q.matrix?.listI?.length) return q.matrix;
  const ca = q.correctAnswer as unknown;
  if (!Array.isArray(ca) || !ca.length) return null;
  if (Array.isArray(ca[0]) && typeof ca[0][0] === "boolean") {
    const g = ca as boolean[][];
    const cols = Math.max(...g.map((r) => r.length));
    const listI = g.map((_, r) => ({ id: KEY(r), en: "", hi: null }));
    const listII = Array.from({ length: cols }, (_, c) => ({ id: COL(c), en: "", hi: null }));
    const matches = Object.fromEntries(g.map((row, r) => [KEY(r), row.map((on, c) => (on ? COL(c) : "")).filter(Boolean)]));
    return { listI, listII, matches };
  }
  if (Array.isArray(ca[0])) {
    const rows = ca as string[][];
    const cols = [...new Set(rows.flat())].sort();
    return {
      listI: rows.map((_, r) => ({ id: KEY(r), en: "", hi: null })),
      listII: cols.map((c) => ({ id: c, en: "", hi: null })),
      matches: Object.fromEntries(rows.map((r, i) => [KEY(i), r])),
    };
  }
  return null;
}

/** "A→P · B→Q, R" */
export function matrixKey(m: MatrixView): string {
  return m.listI
    .map((r) => `${r.id}→${(m.matches[r.id] ?? []).join(", ") || "?"}`)
    .join(" · ");
}

/** "Single · B", "Multiple · A, C", "Numerical · 5.2–5.4" for a paragraph child. */
export function childKeyLabel(c: BankChild): string {
  if (c.type === "integer") {
    const a = c.correctAnswer;
    const v = a?.from == null ? "no answer" : a.to != null && a.to !== a.from ? `${a.from}–${a.to}` : String(a.from);
    return `Numerical · ${v}`;
  }
  const opts = c.en?.options ?? [];
  const keys = (c.correctAnswers ?? []).map((id) => {
    const i = opts.findIndex((o) => o.id === id);
    return i >= 0 ? KEY(i) : "?";
  });
  return `${c.type === "multiple" ? "Multiple" : "Single"} · ${keys.join(", ") || "no answer"}`;
}

function Options({
  options,
  correct,
  showAnswers,
}: {
  options: { id: string; value: string }[];
  correct: string[];
  showAnswers: boolean;
}) {
  return (
    <div className="col gap-1.5">
      {options.map((o, i) => {
        const ok = showAnswers && correct.includes(o.id);
        return (
          <div key={o.id || i} className={`opt items-center px-2.5 py-2 ${ok ? "correct" : ""}`}>
            <span className="key size-6">{KEY(i)}</span>
            <MathText html as="div" className="min-w-0 grow font-serif text-[15px] [&_p]:m-0" text={o.value || ""} />
          </div>
        );
      })}
    </div>
  );
}

function Range({ from, to }: { from?: number | null; to?: number | null }) {
  if (from == null && to == null) return <span className="xs muted">No answer set</span>;
  return (
    <span className="badge b-green">
      Answer {from ?? "—"}
      {to != null && to !== from ? ` to ${to}` : ""}
    </span>
  );
}

/**
 * A question as students see it (stem, options, passage), rendered with MathText (KaTeX, never images of maths).
 * `showAnswers` marks the correct options and answer ranges (the bank's preview pane); the editor's student preview
 * leaves it off. `lang` picks the Hindi block, falling back to English where a Hindi field is empty.
 */
export function QuestionBody({
  q,
  showAnswers = false,
  lang = "en",
  variant = "full",
}: {
  q: BankQuestion;
  showAnswers?: boolean;
  lang?: "en" | "hi";
  /** "pane": the bank's preview pane (board Admin-Questions): a paragraph's questions as one line each with type · key,
   *  a matrix as List I / List II and its key. */
  variant?: "full" | "pane";
}) {
  const pick = (en?: string | null, hi?: string | null) => (lang === "hi" && stripHtml(hi ?? "") ? hi! : en || "");
  const stem = "my-0 font-serif text-base leading-[1.55] [&_img]:max-w-full [&_p]:my-0";
  const passage = pick(paragraphHtml(q), q.passage?.hi ?? null);

  if (q._kind === "paragraph" && variant === "pane") {
    const kids = q.questions ?? [];
    return (
      <div className="col gap-2">
        <div className="rounded-[10px] border border-line-2 bg-[#FAFBFD] px-3 py-2.5 font-serif text-[14px] leading-[1.55]">
          <span className="xs mb-0.5 block font-sans font-semibold text-muted">
            Passage · shared by {kids.length === 1 ? "1 question" : `${kids.length} questions`}
          </span>
          <MathText html as="div" className="[&_img]:max-w-full [&_p]:my-0" text={passage} />
        </div>
        <div className="col gap-1.5 text-[13px]">
          {kids.map((c, i) => (
            <span key={c._id || c.id || i} className="row between items-start gap-2">
              <span className="row min-w-0 items-baseline gap-1.5">
                <b className="mono">{i + 1}</b>
                <MathText html as="span" className="min-w-0 [&_img]:max-w-full [&_p]:inline [&_p]:m-0" text={pick(c.en?.question, c.hi?.question)} />
              </span>
              <span className="badge b-grey shrink-0">{showAnswers ? childKeyLabel(c) : childKeyLabel(c).split(" · ")[0]}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (q._kind === "matrix") {
    const m = matrixOf(q);
    const rowText = (r: { en: string; hi: string | null }) => pick(r.en, r.hi);
    return (
      <div className="col gap-2">
        <MathText html as="div" className={variant === "pane" ? "my-0 font-serif text-[15px] leading-[1.55] [&_img]:max-w-full [&_p]:my-0" : stem} text={pick(q.en?.question, q.hi?.question)} />
        {m && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
            <span className="xs font-semibold text-muted">List I</span>
            <span className="xs font-semibold text-muted">List II</span>
            {Array.from({ length: Math.max(m.listI.length, m.listII.length) }, (_, i) => {
              const a = m.listI[i];
              const b = m.listII[i];
              return (
                <React.Fragment key={i}>
                  <span className="row min-w-0 items-baseline gap-1.5">
                    {a && (
                      <>
                        <b className="mono">{a.id}</b>
                        <MathText html as="span" className="min-w-0 font-serif [&_p]:inline [&_p]:m-0" text={rowText(a)} />
                      </>
                    )}
                  </span>
                  <span className="row min-w-0 items-baseline gap-1.5">
                    {b && (
                      <>
                        <b className="mono">{b.id}</b>
                        <MathText html as="span" className="min-w-0 font-serif [&_p]:inline [&_p]:m-0" text={rowText(b)} />
                      </>
                    )}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        )}
        {m && showAnswers && <span className="xs font-semibold text-success">Key: {matrixKey(m)}</span>}
      </div>
    );
  }

  if (q._kind === "paragraph") {
    return (
      <div className="col gap-3">
        <MathText html as="div" className={stem} text={passage} />
        {(q.questions ?? []).map((c, i) => (
          <div key={c._id || c.id || i} className="col gap-2 border-t border-line-2 pt-3">
            <div className="row items-start gap-2">
              <span className="xs mono muted pt-1">Q{i + 1}</span>
              <MathText html as="div" className={stem} text={pick(c.en?.question, c.hi?.question)} />
            </div>
            {c.type === "integer" ? (
              showAnswers && <Range from={c.correctAnswer?.from} to={c.correctAnswer?.to} />
            ) : (
              <Options
                options={(c.en?.options ?? []).map((o, j) => ({ id: o.id, value: pick(o.value, c.hi?.options?.[j]?.value) }))}
                correct={c.correctAnswers ?? []}
                showAnswers={showAnswers}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  const options = (q.en?.options ?? []).map((o, j) => ({ id: o.id, value: pick(o.value, q.hi?.options?.[j]?.value) }));
  return (
    <div className="col gap-3">
      <MathText html as="div" className={stem} text={pick(q.en?.question, q.hi?.question)} />
      {q._kind === "mcq" && <Options options={options} correct={q.correctAnswers ?? []} showAnswers={showAnswers} />}
      {q._kind === "numerical" && showAnswers && !Array.isArray(q.correctAnswer) && (
        <Range from={q.correctAnswer?.from} to={q.correctAnswer?.to} />
      )}
    </div>
  );
}

export function MatrixGrid({ matrix, onToggle }: { matrix: boolean[][]; onToggle?: (r: number, c: number) => void }) {
  const cols = matrix[0]?.length ?? 0;
  return (
    <div className="scrollx">
      <table className="border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="p-1.5" />
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} className="xs muted p-1.5 text-center font-semibold">
                {String.fromCharCode(80 + c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, r) => (
            <tr key={r}>
              <td className="xs muted p-1.5 font-semibold">{KEY(r)}</td>
              {row.map((on, c) => (
                <td key={c} className="p-1.5 text-center">
                  {onToggle ? (
                    <input
                      type="checkbox"
                      className="check"
                      checked={on}
                      aria-label={`${KEY(r)} matches ${String.fromCharCode(80 + c)}`}
                      onChange={() => onToggle(r, c)}
                    />
                  ) : (
                    <span className={`inline-block size-5 rounded-md border ${on ? "border-success bg-success" : "border-line bg-ground"}`} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
