"use client";
/*
  Admin-Users detail drawer: Details (contact, study, parent, personal, access) and History (audit events involving
  the person, names never ids, field diffs). Actions: Edit, Reset password, Deactivate & anonymise… (students) /
  Deactivate… (staff), Erase everything….
*/
import Link from "next/link";
import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ResetTwoStepDialog, useIsOwner } from "@/components/m7b/invites";
import { Drawer, InlineError, apiError, fmtDate, fmtDateTime, fmtPhone, fmtRelative, initials, notify } from "@/components/kit";
import type { AuditDetail, UserDetail } from "@/lib/m6-contract";
import { auditApi, useCan, useUser, usersApi } from "@/lib/m6/people";
import type { AdminGuardianConsent } from "@/lib/m6-contract";
import { cap, isRemoved, isStaffType } from "./shared";

export function UserDetailDrawer({
  id,
  tab,
  onTab,
  onClose,
  onEdit,
  onDelete,
  onErase,
}: {
  id: string | null;
  tab: "details" | "history";
  onTab: (t: "details" | "history") => void;
  onClose: () => void;
  onEdit: (u: UserDetail) => void;
  onDelete: (u: UserDetail) => void;
  onErase: (u: UserDetail) => void;
}) {
  const q = useUser(id);
  const u = q.data;
  const { can } = useCan();
  const removed = u ? isRemoved(u as UserDetail & { anonymisedAt?: string | null }) : false;
  const staff = u ? u.type !== "student" : false;
  const isOwner = useIsOwner();
  const [mfaReset, setMfaReset] = useState(false);
  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      aria-label={u?.type === "student" ? "Student details" : "Details"}
      leading={
        <span className="avatar" style={{ width: 44, height: 44, fontSize: 15, ...(removed ? { background: "var(--line-2)", color: "var(--muted)" } : {}) }}>
          {u ? (removed ? "—" : initials(u.name)) : ""}
        </span>
      }
      title={u ? u.name : q.isError ? "Couldn't load this person" : "Loading…"}
      subtitle={u ? `${u.email} · ${u.status === "active" ? "Active" : "Deactivated"}` : undefined}
      belowHeader={
        u && (
          <>
            <div className="row wrap" style={{ gap: 6, padding: "10px 16px", borderBottom: "1px solid var(--line-2)" }}>
              {can("UPDATE_USER") && !removed && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onEdit(u)}>
                  Edit
                </button>
              )}
              {can("UPDATE_USER") && !removed && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      await usersApi.sendReset(u.email);
                      notify.success("Reset link sent", { description: `To ${u.email}` });
                    } catch (e) {
                      notify.error("Couldn't send the reset link", { description: apiError(e).message ?? undefined });
                    }
                  }}
                >
                  Reset password
                </button>
              )}
              {/* M7b: only the Owner resets someone's 2-step sign-in (re-auth) */}
              {isOwner && staff && !removed && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMfaReset(true)}>
                  Reset 2-step sign-in…
                </button>
              )}
              {can("DELETE_USER") && (
                <span className="row" style={{ gap: 2, marginLeft: "auto" }}>
                  {!removed && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--red-600)" }} onClick={() => onDelete(u)}>
                      {staff ? "Deactivate…" : "Deactivate & anonymise…"}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--red-600)" }} onClick={() => onErase(u)}>
                    Erase everything…
                  </button>
                </span>
              )}
            </div>
            <div className="underline-tabs" style={{ padding: "0 16px" }} role="tablist">
              <button type="button" role="tab" aria-selected={tab === "details"} className={`utab ${tab === "details" ? "on" : ""}`} onClick={() => onTab("details")}>
                Details
              </button>
              <button type="button" role="tab" aria-selected={tab === "history"} className={`utab ${tab === "history" ? "on" : ""}`} onClick={() => onTab("history")}>
                History
              </button>
            </div>
          </>
        )
      }
    >
      {q.isLoading && (
        <div className="col" style={{ gap: 12 }} aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="skel" style={{ height: 10, width: `${60 + ((i * 13) % 35)}%` }} />
          ))}
        </div>
      )}
      {q.isError && <InlineError onRetry={() => q.refetch()}>Couldn&rsquo;t load this person</InlineError>}
      {u && tab === "details" && <Details u={u} />}
      {u && tab === "history" && <History u={u} />}
      <ResetTwoStepDialog user={u ? { id: u.id, name: u.name } : null} open={mfaReset} onOpenChange={setMfaReset} />
    </Drawer>
  );
}

function Details({ u }: { u: UserDetail }) {
  const dash = (v: string | null | undefined) => (v ? v : "—");
  const removed = isRemoved(u as UserDetail & { anonymisedAt?: string | null });
  return (
    <div className="col" style={{ gap: 14 }}>
      {removed && <span className="xs muted">Personal details were erased. Scores stay in results as &ldquo;Removed student&rdquo;.</span>}
      <span className="k-sec first">Contact</span>
      <dl className="k-kv">
        <dt>Phone</dt>
        <dd className="num">{u.phone ? `+91 ${fmtPhone(u.phone)}` : "—"}</dd>
        <dt>Email</dt>
        <dd>{u.email}</dd>
      </dl>
      {u.type === "student" ? (
        <>
          <span className="k-sec">Study</span>
          <dl className="k-kv">
            <dt>Centre</dt>
            <dd>{dash(u.centre?.name)}</dd>
            <dt>Batches</dt>
            <dd>{u.batch ? <Link href={`/setup?tab=batches&batch=${encodeURIComponent(u.batch.id)}`}>{u.batch.name}</Link> : "—"}</dd>
            <dt>Class</dt>
            <dd>{dash(u.standard)}</dd>
            <dt>Stream</dt>
            <dd>{dash(u.stream)}</dd>
            <dt>Medium</dt>
            <dd>{dash(cap(u.medium))}</dd>
            <dt>School</dt>
            <dd>{dash(u.school)}</dd>
          </dl>
          <span className="k-sec">Parent</span>
          <dl className="k-kv">
            <dt>Name</dt>
            <dd>{dash(u.parentName)}</dd>
            <dt>Phone</dt>
            <dd className="num">{u.parentPhone ? `+91 ${fmtPhone(u.parentPhone)}` : "—"}</dd>
            {/* Batch 7: under-18 parent or guardian confirmation (never blocks the student) */}
            <GuardianRow g={(u as UserDetail & { guardianConsent?: AdminGuardianConsent | null }).guardianConsent ?? null} />
          </dl>
        </>
      ) : u.type === "teacher" ? (
        <>
          <span className="k-sec">Teaching</span>
          <dl className="k-kv">
            <dt>Centre</dt>
            <dd>{dash(u.centre?.name)}</dd>
            <dt>Subjects</dt>
            <dd>{u.subjects.map((s) => s.name).join(", ") || "—"}</dd>
            <dt>Batches</dt>
            <dd>{u.batches.map((b) => b.name).join(", ") || "No batch yet"}</dd>
          </dl>
        </>
      ) : (
        <>
          <span className="k-sec">Work</span>
          <dl className="k-kv">
            <dt>Type</dt>
            <dd>{cap(u.type)}</dd>
            <dt>Centre</dt>
            <dd>{u.centre?.name ?? "All centres"}</dd>
          </dl>
        </>
      )}
      <span className="k-sec">Personal</span>
      <dl className="k-kv">
        <dt>Date of birth</dt>
        <dd>{fmtDate(u.dob)}</dd>
        <dt>Gender</dt>
        <dd>{dash(u.gender)}</dd>
        <dt>Address</dt>
        <dd>{dash(u.address)}</dd>
        <dt>City, state</dt>
        <dd>{[u.city, u.state].filter(Boolean).join(", ") || "—"}</dd>
      </dl>
      <span className="k-sec">Access</span>
      <dl className="k-kv">
        <dt>Valid</dt>
        <dd>{u.validFrom || u.validTill ? `${u.validFrom ? fmtDate(u.validFrom) : "Any time"} – ${u.validTill ? fmtDate(u.validTill) : "no end date"}` : "No end date"}</dd>
        <dt>Roles</dt>
        <dd className="row wrap" style={{ gap: 4 }}>
          {u.roles.length ? u.roles.map((r) => <span key={r.id} className="badge b-grey">{r.name}</span>) : "—"}
        </dd>
        <dt>Last active</dt>
        <dd>{fmtRelative(u.lastActiveAt)}</dd>
        {u.promoCode && (
          <>
            <dt>Joined with</dt>
            <dd className="mono">{u.promoCode}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function History({ u }: { u: UserDetail }) {
  const list = useQuery({ queryKey: ["m6", "people", "history", u.id], queryFn: () => auditApi.list({ involving: u.id, limit: 10 }) });
  const items = list.data?.items ?? [];
  const details = useQueries({ queries: items.map((e) => ({ queryKey: ["m6", "people", "audit-event", e.id], staleTime: 5 * 60_000, queryFn: () => auditApi.event(e.id) })) });
  if (list.isLoading)
    return (
      <div className="col" style={{ gap: 12 }} aria-busy>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="skel" style={{ height: 10, width: `${70 + ((i * 11) % 25)}%` }} />
        ))}
      </div>
    );
  if (list.isError)
    return (
      <InlineError onRetry={() => list.refetch()}>
        {apiError(list.error).status === 403 ? "Your role can't see this person's history" : "Couldn't load the history"}
      </InlineError>
    );
  if (!items.length) return <span className="sm muted">Nothing recorded for {u.name} yet.</span>;
  return (
    <div className="hist-k col" style={{ gap: 14 }}>
      <div style={{ position: "relative", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <span aria-hidden style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "var(--line-2)" }} />
        {items.map((e, i) => {
          const d = details[i]?.data as AuditDetail | undefined;
          const changes = d?.changes ?? [];
          return (
            <div key={e.id} style={{ position: "relative" }}>
              <span aria-hidden style={{ position: "absolute", left: -20, top: 4, width: 8, height: 8, borderRadius: "50%", background: "#fff", border: "2px solid var(--navy-200)" }} />
              <span className="sm">
                <b>{e.actor.name}</b> {sentence(e.verb, e.kind, e.what, e.details)}
              </span>
              <span className="xs muted" style={{ display: "block" }}>
                {fmtDateTime(e.occurredAt, "short")}
              </span>
              {changes.length > 0 && (
                <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "90px minmax(0,1fr)", gap: "4px 10px", fontSize: 12, padding: "8px 10px", borderRadius: 8, background: "#FAFBFD", border: "1px solid var(--line-2)" }}>
                  {changes.slice(0, 4).map((c, ci) => (
                    <span key={ci} style={{ display: "contents" }}>
                      <span className="muted">{c.field}</span>
                      <span>{c.redacted ? "changed" : <>{c.before ?? "—"} → <b>{c.after ?? "—"}</b></>}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Link href={`/audit-logs?involving=${encodeURIComponent(u.id)}`} className="xs" style={{ fontWeight: 600 }}>
        See all in Audit logs
      </Link>
    </div>
  );
}

const VERB: Record<string, string> = { added: "added", changed: "changed", deleted: "deleted", restored: "restored", imported: "imported", signedIn: "signed in to", signInFailed: "failed to sign in to", other: "updated" };
function sentence(verb: string, kind: string, what: string, details: string) {
  if (verb === "signedIn" || verb === "signInFailed") return `${verb === "signedIn" ? "signed in" : "couldn't sign in"}${details ? ` · ${details}` : ""}`;
  return `${VERB[verb] ?? "updated"} ${kind.toLowerCase()} ${what}${details ? ` · ${details}` : ""}`;
}

const GC_LABEL: Record<AdminGuardianConsent["status"], [string, string]> = {
  notRequired: ["b-grey", "Not needed (18 or older)"],
  needsDob: ["b-grey", "Unknown: no date of birth"],
  missing: ["b-amber", "Not asked yet"],
  waiting: ["b-amber", "Waiting for the parent"],
  expired: ["b-amber", "Link expired"],
  confirmed: ["b-green", "Confirmed"],
};
function GuardianRow({ g }: { g: AdminGuardianConsent | null }) {
  if (!g) return null;
  const [cls, label] = GC_LABEL[g.status] ?? ["b-grey", g.status];
  return (
    <>
      <dt>Consent</dt>
      <dd className="row wrap" style={{ gap: 6 }}>
        <span className={`badge ${cls}`}>{label}</span>
        {g.status === "confirmed" && g.confirmedAt && <span className="xs muted">{fmtDate(g.confirmedAt)}</span>}
      </dd>
    </>
  );
}
