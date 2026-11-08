"use client";
/*
  Options of a single / multiple question, and of a paragraph child (board: "Options · pick the correct one",
  "Options · tick every correct one"). Each option is a one-line LaTeX field with its render beside it, the key
  (radio or tick), "Correct", remove; "Write option D, or remove it"; "Add option E". In Hindi: maths-only options are
  the same in Hindi (shown, not edited); a missing Hindi option says so.
*/
import * as React from "react";
import { MathField } from "@/components/kit/math-field";
import { isBlankHtml, isMathsOnly } from "@/lib/latex-source";
import { MathText } from "@/components/math-text";
import { KEY, uid, type OptionF } from "./form";
import { useEditor, useFieldProps } from "./context";
import { FieldErr, HindiMissing, I } from "./ui";

const MAX_OPTIONS = 6;

function OptionRow({
  o,
  i,
  multi,
  correct,
  name,
  hiMissing,
  err,
  fieldOf,
  onText,
  onToggle,
  onRemove,
  canRemove,
  small,
  ariaPrefix,
}: {
  o: OptionF;
  i: number;
  multi: boolean;
  correct: boolean;
  name: string;
  hiMissing: boolean;
  err?: string;
  fieldOf: (lang: "en" | "hi", key: string) => string;
  onText: (lang: "en" | "hi", v: string) => void;
  onToggle: () => void;
  onRemove: () => void;
  canRemove: boolean;
  small?: boolean;
  ariaPrefix: string;
}) {
  const { lang, ro } = useEditor();
  const k = KEY(i);
  const hi = lang === "hi";
  const fp = useFieldProps(fieldOf(hi ? "hi" : "en", k));
  const same = hi && isMathsOnly(o.en) && isBlankHtml(o.hi);
  return (
    <div className="col gap-1.5" id={`f-opt-${o.id}`} tabIndex={-1}>
      <div className={`qe-opt ${correct ? "correct" : ""} ${err ? "oerr" : ""} ${small ? "sm" : ""}`}>
        <input
          type={multi ? "checkbox" : "radio"}
          name={name}
          className="qe-radio"
          checked={correct}
          onChange={onToggle}
          disabled={ro}
          aria-label={`${ariaPrefix}Option ${k} is correct`}
        />
        <span className="key">{k}</span>
        {same ? (
          <span className="row grow min-w-0 gap-2.5">
            <span className="grow" />
            <MathText html text={o.en} as="span" className="k-mf-rend" />
          </span>
        ) : (
          <MathField
            {...fp}
            variant="inline"
            value={hi ? o.hi : o.en}
            onChange={(v) => onText(hi ? "hi" : "en", v)}
            label={`${ariaPrefix}Option ${k}${hi ? " in Hindi" : ""}`}
            placeholder={hi ? `विकल्प ${k} हिन्दी में लिखें` : `Option ${k} · maths between $…$`}
            error={err}
          />
        )}
        {hi && hiMissing && !same && <HindiMissing />}
        {correct && <span className="badge b-green">Correct</span>}
        {canRemove && !ro && (
          <button type="button" className="qe-ib" aria-label={`Remove ${ariaPrefix.toLowerCase()}option ${k}`} onClick={onRemove}>
            {I.x()}
          </button>
        )}
      </div>
      {err && (
        <span className="pl-10">
          <FieldErr>{err}</FieldErr>
        </span>
      )}
    </div>
  );
}

export function OptionsEditor({
  options,
  correct,
  multi,
  onChange,
  hiMissing,
  errors,
  keyError,
  name,
  fieldOf = (l, k) => `${l}.options.${k}`,
  small,
  ariaPrefix = "",
  showHeader = true,
}: {
  options: OptionF[];
  correct: string[];
  multi: boolean;
  onChange: (options: OptionF[], correct: string[]) => void;
  hiMissing: Set<string>;
  /** option id → message */
  errors: Record<string, string>;
  keyError?: string;
  name: string;
  /** contract field path of an option ("en.options.D", "questions.2.en.options.D") */
  fieldOf?: (lang: "en" | "hi", key: string) => string;
  small?: boolean;
  ariaPrefix?: string;
  showHeader?: boolean;
}) {
  const { lang, ro } = useEditor();
  const mathsOnly = lang === "hi" && options.length > 0 && options.every((o) => isMathsOnly(o.en));
  const toggle = (id: string) => {
    if (multi) onChange(options, correct.includes(id) ? correct.filter((c) => c !== id) : [...correct, id]);
    else onChange(options, [id]);
  };
  return (
    <div className="col gap-2" id={showHeader ? "f-opts" : undefined}>
      {showHeader && (
        <div className="row between gap-2">
          <span className="label m-0">{multi ? "Options · tick every correct one" : "Options · pick the correct one"}</span>
          {mathsOnly && <span className="xs muted">Options are maths only, so they&apos;re the same in Hindi.</span>}
        </div>
      )}
      {options.map((o, i) => (
        <OptionRow
          key={o.id}
          o={o}
          i={i}
          multi={multi}
          correct={correct.includes(o.id)}
          name={name}
          hiMissing={hiMissing.has(o.id)}
          err={errors[o.id]}
          fieldOf={fieldOf}
          small={small}
          ariaPrefix={ariaPrefix}
          onText={(l, v) => onChange(options.map((x) => (x.id === o.id ? { ...x, [l]: v } : x)), correct)}
          onToggle={() => toggle(o.id)}
          onRemove={() => onChange(options.filter((x) => x.id !== o.id), correct.filter((c) => c !== o.id))}
          canRemove={options.length > 2}
        />
      ))}
      <div className="row between wrap gap-2">
        {!ro && options.length < MAX_OPTIONS && lang === "en" ? (
          <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => onChange([...options, { id: uid("opt"), en: "", hi: "" }], correct)}>
            {I.plus()}Add option {KEY(options.length)}
          </button>
        ) : (
          <span />
        )}
        {multi && showHeader && <span className="xs muted">Marks come from the test&apos;s pattern, including part marks.</span>}
      </div>
      {keyError && <FieldErr id={showHeader ? "f-key" : undefined}>{keyError}</FieldErr>}
    </div>
  );
}
