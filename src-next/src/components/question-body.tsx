"use client";

import { MathText } from "@iitpulse/ui";
import { paragraphHtml, stripHtml, type BankQuestion } from "@/lib/question-queries";

const KEY = (i: number) => String.fromCharCode(65 + i);

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
export function QuestionBody({ q, showAnswers = false, lang = "en" }: { q: BankQuestion; showAnswers?: boolean; lang?: "en" | "hi" }) {
  const pick = (en?: string, hi?: string) => (lang === "hi" && stripHtml(hi) ? hi! : en || "");
  const stem = "my-0 font-serif text-base leading-[1.55] [&_img]:max-w-full [&_p]:my-0";

  if (q._kind === "paragraph") {
    return (
      <div className="col gap-3">
        <MathText html as="div" className={stem} text={paragraphHtml(q)} />
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
      {q._kind === "matrix" && Array.isArray(q.correctAnswer) && q.correctAnswer.length > 0 && showAnswers && (
        <MatrixGrid matrix={q.correctAnswer} />
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
