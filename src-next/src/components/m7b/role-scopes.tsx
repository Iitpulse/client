"use client";
/*
  Board Admin-RoleScopes (list, edit-centres, edit-batches, edit-own, transfer-owner). Contract api-users
  docs/m7b-permissions.md §3 and docs/m7b-auth.md §6: roles carry scope {kind, centres, batches}; PATCH
  /users/admin/roles/:id {scope: {kind, centreIds?, batchIds?}}; POST …/scope-impact (nothing saved) for the "N members
  lose access to …" line; GET /users/admin/owner; POST /users/admin/owner/transfer {userId} (current Owner, re-auth).
*/
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, KitDialog, MultiSelect, ReauthDialog, Combobox, apiError, notify } from "@/components/kit";
import { apiUsers } from "@/lib/api";
import { authV2 } from "@/lib/m7b-auth";
import { useAllBatches, useCentres, useUsers } from "@/lib/m6/people";
import { useIsOwner } from "./invites";

export type ScopeKind = "institute" | "centres" | "batches" | "own";
export interface RoleScope {
  kind: ScopeKind;
  centres: Array<{ id: string; name: string }>;
  batches: Array<{ id: string; name: string }>;
}
type Impact = { members: number; membersLosingAccess: number; lostCentres: Array<{ id: string; name: string }>; lostBatches: Array<{ id: string; name: string }> };

const KINDS: Array<{ kind: ScopeKind; title: string; sub: string }> = [
  { kind: "institute", title: "Whole institute", sub: "Every centre and batch, now and later" },
  { kind: "centres", title: "Some centres", sub: "Batches added to these centres later are included" },
  { kind: "batches", title: "Some batches", sub: "Only the batches you pick" },
  { kind: "own", title: "Own batches", sub: "The batches each member is assigned to teach" },
];

export function scopeLabel(s: RoleScope | null | undefined): string {
  if (!s || s.kind === "institute") return "Whole institute";
  if (s.kind === "own") return "Own batches";
  const names = (s.kind === "centres" ? s.centres : s.batches).map((x) => x.name);
  if (!names.length) return s.kind === "centres" ? "No centres" : "No batches";
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
}

export function ScopeDialog({ open, onOpenChange, role }: { open: boolean; onOpenChange: (o: boolean) => void; role: { id: string; name: string; scope?: RoleScope | null } }) {
  const qc = useQueryClient();
  const centres = useCentres();
  const batches = useAllBatches(open);
  const [kind, setKind] = useState<ScopeKind>(role.scope?.kind ?? "institute");
  const [centreIds, setCentreIds] = useState<string[]>(role.scope?.centres.map((c) => c.id) ?? []);
  const [batchIds, setBatchIds] = useState<string[]>(role.scope?.batches.map((b) => b.id) ?? []);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind(role.scope?.kind ?? "institute");
    setCentreIds(role.scope?.centres.map((c) => c.id) ?? []);
    setBatchIds(role.scope?.batches.map((b) => b.id) ?? []);
    setErr(null);
  }, [open, role]);

  const body = { kind, ...(kind === "centres" ? { centreIds } : {}), ...(kind === "batches" ? { batchIds } : {}) };
  const bodyKey = JSON.stringify(body);
  useEffect(() => {
    if (!open) return;
    if ((kind === "centres" && !centreIds.length) || (kind === "batches" && !batchIds.length)) return setImpact(null);
    let live = true;
    const t = setTimeout(() => {
      apiUsers
        .post(`/admin/roles/${encodeURIComponent(role.id)}/scope-impact`, JSON.parse(bodyKey))
        .then((r) => live && setImpact((r.data?.data ?? r.data) as Impact))
        .catch(() => live && setImpact(null));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, bodyKey, role.id, kind, centreIds.length, batchIds.length]);

  const save = async () => {
    if (kind === "centres" && !centreIds.length) return setErr("Pick at least one centre");
    if (kind === "batches" && !batchIds.length) return setErr("Pick at least one batch");
    setBusy(true);
    setErr(null);
    try {
      await apiUsers.patch(`/admin/roles/${encodeURIComponent(role.id)}`, { scope: body });
      await qc.invalidateQueries({ queryKey: ["m6", "people", "roles"] });
      notify.success(`${role.name} saved`, { description: "The new scope applies at each member's next page load." });
      onOpenChange(false);
    } catch (e) {
      const a = apiError(e);
      setErr(a.code === "SCOPE_LOCKED" ? "The Owner and Admin roles always cover the whole institute." : a.message || "Couldn't save the scope.");
    } finally {
      setBusy(false);
    }
  };

  const lost = impact ? [...impact.lostCentres, ...impact.lostBatches].map((x) => x.name) : [];
  return (
    <KitDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit role · ${role.name}`}
      busy={busy}
      closeButton
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save role"}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }} data-testid="scope-dialog">
        <span className="label">Scope</span>
        <div className="col" role="radiogroup" aria-label="Scope" style={{ gap: 6 }}>
          {KINDS.map((k) => (
            <label key={k.kind} className="row" style={{ gap: 10, alignItems: "flex-start", padding: "8px 10px", border: "1px solid var(--line-2)", borderRadius: 10, cursor: "pointer", background: kind === k.kind ? "var(--navy-50, #F2F3FD)" : undefined }}>
              <input type="radio" name="scope-kind" checked={kind === k.kind} onChange={() => setKind(k.kind)} style={{ marginTop: 3 }} />
              <span className="col">
                <span className="sm" style={{ fontWeight: 600 }}>
                  {k.title}
                </span>
                <span className="xs muted">{k.sub}</span>
              </span>
            </label>
          ))}
        </div>
        {kind === "centres" && (
          <Field label="Centres" htmlFor="scope-centres" error={err ?? undefined}>
            <MultiSelect id="scope-centres" noun="centres" value={centreIds} onChange={setCentreIds} options={(centres.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))} loading={centres.isLoading} placeholder="Pick centres" />
          </Field>
        )}
        {kind === "batches" && (
          <Field label="Batches" htmlFor="scope-batches" error={err ?? undefined}>
            <MultiSelect id="scope-batches" noun="batches" value={batchIds} onChange={setBatchIds} options={(batches.data?.items ?? []).map((b) => ({ value: b.id, label: b.name }))} loading={batches.isLoading} placeholder="Pick batches" />
          </Field>
        )}
        {err && kind !== "centres" && kind !== "batches" && (
          <span className="sm" role="alert" style={{ color: "var(--red-600)" }}>
            {err}
          </span>
        )}
        <span className="xs muted" role="status">
          Changing a scope applies at each member&rsquo;s next page load.
          {impact && impact.membersLosingAccess > 0 && lost.length > 0
            ? ` ${impact.membersLosingAccess} ${impact.membersLosingAccess === 1 ? "member loses" : "members lose"} access to ${lost.slice(0, 3).join(", ")}${lost.length > 3 ? ` +${lost.length - 3}` : ""}.`
            : ""}
        </span>
      </div>
    </KitDialog>
  );
}

/** "Rohit Mehta is the Owner…" with Transfer ownership… for the current Owner */
export function OwnerCard() {
  const isOwner = useIsOwner();
  const owner = useQuery({ queryKey: ["m7b", "owner"], queryFn: () => authV2.owner(), staleTime: 60_000 });
  const [open, setOpen] = useState(false);
  if (!owner.data) return null;
  return (
    <section className="card pad-lg row between wrap rise" style={{ gap: 12 }} data-testid="owner-card">
      <span className="col" style={{ gap: 2, minWidth: 0 }}>
        <span className="row" style={{ gap: 8 }}>
          <span className="h3">Owner</span>
          <span className="badge b-grey">1 per institute</span>
        </span>
        <span className="sm muted">
          <b>{owner.data.name}</b> is the Owner. Only the Owner sees Billing, can change the institute&rsquo;s address and can hand ownership to an admin.
        </span>
      </span>
      {isOwner && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
          Transfer ownership…
        </button>
      )}
      {isOwner && <TransferOwnerDialog open={open} onOpenChange={setOpen} currentId={owner.data.id} />}
    </section>
  );
}

function TransferOwnerDialog({ open, onOpenChange, currentId }: { open: boolean; onOpenChange: (o: boolean) => void; currentId: string }) {
  const qc = useQueryClient();
  const admins = useUsers({ type: "admin", status: "active", page: 1, pageSize: 100 } as Parameters<typeof useUsers>[0], open);
  const [to, setTo] = useState<string | null>(null);
  const options = ((admins.data as { items?: Array<{ id: string; name: string; email: string }> } | undefined)?.items ?? [])
    .filter((u) => u.id !== currentId)
    .map((u) => ({ value: u.id, label: u.name, end: u.email }));
  return (
    <ReauthDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer ownership"
      description="The new Owner gets billing and the institute settings. You become an Admin. They must have 2-step sign-in on."
      confirmLabel="Transfer"
      passwordHint="Your password"
      onConfirm={async (t) => {
        if (!to) throw new Error("Pick the new Owner");
        try {
          await authV2.transferOwner(to, t);
        } catch (e) {
          const a = apiError(e);
          if (a.code === "NOT_ELIGIBLE") throw new Error("They need to be an active admin with 2-step sign-in on.");
          throw e;
        }
        await qc.invalidateQueries({ queryKey: ["m7b", "owner"] });
        await qc.invalidateQueries({ queryKey: ["m6", "me"] });
        notify.success("Ownership transferred", { description: "You're an Admin now." });
        onOpenChange(false);
      }}
    >
      <Field label="New Owner" htmlFor="new-owner">
        <Combobox id="new-owner" value={to} onChange={setTo} options={options} placeholder="Pick an admin" loading={admins.isLoading} />
      </Field>
    </ReauthDialog>
  );
}
