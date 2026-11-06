"use client";
/*
  M8 support visit hand-off (Platform-Impersonation): the platform console opens /support-visit#code=<code>. The
  single-use, 60-second code is redeemed at POST /users/auth/support-visit; the read-only token stays in this tab's
  memory (lib/session.ts startSupportVisit) and the dashboard opens with the support-visit banner.
  States without a board use the Admin-Auth shell + messages: opening, link used or expired, no admin yet, ended.
*/
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createJSONStorage } from "zustand/middleware";
import { auth } from "@/lib/session";
import { supportVisitApi, SupportVisitError } from "@/lib/support-visit";
import { useAuthStore } from "@/stores";
import { AuthMsg } from "@/components/people/auth/parts";

/** The auth store persists to localStorage; a support visit must leave the staff member's own session there alone. */
const memory = new Map<string, string>();
const memoryStorage = createJSONStorage(() => ({
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
}));

function claims(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function Visit() {
  const sp = useSearchParams();
  const router = useRouter();
  const ended = sp.get("ended") === "1";
  const [state, setState] = useState<"opening" | "invalid" | "no-admin" | "error" | "ended">(ended ? "ended" : "opening");
  const [msg, setMsg] = useState<string | null>(null);
  const once = useRef(false);

  useEffect(() => {
    if (ended || once.current) return;
    once.current = true;
    const code = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("code");
    // the code works once: take it out of the address bar and history at once
    window.history.replaceState(null, "", "/support-visit");
    if (!code) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const r = await supportVisitApi.redeem(code);
        auth.startSupportVisit(r.token, r.expiresAt);
        useAuthStore.persist.setOptions({ storage: memoryStorage as never });
        const c = claims(r.token) ?? {};
        const roles = Array.isArray(c.roles) ? Object.fromEntries((c.roles as Array<{ id?: string }>).filter((x) => x?.id).map((x) => [x.id as string, true])) : {};
        useAuthStore.setState({
          currentUser: { id: String(c.id ?? ""), email: String(c.email ?? ""), userType: String(c.userType ?? "admin") as never, instituteId: c.instituteId as string | undefined, roles },
          isAuthenticated: true,
          error: null,
        });
        document.documentElement.dataset.supportVisit = "1";
        router.replace("/");
      } catch (e) {
        const err = e as SupportVisitError;
        if (err.code === "HANDOFF_INVALID" || err.status === 410) setState("invalid");
        else if (err.code === "NO_ADMIN_YET") setState("no-admin");
        else {
          setMsg(err.message);
          setState("error");
        }
      }
    })();
  }, [ended, router]);

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="col" style={{ gap: 4 }}>
        <span className="eyebrow">IIT-PULSE support</span>
        <h1 className="h2">{state === "ended" ? "Support visit ended" : state === "opening" ? "Opening the support visit…" : "Can't open the support visit"}</h1>
      </div>
      {state === "opening" && <AuthMsg tone="info">Read only, for 30 minutes. The institute&apos;s Owner was emailed and the visit is in their audit log.</AuthMsg>}
      {state === "invalid" && (
        <AuthMsg tone="warn" alert>
          <b>This link was already used or has expired.</b> Visit links work once, for 60 seconds. Open the visit again from the platform console (institute page › Open again).
        </AuthMsg>
      )}
      {state === "no-admin" && (
        <AuthMsg tone="warn" alert>
          <b>This institute has no admin yet.</b> The visit opens once the first admin has accepted their invite.
        </AuthMsg>
      )}
      {state === "error" && (
        <AuthMsg tone="bad" alert>
          {msg ?? "Something went wrong."} Try again from the platform console.
        </AuthMsg>
      )}
      {state === "ended" && (
        <AuthMsg tone="ok">
          <b>The visit is over.</b> Its start, end and pages viewed are saved in the institute&apos;s audit log and the platform audit log. You can close this tab.
        </AuthMsg>
      )}
    </div>
  );
}

export default function SupportVisitPage() {
  return (
    <Suspense>
      <Visit />
    </Suspense>
  );
}
