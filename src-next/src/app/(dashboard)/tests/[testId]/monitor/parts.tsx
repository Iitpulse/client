"use client";

/*
  Admin-Monitor overlays: the student detail drawer (state student-detail) and "Give extra time" (states extra-time,
  extra-time-no-reason). Reason is required (owner); 409 ATTEMPT_NOT_RUNNING when the student stopped writing.
*/

import { useState } from "react";
import { cx, Drawer, Field, FieldError, fmtPhone, initials, KitDialog, notify, Segmented, TextInput } from "@/components/kit";
import type { MonitorRow, MonitorStudentDetail } from "@/lib/m6-contract";
import { apiError } from "@/lib/m6/client";
import { useGiveExtraTime, useMonitorStudent } from "@/lib/m6/monitor";
import { istTime } from "@/lib/m6/shared";
import { clock, reasonText, seenLabel, STATUS_LABEL, timelineText } from "./format";

function TimelineLine({ ev }: { ev: MonitorStudentDetail["timeline"][number] }) {
  const d = ev.data as Record<string, unknown>;
  const t = istTime(ev.at);
  let text: string;
  let cls = "";
  switch (ev.kind) {
    case "linkOpened":
      text = "Opened their sign-in link";
      break;
    case "started":
      text = "Started on the instructions page";
      break;
    case "fullscreenExit": {
      const s = typeof d.durationSeconds === "number" ? d.durationSeconds : null;
      const dur = s == null ? "" : s < 60 ? ` for ${s} s` : ` for ${Math.round(s / 60)} min`;
      text = `Left fullscreen${dur} · ${d.action === "submitted" ? "submitted" : "warned"}`;
      cls = "w";
      break;
    }
    case "answerSaved":
      text = `Last answer saved${d.question ? ` (${d.question})` : ""}`;
      break;
    case "noContact":
      text = "No contact since";
      break;
    case "submitted":
      text = "Submitted";
      cls = "s";
      break;
    case "autoSubmitted":
      text = d.reason === "exitLimit" ? "Auto-submitted at the fullscreen exit limit" : d.reason === "reentryDenied" ? "Saved answers submitted · re-entry denied" : "Auto-submitted · time ran out";
      cls = "s";
      break;
    default:
      ({ text, cls } = timelineText(String(ev.kind), d));
  }
  return (
    <span className={cx("ev", cls)}>
      {t} · {text}
    </span>
  );
}

export function StudentDrawer({
  testId,
  open,
  studentId,
  fallbackRow,
  total,
  exitsFlagAt,
  exitsLimit,
  now,
  onClose,
  onCopyLink,
  onExtraTime,
}: {
  testId: string;
  open: boolean;
  studentId: string | null;
  fallbackRow: MonitorRow | null;
  total: number;
  exitsFlagAt: number;
  exitsLimit: number | null;
  now: number;
  onClose: () => void;
  onCopyLink: (r: MonitorRow) => void;
  onExtraTime: (r: MonitorRow) => void;
}) {
  const q = useMonitorStudent(testId, open ? studentId : null);
  const d = q.data && q.data.row.student.id === studentId ? q.data : null;
  const row = d?.row ?? fallbackRow;
  const running = row?.status === "writing" || row?.status === "offline" || row?.status === "wantsBackIn";
  const left = row?.secondsLeft == null ? null : row.secondsLeft - Math.max(0, (now - q.dataUpdatedAt) / 1000);
  const allowed = d?.exitsAllowed ?? exitsLimit;
  const why = row ? reasonText(row, exitsLimit) : null;

  return (
    <Drawer
      open={open && !!row}
      onOpenChange={(o) => !o && onClose()}
      aria-label={row ? `${row.student.name} in this test` : "Student"}
      title={row?.student.name ?? ""}
      subtitle={row ? [row.student.batch?.name, row.student.phone && fmtPhone(row.student.phone)].filter(Boolean).join(" · ") : undefined}
      leading={row ? <span className="avatar size-9 shrink-0">{initials(row.student.name)}</span> : undefined}
      footer={
        row && (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCopyLink(row)}>
              Copy sign-in link
            </button>
            {running && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onExtraTime(row)}>
                Give extra time…
              </button>
            )}
          </>
        )
      }
    >
      {row && (
        <>
          <span className="mo-stat">
            <span className={cx("mo-dot", row.status)} />
            {STATUS_LABEL[row.status]}
            {row.status === "offline" && row.lastSeenAt ? ` · last seen ${seenLabel(row.lastSeenAt, now, true)}` : why ? ` · ${why}` : ""}
          </span>
          <div className="mo-facts">
            <span className="muted">Started</span>
            <span className="num">{row.startedAt ? istTime(row.startedAt) : "Not yet"}</span>
            {running && (
              <>
                <span className="muted">Time left</span>
                <span className="num">
                  {clock(left)}
                  {row.status === "offline" ? " (clock keeps running)" : ""}
                </span>
              </>
            )}
            {row.extraMinutes > 0 && (
              <>
                <span className="muted">Extra time</span>
                <span className="num">{row.extraMinutes} min</span>
              </>
            )}
            <span className="muted">Answered</span>
            <span className="num">
              {row.answered} of {total}
              {d && d.answeredBySection.length > 1 ? ` · ${d.answeredBySection.map((s) => `${s.section} ${s.answered}`).join(" · ")}` : ""}
            </span>
            {d && (
              <>
                <span className="muted">Marked for review</span>
                <span className="num">{d.markedForReview}</span>
              </>
            )}
            <span className="muted">Fullscreen exits</span>
            <span className={cx("num", row.fullscreenExits >= exitsFlagAt && "font-semibold text-warning")}>
              {allowed != null ? `${row.fullscreenExits} of ${allowed} allowed` : row.fullscreenExits}
            </span>
          </div>
          <div className="col gap-1.5">
            <span className="sm font-semibold">What happened</span>
            {q.isLoading && !d ? (
              <span className="col gap-2" aria-hidden>
                <span className="skel block h-2.5 w-56" />
                <span className="skel block h-2.5 w-48" />
                <span className="skel block h-2.5 w-52" />
              </span>
            ) : q.isError && !d ? (
              <span className="sm text-danger">Couldn&apos;t load what happened. {apiError(q.error).message}</span>
            ) : d && d.timeline.length ? (
              <div className="mo-tl">
                {d.timeline.map((ev, i) => (
                  <TimelineLine key={i} ev={ev} />
                ))}
              </div>
            ) : (
              <span className="sm muted">Nothing yet: they haven&apos;t opened their link.</span>
            )}
          </div>
          {running && <span className="xs muted">If they come back, they continue where they stopped. If time runs out, their saved answers are submitted.</span>}
        </>
      )}
    </Drawer>
  );
}

type Minutes = "5" | "10" | "15" | "30";

export function ExtraTimeDialog({
  testId,
  row,
  secondsLeft,
  closesAt,
  onClose,
}: {
  testId: string;
  row: MonitorRow;
  secondsLeft: number | null;
  closesAt: string | null;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState<Minutes>("10");
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const give = useGiveExtraTime(testId);
  const m = Number(minutes) as 5 | 10 | 15 | 30;
  const name = row.student.name;

  const submit = async () => {
    setFormErr(null);
    if (reason.trim().length < 3) {
      setReasonErr("Write why this student needs more time");
      document.getElementById("et-r")?.focus();
      return;
    }
    try {
      await give.mutateAsync({ studentId: row.student.id, body: { minutes: m, reason: reason.trim() } });
      notify.success(`Gave ${name} ${m} more minutes`);
      onClose();
    } catch (e) {
      const err = apiError(e);
      if (err.code === "VALIDATION_ERROR") {
        const f = (err.details as { fields?: Record<string, { message: string }> } | null)?.fields;
        setReasonErr(f?.reason?.message ?? "Write why this student needs more time");
      } else if (err.code === "ATTEMPT_NOT_RUNNING") setFormErr(`${name} isn't writing now, so there's no clock to extend.`);
      else if (err.code === "FORBIDDEN") setFormErr("Your role can't give extra time. An admin can.");
      else setFormErr(err.message || "Couldn't give extra time. Try again.");
    }
  };

  return (
    <KitDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Give ${name} extra time?`}
      description={`Only for this student, in this test.${closesAt ? ` The test still closes for everyone else at ${istTime(closesAt)}.` : ""}`}
      initialFocus="et-r"
      busy={give.isPending}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={give.isPending}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={give.isPending}>
            {give.isPending ? "Giving…" : `Give ${m} minutes`}
          </button>
        </>
      }
    >
      <Field label="Extra time" group hint={secondsLeft != null ? `Their clock goes from ${clock(secondsLeft)} to ${clock(secondsLeft + m * 60)}.` : undefined}>
        <Segmented<Minutes>
          ariaLabel="Extra time"
          value={minutes}
          onChange={setMinutes}
          options={[
            { value: "5", label: "5 min" },
            { value: "10", label: "10 min" },
            { value: "15", label: "15 min" },
            { value: "30", label: "30 min" },
          ]}
        />
      </Field>
      <Field label="Reason" htmlFor="et-r" error={reasonErr} hint="Needed. Saved in the audit log with your name.">
        <TextInput
          id="et-r"
          placeholder="e.g. Power cut at home"
          value={reason}
          maxLength={300}
          invalid={!!reasonErr}
          aria-describedby="et-r-e"
          onChange={(e) => {
            setReason(e.target.value);
            setReasonErr(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </Field>
      {formErr && <FieldError>{formErr}</FieldError>}
    </KitDialog>
  );
}
