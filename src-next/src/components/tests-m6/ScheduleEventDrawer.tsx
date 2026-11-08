"use client";

/*
  A class or session on the tests calendar (batch 8, board Admin-AddSchedule "Click one to edit, move or cancel it;
  cancelling tells the students who were told"). Edit the title, move it (time and length) or cancel it.
  PATCH / DELETE /tests/admin/schedule-events/:id (lib/m6/batch8.ts).
*/
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog, DateTimeField, Drawer, NumberStepper, notify } from "@/components/kit";
import { apiError } from "@/lib/m6/client";
import { istDateTime, istTime } from "@/lib/m6/shared";
import { cancelEvent, patchEvent, type ScheduleEvent } from "@/lib/m6/batch8";

export function ScheduleEventDrawer({ event, onClose, batchName, canEdit }: { event: ScheduleEvent | null; onClose: () => void; batchName: (id: string) => string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [at, setAt] = React.useState<string | null>(null);
  const [minutes, setMinutes] = React.useState<number | null>(60);
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setAt(event.startsAt);
      setMinutes(event.minutes);
    }
  }, [event]);
  if (!event) return null;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["m6", "calendar"] }), qc.invalidateQueries({ queryKey: ["m6", "schedule-events"] })]);
  const changed = title.trim() !== event.title || at !== event.startsAt || minutes !== event.minutes;
  const save = async () => {
    setBusy(true);
    try {
      const r = await patchEvent(event.id, { ...(title.trim() !== event.title ? { title: title.trim() } : {}), ...(at && at !== event.startsAt ? { startsAt: at } : {}), ...(minutes && minutes !== event.minutes ? { minutes } : {}) });
      notify.success(r.told ? `Moved. ${r.told} students were told.` : "Saved", { description: r.clashes.length ? `Clashes with ${r.clashes.map((c) => c.name).join(", ")}.` : undefined });
      await refresh();
      onClose();
    } catch (e) {
      notify.error("Not saved", { description: apiError(e).message ?? "Try again in a moment." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Drawer
        open={!!event}
        onOpenChange={(o) => !o && onClose()}
        busy={busy}
        title={event.kindLabel}
        subtitle={<span className="xs muted">{event.batchIds.map(batchName).join(", ")}{event.students !== null ? ` · ${event.students} students` : ""}</span>}
        footer={
          canEdit && !event.cancelledAt ? (
            <div className="row between w-full gap-2">
              <button type="button" className="btn btn-ghost danger-hover" onClick={() => setAsking(true)} disabled={busy} data-testid="event-cancel">
                Cancel {event.kind === "doubt" ? "session" : "class"}
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !changed} data-testid="event-save">
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="col gap-4" data-testid="event-drawer">
          {event.cancelledAt && <span className="sm text-danger">Cancelled {istDateTime(event.cancelledAt)}</span>}
          <div className="col gap-1.5">
            <label className="sm font-semibold" htmlFor="ev-title">
              Title
            </label>
            <input id="ev-title" className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit || !!event.cancelledAt} />
          </div>
          <div className="row wrap items-start gap-4">
            <div className="col gap-1.5">
              <span className="sm font-semibold">When</span>
              <DateTimeField value={at} onChange={setAt} aria-label="When" readOnly={!canEdit || !!event.cancelledAt} />
            </div>
            <div className="col gap-1.5">
              <span className="sm font-semibold">Length</span>
              <NumberStepper value={minutes} onChange={setMinutes} min={5} max={600} step={15} aria-label="Length in minutes" />
            </div>
          </div>
          <span className="sm">
            {istDateTime(event.startsAt)} – {istTime(event.endsAt)}
            {event.place.label ? ` · ${event.place.label}` : event.place.kind === "online" ? " · Online" : ""}
            {event.teacher ? ` · ${event.teacher.name}` : ""}
          </span>
          <span className="xs muted">
            {event.notifiedAt ? `Students were told ${istDateTime(event.notifiedAt)}; moving it tells them again.` : "Students weren't told."} {event.remind ? "A reminder goes 1 hour before." : ""} Added by {event.by.name ?? "staff"}.
          </span>
        </div>
      </Drawer>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title={`Cancel ${event.title}?`}
        description={event.notifiedAt ? "The students who were told get a cancellation email." : "No student was told about it, so nobody is emailed."}
        confirmLabel={`Cancel ${event.kind === "doubt" ? "session" : "class"}`}
        onConfirm={async () => {
          const r = await cancelEvent(event.id);
          notify.success("Cancelled", { description: r.told ? `${r.told} students were told.` : undefined });
          await refresh();
          onClose();
        }}
      />
    </>
  );
}
