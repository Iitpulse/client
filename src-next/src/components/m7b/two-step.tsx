"use client";
/*
  M7b 2-step sign-in (boards Admin-Security "challenge-passkey / challenge-code / challenge-wrong-code / lost-device" and
  Admin-InviteAccept "two-step-optional / two-step-required / authenticator-app / recovery-codes"). Contract: api-users
  docs/m7b-auth.md §3–4. Used by the sign-in page (mfa_required / mfa_setup_required), the invite page and Profile.
*/
import { useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { apiError, notify } from "@/components/kit";
import { AuthMsg } from "@/components/people/auth/parts";
import { authV2, createPasskey, getPasskey, passkeysSupported, thisDevice, type MfaMethod, type SignedIn } from "@/lib/m7b-auth";

/* ─────────────────────────────── Challenge (sign-in) ─────────────────────────────── */

export function TwoStepChallenge({ ticket, methods, email, onDone, onBack }: { ticket: string; methods: MfaMethod[]; email: string; onDone: (s: SignedIn) => void; onBack: () => void }) {
  const canPasskey = methods.includes("passkey") && passkeysSupported();
  const [view, setView] = useState<"passkey" | "code" | "recovery" | "lost">(canPasskey ? "passkey" : methods.includes("totp") ? "code" : "recovery");
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ kind: "wrong"; left?: number } | { kind: "locked"; min: number } | { kind: "expired" } | { kind: "other"; message: string } | null>(null);

  const fail = (err: unknown) => {
    const a = apiError(err);
    const d = (a.details ?? {}) as { triesLeft?: number; retryAfterSeconds?: number };
    if (a.code === "MFA_LOCKED" || a.status === 429) setProblem({ kind: "locked", min: Math.max(1, Math.ceil((d.retryAfterSeconds ?? 900) / 60)) });
    else if (a.code === "MFA_TICKET_EXPIRED") setProblem({ kind: "expired" });
    else if (a.code === "MFA_CODE_WRONG" || a.status === 401) setProblem({ kind: "wrong", left: d.triesLeft });
    else setProblem({ kind: "other", message: a.message || "The server didn't answer. Try again in a moment." });
    setBusy(false);
  };

  const usePasskey = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const opts = await authV2.passkeyOptions(ticket);
      const credential = await getPasskey(opts);
      onDone(await authV2.verify({ ticket, method: "passkey", credential, trustDevice: trust }));
    } catch (err) {
      if ((err as Error)?.name === "NotAllowedError" || (err as Error)?.name === "AbortError") {
        setBusy(false);
        setProblem({ kind: "other", message: "The passkey wasn't used. Try again, or use the authenticator app." });
        return;
      }
      fail(err);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = view === "code" ? code.replace(/\D/g, "") : code.trim().toUpperCase();
    if (view === "code" && c.length !== 6) return setProblem({ kind: "wrong" });
    if (view === "recovery" && c.replace(/[^A-Z0-9]/g, "").length < 8) return setProblem({ kind: "wrong" });
    setBusy(true);
    setProblem(null);
    try {
      const s = await authV2.verify({ ticket, method: view === "code" ? "totp" : "recovery", code: c, trustDevice: trust });
      if (typeof s.recoveryCodesLeft === "number" && s.recoveryCodesLeft <= 2) notify.success(`You have ${s.recoveryCodesLeft} recovery ${s.recoveryCodesLeft === 1 ? "code" : "codes"} left`, { description: "Make new ones in Profile › Security." });
      onDone(s);
    } catch (err) {
      fail(err);
    }
  };

  const problemMsg =
    problem?.kind === "wrong" ? (
      <AuthMsg tone="bad" alert>
        <b>That code didn&rsquo;t work.</b> {view === "code" ? "Codes change every 30 seconds; use the newest one." : "Check the code and try again."}
        {typeof problem.left === "number" ? ` ${problem.left} ${problem.left === 1 ? "try" : "tries"} left before a 15-minute pause.` : ""}
      </AuthMsg>
    ) : problem?.kind === "locked" ? (
      <AuthMsg tone="warn" alert>
        <b>Too many wrong codes.</b> Try again in {problem.min} {problem.min === 1 ? "minute" : "minutes"}.
      </AuthMsg>
    ) : problem?.kind === "expired" ? (
      <AuthMsg tone="warn" alert>
        <b>This sign-in took too long.</b> Go back and sign in again.
      </AuthMsg>
    ) : problem?.kind === "other" ? (
      <AuthMsg tone="bad" alert>
        {problem.message}
      </AuthMsg>
    ) : null;

  const trustBox = (
    <label className="row sm" style={{ gap: 8, alignItems: "center" }}>
      <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} /> Trust this device for 30 days
    </label>
  );

  return (
    <div className="col fade" style={{ gap: 16 }} data-testid="two-step">
      {view === "passkey" && (
        <>
          <div className="col" style={{ gap: 4 }}>
            <h2 className="h1">Confirm it&rsquo;s you</h2>
            <p className="sm muted" style={{ margin: 0 }}>
              Use your passkey for <b>{email}</b>.
            </p>
          </div>
          {problemMsg}
          {trustBox}
          <button type="button" className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={usePasskey} disabled={busy}>
            {busy ? "Waiting for the passkey…" : "Use passkey"}
          </button>
          <div className="row between sm">
            {methods.includes("totp") ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setProblem(null), setView("code"))}>
                Use the authenticator app
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setProblem(null), setView("lost"))}>
              Lost your device?
            </button>
          </div>
        </>
      )}
      {(view === "code" || view === "recovery") && (
        <form className="col" style={{ gap: 14 }} onSubmit={submitCode} noValidate>
          <div className="col" style={{ gap: 4 }}>
            <h2 className="h1">{view === "code" ? "Enter your 6-digit code" : "Use a recovery code"}</h2>
            <p className="sm muted" style={{ margin: 0 }}>
              {view === "code" ? "From your authenticator app." : "Each code from the list you saved works once."}
            </p>
          </div>
          {problemMsg}
          <div className="field">
            <label className="label" htmlFor="mfa-code">
              {view === "code" ? "6-digit code" : "Recovery code"}
            </label>
            <input
              id="mfa-code"
              className={`input${problem?.kind === "wrong" ? " e" : ""}`}
              inputMode={view === "code" ? "numeric" : "text"}
              autoComplete="one-time-code"
              maxLength={view === "code" ? 7 : 12}
              placeholder={view === "code" ? "123456" : "XXXX-XXXX"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          {trustBox}
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Checking…" : view === "code" ? "Verify" : "Sign in"}
          </button>
          <div className="row between sm">
            {canPasskey ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setProblem(null), setCode(""), setView("passkey"))}>
                Use a passkey
              </button>
            ) : view === "recovery" && methods.includes("totp") ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setProblem(null), setCode(""), setView("code"))}>
                Use the authenticator app
              </button>
            ) : (
              <span />
            )}
            {view === "code" && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => (setProblem(null), setView("lost"))}>
                Lost your device?
              </button>
            )}
          </div>
        </form>
      )}
      {view === "lost" && (
        <div className="col" style={{ gap: 14 }}>
          <div className="col" style={{ gap: 4 }}>
            <h2 className="h1">Lost your device?</h2>
            <p className="sm muted" style={{ margin: 0 }}>
              Sign in with one of the recovery codes you saved when you turned on 2-step sign-in.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={() => (setCode(""), setView("recovery"))}>
            Use a recovery code
          </button>
          <AuthMsg tone="info">
            <b>No codes either?</b> Ask your institute&rsquo;s Owner to reset your 2-step sign-in. The Owner&rsquo;s own reset goes through IIT-PULSE support.
          </AuthMsg>
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

/* ─────────────────────────────── Set-up (invite, enforcement, Profile) ─────────────────────────────── */

export function QrCode({ text, size = 168, label }: { text: string; size?: number; label: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [text]);
  return <div role="img" aria-label={label} style={{ width: size, height: size, background: "#fff", padding: 6, borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** The authenticator-app set-up: QR + typed key + first code. Resolves with the confirm answer. */
export function AuthenticatorSetup({ ticket, onDone, onCancel }: { ticket?: string | null; onDone: (r: { recoveryCodes?: string[]; signIn?: SignedIn }) => void; onCancel?: () => void }) {
  const [start, setStart] = useState<{ otpauthUrl: string; keyGroups: string[] | string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    authV2
      .totpStart(ticket)
      .then((r) => setStart(r))
      .catch((e) => setErr(apiError(e).message || "Couldn't start the set-up. Try again."));
  }, [ticket]);
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\D/g, "");
    if (c.length !== 6) return setErr("Type the 6-digit code the app shows.");
    setBusy(true);
    setErr(null);
    try {
      onDone(await authV2.totpConfirm(c, ticket));
    } catch (ex) {
      const a = apiError(ex);
      setErr(a.code === "MFA_CODE_WRONG" || a.status === 401 ? "That code didn't work. Codes change every 30 seconds; use the newest one." : a.message || "Couldn't check the code.");
      setBusy(false);
    }
  };
  return (
    <form className="col" style={{ gap: 14 }} onSubmit={confirm} noValidate data-testid="totp-setup">
      <p className="sm" style={{ margin: 0 }}>
        Scan this with Google Authenticator, Microsoft Authenticator or a similar app, then type the 6-digit code it shows.
      </p>
      {start ? (
        <div className="row" style={{ gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <QrCode text={start.otpauthUrl} label="QR code for the authenticator app" />
          <div className="col sm" style={{ gap: 4 }}>
            <span className="muted">Can&rsquo;t scan? Type this key:</span>
            <code data-testid="totp-key" style={{ fontSize: 15, letterSpacing: 1 }}>
              {Array.isArray(start.keyGroups) ? start.keyGroups.join(" ") : start.keyGroups}
            </code>
          </div>
        </div>
      ) : !err ? (
        <div className="muted sm">Preparing…</div>
      ) : null}
      {err && (
        <AuthMsg tone="bad" alert>
          {err}
        </AuthMsg>
      )}
      <div className="field">
        <label className="label" htmlFor="totp-first">
          6-digit code from the app
        </label>
        <input id="totp-first" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !start}>
          {busy ? "Checking…" : "Turn on"}
        </button>
      </div>
    </form>
  );
}

/** Adds a passkey on this device. Resolves with the add answer (recovery codes on the first factor; signIn with a ticket). */
export async function addPasskey(ticket?: string | null) {
  const opts = await authV2.passkeyCreateOptions(ticket);
  const credential = await createPasskey(opts);
  return authV2.passkeyAdd(credential, thisDevice(), ticket);
}

export function RecoveryCodes({ codes, onDone, doneLabel = "Done" }: { codes: string[]; onDone: () => void; doneLabel?: string }) {
  const [saved, setSaved] = useState(false);
  const text = codes.join("\n");
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`IIT-PULSE recovery codes (each works once)\n\n${text}\n`], { type: "text/plain" }));
    a.download = "iitpulse-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="col" style={{ gap: 14 }} data-testid="recovery-codes">
      <p className="sm" style={{ margin: 0 }}>
        If you lose your phone, each code signs you in once. We won&rsquo;t show them again.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, fontFamily: "var(--font-mono, monospace)", fontSize: 15 }}>
        {codes.map((c) => (
          <code key={c}>{c}</code>
        ))}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(text).then(() => notify.success("Codes copied"))}>
          Copy
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={download}>
          Download .txt
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <label className="row sm" style={{ gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I&rsquo;ve saved these codes somewhere safe.
      </label>
      <button type="button" className="btn btn-primary" disabled={!saved} onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}

/**
 * "Turn on 2-step sign-in": passkey (recommended) or authenticator app, then the recovery codes. With a ticket (sign-in
 * enforcement, invite) the last step signs in. `required`: no "Skip for now".
 */
export function TwoStepSetup({ ticket, required, lead, onDone, onSkip, doneLabel }: { ticket?: string | null; required: boolean; lead?: string; onDone: (signIn: SignedIn | null) => void; onSkip?: () => void; doneLabel?: string }) {
  const [step, setStep] = useState<"choose" | "app" | "codes">("choose");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [signIn, setSignIn] = useState<SignedIn | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const finish = (r: { recoveryCodes?: string[]; signIn?: SignedIn }) => {
    setSignIn(r.signIn ?? null);
    if (r.recoveryCodes?.length) {
      setCodes(r.recoveryCodes);
      setStep("codes");
    } else onDone(r.signIn ?? null);
  };
  const passkey = async () => {
    setBusy(true);
    setErr(null);
    try {
      finish(await addPasskey(ticket));
    } catch (e) {
      const n = (e as Error)?.name;
      setErr(n === "NotAllowedError" || n === "AbortError" ? "The passkey wasn't made. Try again, or use an authenticator app." : apiError(e).message || "Couldn't add the passkey.");
      setBusy(false);
    }
  };
  if (step === "codes" && codes) return <RecoveryCodes codes={codes} doneLabel={doneLabel ?? "Finish"} onDone={() => onDone(signIn)} />;
  if (step === "app") return <AuthenticatorSetup ticket={ticket} onDone={finish} onCancel={() => setStep("choose")} />;
  return (
    <div className="col" style={{ gap: 14 }} data-testid="two-step-setup">
      {lead && (
        <p className="sm muted" style={{ margin: 0 }}>
          {lead}
        </p>
      )}
      {err && (
        <AuthMsg tone="bad" alert>
          {err}
        </AuthMsg>
      )}
      {passkeysSupported() && (
        <button type="button" className="btn btn-secondary" style={{ justifyContent: "flex-start", textAlign: "left", height: "auto", padding: "12px 14px" }} onClick={passkey} disabled={busy}>
          <span className="col" style={{ gap: 2 }}>
            <b>Passkey on this device</b>
            <span className="xs muted">Face, fingerprint or screen lock. Nothing to type. Recommended.</span>
          </span>
        </button>
      )}
      <button type="button" className="btn btn-secondary" style={{ justifyContent: "flex-start", textAlign: "left", height: "auto", padding: "12px 14px" }} onClick={() => setStep("app")} disabled={busy}>
        <span className="col" style={{ gap: 2 }}>
          <b>Authenticator app</b>
          <span className="xs muted">Google Authenticator, Microsoft Authenticator or similar: a 6-digit code each time.</span>
        </span>
      </button>
      {required ? (
        <p className="xs muted" style={{ margin: 0 }}>
          Owners and admins can&rsquo;t skip this step.
        </p>
      ) : (
        onSkip && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={onSkip}>
            Skip for now
          </button>
        )
      )}
    </div>
  );
}
