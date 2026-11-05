"use client";
/* Small helpers the Patterns and Templates pages share (everything else comes from @/components/kit). */
import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { NoAccess as KitNoAccess, notify, NumberStepper, StateBox as KitStateBox } from "@/components/kit";
import { apiError, type M6Area, useM6Source } from "@/lib/m6/client";

export function isForbidden(e: unknown): boolean {
  const x = apiError(e);
  return x.status === 403 && (x.code === "FORBIDDEN" || x.code === "STAFF_ONLY");
}

/** Short support code for a failed read: "PAT-503". */
export function errorCode(prefix: string, e: unknown): string {
  return `${prefix}-${apiError(e).status || "OFFLINE"}`;
}

/** "Sample data" pill while the area answers from fixtures (routes not on this backend yet). */
export function SamplePill({ areas }: { areas: M6Area[] }) {
  const src = useM6Source(...areas);
  if (src !== "sample") return null;
  return (
    <span className="m6-pill" title="This backend doesn't have these routes yet. The page shows sample data; changes are not saved.">
      <FlaskConical className="size-3" aria-hidden />
      Sample data
    </span>
  );
}

/* ───────── compatibility for other M6 pages that imported the first version of this file (use the kit directly) ───────── */

/** @deprecated use StateBox from @/components/kit */
export function StateBox({ kind, title, text, action, code }: { kind: "empty" | "error" | "lock"; icon?: ReactNode; title: string; text: ReactNode; action?: ReactNode; code?: string }) {
  return (
    <section className="card">
      <KitStateBox tone={kind === "error" ? "error" : undefined} title={title} body={text} action={action} code={code} />
    </section>
  );
}
/** @deprecated use NoAccess from @/components/kit */
export function NoAccess({ what }: { what: string }) {
  return <KitNoAccess what={what} />;
}
/** @deprecated use notify.undo from @/components/kit */
export function undoToast(title: string, onUndo: () => Promise<unknown>) {
  notify.undo(title, () =>
    onUndo().catch((e) => notify.error("Couldn't undo", { description: apiError(e).message }))
  );
}
/** @deprecated use NumberStepper from @/components/kit */
export function Stepper({ id, value, onChange, min = 0, max, invalid, label }: { id?: string; value: number; onChange: (n: number) => void; min?: number; max?: number; invalid?: boolean; disabled?: boolean; label: string }) {
  return <NumberStepper id={id} value={value} onChange={(v) => onChange(v ?? min)} min={min} max={max} invalid={invalid} aria-label={label} width={104} />;
}
