"use client";
/* Admin-Auth board parts: message boxes, the password strength meter, a password field with the eye button. */
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Clock, Eye, EyeOff, Info, Lock, Mail, CircleSlash } from "lucide-react";

const ICON = {
  bad: <CircleAlert className="size-4" aria-hidden />,
  off: <CircleSlash className="size-4" aria-hidden />,
  warn: <Lock className="size-4" aria-hidden />,
  info: <Info className="size-4" aria-hidden />,
  clock: <Clock className="size-4" aria-hidden />,
  ok: <CircleCheck className="size-4" aria-hidden />,
  mail: <Mail className="size-4" aria-hidden />,
};
export function AuthMsg({ tone, icon, children, alert }: { tone: "bad" | "warn" | "info" | "ok"; icon?: keyof typeof ICON; children: ReactNode; alert?: boolean }) {
  return (
    <div className={`au-msg ${tone}`} role={alert ? "alert" : "status"}>
      {ICON[icon ?? (tone === "bad" ? "bad" : tone === "ok" ? "ok" : tone === "warn" ? "warn" : "info")]}
      <span>{children}</span>
    </div>
  );
}

/** 0–4: 8+ characters, 12+, a number or symbol, upper and lower case. */
export function strength(pw: string): number {
  if (pw.length < 8) return pw ? 1 : 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[\d\W_]/.test(pw)) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  return Math.min(4, s);
}
export function StrengthMeter({ pw, small }: { pw: string; small?: boolean }) {
  const s = strength(pw);
  if (!pw) return null;
  const strong = s >= 3;
  const colour = s <= 1 ? "var(--red-600)" : strong ? "var(--green)" : "var(--amber)";
  const label = pw.length < 8 ? `Use at least 8 characters (${pw.length} so far)` : strong ? "Strong enough" : "Good. Add a number or symbol to make it strong.";
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className={`au-meter${small ? " sm" : ""}`} aria-hidden style={{ ["--meter" as string]: colour }}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < s ? "on" : ""} />
        ))}
      </div>
      <span className="xs" style={{ color: colour, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

export function EyePassword({ invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="au-pw">
      <input {...rest} type={show ? "text" : "password"} className={`input${invalid ? " e" : ""}`} aria-invalid={invalid || undefined} />
      <button type="button" className="au-eye" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
