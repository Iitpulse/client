"use client";
/* Small helpers the Patterns and Templates pages share (everything else comes from @/components/kit). */
import { FlaskConical } from "lucide-react";
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
