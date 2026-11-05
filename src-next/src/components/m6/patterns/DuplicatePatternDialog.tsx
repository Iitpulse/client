"use client";
/* Admin-Patterns view=duplicate: "Duplicate pattern" · Name of the copy · Make a copy (POST …/:id/duplicate). */
import { useState } from "react";
import { Field, KitDialog, TextInput } from "@/components/kit";
import { apiError, fieldErrors } from "@/lib/m6/client";
import { patternsApi, useInvalidatePatterns } from "@/lib/m6/patterns";

export function DuplicatePatternDialog({ pattern, onClose, onDone }: { pattern: { id: string; name: string }; onClose: () => void; onDone: (id: string) => void }) {
  const [name, setName] = useState(`${pattern.name} (copy)`);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidatePatterns();
  const go = async () => {
    if (!name.trim()) return setErr("Give the copy a name");
    setBusy(true);
    try {
      const r = await patternsApi.duplicate(pattern.id, name.trim());
      await invalidate();
      onDone(r.pattern.id);
    } catch (e) {
      const f = fieldErrors(e);
      const x = apiError(e);
      setErr(f.name ?? (x.code === "NAME_TAKEN" ? "Another pattern has this name" : x.message));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Duplicate pattern"
      busy={busy}
      initialFocus="dup-name"
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go}>
            {busy ? "Copying…" : "Make a copy"}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 10 }}>
        <Field label="Name of the copy" htmlFor="dup-name" error={err}>
          <TextInput
            id="dup-name"
            value={name}
            invalid={!!err}
            onChange={(e) => {
              setName(e.target.value);
              setErr(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
        </Field>
        <span className="xs muted">The copy isn&apos;t used by any test, so everything in it can be changed.</span>
      </div>
    </KitDialog>
  );
}
