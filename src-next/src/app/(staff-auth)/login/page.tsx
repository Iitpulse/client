"use client";
/*
  Admin-Auth board, sign-in views: login, wrong-password, too-many-tries, account-off, student-account,
  session-expired (?expired=1, set by the 401 redirect), password-updated (?reset=done).
  POST /users/auth/login { email, password, app: "admin" } (contract "Auth"): 401 wrong; 429 LOGIN_LOCKED
  { retryAfterSeconds }; 403 ACCOUNT_DISABLED; 403 STUDENT_ACCOUNT { studentPortalUrl }.
  M7b (api-users docs/m7b-auth.md, board Admin-Security challenge-*): a cookie session; staff with 2-step answer
  mfa_required (passkey / code / recovery code, trust this device), Owners and Admins without it under enforcement
  answer mfa_setup_required (set it up here, then signed in).
*/
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authV2, type MfaMethod, type SignedIn } from "@/lib/m7b-auth";
import { TwoStepChallenge, TwoStepSetup } from "@/components/m7b/two-step";
import { useAuthStore } from "@/stores";
import { apiError } from "@/components/kit";
import { AuthMsg, EyePassword } from "@/components/people/auth/parts";

type Problem = { kind: "wrong" } | { kind: "locked"; until: number } | { kind: "off" } | { kind: "student"; url: string } | { kind: "other"; message: string } | null;
const PORTAL = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "https://tests.iitpulse.in";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const sp = useSearchParams();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [now, setNow] = useState(() => Date.now());
  const expired = sp.get("expired") === "1";
  const needsMfa = sp.get("mfa") === "1";
  const [step, setStep] = useState<{ kind: "mfa"; ticket: string; methods: MfaMethod[]; email: string } | { kind: "setup"; ticket: string; email: string } | null>(null);
  const done = sp.get("reset") === "done";

  useEffect(() => {
    if (problem?.kind !== "locked") return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [problem]);
  const lockedMin = problem?.kind === "locked" ? Math.max(1, Math.ceil((problem.until - now) / 60_000)) : 0;
  const locked = problem?.kind === "locked" && problem.until > now;

  const signedIn = async (a: SignedIn | null) => {
    if (!a?.token || !(await loginWithToken(a.token))) throw new Error("No token");
    const next = sp.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    if (!email.trim() || !password) {
      setProblem({ kind: "wrong" });
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const a = await authV2.login(email.trim(), password);
      if (a.status === "mfa_required") {
        setStep({ kind: "mfa", ticket: a.ticket, methods: a.methods, email: a.email });
        setBusy(false);
        return;
      }
      if (a.status === "mfa_setup_required") {
        setStep({ kind: "setup", ticket: a.ticket, email: a.email });
        setBusy(false);
        return;
      }
      await signedIn(a);
    } catch (err) {
      const a = apiError(err);
      const d = (a.details ?? {}) as { retryAfterSeconds?: number; studentPortalUrl?: string | null };
      if (a.code === "LOGIN_LOCKED" || a.status === 429) setProblem({ kind: "locked", until: Date.now() + (d.retryAfterSeconds ?? 900) * 1000 });
      else if (a.code === "ACCOUNT_DISABLED") setProblem({ kind: "off" });
      else if (a.code === "STUDENT_ACCOUNT") setProblem({ kind: "student", url: d.studentPortalUrl || PORTAL });
      else if (a.status === 401 || a.status === 400) setProblem({ kind: "wrong" });
      else setProblem({ kind: "other", message: a.message || "The server didn't answer. Try again in a moment." });
      setBusy(false);
    }
  };

  const errCls = problem?.kind === "wrong";
  if (step?.kind === "mfa")
    return <TwoStepChallenge ticket={step.ticket} methods={step.methods} email={step.email} onDone={(s) => void signedIn(s)} onBack={() => (setStep(null), setPassword(""))} />;
  if (step?.kind === "setup")
    return (
      <div className="col fade" style={{ gap: 16 }}>
        <div className="col" style={{ gap: 4 }}>
          <h2 className="h1">Turn on 2-step sign-in</h2>
          <p className="sm muted" style={{ margin: 0 }}>
            Your institute requires it for <b>{step.email}</b>. You&rsquo;ll confirm with a passkey or a code each time you sign in on a new device.
          </p>
        </div>
        <TwoStepSetup ticket={step.ticket} required doneLabel="Finish and open the console" onDone={(s) => void signedIn(s)} />
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => (setStep(null), setPassword(""))}>
          ← Back
        </button>
      </div>
    );
  return (
    <form className="col fade" style={{ gap: 18 }} onSubmit={submit} noValidate>
      {expired && !problem && (
        <AuthMsg tone="info" icon="clock">
          {needsMfa ? (
            <>
              <b>Sign in again.</b> Your account now uses 2-step sign-in, so this browser needs it once. Nothing you saved is lost.
            </>
          ) : (
            <>
              <b>You were signed out.</b> Sessions end after 7 days. Sign in again to go back to where you were; nothing you saved is lost.
            </>
          )}
        </AuthMsg>
      )}
      {done && !problem && (
        <AuthMsg tone="ok">
          <b>Password updated.</b> Sign in with your new password.
        </AuthMsg>
      )}
      <div className="col" style={{ gap: 4 }}>
        <h2 className="h1">Sign in to the console</h2>
        <p className="sm muted" style={{ margin: 0 }}>
          For admins, teachers, managers and operators. Your institute creates your account.
        </p>
      </div>
      {problem?.kind === "wrong" && (
        <AuthMsg tone="bad" alert>
          <b>Email or password is wrong.</b> Check both and try again. After 10 wrong tries, sign-in pauses for 15 minutes.
        </AuthMsg>
      )}
      {problem?.kind === "locked" && (
        <AuthMsg tone="warn" alert>
          <b>Too many wrong tries.</b> Sign-in for this account is paused for {lockedMin} {lockedMin === 1 ? "minute" : "minutes"}. If you&rsquo;ve forgotten it,{" "}
          <Link href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}>reset your password</Link>.
        </AuthMsg>
      )}
      {problem?.kind === "off" && (
        <AuthMsg tone="bad" icon="off" alert>
          <b>Your account is turned off.</b> Ask your institute&rsquo;s admin to turn it back on. Your work is kept.
        </AuthMsg>
      )}
      {problem?.kind === "student" && (
        <AuthMsg tone="info" alert>
          <span className="col" style={{ gap: 8 }}>
            <span>
              <b>This is a student account.</b> Students sign in on the student site to take tests and see results.
            </span>
            <a href={problem.url} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
              Go to {hostOf(problem.url)}
            </a>
          </span>
        </AuthMsg>
      )}
      {problem?.kind === "other" && (
        <AuthMsg tone="bad" alert>
          <b>Couldn&rsquo;t sign you in.</b> {problem.message}
        </AuthMsg>
      )}
      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" className={`input${errCls ? " e" : ""}`} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <div className="row between">
          <label className="label" htmlFor="password">
            Password
          </label>
          <Link href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="xs" style={{ fontWeight: 600 }}>
            Forgot password?
          </Link>
        </div>
        <EyePassword id="password" autoComplete="current-password" invalid={errCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy || locked}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function hostOf(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return "the student site";
  }
}
