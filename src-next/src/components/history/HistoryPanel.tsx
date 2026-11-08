"use client";

/*
  History panel (batch 8, board Admin-HistoryPanel): a side drawer on the question editor and the test builder with the
  item's changes from the audit log, newest first, grouped by day; filter tabs (question: All / Content / Answer key /
  Used in tests; test: All / Questions / Settings and dates / Publishing); "Name verb", time · source, before → after
  lines from the event's diff; AI badge; "Show older"; a link to the full audit log. States: loading, error (support
  code + Try again), nothing yet, nothing in this filter. Visible to every role that can open the item (route rule).
*/
import * as React from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { Drawer, istParts, MONTHS, supportCode } from "@/components/kit";
import { useItemHistory, type HistoryItem, type HistoryType } from "@/lib/m6/history";

const FILTERS: Record<HistoryType, Array<[string, string]>> = {
  question: [["all", "All"], ["content", "Content"], ["key", "Answer key"], ["use", "Used in tests"]],
  test: [["all", "All"], ["questions", "Questions"], ["settings", "Settings and dates"], ["publish", "Publishing"]],
};

/** "changed the answer key", "published the test" … (else the event's own summary) */
const VERB: Record<string, string> = {
  "question.created": "created the question",
  "question.updated": "edited the question",
  "question.deleted": "deleted the question",
  "question.restored": "restored the question",
  "question.import_confirmed": "imported it from a Word file",
  "question.ai_draft_accepted": "accepted an AI draft",
  "question.key_corrected": "changed the answer key",
  "test.key_corrected": "changed the answer key",
  "test.questions_added": "added it to a test",
  "test.created": "created the test",
  "test.updated": "changed the settings",
  "test.published": "published the test",
  "test.unpublished": "moved it back to drafts",
  "test.rescheduled": "moved it on the calendar",
  "test.extra_time_given": "gave extra time",
  "test.paper_changed": "changed the questions",
  "test.duplicated": "duplicated the test",
  "test.deleted": "deleted the test",
  "test.restored": "restored the test",
  "test.result_published": "published the results",
  "test.result_reminder_sent": "reminded a student to check the result",
};

const day = (iso: string) => {
  const p = istParts(iso);
  return `${p.d} ${MONTHS[p.m]}`;
};
const time = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).toUpperCase();
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v.length > 80 ? `${v.slice(0, 79)}…` : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(show).join(", ");
  const o = v as Record<string, unknown>;
  if (typeof o.name === "string") return o.name;
  if (o.range && typeof o.range === "object") {
    const r = o.range as { from: number; to: number };
    return r.from === r.to ? String(r.from) : `${r.from}–${r.to}`;
  }
  if (Array.isArray(o.optionIds)) return `${o.optionIds.length} option${o.optionIds.length === 1 ? "" : "s"}`;
  if (o.dropped) return "dropped";
  return JSON.stringify(v).slice(0, 80);
}
const LABEL = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

function Entry({ it }: { it: HistoryItem }) {
  const name = it.actor.name ?? (it.actor.type === "system" ? "IIT-PULSE" : it.actor.role ? `Someone (${it.actor.role})` : "Someone");
  const verb = VERB[it.action] ?? it.summary;
  const src = typeof it.metadata.source === "string" ? it.metadata.source : null;
  const diffs = Object.entries(it.diff ?? {})
    .filter(([, d]) => d && typeof d === "object" && ("from" in (d as object) || "to" in (d as object)))
    .slice(0, 4) as Array<[string, { from?: unknown; to?: unknown }]>;
  return (
    <li className="col gap-1 border-b border-line-2 py-2.5" data-testid="history-entry" data-action={it.action}>
      <span className="sm">
        <b>{name}</b> {verb}
        {it.ai && <span className="badge b-sky ml-1.5">AI</span>}
        {it.action.endsWith("key_corrected") && <span className="badge b-navy ml-1.5">Key fix</span>}
      </span>
      <span className="xs muted">
        {day(it.at)}, {time(it.at)}
        {src ? ` · from ${src.replace(/^admin console · /, "")}` : ""}
      </span>
      {diffs.map(([k, d]) => (
        <span key={k} className="xs row wrap gap-1.5">
          <span className="muted">{LABEL(k)}</span>
          <span className="mono">{show(d.from)}</span>
          <span aria-hidden>→</span>
          <span className="sr-only">changed to</span>
          <span className="mono font-semibold">{show(d.to)}</span>
        </span>
      ))}
      {typeof it.metadata.reason === "string" && <span className="xs">Reason: {it.metadata.reason}</span>}
      {it.action === "test.key_corrected" && typeof it.metadata.rescored === "number" && (
        <span className="xs muted">
          Re-scored {String(it.metadata.rescored)}
          {typeof it.metadata.scoresChanged === "number" ? ` · ${it.metadata.scoresChanged} scores, ${it.metadata.ranksChanged ?? 0} ranks changed` : ""}
        </span>
      )}
    </li>
  );
}

export function HistoryButton({ type, id, label }: { type: HistoryType; id: string | null | undefined; label: string }) {
  const [open, setOpen] = React.useState(false);
  if (!id) return null;
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} data-testid="history-open">
        <History className="size-3.5" aria-hidden />
        History
      </button>
      <HistoryPanel type={type} id={id} label={label} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function HistoryPanel({ type, id, label, open, onClose }: { type: HistoryType; id: string; label: string; open: boolean; onClose: () => void }) {
  const [filter, setFilter] = React.useState("all");
  const q = useItemHistory(type, id, filter, open);
  const pages = q.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const counts = pages[0]?.counts ?? {};
  const groups = React.useMemo(() => {
    const m = new Map<string, HistoryItem[]>();
    for (const it of items) (m.get(dayKey(it.at)) ?? m.set(dayKey(it.at), []).get(dayKey(it.at))!).push(it);
    return [...m.values()];
  }, [items]);
  const oldest = items.at(-1)?.at;
  const auditHref = `/audit-logs?involving=${encodeURIComponent(id)}&range=all`;
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="History"
      subtitle={<span className="xs muted">{counts.all ? `${label} · ${counts.all} change${counts.all === 1 ? "" : "s"}${oldest ? ` since ${day(oldest)}` : ""}` : label}</span>}
      aria-label={`History of ${label}`}
      footer={<span className="xs muted">From the audit log. Names, not IDs; IP addresses stay in the audit log.</span>}
    >
      <div className="col gap-3" data-testid="history-panel">
        <div className="seg" role="radiogroup" aria-label="Show">
          {FILTERS[type].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={filter === k} className={`tab ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
              {l}
              {counts[k] !== undefined && k !== "all" ? <span className="muted"> {counts[k]}</span> : null}
            </button>
          ))}
        </div>
        {q.isLoading ? (
          <div className="col gap-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="skel block h-12 w-full" />
            ))}
          </div>
        ) : q.isError ? (
          <div className="col gap-2" role="alert">
            <span className="sm font-semibold">Couldn&rsquo;t load the history</span>
            <span className="sm text-ink-2">
              Your changes here are unaffected. Try again, or share this code with support: <span className="mono">{supportCode("E", q.error)}</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => q.refetch()}>
              Try again
            </button>
          </div>
        ) : !items.length ? (
          <span className="sm text-ink-2" data-testid="history-empty">
            {filter === "all" ? "No changes yet. Edits, key changes and publishing show here." : filter === "key" ? "No answer-key changes." : "Nothing of this kind yet."}
          </span>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g[0]!.id} className="col">
                <span className="xs font-semibold muted">{dayKey(g[0]!.at) === dayKey(new Date().toISOString()) ? "Today" : day(g[0]!.at)}</span>
                <ul className="col">
                  {g.map((it) => (
                    <Entry key={it.id} it={it} />
                  ))}
                </ul>
              </section>
            ))}
            {q.hasNextPage && (
              <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage ? "Loading…" : "Show older"}
              </button>
            )}
          </>
        )}
        <Link href={auditHref} className="sm">
          See all for this {type} in Audit logs
        </Link>
      </div>
    </Drawer>
  );
}
