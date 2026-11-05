"use client";
/*
  Questions on a passage (board: "Questions on this passage · 3"): 1–8 children in order, each collapsed to a line
  (type, stem, answer, "Solution ✓", Hindi missing, No answer) or open (type switch, the question, options or the
  answer, the solution; the maths toolbar appears when a field has focus). Reorder by dragging the handle or with
  the arrows; remove (the page offers Undo); "+ Single", "+ Multiple", "+ Numerical".
*/
import * as React from "react";
import { MathField } from "@/components/kit/math-field";
import { Segmented } from "@/components/kit/Segmented";
import { isBlankHtml, sourcePreview } from "@/lib/latex-source";
import type { ChildType } from "@/lib/m6-contract";
import { blankChild, blankOptions, childAnswerLabel, type ChildF } from "./form";
import { useEditor, useFieldProps } from "./context";
import { OptionsEditor } from "./options";
import { FieldErr, HindiMissing, I } from "./ui";

const TYPE_LABEL: Record<ChildType, string> = { single: "Single", multiple: "Multiple", integer: "Numerical" };

function ChildBody({ c, i, onChange, errors, hiMissing }: { c: ChildF; i: number; onChange: (c: ChildF) => void; errors: Record<string, string>; hiMissing: boolean }) {
  const { lang } = useEditor();
  const hi = lang === "hi";
  const n = `Q${i + 1}`;
  const stemFp = useFieldProps(`questions.${i}.${lang}.question`);
  const solFp = useFieldProps(`questions.${i}.${lang}.solution`);
  const optErrors: Record<string, string> = {};
  c.options.forEach((o) => {
    if (errors[`opt-${o.id}`]) optErrors[o.id] = errors[`opt-${o.id}`];
  });
  return (
    <div className="qe-kid-body">
      <div className="field">
        <span className="label">Question{hi ? " · Hindi" : ""}</span>
        <MathField
          {...stemFp}
          id={`f-kid-${c.id}-q`}
          value={hi ? c.hi.question : c.en.question}
          onChange={(v) => onChange({ ...c, [lang]: { ...c[lang], question: v } })}
          label={`${n} question${hi ? " in Hindi" : ""}`}
          toolbar="focus"
          minHeight={48}
          placeholder={hi ? `${n} हिन्दी में लिखें` : `Type ${n}. Maths between $…$.`}
          error={errors.stem}
          showError
        />
        <span className="hint">The maths toolbar appears when you click into the field.</span>
      </div>
      {c.type === "integer" ? (
        <div className="field max-w-[260px]" id={`f-kid-${c.id}-ans`} tabIndex={-1}>
          <label className="label" htmlFor={`ka-${c.id}`}>
            Answer
          </label>
          <div className="row gap-2">
            <div className={`k-affix grow ${errors.answer ? "e" : ""}`}>
              <input
                id={`ka-${c.id}`}
                value={c.from}
                inputMode="decimal"
                placeholder="Type the answer"
                aria-invalid={!!errors.answer || undefined}
                onChange={(e) => onChange({ ...c, from: e.target.value })}
              />
            </div>
            {c.to.trim() !== "" && (
              <>
                <span className="xs muted">to</span>
                <div className="k-affix grow">
                  <input aria-label={`${n} answer up to`} value={c.to} inputMode="decimal" onChange={(e) => onChange({ ...c, to: e.target.value })} />
                </div>
              </>
            )}
          </div>
          {errors.answer && <FieldErr>{errors.answer}</FieldErr>}
        </div>
      ) : (
        <div id={`f-kid-${c.id}-ans`} tabIndex={-1}>
          <OptionsEditor
            options={c.options}
            correct={c.correct}
            multi={c.type === "multiple"}
            onChange={(options, correct) => onChange({ ...c, options, correct })}
            hiMissing={new Set(hiMissing ? c.options.filter((o) => !isBlankHtml(o.en) && isBlankHtml(o.hi)).map((o) => o.id) : [])}
            errors={optErrors}
            keyError={errors.answer}
            name={`k-${c.id}`}
            fieldOf={(l, k) => `questions.${i}.${l}.options.${k}`}
            small
            ariaPrefix={`${n} `}
            showHeader={false}
          />
        </div>
      )}
      <div className="field">
        <span className="label">Solution{hi ? " · Hindi" : ""}</span>
        <MathField
          {...solFp}
          value={hi ? c.hi.solution : c.en.solution}
          onChange={(v) => onChange({ ...c, [lang]: { ...c[lang], solution: v } })}
          label={`${n} solution${hi ? " in Hindi" : ""}`}
          toolbar="focus"
          minHeight={48}
          placeholder={hi ? "हल हिन्दी में लिखें" : "No solution. Students won't get an AI review for this question until one exists."}
        />
      </div>
    </div>
  );
}

export function ParagraphChildren({
  items,
  onChange,
  onRemoved,
  errors,
  hiMissing,
}: {
  items: ChildF[];
  onChange: (items: ChildF[]) => void;
  /** a child was removed (the page shows "Removed a question from the passage" with Undo) */
  onRemoved: (child: ChildF, index: number) => void;
  /** "kid-<id>" → {stem, answer, opt-<id>} messages */
  errors: Record<string, Record<string, string>>;
  hiMissing: Set<string>;
}) {
  const { lang, ro } = useEditor();
  const [open, setOpen] = React.useState<string | null>(items[0]?.id ?? null);
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [over, setOver] = React.useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const a = [...items];
    const [x] = a.splice(from, 1);
    a.splice(to, 0, x);
    onChange(a);
  };
  // an error inside a closed child opens it
  const errKey = Object.keys(errors).join(",");
  React.useEffect(() => {
    const first = items.find((c) => errors[`kid-${c.id}`] && Object.keys(errors[`kid-${c.id}`]).length);
    if (first) setOpen(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errKey]);

  const add = (t: ChildType) => {
    const c = blankChild(t);
    onChange([...items, c]);
    setOpen(c.id);
  };

  return (
    <div className="col gap-2.5" id="f-kids" tabIndex={-1}>
      <div className="row between wrap gap-2">
        <span className="label m-0">Questions on this passage · {items.length === 1 ? "1 question" : `${items.length} questions`}</span>
        <span className="xs muted">Tests always keep the passage and its questions together, in this order.</span>
      </div>
      {items.map((c, i) => {
        const isOpen = open === c.id;
        const n = `Q${i + 1}`;
        const e = errors[`kid-${c.id}`] ?? {};
        const noAnswer = !!e.answer;
        const stem = lang === "hi" ? c.hi.question || c.en.question : c.en.question;
        return (
          <div
            key={c.id}
            id={`f-kid-${c.id}`}
            tabIndex={-1}
            className={`qe-kid ${isOpen ? "open" : ""} ${over === i && dragFrom !== null && dragFrom !== i ? "drag-over" : ""}`}
            onDragOver={(ev) => {
              if (dragFrom === null) return;
              ev.preventDefault();
              setOver(i);
            }}
            onDrop={(ev) => {
              ev.preventDefault();
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
              setOver(null);
            }}
          >
            <div className="qe-kid-h">
              {!ro && (
                <button
                  type="button"
                  className="qe-ib grab"
                  aria-label={`Drag to reorder ${n}`}
                  draggable
                  onDragStart={(ev) => {
                    setDragFrom(i);
                    ev.dataTransfer.effectAllowed = "move";
                    ev.dataTransfer.setData("text/plain", c.id);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setOver(null);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "ArrowUp") {
                      ev.preventDefault();
                      move(i, i - 1);
                    } else if (ev.key === "ArrowDown") {
                      ev.preventDefault();
                      move(i, i + 1);
                    }
                  }}
                >
                  {I.grip()}
                </button>
              )}
              <span className="badge b-navy">{n}</span>
              {isOpen ? (
                <Segmented<ChildType>
                  size="sm"
                  ariaLabel={`Type of ${n}`}
                  value={c.type}
                  onChange={(t) => {
                    if (t === c.type || ro) return;
                    const next: ChildF = { ...c, type: t };
                    if (t === "integer") next.correct = [];
                    else if (!c.options.length) next.options = blankOptions();
                    if (t === "single") next.correct = c.correct.slice(0, 1);
                    onChange(items.map((x) => (x.id === c.id ? next : x)));
                  }}
                  options={(["single", "multiple", "integer"] as ChildType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
                />
              ) : (
                <button type="button" className="qe-kid-sum" onClick={() => setOpen(c.id)}>
                  <span className="badge b-grey">{TYPE_LABEL[c.type]}</span>
                  <span className={`sm ell grow ${lang === "hi" ? "qe-hi" : ""}`}>{sourcePreview(stem, 140) || <span className="muted">No question text yet</span>}</span>
                  <span className="xs muted whitespace-nowrap">{childAnswerLabel(c)}</span>
                  {!isBlankHtml(c.en.solution) && <span className="xs whitespace-nowrap text-[var(--green)]">Solution ✓</span>}
                </button>
              )}
              {lang === "hi" && hiMissing.has(c.id) && <HindiMissing />}
              {noAnswer && <span className="badge b-live">No answer</span>}
              <span className="row ml-auto gap-0">
                {!ro && (
                  <>
                    <button type="button" className="qe-ib" aria-label={`Move ${n} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                      {I.up()}
                    </button>
                    <button type="button" className="qe-ib" aria-label={`Move ${n} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                      {I.down()}
                    </button>
                  </>
                )}
                <button type="button" className="qe-ib" aria-label={`${isOpen ? "Collapse" : "Expand"} ${n}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>
                  {isOpen ? I.up() : I.down()}
                </button>
                {!ro && (
                  <button
                    type="button"
                    className="qe-ib danger-hover"
                    aria-label={`Remove ${n}`}
                    onClick={() => {
                      onChange(items.filter((x) => x.id !== c.id));
                      onRemoved(c, i);
                    }}
                  >
                    {I.bin()}
                  </button>
                )}
              </span>
            </div>
            {isOpen && <ChildBody c={c} i={i} errors={e} hiMissing={hiMissing.has(c.id)} onChange={(nc) => onChange(items.map((x) => (x.id === c.id ? nc : x)))} />}
          </div>
        );
      })}
      {!ro && items.length < 8 && (
        <div className="row wrap gap-1.5">
          <span className="xs muted mr-1">Add a question:</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => add("single")}>
            + Single
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => add("multiple")}>
            + Multiple
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => add("integer")}>
            + Numerical
          </button>
        </div>
      )}
      {errors.kids?.list && <FieldErr>{errors.kids.list}</FieldErr>}
    </div>
  );
}
