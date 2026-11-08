"use client";
/*
  K14 Steps: one stepper for every wizard (sign-up, bulk upload, users import, new institute). Done steps are links
  back; future steps aren't clickable; a step with errors is red ("Review · 2 to fix"). Under 1180px only the current
  step keeps its label (the others keep it for screen readers).
*/
import { Fragment } from "react";
import { Check } from "lucide-react";
import { cx } from "./utils";

export interface StepDef {
  label: string;
  /** a step that needs a fix: red, with "!" */
  bad?: boolean;
}

export function Steps({
  steps,
  current,
  onGo,
  allDone,
  ariaLabel = "Steps",
  className,
  style,
}: {
  steps: StepDef[];
  /** index of the current step */
  current: number;
  /** go back to a done step */
  onGo?: (i: number) => void;
  /** the wizard finished: every step done */
  allDone?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <nav className={cx("k-steps", className)} aria-label={ariaLabel} style={style}>
      {steps.map((s, i) => {
        const done = allDone || i < current;
        const cur = !allDone && i === current;
        const state = s.bad && (cur || done) ? "bad" : done ? "done" : cur ? "cur" : "";
        const clickable = (done || s.bad) && !!onGo && !cur;
        return (
          <Fragment key={i}>
            {i > 0 && <span className={cx("k-line", (done || cur) && "done")} aria-hidden />}
            <button
              type="button"
              className={cx("k-st", state)}
              disabled={!clickable}
              aria-current={cur ? "step" : undefined}
              onClick={() => clickable && onGo!(i)}
            >
              <span className="sr-only">Step {i + 1}, </span>
              <span className="n" aria-hidden>
                {s.bad && (cur || done) ? "!" : done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className="t">{s.label}</span>
              {done && <span className="sr-only">, done</span>}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
