"use client";
/*
  Profile › Security (board Admin-Security: profile-on, profile-off, recovery-low, sign-out-everywhere). Contract api-users
  docs/m7b-auth.md §4–5. Removing a factor, new recovery codes and "sign out everywhere" ask for the password (re-auth).
*/
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InlineNote, KitDialog, ReauthDialog, apiError, notify } from "@/components/kit";
import { authV2, type SessionRow } from "@/lib/m7b-auth";
import { auth } from "@/lib/session";
import { AuthenticatorSetup, RecoveryCodes, TwoStepSetup, addPasskey } from "./two-step";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
function ago(iso: string | null): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 5) return "active now";
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

type Dialog = null | { kind: "turn-on" } | { kind: "app" } | { kind: "codes"; codes: string[] } | { kind: "new-codes" } | { kind: "remove-app" } | { kind: "remove-passkey"; id: string; name: string } | { kind: "rename"; id: string; name: string };

export function SecurityCard() {
  const qc = useQueryClient();
  const sec = useQuery({ queryKey: ["m7b", "security"], queryFn: () => authV2.security() });
  const [dlg, setDlg] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["m7b", "security"] });

  if (sec.isLoading) return <article className="card pad-lg rise muted sm">Loading 2-step sign-in…</article>;
  if (sec.isError || !sec.data)
    return (
      <article className="card pad-lg col rise" style={{ gap: 8 }}>
        <span className="h3">2-step sign-in</span>
        <span className="sm muted">Couldn&rsquo;t load your sign-in settings. You&rsquo;re still signed in.</span>
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => sec.refetch()}>
          Try again
        </button>
      </article>
    );
  const m = sec.data.mfa;
  const off = !m.enabled;
  const low = !off && m.recoveryCodes.remaining <= 2;

  const newPasskey = async () => {
    setBusy(true);
    try {
      const r = await addPasskey();
      notify.success("Passkey added", { description: r.passkey?.name });
      await refresh();
      if (r.recoveryCodes?.length) setDlg({ kind: "codes", codes: r.recoveryCodes });
    } catch (e) {
      const n = (e as Error)?.name;
      if (n !== "NotAllowedError" && n !== "AbortError") notify.error("Couldn't add the passkey", { description: apiError(e).message ?? undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card pad-lg col rise" style={{ gap: 4, ["--i" as string]: 2 }} data-testid="security-card">
      <span className="h3">2-step sign-in</span>
      {low && (
        <InlineNote tone="warn">
          You have {m.recoveryCodes.remaining} recovery {m.recoveryCodes.remaining === 1 ? "code" : "codes"} left. Make new ones so you can still sign in if you lose your phone.
        </InlineNote>
      )}
      <span className="sm muted" style={{ paddingBottom: 8 }}>
        {off
          ? `Off. Turn it on with a passkey or an authenticator app.${m.required ? " Your institute requires it for your role." : " Your institute may require it."}`
          : "On. You confirm with a passkey or a code each time you sign in on a new device."}
      </span>
      {off && (
        <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start", marginBottom: 8 }} onClick={() => setDlg({ kind: "turn-on" })}>
          Turn on 2-step sign-in
        </button>
      )}
      <Row title="Passkeys" sub={m.passkeys.length ? `${m.passkeys.length} ${m.passkeys.length === 1 ? "passkey" : "passkeys"}` : "None yet"}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={newPasskey} disabled={busy}>
          Add a passkey
        </button>
      </Row>
      {m.passkeys.map((p) => (
        <div key={p.id} className="row between" style={{ gap: 12, padding: "6px 0 6px 14px" }}>
          <span className="col">
            <span className="sm">{p.name}</span>
            <span className="xs muted">
              Added {day(p.createdAt)}
              {p.lastUsedAt ? ` · used ${ago(p.lastUsedAt)}` : ""}
            </span>
          </span>
          <span className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDlg({ kind: "rename", id: p.id, name: p.name })}>
              Rename
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDlg({ kind: "remove-passkey", id: p.id, name: p.name })}>
              Remove
            </button>
          </span>
        </div>
      ))}
      <Row title="Authenticator app" sub={m.totp.enabled ? `Set up ${day(m.totp.addedAt)}` : "Not set up"}>
        <span className="row" style={{ gap: 6 }}>
          {m.totp.enabled && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDlg({ kind: "remove-app" })}>
              Remove
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDlg({ kind: "app" })}>
            {m.totp.enabled ? "Replace" : "Set up"}
          </button>
        </span>
      </Row>
      <Row title="Recovery codes" sub={off ? "Made when you turn on 2-step sign-in" : `${m.recoveryCodes.remaining} of 8 left`}>
        {!off && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDlg({ kind: "new-codes" })}>
            Make new codes
          </button>
        )}
      </Row>

      <KitDialog open={dlg?.kind === "turn-on"} onOpenChange={(o) => !o && setDlg(null)} title="Turn on 2-step sign-in">
        {dlg?.kind === "turn-on" && (
          <TwoStepSetup
            required={false}
            lead="Pick how you'll confirm it's you on a new device."
            onDone={() => {
              setDlg(null);
              notify.success("2-step sign-in is on");
              void refresh();
            }}
          />
        )}
      </KitDialog>
      <KitDialog open={dlg?.kind === "app"} onOpenChange={(o) => !o && setDlg(null)} title={m.totp.enabled ? "Replace the authenticator app" : "Set up an authenticator app"}>
        {dlg?.kind === "app" && (
          <AuthenticatorSetup
            onCancel={() => setDlg(null)}
            onDone={(r) => {
              notify.success("Authenticator app set up");
              void refresh();
              setDlg(r.recoveryCodes?.length ? { kind: "codes", codes: r.recoveryCodes } : null);
            }}
          />
        )}
      </KitDialog>
      <KitDialog open={dlg?.kind === "codes"} onOpenChange={(o) => !o && setDlg(null)} title="Save your recovery codes">
        {dlg?.kind === "codes" && <RecoveryCodes codes={dlg.codes} onDone={() => setDlg(null)} />}
      </KitDialog>
      <ReauthDialog
        open={dlg?.kind === "new-codes"}
        onOpenChange={(o) => !o && setDlg(null)}
        title="Make new recovery codes?"
        description="Your old codes stop working."
        confirmLabel="Make new codes"
        passwordHint="We ask because this changes how you sign in."
        onConfirm={async (t) => {
          const r = await authV2.newRecoveryCodes(t);
          void refresh();
          setDlg({ kind: "codes", codes: r.codes });
        }}
      />
      <ReauthDialog
        open={dlg?.kind === "remove-app"}
        onOpenChange={(o) => !o && setDlg(null)}
        title="Remove the authenticator app?"
        description={m.required && m.passkeys.length === 0 ? "Your role needs 2-step sign-in: add a passkey first." : "Codes from the app stop working."}
        confirmLabel="Remove"
        passwordHint="We ask because this changes how you sign in."
        onConfirm={async (t) => {
          await authV2.totpRemove(t);
          notify.success("Authenticator app removed");
          void refresh();
          setDlg(null);
        }}
      />
      <ReauthDialog
        open={dlg?.kind === "remove-passkey"}
        onOpenChange={(o) => !o && setDlg(null)}
        title={dlg?.kind === "remove-passkey" ? `Remove ${dlg.name}?` : "Remove passkey?"}
        description={m.required && !m.totp.enabled && m.passkeys.length === 1 ? "Your role needs 2-step sign-in: set up the authenticator app first." : "This passkey stops working for your account."}
        confirmLabel="Remove passkey"
        passwordHint="We ask because this changes how you sign in."
        onConfirm={async (t) => {
          if (dlg?.kind !== "remove-passkey") return;
          await authV2.passkeyRemove(dlg.id, t);
          notify.success("Passkey removed");
          void refresh();
          setDlg(null);
        }}
      />
      {dlg?.kind === "rename" && <RenamePasskey id={dlg.id} name={dlg.name} onClose={() => setDlg(null)} onSaved={refresh} />}
    </article>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="row between" style={{ gap: 12, padding: "12px 0", borderTop: "1px solid var(--line-2)" }}>
      <span className="col">
        <span className="sm" style={{ fontWeight: 600 }}>
          {title}
        </span>
        <span className="xs muted">{sub}</span>
      </span>
      {children}
    </div>
  );
}

function RenamePasskey({ id, name, onClose, onSaved }: { id: string; name: string; onClose: () => void; onSaved: () => unknown }) {
  const [v, setV] = useState(name);
  const [busy, setBusy] = useState(false);
  return (
    <KitDialog open onOpenChange={(o) => !o && onClose()} title="Rename passkey">
      <form
        className="col"
        style={{ gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!v.trim()) return;
          setBusy(true);
          try {
            await authV2.passkeyRename(id, v.trim().slice(0, 60));
            await onSaved();
            onClose();
          } catch (err) {
            notify.error("Couldn't rename it", { description: apiError(err).message ?? undefined });
            setBusy(false);
          }
        }}
      >
        <div className="field">
          <label className="label" htmlFor="pk-name">
            Name
          </label>
          <input id="pk-name" className="input" maxLength={60} value={v} onChange={(e) => setV(e.target.value)} autoFocus />
        </div>
        <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </KitDialog>
  );
}

/** "Where you're signed in": device + part of the network address; sign out one, or everywhere (re-auth). */
export function SessionsCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["m7b", "sessions"], queryFn: () => authV2.sessions() });
  const [all, setAll] = useState(false);
  const end = async (s: SessionRow) => {
    try {
      await authV2.endSession(s.id);
      notify.success(`Signed out ${s.device ?? "that device"}`);
      void qc.invalidateQueries({ queryKey: ["m7b", "sessions"] });
    } catch (e) {
      notify.error("Couldn't sign that device out", { description: apiError(e).message ?? undefined });
    }
  };
  const rows = q.data ?? [];
  return (
    <article className="card pad-lg col rise" style={{ gap: 4, ["--i" as string]: 3 }} data-testid="sessions-card">
      <div className="row between" style={{ gap: 12 }}>
        <span className="h3">Where you&rsquo;re signed in</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAll(true)} disabled={!rows.length}>
          Sign out everywhere
        </button>
      </div>
      <span className="xs muted" style={{ paddingBottom: 8 }}>
        Device and part of the network address only. Sessions end after 7 days without use.
      </span>
      {q.isLoading && <span className="sm muted">Loading…</span>}
      {q.isError && <span className="sm muted">Couldn&rsquo;t load the list. Try again in a moment.</span>}
      {rows.map((s) => (
        <div key={s.id} className="row between" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--line-2)" }}>
          <span className="col">
            <span className="sm" style={{ fontWeight: 600 }}>
              {s.device ?? "Unknown device"} {s.current && <span className="badge">This device</span>}
              {s.app === "student" && <span className="badge">Student app</span>}
            </span>
            <span className="xs muted">
              {s.ipMasked ?? "address hidden"} · {s.current ? "active now" : ago(s.lastUsedAt ?? s.createdAt)}
            </span>
          </span>
          {!s.current && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => end(s)}>
              Sign out
            </button>
          )}
        </div>
      ))}
      <ReauthDialog
        open={all}
        onOpenChange={setAll}
        title="Sign out everywhere?"
        description="Every device, including this one, is signed out."
        confirmLabel="Sign out everywhere"
        passwordHint="Enter your password to confirm."
        onConfirm={async (t) => {
          await authV2.endAll(t, true);
          auth.removeToken();
          window.location.href = "/login";
        }}
      />
    </article>
  );
}
