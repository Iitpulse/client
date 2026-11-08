"use client";

/*
  Admin-ReEntrySetting board (batch 8): "If a student leaves and comes back" under Exam controls, and the
  "How re-entry decides" table. States: once only, resume after a crash (N min, 1–30), any time until the link
  expires, how it decides, live test (stays editable; applies from the next return), invalid minutes.
  Contract: api-tests docs/reentry-api.md (PATCH /tests/admin/tests/:id { reentry: { policy, minutes } }).
*/
import { Check } from "lucide-react";
import { cx, FieldError, NumberStepper } from "@/components/kit";
import type { ReentryPolicy, ReentrySetting } from "@/lib/m6-contract";

export const REENTRY_DEFAULT: ReentrySetting = { policy: "crash", minutes: 5 };
export const reentryOf = (r: ReentrySetting | null | undefined): ReentrySetting => (r && ["once", "crash", "any"].includes(r.policy) ? r : REENTRY_DEFAULT);
export const reentryMinutesError = (r: ReentrySetting) => (r.policy === "crash" && (!Number.isInteger(r.minutes) || r.minutes < 1 || r.minutes > 30) ? "Pick 1 to 30 minutes" : null);

const OPTIONS: Array<{ key: ReentryPolicy; label: string; help: string }> = [
  { key: "once", label: "Once only", help: "One sitting. Coming back always needs staff." },
  { key: "crash", label: "Resume after a crash", help: "Back in by itself after a genuine crash; otherwise staff decide. Default for new tests." },
  { key: "any", label: "Any time until the link expires", help: "Sign out and in freely; every return is logged." },
];

export function ReEntrySetting({
  value,
  onChange,
  disabled,
  closesAt,
  serverError,
  explain,
  onToggleExplain,
}: {
  value: ReentrySetting;
  onChange: (v: ReentrySetting) => void;
  disabled?: boolean;
  /** "until their link expires (Sun 29 Nov, 9:00 PM)" */
  closesAt: string | null;
  serverError?: string | null;
  explain: boolean;
  onToggleExplain: () => void;
}) {
  const err = serverError ?? reentryMinutesError(value);
  return (
    <div className="col" style={{ gap: 10 }} role="group" aria-labelledby="tb-re-l">
      <span className="row" style={{ gap: 8 }}>
        <span id="tb-re-l" className="sm" style={{ fontWeight: 600 }}>
          If a student leaves and comes back
        </span>
        <span className="badge b-navy">New</span>
      </span>
      <div className="col" style={{ gap: 8 }} role="radiogroup" aria-labelledby="tb-re-l">
        {OPTIONS.map((o) => (
          <label key={o.key} className={cx("k-radio-card", value.policy === o.key && "on")} style={{ minWidth: 0, opacity: disabled ? 0.6 : undefined, cursor: disabled ? "not-allowed" : undefined }}>
            <input type="radio" name="tb-reentry" checked={value.policy === o.key} disabled={disabled} onChange={() => onChange({ ...value, policy: o.key })} />
            <span className="col" style={{ gap: 2 }}>
              <span className="sm" style={{ fontWeight: 600 }}>
                {o.label}
              </span>
              <span className="xs muted">{o.help}</span>
            </span>
          </label>
        ))}
      </div>
      {value.policy === "crash" && (
        <div className="col" style={{ gap: 8, paddingLeft: 4 }}>
          <span className="xs muted">They go back in by themselves only if all three are true:</span>
          <ul className="col" style={{ gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
            <li className="row sm" style={{ gap: 8 }}>
              <Check className="size-4 shrink-0" style={{ color: "var(--green)" }} aria-hidden />
              They didn&apos;t press Sign out or Submit
            </li>
            <li className="row sm" style={{ gap: 8 }}>
              <Check className="size-4 shrink-0" style={{ color: "var(--green)" }} aria-hidden />
              Same device and browser as before
            </li>
            <li className="row wrap sm" style={{ gap: 8 }}>
              <Check className="size-4 shrink-0" style={{ color: "var(--green)" }} aria-hidden />
              <span>Back within</span>
              <NumberStepper
                id="tb-re-min"
                aria-label="Minutes since their last saved answer"
                value={value.minutes}
                min={1}
                max={30}
                width={112}
                invalid={!!err}
                onChange={(v) => onChange({ ...value, minutes: v ?? 0 })}
              />
              <span>min of their last saved answer</span>
            </li>
          </ul>
          {err ? (
            <FieldError id="tb-re-min-e">{err}</FieldError>
          ) : (
            <span className="hint">Pick 1 to 30 minutes. Anything else waits for staff in the Monitor.</span>
          )}
        </div>
      )}
      {value.policy === "once" && <span className="hint">Every return waits for staff in the Monitor, even after a crash. Good for centre exams with an invigilator in the room.</span>}
      {value.policy === "any" && (
        <span className="hint">
          They can sign out and back in, on any device, until their link expires{closesAt ? ` (${closesAt})` : ""}. Every return is logged and a new device is flagged in the Monitor.
        </span>
      )}
      <span className="hint">
        <b>The clock keeps running while they&apos;re away</b>, in every option. To make up lost time, use Give extra time in the Monitor. Fullscreen exits carry over.
      </span>
      <span className="hint">Staff with the Monitor permission for these batches decide.</span>
      <button type="button" className="btn btn-ghost btn-sm self-start" aria-expanded={explain} aria-controls="tb-re-how" onClick={onToggleExplain}>
        {explain ? "Hide how it decides" : "See how it decides"}
      </button>
    </div>
  );
}

type Cell = { t: string; tone: "in" | "ask" | "never"; extra?: string };
const IN = (extra?: string): Cell => ({ t: "Back in by itself", tone: "in", extra });
const ASK = (extra?: string): Cell => ({ t: "Asks staff", tone: "ask", extra });
const NEVER: Cell = { t: "Never", tone: "never" };

/** The board's table: what happened × the three options. */
export function ReEntryExplainer({ value, onHide }: { value: ReentrySetting; onHide: () => void }) {
  const n = value.minutes >= 1 && value.minutes <= 30 ? value.minutes : 5;
  const rows: Array<{ what: string; once: Cell; crash: Cell; any: Cell }> = [
    { what: `Browser or laptop crashed, back on the same laptop ${Math.min(3, n)} min after the last save`, once: ASK(), crash: IN(), any: IN() },
    { what: `Crashed, back ${n + 7} min after the last save (longer than ${n} min)`, once: ASK(), crash: ASK(), any: IN() },
    { what: "Laptop died, comes back on a phone or another computer", once: ASK(), crash: ASK(), any: IN("flagged as a new device") },
    { what: "Pressed Sign out during the test, signed in again", once: ASK(), crash: ASK(), any: IN() },
    { what: "Signed out by the idle timeout (no answer saved for a long time), signed in again", once: ASK(), crash: ASK(`unless the last save was within ${n} min`), any: IN() },
    { what: "Opens the test on a second device while the first is still open", once: ASK("the first keeps going"), crash: ASK("the first keeps going"), any: { t: "Moves to the new device", tone: "in", extra: "the first closes" } },
    { what: "Already submitted, or time ran out while away", once: NEVER, crash: NEVER, any: NEVER },
    { what: "Test closed, or the student's link expired", once: NEVER, crash: NEVER, any: NEVER },
  ];
  const cols: Array<{ key: ReentryPolicy; label: string }> = [
    { key: "once", label: "Once only" },
    { key: "crash", label: `Resume after a crash · ${n} min` },
    { key: "any", label: "Any time until the link expires" },
  ];
  const color = { in: "var(--green)", ask: "var(--amber)", never: "var(--muted)" } as const;
  return (
    <section id="tb-re-how" className="card pad-lg col tb-wide" style={{ gap: 12 }} aria-labelledby="tb-re-how-h">
      <div className="row between wrap" style={{ gap: 8 }}>
        <span className="col" style={{ gap: 2 }}>
          <h2 id="tb-re-how-h" className="h3">
            How re-entry decides
          </h2>
          <span className="xs muted">The same rules for every student in this test. Saved answers are never lost in any case.</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onHide}>
          Hide
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="sm" style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>
                What happened
              </th>
              {cols.map((c) => (
                <th key={c.key} scope="col" aria-current={value.policy === c.key || undefined} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, background: value.policy === c.key ? "var(--navy-50)" : undefined, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                  {c.label}
                  {value.policy === c.key && <span className="xs muted"> · this test</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.what} style={{ borderTop: "1px solid var(--line-2)" }}>
                <th scope="row" style={{ textAlign: "left", padding: "8px 10px", fontWeight: 400 }}>
                  {r.what}
                </th>
                {cols.map((c) => {
                  const cell = r[c.key];
                  return (
                    <td key={c.key} style={{ padding: "8px 10px", background: value.policy === c.key ? "var(--navy-50)" : undefined }}>
                      <span style={{ color: color[cell.tone], fontWeight: 600 }}>{cell.t}</span>
                      {cell.extra && <span className="muted"> · {cell.extra}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="xs muted">
        <b style={{ color: color.in }}>Back in by itself</b>: logged in the Monitor timeline. <b style={{ color: color.ask }}>Asks staff</b>: the student waits; staff allow or deny with a reason
        (audited). <b>Never</b>: not even staff can reopen it.
      </span>
    </section>
  );
}
