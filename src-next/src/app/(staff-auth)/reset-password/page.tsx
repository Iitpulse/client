"use client";
/*
  Admin-Auth board, reset views: forgot, reset-sent (resend after 60 s), new-password, new-password-errors,
  link-expired, then /login?reset=done ("password-updated").
  POST /users/reset-password/request { email, app: "admin" } (same answer whether or not the account exists);
  POST …/verify { token } → { email } or 400 RESET_TOKEN_INVALID; POST …/reset { token, newPassword } (min 8,
  400 WEAK_PASSWORD; RESET_TOKEN_INVALID). Links last 30 minutes and work once.
*/
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { apiUsersPublic } from "@/lib/api";
import { FieldError, apiError } from "@/components/kit";
import { AuthMsg, EyePassword, StrengthMeter } from "@/components/people/auth/parts";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}

function Reset() {
  const sp = useSearchParams();
  const token = sp.get("token");
  return token ? <NewPassword token={token} /> : <Forgot initial={sp.get("email") ?? ""} />;
}

function Forgot({ initial }: { initial: string }) {
  const [email, setEmail] = useState(initial);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr("Type the email you sign in with");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiUsersPublic.post("/reset-password/request", { email: email.trim(), app: "admin" });
    } catch (e) {
      const a = apiError(e);
      if (a.status === 429) {
        setErr(a.message || "Too many requests. Try again in a minute.");
        setBusy(false);
        return;
      }
      /* the same answer whether or not the account exists */
    }
    setSentTo(email.trim());
    setWait(60);
    setBusy(false);
  };
  return (
    <div className="col fade" style={{ gap: 18 }}>
      <Link href="/login" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", marginLeft: -12 }}>
        ← Back to sign in
      </Link>
      <div className="col" style={{ gap: 4 }}>
        <h2 className="h1">Reset your password</h2>
        <p className="sm muted" style={{ margin: 0 }}>
          We&rsquo;ll email a link. It works once and expires in 30 minutes.
        </p>
      </div>
      {sentTo ? (
        <div className="col" style={{ gap: 14 }}>
          <AuthMsg tone="ok" icon="mail">
            <b>Check {sentTo}.</b> If it has an account, the link is on its way. Look in spam too.
          </AuthMsg>
          <span className="sm muted">
            Didn&rsquo;t get it?{" "}
            {wait > 0 ? (
              <span className="num" style={{ fontWeight: 600 }}>
                Send again in 0:{String(wait).padStart(2, "0")}
              </span>
            ) : (
              <button type="button" className="k-linkbtn" style={{ textDecoration: "none" }} disabled={busy} onClick={send}>
                Send again
              </button>
            )}
          </span>
          {err && <FieldError>{err}</FieldError>}
        </div>
      ) : (
        <form
          className="col"
          style={{ gap: 18 }}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" className={`input${err ? " e" : ""}`} autoComplete="username" value={email} onChange={(e) => (setEmail(e.target.value), setErr(null))} aria-invalid={!!err || undefined} />
            {err && <FieldError id="email-e">{err}</FieldError>}
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}

function NewPassword({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "expired">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  useEffect(() => {
    apiUsersPublic
      .post("/reset-password/verify", { token })
      .then((r) => {
        setEmail(r.data?.data?.email ?? null);
        setState("ok");
      })
      .catch(() => setState("expired"));
  }, [token]);
  const shortErr = tried && pw.length < 8 ? "Use at least 8 characters" : null;
  const matchErr = tried && pw2 !== pw ? "Passwords don't match" : null;
  const save = async () => {
    setTried(true);
    if (pw.length < 8 || pw !== pw2) return;
    setBusy(true);
    setServerErr(null);
    try {
      await apiUsersPublic.post("/reset-password/reset", { token, newPassword: pw });
      router.push("/login?reset=done");
    } catch (e) {
      const a = apiError(e);
      if (a.code === "RESET_TOKEN_INVALID") setState("expired");
      else if (a.code === "WEAK_PASSWORD") setServerErr("Use at least 8 characters");
      else setServerErr(a.message || "The server didn't answer. Try again.");
      setBusy(false);
    }
  };
  if (state === "checking") return <div className="skel" style={{ height: 220, borderRadius: 12 }} aria-busy />;
  if (state === "expired")
    return (
      <div className="col fade" style={{ gap: 18 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--amber-50)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Clock className="size-5" aria-hidden />
        </span>
        <div className="col" style={{ gap: 4 }}>
          <h2 className="h1">This link has expired</h2>
          <p className="sm muted" style={{ margin: 0 }}>
            Reset links work once, for 30 minutes. This one was used or is too old. Your password hasn&rsquo;t changed.
          </p>
        </div>
        <Link href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="btn btn-primary btn-lg" style={{ width: "100%" }}>
          Send a new link
        </Link>
        <Link href="/login" className="sm" style={{ fontWeight: 600, textAlign: "center" }}>
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form
      className="col fade"
      style={{ gap: 18 }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="col" style={{ gap: 4 }}>
        <h2 className="h1">Choose a new password</h2>
        <p className="sm muted" style={{ margin: 0 }}>
          {email ? `For ${email}. ` : ""}At least 8 characters. Your old password stops working right away.
        </p>
      </div>
      <div className="field">
        <label className="label" htmlFor="password">
          New password
        </label>
        <EyePassword id="password" autoComplete="new-password" invalid={!!(shortErr || serverErr)} value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby={shortErr ? "password-e" : undefined} />
        {shortErr || serverErr ? <FieldError id="password-e">{shortErr ?? serverErr}</FieldError> : <StrengthMeter pw={pw} />}
      </div>
      <div className="field">
        <label className="label" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input id="confirmPassword" type="password" autoComplete="new-password" className={`input${matchErr ? " e" : ""}`} value={pw2} onChange={(e) => setPw2(e.target.value)} aria-invalid={!!matchErr || undefined} />
        {matchErr && <FieldError id="confirmPassword-e">{matchErr}</FieldError>}
      </div>
      <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
