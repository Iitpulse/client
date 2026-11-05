"use client";
/* Admin-Setup `assign-teachers`: the dialog behind "3 teachers have no batch". One batch multi-select per teacher. */
import { useEffect, useMemo, useState } from "react";
import { KitDialog, MultiSelect, ServerErrorBanner, apiError, initials, notify } from "@/components/kit";
import { batchesApi, useAllBatches, useInvalidatePeople } from "@/lib/m6/people";
import type { PersonRef, Ref } from "@/lib/m6-contract";

export function AssignTeachers({
  open,
  onClose,
  teachers,
  preselect,
}: {
  open: boolean;
  onClose: () => void;
  teachers: Array<PersonRef & { subjects: Ref[] }>;
  /** a batch to start each teacher with (from a batch's detail) */
  preselect?: string | null;
}) {
  const batches = useAllBatches(open);
  const invalidate = useInvalidatePeople();
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setPicks(Object.fromEntries(teachers.map((t) => [t.id, preselect ? [preselect] : []])));
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const opts = useMemo(() => (batches.data?.items ?? []).filter((b) => !b.archivedAt).map((b) => ({ value: b.id, label: b.name, end: b.centre?.name })), [batches.data]);
  const ready = teachers.filter((t) => (picks[t.id] ?? []).length > 0);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await batchesApi.assignTeachers(ready.map((t) => ({ teacherId: t.id, batchIds: picks[t.id]! })));
      invalidate();
      notify.success(ready.length === 1 ? `${ready[0]!.name} assigned` : `${ready.length} teachers assigned`);
      onClose();
    } catch (e) {
      setErr(apiError(e).message ?? "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width="wide"
      closeButton
      busy={busy}
      title="Assign teachers to batches"
      description="A teacher sees the students, tests and results of the batches picked here."
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !ready.length}>
            {busy ? "Assigning…" : ready.length === 1 ? "Assign 1 teacher" : `Assign ${ready.length} teachers`}
          </button>
        </>
      }
    >
      <div className="col" style={{ maxHeight: "52vh", overflowY: "auto" }}>
        {teachers.map((t) => (
          <div key={t.id} className="su-assign">
            <div className="row" style={{ gap: 10 }}>
              <span className="avatar">{initials(t.name)}</span>
              <span className="sm" style={{ fontWeight: 600 }}>
                {t.name}
              </span>
              <span className="xs muted">{t.subjects.map((s) => s.name).join(", ")}</span>
            </div>
            <MultiSelect
              aria-label={`Batches for ${t.name}`}
              options={opts}
              value={picks[t.id] ?? []}
              onChange={(v) => setPicks((p) => ({ ...p, [t.id]: v }))}
              placeholder={(picks[t.id] ?? []).length ? "Add batches" : "Pick batches"}
              noun="batch"
              loading={batches.isLoading}
            />
          </div>
        ))}
      </div>
      {err && <ServerErrorBanner title="Couldn't assign" detail={err} onRetry={save} />}
    </KitDialog>
  );
}
