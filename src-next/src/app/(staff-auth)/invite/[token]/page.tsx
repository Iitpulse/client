"use client";
/*
  Admin-InviteAccept board: set-password, passwords-differ, two-step-optional, two-step-required, authenticator-app,
  recovery-codes, done, expired, already-used, wrong-address. Contract api-users docs/m7b-auth.md §6:
  GET /users/public/invites/:token → the invite; POST …/accept {password, name?, legal, session: "cookie"} → the staff
  account and a sign-in answer (mfa_setup_required when 2-step is required and enforced, else signed_in). The link
  only works on the institute's own address (404 from anywhere else).
*/
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiError } from "@/components/kit";
import { AuthMsg, EyePassword, StrengthMeter } from "@/components/people/auth/parts";
import { TwoStepSetup } from "@/components/m7b/two-step";
import { authV2, type PublicInvite, type SignedIn } from "@/lib/m7b-auth";
import { useAuthStore } from "@/stores";
import { useStudentPortal } from "@/lib/brand";

type Dead = "INVITE_INVALID" | "INVITE_EXPIRED" | "INVITE_REVOKED" | "INVITE_USED" | "OFFLINE";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const PORTAL = useStudentPortal(); // the institute's own student app (its /terms, /privacy)
  const [inv, setInv] = useState<PublicInvite | null>(null);
  const [dead, setDead] = useState<Dead | null>(null);
  const [step, setStep] = useState<"password" | "two-step" | "done">("password");
  const [ticket, setTicket] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    authV2
      .publicInvite(token)
      .then(setInv)
      .catch((e) => {
        const a = apiError(e);
        setDead(a.status === 0 ? "OFFLINE" : ((["INVITE_EXPIRED", "INVITE_REVOKED", "INVITE_USED"] as string[]).includes(a.code ?? "") ? (a.code as Dead) : "INVITE_INVALID"));
      });
  }, [token]);

  const finishSignIn = async (s: SignedIn | null) => {
    if (s?.token) await loginWithToken(s.token);
    setStep("done");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!inv || pw.length < 8 || pw !== pw2 || !agree) return;
    setBusy(true);
    setErr(null);
    try {
      const a = await authV2.acceptInvite(token, { password: pw, legal: inv.legal });
      setMfaRequired(!!a.mfaRequired);
      if (a.status === "mfa_setup_required") {
        setTicket(a.ticket);
        setStep("two-step");
      } else if (a.status === "signed_in") {
        await loginWithToken(a.token);
        setStep("two-step"); // optional set-up (Skip for now)
      } else setStep("done");
    } catch (ex) {
      const a = apiError(ex);
      if (["INVITE_EXPIRED", "INVITE_REVOKED", "INVITE_USED", "INVITE_INVALID"].includes(a.code ?? "")) setDead(a.code as Dead);
      else if (a.code === "WEAK_PASSWORD") setErr("Use at least 8 characters.");
      else setErr(a.message || "Couldn't finish. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  if (dead) {
    const t =
      dead === "INVITE_EXPIRED"
        ? { title: "This invite has expired", lead: "Invites work for 7 days. Ask whoever invited you to send a new one." }
        : dead === "INVITE_USED"
          ? { title: "This invite was already used", lead: "Your account is set up. Sign in with your email and password." }
          : dead === "INVITE_REVOKED"
            ? { title: "This invite was withdrawn", lead: "Ask your institute's admin if you still need access." }
            : dead === "OFFLINE"
              ? { title: "You seem to be offline", lead: "Connect to the internet and open the link again." }
              : { title: "This invite link doesn't work here", lead: "Invite links work only on your institute's own address, once. Open the link from the email again, or ask for a new invite." };
    return (
      <div className="col fade" style={{ gap: 14 }} data-testid="invite-dead">
        <h2 className="h1">{t.title}</h2>
        <p className="sm muted" style={{ margin: 0 }}>
          {t.lead}
        </p>
        <Link href="/login" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          Go to sign in
        </Link>
      </div>
    );
  }
  if (!inv) return <div className="muted sm">Opening your invite…</div>;

  const steps = ["Password", "2-step sign-in", "Done"];
  const at = step === "password" ? 0 : step === "two-step" ? 1 : 2;
  return (
    <div className="col fade" style={{ gap: 18 }} data-testid="invite-page">
      <div className="col" style={{ gap: 6 }}>
        <span className="eyebrow">Staff invite</span>
        <h2 className="h1">
          {inv.invitedBy?.name ? `${inv.invitedBy.name} invited you` : "You're invited"} to the {inv.institute.name} staff console.
        </h2>
        {inv.roles.length > 0 && (
          <span className="sm muted">
            Role: {inv.roles.map((r) => r.name).join(", ")}. Your institute set this; ask them to change it.
          </span>
        )}
        {inv.host && <span className="xs muted">{inv.host} · this link works only on your institute&rsquo;s address</span>}
      </div>
      <ol className="row xs" style={{ gap: 14, listStyle: "none", padding: 0, margin: 0 }} aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} style={{ fontWeight: i === at ? 700 : 500, color: i <= at ? "var(--cl-ink, #1A1C3A)" : "var(--cl-ink-3, #8A8DAA)" }} aria-current={i === at ? "step" : undefined}>
            {i < at ? "✓" : i + 1} {s}
          </li>
        ))}
      </ol>

      {step === "password" && (
        <form className="col" style={{ gap: 14 }} onSubmit={submit} noValidate>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h2">Set your password</h3>
            <span className="sm muted">
              You&rsquo;ll sign in with <b>{inv.email}</b>. At least 8 characters.
            </span>
          </div>
          {err && (
            <AuthMsg tone="bad" alert>
              {err}
            </AuthMsg>
          )}
          <div className="field">
            <label className="label" htmlFor="inv-pw">
              New password
            </label>
            <EyePassword id="inv-pw" autoComplete="new-password" invalid={tried && pw.length < 8} value={pw} onChange={(e) => setPw(e.target.value)} />
            <StrengthMeter pw={pw} small />
          </div>
          <div className="field">
            <label className="label" htmlFor="inv-pw2">
              Type it again
            </label>
            <EyePassword id="inv-pw2" autoComplete="new-password" invalid={tried && pw2 !== pw} value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {tried && pw2 !== pw && (
              <span className="xs" role="alert" style={{ color: "var(--cl-red-700, #C40000)" }}>
                The passwords don&rsquo;t match. Type the same password in both boxes.
              </span>
            )}
          </div>
          <label className="row sm" style={{ gap: 8, alignItems: "flex-start" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              I agree to the{" "}
              <a href={`${PORTAL}/terms`} target="_blank" rel="noopener">
                Terms of Use
              </a>{" "}
              and{" "}
              <a href={`${PORTAL}/privacy`} target="_blank" rel="noopener">
                Privacy Policy
              </a>{" "}
              (version {inv.legal.terms}).
            </span>
          </label>
          {tried && !agree && (
            <span className="xs" role="alert" style={{ color: "var(--cl-red-700, #C40000)" }}>
              Accept the terms to continue
            </span>
          )}
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Setting up…" : "Continue"}
          </button>
        </form>
      )}

      {step === "two-step" && (
        <div className="col" style={{ gap: 12 }}>
          <h3 className="h2">Turn on 2-step sign-in</h3>
          <TwoStepSetup
            ticket={ticket}
            required={!!ticket || mfaRequired}
            lead={ticket || mfaRequired ? "Your role needs it. You'll confirm with a passkey or a code when you sign in on a new device." : "Recommended: it keeps your account safe if your password leaks."}
            doneLabel="Finish and open the console"
            onDone={(s) => void finishSignIn(s)}
            onSkip={ticket ? undefined : () => setStep("done")}
          />
        </div>
      )}

      {step === "done" && (
        <div className="col" style={{ gap: 12 }} data-testid="invite-done">
          <AuthMsg tone="ok">
            <b>You&rsquo;re in.</b> Your account is ready. Sign in next time with {inv.email}.
          </AuthMsg>
          <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => router.push("/")}>
            Go to the dashboard
          </button>
        </div>
      )}
    </div>
  );
}
