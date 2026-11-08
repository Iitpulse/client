"use client";

/*
  Admin-MonitorResume board (batch 8): "Let back in" (reason required, note optional unless Other, optional extra time;
  the yes works once, for 15 minutes), "Deny" (reason + note required; submits the saved answers as "Re-entry
  denied") and "Let N back in" (one reason for several). Contract: api-tests docs/reentry-api.md.
*/
import { useState } from "react";
import { Checkbox, cx, Field, FieldError, KitDialog, notify, NumberStepper, TextInput } from "@/components/kit";
import type { MonitorRow, ReentryAllowReason, ReentryDenyReason, ReentryPolicy } from "@/lib/m6-contract";
import { apiError } from "@/lib/m6/client";
import { useReentryDecision } from "@/lib/m6/monitor";
import { istTime, plural } from "@/lib/m6/shared";
import { ALLOW_REASON_LABEL, clock, DENY_REASON_LABEL, reentryWhyText, waitingLabel } from "./format";

function Chips<T extends string>({ id, value, onChange, options, invalid }: { id: string; value: T | null; onChange: (v: T) => void; options: Record<T, string>; invalid?: boolean }) {
  return (
    <div id={id} className="row wrap" style={{ gap: 8 }} role="radiogroup" aria-invalid={invalid || undefined}>
      {(Object.keys(options) as T[]).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={cx("chip", value === k && "on")} onClick={() => onChange(k)}>
          {options[k]}
        </button>
      ))}
    </div>
  );
}

const fieldsOf = (e: unknown) => (apiError(e).details as { fields?: Record<string, { message: string }> } | null)?.fields ?? {};
const failText = (code: string | null | undefined, name: string, msg: string) =>
  code === "NO_REQUEST" ? `${name} isn't waiting to come back in any more.` : code === "ATTEMPT_NOT_RUNNING" ? `${name}'s attempt has ended.` : code === "FORBIDDEN" ? "Your role can't decide this. An admin can." : msg || "Couldn't save. Try again.";

/** Let one student (or several, one reason for all) back in. */
export function AllowDialog({
  testId,
  rows,
  total,
  exitsAllowed,
  now,
  policy,
  onClose,
}: {
  testId: string;
  rows: MonitorRow[];
  total: number;
  exitsAllowed: number | null;
  now: number;
  policy?: { policy: ReentryPolicy; minutes: number };
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReentryAllowReason | null>(null);
  const [note, setNote] = useState("");
  const [extraOn, setExtraOn] = useState(false);
  const [extra, setExtra] = useState<number | null>(10);
  const [errs, setErrs] = useState<{ reason?: string; note?: string; extra?: string; form?: string }>({});
  const decide = useReentryDecision(testId);
  const one = rows.length === 1 ? rows[0]! : null;
  const name = one?.student.name ?? "";
  const mins = extraOn ? (extra ?? 0) : 0;

  const submit = async () => {
    const e: typeof errs = {};
    if (!reason) e.reason = "Pick a reason";
    if (reason === "other" && note.trim().length < 3) e.note = "Say what happened";
    if (extraOn && (extra == null || extra < 1 || extra > 60)) e.extra = "1 to 60 minutes";
    setErrs(e);
    if (Object.keys(e).length) return;
    try {
      const r = await decide.mutateAsync({ action: "allow", body: { studentIds: rows.map((x) => x.student.id), reason: reason!, ...(note.trim() ? { note: note.trim() } : {}), ...(mins ? { extraMinutes: mins } : {}) } });
      const failed = r.results.filter((x) => !x.ok);
      if (one) notify.success(`${name} can go back in. Their screen moves on within 10 seconds.`);
      else notify.success(`${plural(r.allowed, "student")} can go back in${mins ? `, each with ${mins} min extra` : ""}.`, failed.length ? { description: `${plural(failed.length, "student")} weren't waiting any more.` } : undefined);
      onClose();
    } catch (err) {
      const f = fieldsOf(err);
      if (Object.keys(f).length) setErrs({ reason: f.reason?.message, note: f.note?.message, extra: f.extraMinutes?.message });
      else setErrs({ form: failText(apiError(err).code, name || "This student", apiError(err).message) });
    }
  };

  const left = one?.secondsLeft ?? null;
  const q = one?.reentry;
  return (
    <KitDialog
      open
      onOpenChange={(o) => !o && onClose()}
      width={one ? "w500" : "wide"}
      closeButton
      title={one ? `Let ${name} back in?` : `Let ${plural(rows.length, "student")} back in?`}
      description={
        one && q
          ? `${reentryWhyText(q)}.${policy?.policy === "crash" ? ` This test allows ${policy.minutes} min on its own.` : policy?.policy === "once" && q.why !== "onceOnly" ? " This test is once only." : ""}`
          : "One reason for all of them. Use this for a single known event, like a power cut at a centre."
      }
      busy={decide.isPending}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={decide.isPending}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={decide.isPending}>
            {decide.isPending ? "Saving…" : one ? `Let ${one.student.name.split(" ")[0]} back in` : `Let ${rows.length} back in`}
          </button>
        </>
      }
    >
      {one && q ? (
        <div className="mo-facts">
          <span className="muted">Code on their screen</span>
          <span>
            <b className="mono">{q.code}</b> <span className="xs muted">· ask them to read it out</span>
          </span>
          <span className="muted">Away</span>
          <span className="num">
            {q.facts?.leftAt ? `${istTime(q.facts.leftAt)} to now` : "Since"} · {waitingLabel(q.since, now).toLowerCase()}
          </span>
          <span className="muted">Answered</span>
          <span className="num">
            {one.answered} of {total}
            {q.facts?.lastSaveAt ? ` · last saved ${istTime(q.facts.lastSaveAt)}` : ""}
          </span>
          <span className="muted">Time left</span>
          <span className="num">{clock(left)} · the clock kept running</span>
          <span className="muted">Fullscreen exits</span>
          <span className="num">{exitsAllowed != null ? `${one.fullscreenExits} of ${exitsAllowed} used` : one.fullscreenExits}</span>
        </div>
      ) : (
        <ul className="col" style={{ gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
          {rows.map((r) => (
            <li key={r.student.id} className="row sm" style={{ gap: 10 }}>
              <b className="mono">{r.reentry?.code ?? "—"}</b>
              <span>
                {r.student.name}
                {r.student.batch ? ` · ${r.student.batch.name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Field label="Reason" htmlFor="re-a-r" group error={errs.reason ?? null}>
        <Chips id="re-a-r" value={reason} onChange={(v) => (setReason(v), setErrs({ ...errs, reason: undefined }))} options={ALLOW_REASON_LABEL as Record<ReentryAllowReason, string>} invalid={!!errs.reason} />
      </Field>
      <Field label="Note" optional={reason !== "other"} htmlFor="re-a-n" error={errs.note ?? null}>
        <TextInput id="re-a-n" value={note} maxLength={300} invalid={!!errs.note} placeholder={reason === "other" ? "What happened" : "e.g. Laptop restarted for an update"} onChange={(e) => (setNote(e.target.value), setErrs({ ...errs, note: undefined }))} />
      </Field>
      <div className="col" style={{ gap: 8 }}>
        <Checkbox checked={extraOn} onChange={setExtraOn}>
          {one ? "Also give extra time" : "Give each extra time"}
        </Checkbox>
        {extraOn && (
          <div className="row wrap" style={{ gap: 8, paddingLeft: 28 }}>
            <NumberStepper id="re-a-x" aria-label="Extra minutes" value={extra} min={1} max={60} width={112} invalid={!!errs.extra} onChange={setExtra} />
            <span className="sm muted">min{one && left != null && extra ? ` · ends at ${istTime(new Date(now + (left + extra * 60) * 1000).toISOString())} instead of ${istTime(new Date(now + left * 1000).toISOString())}` : ""}</span>
          </div>
        )}
        {errs.extra && <FieldError>{errs.extra}</FieldError>}
      </div>
      <span className="xs muted">
        {one ? "The yes works once, for the next 15 minutes. " : "Codes aren't checked one by one here. Each student gets their own audit entry with this reason. "}
        Saved in the audit log with your name, the reason and the time.
      </span>
      {errs.form && <FieldError>{errs.form}</FieldError>}
    </KitDialog>
  );
}

/** Deny: the saved answers are submitted at once, marked "Re-entry denied". */
export function DenyDialog({ testId, rows, onClose }: { testId: string; rows: MonitorRow[]; onClose: () => void }) {
  const [reason, setReason] = useState<ReentryDenyReason | null>(null);
  const [note, setNote] = useState("");
  const [errs, setErrs] = useState<{ reason?: string; note?: string; form?: string }>({});
  const decide = useReentryDecision(testId);
  const one = rows.length === 1 ? rows[0]! : null;
  const name = one?.student.name ?? "";
  const q = one?.reentry;

  const submit = async () => {
    const e: typeof errs = {};
    if (!reason) e.reason = "Pick a reason";
    if (note.trim().length < 3) e.note = "Write what happened. It goes in the audit log and the report.";
    setErrs(e);
    if (Object.keys(e).length) {
      document.getElementById(e.reason ? "re-d-r" : "re-d-n")?.focus();
      return;
    }
    try {
      const r = await decide.mutateAsync({ action: "deny", body: { studentIds: rows.map((x) => x.student.id), reason: reason!, note: note.trim() } });
      const ok = r.results.filter((x) => x.ok);
      if (one) {
        const n = ok[0] && "answered" in ok[0] && typeof ok[0].answered === "number" ? ok[0].answered : one.answered;
        notify.success(`${name}'s ${plural(n, "answer")} were submitted. Saved in the audit log.`);
      } else notify.success(`${plural(ok.length, "student")}' saved answers were submitted. Saved in the audit log.`);
      onClose();
    } catch (err) {
      const f = fieldsOf(err);
      if (Object.keys(f).length) setErrs({ reason: f.reason?.message, note: f.note?.message });
      else setErrs({ form: failText(apiError(err).code, name || "This student", apiError(err).message) });
    }
  };

  return (
    <KitDialog
      open
      onOpenChange={(o) => !o && onClose()}
      width="w500"
      alert
      title={one ? `Don't let ${name} back in?` : `Don't let ${plural(rows.length, "student")} back in?`}
      description={one && q ? `${reentryWhyText(q)}.` : undefined}
      busy={decide.isPending}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={decide.isPending}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={decide.isPending}>
            {decide.isPending ? "Submitting…" : one ? "Deny and submit their answers" : `Deny and submit ${rows.length}`}
          </button>
        </>
      }
    >
      <Field label="Reason" htmlFor="re-d-r" group error={errs.reason ?? null}>
        <Chips id="re-d-r" value={reason} onChange={(v) => (setReason(v), setErrs({ ...errs, reason: undefined }))} options={DENY_REASON_LABEL as Record<ReentryDenyReason, string>} invalid={!!errs.reason} />
      </Field>
      <Field label="What happened" htmlFor="re-d-n" error={errs.note ?? null} hint={errs.note ? undefined : "Write what happened. It goes in the audit log and their report."}>
        <TextInput id="re-d-n" value={note} maxLength={500} invalid={!!errs.note} placeholder="e.g. Left the centre at 10:12 without telling the invigilator" onChange={(e) => (setNote(e.target.value), setErrs({ ...errs, note: undefined }))} />
      </Field>
      <div className="k-srv" role="note">
        <span className="sm">
          {one ? (
            <>
              Their {plural(one.answered, "saved answer")} {one.answered === 1 ? "is" : "are"} <b>submitted now</b>, marked &quot;Re-entry denied&quot;. They can&apos;t open the test again. The score counts unless
              you change it later.
            </>
          ) : (
            <>
              Their saved answers are <b>submitted now</b>, marked &quot;Re-entry denied&quot;. They can&apos;t open the test again.
            </>
          )}
        </span>
      </div>
      {errs.form && <FieldError>{errs.form}</FieldError>}
    </KitDialog>
  );
}
