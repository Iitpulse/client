"use client";
/*
  Staff invites (contract api-users docs/m7b-auth.md §6; board Admin-InviteAccept is the receiving end, Platform-SmallStates
  "staff invites" the sending end): Users › "Invite by email" sends a 7-day, single-use link; "Invites" lists them with
  Resend (new link, old one stops) and Withdraw. Also the Owner's "Reset 2-step sign-in…" on a staff member.
*/
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, KitDialog, ReauthDialog, Segmented, TextInput, apiError, notify } from "@/components/kit";
import { authV2, type InviteRow } from "@/lib/m7b-auth";
import { isAdminUser, useMe } from "@/lib/m6/people";
import { auth } from "@/lib/session";

type StaffType = "teacher" | "admin" | "operator" | "manager";
const TYPE_LABEL: Record<StaffType, string> = { teacher: "Teacher", admin: "Admin", operator: "Operator", manager: "Manager" };

/** The signed-in user is the institute's Owner (`isOwner` on /users/me when sent, else the session claim `own`) */
export function useIsOwner(): boolean {
  return useOwner().owner;
}

/** M9 Billing & usage in the nav: the Owner, or a support visit (read-only Owner view; the platform decides what it reads) */
export function useBillingVisible(): boolean {
  const { owner } = useOwner();
  return owner || auth.isSupportVisit();
}

/** Owner flag plus whether it is known yet (pages that only the Owner opens wait for it) */
export function useOwner(): { owner: boolean; loading: boolean } {
  const me = useMe();
  const claim = useQuery({ queryKey: ["session-claim", "own"], staleTime: 5 * 60_000, queryFn: async () => (await auth.claim("own")) === true });
  const u = me.data?.user as (NonNullable<typeof me.data>["user"] & { isOwner?: boolean; access?: { owner?: boolean } }) | undefined;
  return { owner: !!(u?.isOwner || u?.access?.owner || claim.data), loading: claim.isLoading };
}

export function InviteStaffDialog({ open, onOpenChange, defaultType = "teacher" }: { open: boolean; onOpenChange: (o: boolean) => void; defaultType?: StaffType }) {
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = isAdminUser(me.data?.user);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<StaffType>(defaultType);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reset = () => {
    setEmail("");
    setName("");
    setErr(null);
    setBusy(false);
  };
  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter a valid email");
    setBusy(true);
    setErr(null);
    try {
      await authV2.invite({ email: email.trim().toLowerCase(), ...(name.trim() ? { name: name.trim() } : {}), userType: type });
      notify.success("Invite sent", { description: `To ${email.trim()}. The link works for 7 days.` });
      await qc.invalidateQueries({ queryKey: ["m7b", "invites"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      const a = apiError(e);
      setErr(a.code === "EMAIL_TAKEN" ? "Someone in your institute already uses this email." : a.code === "INVITE_PENDING" ? "This email already has an invite waiting. Resend it from Invites." : a.message || "Couldn't send the invite.");
      setBusy(false);
    }
  };
  const types: StaffType[] = isAdmin ? ["teacher", "admin", "manager", "operator"] : ["teacher", "manager", "operator"];
  return (
    <KitDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : (reset(), onOpenChange(false)))}
      title="Invite by email"
      description="They set their own password from the link. It works once, for 7 days, on your institute's address."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>
            {busy ? "Sending…" : "Send invite"}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }} data-testid="invite-dialog">
        <Field label="Email" htmlFor="inv-email" error={err ?? undefined}>
          <TextInput id="inv-email" type="email" value={email} invalid={!!err} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Name" htmlFor="inv-name" optional>
          <TextInput id="inv-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role" group>
          <Segmented<StaffType> value={type} onChange={setType} options={types.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} ariaLabel="Role" />
        </Field>
        <span className="xs muted">Teachers start with the institute&rsquo;s Teacher role (own batches). Change roles after they join.</span>
      </div>
    </KitDialog>
  );
}

const STATUS_LABEL: Record<InviteRow["status"], string> = { pending: "Waiting", accepted: "Joined", expired: "Expired", revoked: "Withdrawn" };

export function InvitesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["m7b", "invites"], queryFn: () => authV2.invites(), enabled: open });
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify.success(ok);
      await qc.invalidateQueries({ queryKey: ["m7b", "invites"] });
    } catch (e) {
      notify.error("That didn't work", { description: apiError(e).message ?? undefined });
    }
  };
  const rows = q.data ?? [];
  return (
    <KitDialog open={open} onOpenChange={onOpenChange} title="Staff invites" width="wide">
      <div className="col" style={{ gap: 0, maxHeight: "60vh", overflowY: "auto" }} data-testid="invites-list">
        {q.isLoading && <span className="sm muted">Loading…</span>}
        {!q.isLoading && !rows.length && <span className="sm muted">No invites yet. Use &ldquo;Invite by email&rdquo; to add staff who set their own password.</span>}
        {rows.map((r) => (
          <div key={r.id} className="row between" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--line-2)" }}>
            <span className="col" style={{ minWidth: 0 }}>
              <span className="sm" style={{ fontWeight: 600 }}>
                {r.name ? `${r.name} · ` : ""}
                {r.email}
              </span>
              <span className="xs muted">
                {STATUS_LABEL[r.status]}
                {r.roles.length ? ` · ${r.roles.map((x) => x.name).join(", ")}` : ""}
                {r.invitedBy ? ` · by ${r.invitedBy.name}` : ""}
                {r.status === "pending" ? ` · expires ${new Date(r.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
              </span>
            </span>
            {(r.status === "pending" || r.status === "expired") && (
              <span className="row" style={{ gap: 6 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => act(() => authV2.resendInvite(r.id), `New link sent to ${r.email}`)}>
                  Resend
                </button>
                {r.status === "pending" && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--red-600)" }} onClick={() => act(() => authV2.revokeInvite(r.id), "Invite withdrawn")}>
                    Withdraw
                  </button>
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </KitDialog>
  );
}

/** Owner only: removes a staff member's passkeys, app and recovery codes and signs them out everywhere (re-auth). */
export function ResetTwoStepDialog({ user, open, onOpenChange }: { user: { id: string; name: string } | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <ReauthDialog
      open={open && !!user}
      onOpenChange={onOpenChange}
      title={`Reset ${user?.name ?? "their"}'s 2-step sign-in?`}
      description="Their passkeys, authenticator app and recovery codes are removed and they're signed out everywhere. They set 2-step up again at their next sign-in."
      confirmLabel="Reset 2-step sign-in"
      onConfirm={async (t) => {
        if (!user) return;
        await authV2.resetMfa(user.id, t);
        notify.success("2-step sign-in reset", { description: `${user.name} sets it up again at the next sign-in.` });
        onOpenChange(false);
      }}
    />
  );
}
