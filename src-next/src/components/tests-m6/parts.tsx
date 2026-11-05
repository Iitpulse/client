"use client";

/*
  Small pieces the M6 Tests list and Calendar pages share that are not in the kit (src/components/kit).
*/
import { fixtureMode, useM6Source, type M6Area } from "@/lib/m6/client";

/**
 * Pill next to the title while an area answers from the fallback (lib/m6/client): "Older API" when the page shows the
 * real data through the legacy routes, "Sample data" in fixture mode "on".
 */
export function SampleDataPill({ areas }: { areas: M6Area[] }) {
  const src = useM6Source(...areas);
  if (src !== "sample") return null;
  if (fixtureMode() !== "on")
    return (
      <span className="badge b-amber" title="The M6 routes for this page are not on this server yet. It shows the real data through the older routes; a few actions wait for the update.">
        Older API
      </span>
    );
  return (
    <span className="badge b-amber" title="Sample data: nothing here is saved.">
      Sample data
    </span>
  );
}
