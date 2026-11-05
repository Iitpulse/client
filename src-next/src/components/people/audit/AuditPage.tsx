"use client";
/*
  Admin-AuditLogs board: list (grouped by IST day, newest first, "Load 50 more"), person-picker (names, never ids;
  students too), detail drawer (device, masked IP, about, before → after, technical details, everything about it),
  export (ready now ≤ 5,000 events, else emailed), no-match, empty, error, no-access.
  Filters live in the URL: q, actor (+ actorName), verb, about, range (preset or from/to), involving, event.
  Reader: GET /users/admin/audit/events (keyset cursor), …/events/:id, …/people?q=, POST …/export.
*/
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import {
  DateField,
  DateRangeChip,
  Drawer,
  Field,
  FilterBar,
  FilterChip,
  InlineNote,
  KitDialog,
  NoAccess,
  PageCard,
  PageError,
  SearchBox,
  StateBox,
  Doodle,
  addDays,
  apiError,
  fmtDate,
  fmtDateTime,
  fmtRange,
  initials,
  inr,
  istParts,
  isoDate,
  istToday,
  notify,
  presetRange,
  rangeInstants,
  rangeLabel,
  supportCode,
  useAfter,
  useUrlState,
  type ComboOption,
  type DateRange,
  type RangePreset,
} from "@/components/kit";
import { API_GATEWAY } from "@/lib/ai-admin";
import { auditApi, useCan, useMe } from "@/lib/m6/people";
import type { AuditListItem, AuditListQuery, AuditVerb } from "@/lib/m6-contract";
import "./audit.css";

const VERBS: Record<AuditVerb, [string, string]> = {
  added: ["Added", "a-add"],
  changed: ["Changed", "a-chg"],
  deleted: ["Deleted", "a-del"],
  restored: ["Restored", "a-res"],
  imported: ["Imported", "a-add"],
  signedIn: ["Signed in", "a-sign"],
  signInFailed: ["Sign-in failed", "a-del"],
  other: ["Other", "a-sign"],
};
const VERB_OPTIONS: ComboOption<AuditVerb>[] = (["added", "changed", "deleted", "restored", "imported", "signedIn", "signInFailed"] as AuditVerb[]).map((v) => ({ value: v, label: VERBS[v][0] }));
const ABOUT: Array<[string, string]> = [
  ["student", "Students"],
  ["teacher", "Teachers"],
  ["staff", "Staff"],
  ["batch", "Batches"],
  ["centre", "Centres"],
  ["role", "Roles"],
  ["exam", "Exams"],
  ["template", "Templates"],
  ["test", "Tests"],
  ["pattern", "Patterns"],
  ["question", "Questions"],
  ["subject", "Subjects"],
  ["chapter", "Chapters"],
  ["topic", "Topics"],
  ["sign-in", "Sign-ins"],
];
const ABOUT_OPTIONS: ComboOption[] = ABOUT.map(([value, label]) => ({ value, label }));
const DEFAULTS = { q: "", actor: "", actorName: "", verb: "", about: "", range: "7d", from: "", to: "", involving: "", event: "" };

function rangeOf(s: typeof DEFAULTS): DateRange {
  if (s.range === "custom" && s.from && s.to) return { from: s.from, to: s.to, preset: "custom" };
  const p = (["today", "yesterday", "7d", "30d", "month"].includes(s.range) ? s.range : "7d") as Exclude<RangePreset, "custom">;
  return presetRange(p);
}
const dayKey = (iso: string) => {
  const p = istParts(iso);
  return isoDate(p.y, p.m, p.d);
};
function dayLabel(d: string) {
  const t = istToday();
  const full = fmtDate(d, true).replace(/ \d{4}$/, "");
  if (d === t) return `Today · ${full}`;
  if (d === addDays(t, -1)) return `Yesterday · ${full}`;
  return full;
}
const hhmm = (iso: string) => {
  const p = istParts(iso);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
};

export function AuditPage() {
  const { can, loading, roleName } = useCan();
  const [s, set] = useUrlState(DEFAULTS);
  const range = rangeOf(s);
  const allowed = can("READ_AUDIT", "READ_USER_ACTIVITY");
  const inst = rangeInstants(range);
  const query: AuditListQuery = {
    q: s.q || undefined,
    actorId: s.actor || undefined,
    verb: (s.verb || undefined) as AuditVerb | undefined,
    about: s.about || undefined,
    involving: s.involving || undefined,
    from: inst.from,
    to: inst.to,
  };
  const list = useInfiniteQuery({
    queryKey: ["m6", "people", "audit", query],
    enabled: allowed,
    initialPageParam: "",
    queryFn: ({ pageParam }) => auditApi.list({ ...query, cursor: pageParam || undefined, limit: 50 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const [people, setPeople] = useState<ComboOption[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const searchPeople = async (q: string) => {
    setPeopleLoading(true);
    try {
      const r = await auditApi.people(q);
      setPeople(r.items.map((p) => ({ value: p.id, label: p.name, end: p.role ?? (p.userType === "student" ? "Student" : undefined), icon: <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(p.name)}</span> })));
    } catch {
      setPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  };
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total;
  const filterCount = (s.actor ? 1 : 0) + (s.verb ? 1 : 0) + (s.about ? 1 : 0) + (s.range !== "7d" ? 1 : 0) + (s.involving ? 1 : 0);
  const filtered = filterCount > 0 || !!s.q;
  const clearAll = () => set({ q: "", actor: "", actorName: "", verb: "", about: "", range: "7d", from: "", to: "", involving: "" });
  const showSkel = useAfter(list.isLoading, 300);

  const body = () => {
    if (loading) return <PageCard><div style={{ minHeight: 240 }} /></PageCard>;
    if (!allowed) return <NoAccess what="audit logs" role={roleName} />;
    return (
      <div className="col" style={{ gap: 14 }}>
        <FilterBar
          activeCount={filterCount}
          onClearAll={clearAll}
          showLabel={total != null ? `Show ${inr(total)} events` : undefined}
          search={<SearchBox value={s.q} onChange={(q) => set({ q })} placeholder="Search names, tests, batches" label="Search audit logs" />}
        >
          <FilterChip
            label="Person"
            noun="person"
            anyLabel="Anyone"
            options={people}
            value={s.actor || null}
            valueLabel={s.actorName || undefined}
            onSearch={searchPeople}
            loading={peopleLoading}
            onChange={(v) => set({ actor: v ?? "", actorName: v ? people.find((p) => p.value === v)?.label ?? "" : "" })}
          />
          <FilterChip label="Action" noun="action" anyLabel="Any action" options={VERB_OPTIONS} value={(s.verb || null) as AuditVerb | null} onChange={(v) => set({ verb: v ?? "" })} />
          <FilterChip label="About" noun="thing" anyLabel="Anything" options={ABOUT_OPTIONS} value={s.about || null} onChange={(v) => set({ about: v ?? "" })} />
          <DateRangeChip
            value={range}
            isDefault={s.range === "7d"}
            onReset={() => set({ range: "7d", from: "", to: "" })}
            onChange={(r) => set(r.preset === "custom" ? { range: "custom", from: r.from, to: r.to } : { range: r.preset, from: "", to: "" })}
          />
          {s.involving && (
            <span className="k-fc set">
              <span className="k">Involving:</span>
              <b>{s.actorName || "this person"}</b>
              <button type="button" className="k-x" aria-label="Clear involving filter" onClick={() => set({ involving: "" })}>
                ×
              </button>
            </span>
          )}
        </FilterBar>
        {list.isError ? (
          <PageError what="audit logs" body="Events are still being recorded. Try again in a moment." code={supportCode("AUD", list.error)} onRetry={() => list.refetch()} />
        ) : !list.isLoading && items.length === 0 ? (
          filtered ? (
            <PageCard>
              <StateBox
                title={noMatchTitle(s, range)}
                body="Try a longer date range, or clear a filter."
                action={
                  <>
                    {s.range !== "30d" && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ range: "30d", from: "", to: "" })}>
                        Last 30 days
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                      Clear all
                    </button>
                  </>
                }
              />
            </PageCard>
          ) : (
            <PageCard>
              <StateBox doodle={<Doodle />} title="Nothing recorded yet" body="Every sign-in and every change to students, batches, roles, tests and questions shows up here, with who did it and when." />
            </PageCard>
          )
        ) : (
          <section className="card rise" style={{ overflow: "clip" }}>
            <div className="au-dt" role="table" aria-label="Audit events" aria-busy={list.isLoading || undefined}>
              <div className="tr h" role="row">
                <span className="th" role="columnheader">Time</span>
                <span className="th" role="columnheader">Person</span>
                <span className="th" role="columnheader">Action</span>
                <span className="th" role="columnheader">What</span>
                <span className="th hide-t" role="columnheader">Details</span>
              </div>
              {list.isLoading
                ? showSkel &&
                  Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="tr" aria-hidden>
                      <span className="td"><span className="skel" style={{ display: "block", width: 40, height: 10 }} /></span>
                      <span className="td"><span className="skel" style={{ display: "block", width: 120, height: 10 }} /></span>
                      <span className="td"><span className="skel" style={{ display: "block", width: 70, height: 18, borderRadius: 6 }} /></span>
                      <span className="td"><span className="skel" style={{ display: "block", width: 180 + ((i * 29) % 60), height: 10 }} /></span>
                      <span className="td hide-t"><span className="skel" style={{ display: "block", width: 100, height: 10 }} /></span>
                    </div>
                  ))
                : items.map((e, i) => {
                    const d = dayKey(e.occurredAt);
                    const newDay = i === 0 || dayKey(items[i - 1]!.occurredAt) !== d;
                    return (
                      <div key={e.id} role="rowgroup">
                        {newDay && (
                          <div className="tr day" role="row">
                            <span role="cell">{dayLabel(d)}</span>
                          </div>
                        )}
                        <EventRow e={e} on={s.event === e.id} open={() => set({ event: e.id })} />
                      </div>
                    );
                  })}
            </div>
            {!list.isLoading && (
              <div className="row between pad wrap" style={{ borderTop: "1px solid var(--line-2)", gap: 8 }}>
                <span className="xs muted num">
                  Showing {inr(items.length)} of {total == null ? "10,000+" : inr(total)} events · newest first
                </span>
                {list.hasNextPage && (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
                    {list.isFetchingNextPage ? "Loading…" : "Load 50 more"}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    );
  };

  return (
    <>
      <Topbar
        title="Audit logs"
        actions={
          allowed ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExportOpen(true)}>
              Export CSV
            </button>
          ) : undefined
        }
      />
      <main className="col" style={{ padding: "20px 28px 40px", gap: 14 }}>
        {body()}
      </main>
      <EventDrawer
        id={allowed ? s.event || null : null}
        onClose={() => set({ event: "" })}
        onEverything={(label) => set({ event: "", q: label, actor: "", actorName: "", verb: "", about: "", range: "30d", from: "", to: "" })}
      />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} range={range} query={query} filters={s} total={total ?? null} />
    </>
  );
}

function noMatchTitle(s: typeof DEFAULTS, r: DateRange) {
  const who = s.actorName ? ` by ${s.actorName}` : "";
  const about = s.about ? ` about ${(ABOUT.find(([v]) => v === s.about)?.[1] ?? s.about).toLowerCase()}` : "";
  const verb = s.verb ? ` (${VERBS[s.verb as AuditVerb]?.[0].toLowerCase() ?? s.verb})` : "";
  const q = s.q ? ` matching "${s.q}"` : "";
  const when = r.preset === "custom" ? ` from ${fmtRange(r)}` : ` in the ${rangeLabel(r).toLowerCase()}`.replace("in the today", "today").replace("in the yesterday", "yesterday").replace("in the this month", "this month");
  return `Nothing${who}${about}${verb}${q}${when}`;
}

function EventRow({ e, on, open }: { e: AuditListItem; on: boolean; open: () => void }) {
  const [label, cls] = VERBS[e.verb] ?? VERBS.other;
  return (
    <div
      className={`tr click${on ? " sel" : ""}`}
      role="row"
      tabIndex={0}
      onClick={open}
      onKeyDown={(k) => {
        if (k.key === "Enter") open();
      }}
    >
      <span className="td mono xs muted" role="cell">
        {hhmm(e.occurredAt)}
      </span>
      <span className="td" role="cell">
        <span className="row" style={{ gap: 8 }}>
          <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
            {initials(e.actor.name)}
          </span>
          <span className="col" style={{ minWidth: 0 }}>
            <span className="k-ell" style={{ fontWeight: 600 }}>
              {e.actor.name}
            </span>
            <span className="xs muted">{e.actor.role ?? (e.actor.userType === "student" ? "Student" : "")}</span>
          </span>
        </span>
      </span>
      <span className="td" role="cell">
        <span className={`au-act ${cls}`}>
          <i aria-hidden />
          {label}
        </span>
      </span>
      <span className="td" role="cell">
        <span className="xs muted">{e.kind}</span> <span style={{ color: "var(--navy)", fontWeight: 500 }}>{e.what}</span>
      </span>
      <span className="td xs muted hide-t" role="cell">
        {e.details || "—"}
      </span>
    </div>
  );
}

function EventDrawer({ id, onClose, onEverything }: { id: string | null; onClose: () => void; onEverything: (label: string) => void }) {
  const q = useQuery({ queryKey: ["m6", "people", "audit-event", id], enabled: !!id, queryFn: () => auditApi.event(id!) });
  const e = q.data;
  const [label, cls] = e ? VERBS[e.verb] ?? VERBS.other : ["", ""];
  const title = e ? `${e.actor.name} ${label.toLowerCase()} ${e.kind.toLowerCase()} ${e.what}` : "Event";
  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      aria-label="Event details"
      title={
        e ? (
          <span className="col" style={{ gap: 4 }}>
            <span className={`au-act ${cls}`} style={{ alignSelf: "flex-start" }}>
              <i aria-hidden />
              {label}
            </span>
            <span style={{ whiteSpace: "normal" }}>{title}</span>
          </span>
        ) : (
          "Event"
        )
      }
    >
      {q.isLoading ? (
        <div className="col" style={{ gap: 10 }} aria-busy>
          {[70, 90, 60, 80].map((w, i) => (
            <span key={i} className="skel" style={{ height: 10, width: `${w}%` }} />
          ))}
        </div>
      ) : q.isError || !e ? (
        <StateBox compact tone="error" title="Couldn't load this event" code={supportCode("AUD", q.error)} action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => q.refetch()}>Try again</button>} />
      ) : (
        <>
          <dl className="k-kv" style={{ gridTemplateColumns: "110px minmax(0, 1fr)" }}>
            <dt>When</dt>
            <dd className="row" style={{ gap: 6 }}>
              {fmtDateTime(e.occurredAt)} <span className="k-ist">IST</span>
            </dd>
            <dt>Person</dt>
            <dd>
              {e.actor.name}
              {e.actor.role ? ` · ${e.actor.role}` : ""}
            </dd>
            <dt>Device</dt>
            <dd>{e.device ?? "—"}</dd>
            <dt>IP address</dt>
            <dd className="mono">{e.ipMasked ?? "—"}</dd>
            <dt>About</dt>
            <dd>{e.about ? [e.about.type, e.about.label, e.about.context].filter(Boolean).join(" · ") : "—"}</dd>
          </dl>
          {e.changes.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <span className="eyebrow">What changed · {e.changes.length === 1 ? "1 field" : `${e.changes.length} fields`}</span>
              <div className="au-diff" role="table" aria-label="Changes">
                <span className="h" role="columnheader">Field</span>
                <span className="h" role="columnheader">Before</span>
                <span className="h" role="columnheader">After</span>
                {e.changes.map((c, i) => {
                  const last = i === e.changes.length - 1 ? " last" : "";
                  return (
                    <span key={c.field} style={{ display: "contents" }} role="row">
                      <span role="cell" className={`muted${last}`}>{c.field}</span>
                      {c.redacted ? (
                        <span role="cell" className={`muted${last}`} style={{ gridColumn: "span 2" }}>
                          changed (personal details are not shown)
                        </span>
                      ) : (
                        <>
                          <span role="cell" className={`was${last}`}>{c.before ?? "—"}</span>
                          <span role="cell" className={`now${last}`}>{c.after ?? "—"}</span>
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <details className="au-tech">
            <summary>Technical details</summary>
            <pre>
              {[`event   ${e.technical.eventId}`, `request ${e.technical.requestId ?? "—"}`, `source  ${e.technical.source ?? "—"}`, `service ${e.technical.service}`, e.technical.metadata ? `\n${JSON.stringify(e.technical.metadata, null, 2)}` : ""].join("\n")}
            </pre>
          </details>
          {e.about && e.relatedCount > 1 && (
            <button type="button" className="k-linkbtn xs" style={{ alignSelf: "flex-start", textDecoration: "none" }} onClick={() => onEverything(e.about!.label)}>
              Everything about {e.about.label} ({inr(e.relatedCount)} events)
            </button>
          )}
        </>
      )}
    </Drawer>
  );
}

function ExportDialog({ open, onClose, range, query, filters, total }: { open: boolean; onClose: () => void; range: DateRange; query: AuditListQuery; filters: typeof DEFAULTS; total: number | null }) {
  const me = useMe();
  const [from, setFrom] = useState<string | null>(range.from);
  const [to, setTo] = useState<string | null>(range.to);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setFrom(range.from);
      setTo(range.to);
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const sameRange = from === range.from && to === range.to;
  const big = sameRange && total != null && total > 5000;
  const used = [filters.actorName && `Person: ${filters.actorName}`, filters.verb && `Action: ${VERBS[filters.verb as AuditVerb]?.[0]}`, filters.about && `About: ${ABOUT.find(([v]) => v === filters.about)?.[1]}`, filters.q && `Search: "${filters.q}"`].filter(Boolean);
  const rangeErr = from && to && to < from ? "To must be after From" : null;
  const go = async () => {
    if (!from || !to || rangeErr) return;
    setBusy(true);
    setErr(null);
    try {
      const inst = rangeInstants({ from, to });
      const { cursor: _c, limit: _l, ...rest } = query;
      void _c;
      void _l;
      const r = await auditApi.export({ ...rest, from: inst.from, to: inst.to });
      if (r.mode === "ready" && r.downloadUrl) {
        const url = r.downloadUrl.startsWith("/") ? `${API_GATEWAY}${r.downloadUrl}` : r.downloadUrl;
        window.location.assign(url);
        notify.success("CSV downloaded", { description: `${inr(r.events)} events` });
      } else notify.success("We'll email the CSV", { description: `To ${r.emailTo ?? "you"}, usually within 5 minutes` });
      onClose();
    } catch (e) {
      setErr(apiError(e).message ?? "Couldn't start the export. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog open={open} onOpenChange={(o) => !o && onClose()} title="Export audit logs" busy={busy}>
      <Field label="Dates" group error={rangeErr ?? err}>
        <div className="row" style={{ gap: 8 }}>
          <DateField aria-label="From" value={from} onChange={setFrom} maxDate={istToday()} />
          <span className="muted">–</span>
          <DateField aria-label="To" value={to} onChange={setTo} maxDate={istToday()} minDate={from ?? undefined} />
        </div>
      </Field>
      <span className="sm">
        {used.length ? (
          <>
            Uses your filters: <b>{used.join(" · ")}</b>.
          </>
        ) : (
          "Every event in these dates."
        )}{" "}
        {sameRange && total != null ? `${inr(total)} events.` : ""}
      </span>
      {big && (
        <InlineNote>
          That&rsquo;s a big file. We&rsquo;ll make it in the background and email a download link to {me.data?.user.email ?? "you"}, usually within 5 minutes. The link works for 24 hours.
        </InlineNote>
      )}
      <span className="xs muted">CSV opens in Excel. Names, not IDs; IP addresses stay masked.</span>
      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={go} disabled={busy || !from || !to || !!rangeErr}>
          {busy ? "Starting…" : big ? "Email me the CSV" : "Download CSV"}
        </button>
      </div>
    </KitDialog>
  );
}
