"use client";
/*
  Admin-Auth board, sign-in views: login, wrong-password, too-many-tries, account-off, student-account,
  session-expired (?expired=1, set by the 401 redirect), password-updated (?reset=done).
  POST /users/auth/login { email, password, app: "admin" } (contract "Auth"): 401 wrong; 429 LOGIN_LOCKED
  { retryAfterSeconds }; 403 ACCOUNT_DISABLED; 403 STUDENT_ACCOUNT { studentPortalUrl }.
*/
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUsersPublic } from "@/lib/api";
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
  const done = sp.get("reset") === "done";

  useEffect(() => {
    if (problem?.kind !== "locked") return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [problem]);
  const lockedMin = problem?.kind === "locked" ? Math.max(1, Math.ceil((problem.until - now) / 60_000)) : 0;
  const locked = problem?.kind === "locked" && problem.until > now;

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
      const r = await apiUsersPublic.post("/auth/login", { email: email.trim(), password, app: "admin" });
      const token: string | undefined = r.data?.data?.token ?? r.data?.token;
      if (!token || !(await loginWithToken(token))) throw new Error("No token");
      const next = sp.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
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
  return (
    <form className="col fade" style={{ gap: 18 }} onSubmit={submit} noValidate>
      {expired && !problem && (
        <AuthMsg tone="info" icon="clock">
          <b>You were signed out.</b> Sessions end after 7 days. Sign in again to go back to where you were; nothing you saved is lost.
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
