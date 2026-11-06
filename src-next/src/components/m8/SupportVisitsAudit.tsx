"use client";
/*
  Admin-AuditLogs "Support visits" filter (Platform-Impersonation "tenant-audit-support-visits"): one row per IIT-PULSE
  support visit: When · Who ("<staff> · IIT-PULSE support") · Reason · Length (minutes, read only). The list endpoint
  (GET /users/admin/audit/events?supportVisits=1) gives the events; their metadata (visitId, staffName, reason, ticket,
  minutes, pages) comes from each event's detail. Opening a row shows the visit's events in the usual drawer.
*/
import { useQueries } from "@tanstack/react-query";
import { auditApi } from "@/lib/m6/people";
import type { AuditListItem } from "@/lib/m6-contract";
import { fmtDateTime } from "@/components/kit";

type Meta = { visitId?: string; staffName?: string; reason?: string; ticket?: string | null; minutes?: number; pages?: string[] | number; endReason?: string };

export function SupportVisitsAudit({ items, onOpen }: { items: AuditListItem[]; onOpen: (id: string) => void }) {
  const details = useQueries({
    queries: items.map((e) => ({ queryKey: ["m6", "people", "audit-event", e.id], queryFn: () => auditApi.event(e.id), staleTime: 5 * 60_000 })),
  });
  const meta = new Map<string, Meta>();
  items.forEach((e, i) => meta.set(e.id, (details[i]?.data?.technical.metadata ?? {}) as Meta));
  // one row per visit: the start event, with the end event's length when it ended
  const visits = new Map<string, { start?: AuditListItem; end?: AuditListItem; m: Meta }>();
  for (const e of items) {
    const m = meta.get(e.id) ?? {};
    const key = m.visitId ?? e.id;
    const v = visits.get(key) ?? { m: {} };
    if (e.action === "support_visit.started" || (!v.start && e.action !== "support_visit.ended")) v.start = v.start ?? e;
    if (e.action === "support_visit.ended") v.end = e;
    v.m = { ...m, ...v.m, ...(e.action === "support_visit.ended" ? m : {}) };
    visits.set(key, v);
  }
  const rows = [...visits.values()].filter((v) => v.start || v.end);
  const loading = details.some((d) => d.isLoading);
  return (
    <div className="sv-atbl" role="table" aria-label="Support visits" aria-busy={loading || undefined}>
      <span className="h" role="columnheader">When</span>
      <span className="h" role="columnheader">Who</span>
      <span className="h" role="columnheader">Reason</span>
      <span className="h" role="columnheader">Length</span>
      {rows.map((v) => {
        const first = (v.start ?? v.end)!;
        const pages = Array.isArray(v.m.pages) ? v.m.pages.length : typeof v.m.pages === "number" ? v.m.pages : null;
        return (
          <span key={first.id} role="row" className="sv-row" tabIndex={0} onClick={() => onOpen(first.id)} onKeyDown={(k) => k.key === "Enter" && onOpen(first.id)} style={{ display: "contents" }}>
            <span role="cell" className="mono xs">{fmtDateTime(first.occurredAt, "short")}</span>
            <span role="cell">{v.m.staffName ?? first.actor.name} · IIT-PULSE support</span>
            <span role="cell">
              {v.m.ticket ? <span className="mono xs muted">{v.m.ticket} · </span> : null}
              {v.m.reason ?? (loading ? "…" : "—")}
            </span>
            <span role="cell">
              {v.end ? `${v.m.minutes ?? 0} min · read only` : "in progress · read only"}
              {pages != null ? <span className="xs muted"> · {pages} page{pages === 1 ? "" : "s"}</span> : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}
