"use client";
/*
  Admin-Profile board (M7b: 2-step sign-in, passkeys and the session list from board Admin-Security, components/m7b): views m6, edited (Discard +
  Save changes), change-password (dialog with a strength meter), password-errors (WRONG_PASSWORD / WEAK_PASSWORD /
  PASSWORD_MISMATCH under their fields), saved ("Password changed" toast), error. Data: GET/PATCH /users/me and
  POST /users/me/password. Changing the email signs out other devices: the answer carries a fresh token for this one.
*/
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import {
  Field,
  FieldError,
  KitDialog,
  PageError,
  PageSkeleton,
  PasswordInput,
  PhoneInput,
  ReadOnlyValue,
  ServerErrorBanner,
  TextInput,
  apiError,
  initials,
  isPhone,
  notify,
  phoneDigits,
  supportCode,
} from "@/components/kit";
import { StrengthMeter } from "@/components/people/auth/parts";
import { auth } from "@/lib/api";
import { meApi, useMe } from "@/lib/m6/people";
import { SecurityCard, SessionsCard } from "@/components/m7b/security-cards";
import type { MeResponse } from "@/lib/m6-contract";

function daysAgo(iso: string | null): string {
  if (!iso) return "Never changed here";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "Changed today" : d === 1 ? "Changed yesterday" : `Changed ${d} days ago`;
}

export default function ProfilePage() {
  const me = useMe();
  return (
    <>
      <Topbar title="Your profile" />
      <main className="col" style={{ padding: "22px 28px 40px", gap: 16 }}>
        {me.isLoading ? (
          <PageSkeleton rows={8} />
        ) : me.isError || !me.data ? (
          <PageError what="your profile" body="You're still signed in. Try again in a moment." code={supportCode("USR", me.error)} onRetry={() => me.refetch()} />
        ) : (
          <Profile data={me.data} />
        )}
      </main>
    </>
  );
}

function Profile({ data }: { data: MeResponse }) {
  const u = data.user;
  const qc = useQueryClient();
  const [name, setName] = useState(u.name);
  const [email, setEmail] = useState(u.email);
  const [phone, setPhone] = useState(phoneDigits(u.phone));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [srv, setSrv] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  useEffect(() => {
    setName(u.name);
    setEmail(u.email);
    setPhone(phoneDigits(u.phone));
  }, [u.name, u.email, u.phone]);
  const dirty = name.trim() !== u.name || email.trim().toLowerCase() !== u.email.toLowerCase() || phone !== phoneDigits(u.phone);
  const roleNames = u.roles.map((r) => r.name);
  const discard = () => {
    setName(u.name);
    setEmail(u.email);
    setPhone(phoneDigits(u.phone));
    setErrs({});
    setSrv(null);
  };
  const save = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Type your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email";
    if (phone && !isPhone(phone)) e.phone = "Phone numbers have 10 digits";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSrv(null);
    const emailChanged = email.trim().toLowerCase() !== u.email.toLowerCase();
    try {
      const r = (await meApi.update({ name: name.trim(), email: email.trim(), phone: phone || null })) as MeResponse & { token?: string };
      if (r.token) auth.setToken(r.token);
      await qc.invalidateQueries({ queryKey: ["m6", "me"] });
      notify.success("Profile saved", emailChanged ? { description: "Other devices were signed out" } : undefined);
    } catch (err) {
      const a = apiError(err);
      const f = (a.details as { fields?: Record<string, { message: string }> } | null)?.fields;
      if (f) setErrs(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.message])));
      else if (a.code === "EMAIL_TAKEN") setErrs({ email: "Another account uses this email" });
      else if (a.code === "PHONE_TAKEN") setErrs({ phone: "Another account uses this phone" });
      else setSrv(a.message || "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pf-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, alignItems: "start" }}>
      <style>{`@media (max-width: 1179px) { .pf-grid { grid-template-columns: minmax(0, 1fr) !important } }`}</style>
      <section className="card pad-lg col rise" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>
            {initials(u.name)}
          </span>
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <span className="h2">{u.name}</span>
            <span className="row wrap" style={{ gap: 6 }}>
              {roleNames.map((r, i) => (
                <span key={r} className={`badge ${i === 0 ? "b-navy" : "b-grey"}`}>
                  {r}
                </span>
              ))}
              <span className="xs muted">
                {data.tenant.name} · {u.centre && u.centre.name !== data.tenant.name ? u.centre.name : "all centres"}
              </span>
            </span>
          </div>
        </div>
        {srv && <ServerErrorBanner onRetry={save} detail={srv} />}
        <Field label="Full name" htmlFor="pn" error={errs.name}>
          <TextInput id="pn" value={name} invalid={!!errs.name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="pe" error={errs.email} hint="You sign in with this. Changing it signs you out of other devices.">
          <TextInput id="pe" type="email" value={email} invalid={!!errs.email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Phone" optional htmlFor="ph" error={errs.phone}>
          <PhoneInput id="ph" value={phone} onChange={setPhone} invalid={!!errs.phone} />
        </Field>
        <Field label="Roles" group>
          <ReadOnlyValue>
            {roleNames.join(", ") || "—"} ·{" "}
            {u.userType === "admin" ? (
              <Link href="/roles" style={{ marginLeft: 4 }}>
                set on Roles &amp; access
              </Link>
            ) : (
              <span style={{ marginLeft: 4 }}>set on Roles &amp; access</span>
            )}
          </ReadOnlyValue>
        </Field>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          {dirty && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={discard} disabled={busy}>
              Discard
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>
      <section className="col" style={{ gap: 16 }}>
        <article className="card pad-lg col rise" style={{ gap: 4, ["--i" as string]: 1 }}>
          <span className="h3">Signing in</span>
          <div className="row between" style={{ gap: 12, padding: "12px 0" }}>
            <span className="col">
              <span className="sm" style={{ fontWeight: 600 }}>
                Password
              </span>
              <span className="xs muted">{daysAgo(u.passwordChangedAt)}</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPwOpen(true)}>
              Change password
            </button>
          </div>
          <span className="xs muted" style={{ paddingTop: 8, borderTop: "1px solid var(--line-2)" }}>
            Forgot it? Sign out and use &ldquo;Forgot password&rdquo; on the sign-in page.
          </span>
        </article>
        {/* M7b (board Admin-Security): 2-step sign-in, passkeys, recovery codes, where you're signed in */}
        <SecurityCard />
        <SessionsCard />
      </section>
      <ChangePassword open={pwOpen} onOpenChange={setPwOpen} onDone={() => qc.invalidateQueries({ queryKey: ["m6", "me"] })} />
    </div>
  );
}

function ChangePassword({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [srv, setSrv] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setCur("");
      setNw("");
      setConf("");
      setErrs({});
      setSrv(null);
    }
  }, [open]);
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!cur) e.currentPassword = "Type your current password";
    if (nw.length < 8) e.newPassword = "Use at least 8 characters";
    if (conf !== nw) e.confirmPassword = "Passwords don't match";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSrv(null);
    try {
      await meApi.password({ currentPassword: cur, newPassword: nw, confirmPassword: conf });
      onOpenChange(false);
      notify.success("Password changed");
      onDone();
    } catch (err) {
      const a = apiError(err);
      if (a.code === "WRONG_PASSWORD") setErrs({ currentPassword: "That isn't your current password" });
      else if (a.code === "WEAK_PASSWORD") setErrs({ newPassword: "Use at least 8 characters" });
      else if (a.code === "PASSWORD_MISMATCH") setErrs({ confirmPassword: "Passwords don't match" });
      else if (a.code === "TOO_MANY_ATTEMPTS") setSrv("Too many wrong passwords. Try again in 15 minutes.");
      else setSrv(a.message || "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog open={open} onOpenChange={onOpenChange} title="Change password" busy={busy} initialFocus="cp0">
      <form
        className="col"
        style={{ gap: 14 }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Current password" htmlFor="cp0" error={errs.currentPassword}>
          <PasswordInput id="cp0" value={cur} invalid={!!errs.currentPassword} autoComplete="current-password" onChange={(e) => setCur(e.target.value)} />
        </Field>
        <div className="field">
          <label className="label" htmlFor="cp1">
            New password
          </label>
          <PasswordInput id="cp1" value={nw} invalid={!!errs.newPassword} autoComplete="new-password" onChange={(e) => setNw(e.target.value)} />
          {errs.newPassword ? <FieldError id="cp1-e">{errs.newPassword}</FieldError> : <StrengthMeter pw={nw} small />}
        </div>
        <Field label="Confirm new password" htmlFor="cp2" error={errs.confirmPassword}>
          <TextInput id="cp2" type="password" value={conf} invalid={!!errs.confirmPassword} autoComplete="new-password" onChange={(e) => setConf(e.target.value)} />
        </Field>
        <span className="xs muted">At least 8 characters. Other devices stay signed in.</span>
        {srv && <ServerErrorBanner title="Couldn't change the password" detail={srv} />}
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </KitDialog>
  );
}
