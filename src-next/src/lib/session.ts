// The staff session (auth v2, api-users docs/m7b-auth.md). No HTTP client here: lib/api.ts and the lib/*-api fetch
// helpers call it.
//
// - The access token (15 minutes) lives in memory only. The refresh token is an HttpOnly cookie on the API host that only
//   POST /users/auth/refresh and /logout can read; every refresh rotates it.
// - localStorage keeps a non-secret hint ("this browser has a session") so a reload knows to refresh before calling the API.
// - Tokens stored by the old app ("auth_token") are traded once for a cookie session, then deleted (an account with
//   2-step on is sent to sign in instead).
// - One refresh at a time per tab, and one across tabs (Web Locks); tabs share fresh tokens and sign-outs over a
//   BroadcastChannel, so two tabs never race the rotation.
// - A refresh that fails for lack of network keeps the session: a paper in progress keeps its saves queued and retries.

/** The old app's token key: read once for the exchange, then removed */
export const AUTH_TOKEN_KEY = "auth_token";
const HINT_KEY = "IITP_ADMIN_SESSION";
const APP = "admin";
const CHANNEL = "iitp-auth-admin";
const LOCK = "iitp-refresh-admin";
/** Refresh when less than this is left (the API allows 30 s of clock skew) */
const MIN_VALIDITY_MS = 90_000;

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

type Access = { token: string; exp: number; margin?: number };

let access: Access | null = null;
let inflight: Promise<string | null> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let exchangeRetryAt = 0;
let lastEndReason: string | null = null;
let channel: BroadcastChannel | null = null;
/** M8 support visit: a read-only token kept in this tab's memory only (no refresh, no storage, no other tabs) */
let supportVisit = false;
const signedOutListeners = new Set<() => void>();

const isBrowser = () => typeof window !== "undefined";

function store(): Storage | null {
  try {
    return isBrowser() ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** A claim of a JWT (unverified: for display and keys only) */
function claimOf(token: string, name: string): unknown {
  try {
    const part = token.split(".")[1];
    if (!part) return undefined;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")))[name];
  } catch {
    return undefined;
  }
}

/** `exp` (ms) of a JWT, or 0 */
function expOf(token: string): number {
  try {
    const part = token.split(".")[1];
    if (!part) return 0;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function legacyToken(): string | null {
  const t = store()?.getItem(AUTH_TOKEN_KEY) ?? null;
  if (!t) return null;
  const exp = expOf(t);
  if (exp && exp < Date.now()) {
    store()?.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
  return t;
}

function bc(): BroadcastChannel | null {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent) => {
      if (supportVisit) return; // a support-visit tab never takes another tab's session (or its sign-out)
      const m = e.data as { type?: string; token?: string; exp?: number } | null;
      if (m?.type === "token" && m.token && m.exp && (!access || m.exp > access.exp)) {
        access = { token: m.token, exp: m.exp, margin: Math.min(MIN_VALIDITY_MS, Math.max(5_000, (m.exp - Date.now()) / 4)) };
        schedule();
      } else if (m?.type === "signed_out") {
        clearLocal();
        signedOutListeners.forEach((fn) => fn());
      }
    };
  }
  return channel;
}

/** Refresh this long before expiry: 90 s, or a quarter of a short token's life (test stacks with 60-second tokens) */
const marginOf = (a: Access) => a.margin ?? MIN_VALIDITY_MS;

function schedule() {
  if (!isBrowser() || !access || supportVisit) return;
  if (timer) clearTimeout(timer);
  const wait = Math.max(5_000, access.exp - Date.now() - marginOf(access));
  timer = setTimeout(() => {
    void auth.ensureToken().catch(() => undefined);
  }, wait);
}

function clearLocal() {
  access = null;
  if (timer) clearTimeout(timer);
  timer = null;
  if (supportVisit) return; // the normal session of other tabs stays
  store()?.removeItem(HINT_KEY);
  store()?.removeItem(AUTH_TOKEN_KEY);
}

function remember(token: string, expiresAt?: string | null, broadcast = true) {
  const exp = (expiresAt ? Date.parse(expiresAt) : 0) || expOf(token) || Date.now() + 15 * 60_000;
  access = { token, exp, margin: Math.min(MIN_VALIDITY_MS, Math.max(5_000, (exp - Date.now()) / 4)) };
  store()?.setItem(HINT_KEY, "1");
  schedule();
  if (broadcast) bc()?.postMessage({ type: "token", token, exp });
}

// keepalive: a refresh in flight when the page navigates away still finishes, so the browser stores the rotated cookie
// (an aborted refresh would leave the old cookie, and presenting it later counts as reuse and ends the session).
async function post(path: string, body: unknown, bearer?: string, keepalive = true): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-iitp-csrf": "1" };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(`${API_GATEWAY}/users${path}`, { method: "POST", credentials: "include", headers, body: JSON.stringify(body), cache: "no-store", keepalive });
  return { status: res.status, body: await res.json().catch(() => null) };
}

type TokenData = { token?: string; expiresAt?: string };
const tokenOf = (body: unknown): TokenData => ((body as { data?: TokenData } | null)?.data ?? {}) as TokenData;

/** One refresh (or the one-time exchange). null = no session; throws only when the network failed. */
async function refreshNow(): Promise<string | null> {
  // An old-style token in storage wins over the current session: it was just put there (an /auth/<token> link, a
  // sign-in on the old app in another tab) and names who should be signed in now.
  const legacy = legacyToken();
  if (legacy && claimOf(legacy, "sid")) {
    // a v2 access token put in storage (a hand-off, QA flows): used as it is until it expires; it has no refresh
    const exp = expOf(legacy);
    if (exp - Date.now() > 30_000) {
      access = { token: legacy, exp };
      return legacy;
    }
    store()?.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
  if (legacy) {
    if (Date.now() < exchangeRetryAt) return legacy;
    let r: { status: number; body: unknown };
    try {
      r = await post("/auth/refresh", { app: APP, session: "cookie" }, legacy);
    } catch {
      exchangeRetryAt = Date.now() + 5 * 60_000;
      return legacy; // offline or the API is down: keep using the old token until it can be traded
    }
    const t = tokenOf(r.body);
    if (r.status === 200 && t.token) {
      store()?.removeItem(AUTH_TOKEN_KEY);
      remember(t.token, t.expiresAt);
      return t.token;
    }
    if (r.status === 401 || r.status === 403) {
      // 401 {reason: "mfa"}: the account has 2-step; it signs in again (the sign-in page says why)
      lastEndReason = (r.body as { details?: { reason?: string } } | null)?.details?.reason ?? null;
      clearLocal();
      return null;
    }
    exchangeRetryAt = Date.now() + 5 * 60_000; // an API that doesn't know the exchange yet: keep the old token
    return legacy;
  }
  if (!store()?.getItem(HINT_KEY)) return null;
  let r: { status: number; body: unknown };
  try {
    r = await post("/auth/refresh", { app: APP });
  } catch {
    throw new Error("offline");
  }
  const t = tokenOf(r.body);
  if (r.status === 200 && t.token) {
    remember(t.token, t.expiresAt);
    return t.token;
  }
  if (r.status === 401) {
    lastEndReason = (r.body as { details?: { reason?: string } } | null)?.details?.reason ?? null;
    clearLocal();
    return null;
  }
  throw new Error(`refresh failed (${r.status})`);
}

async function refreshShared(): Promise<string | null> {
  const locks = isBrowser() ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks?.request) return refreshNow();
  return locks.request(LOCK, async () => {
    // another tab may have refreshed while this one waited for the lock (its token came over the channel)
    if (access && access.exp - Date.now() > marginOf(access)) return access.token;
    return refreshNow();
  });
}

export const auth = {
  /** The current access token, if any (may be about to expire: API calls go through ensureToken) */
  getToken: (): string | null => {
    if (!isBrowser()) return null;
    if (supportVisit) return access && access.exp > Date.now() ? access.token : null;
    bc();
    if (access && access.exp > Date.now()) return access.token;
    return legacyToken();
  },
  /** A token with at least 90 s left, refreshing if needed. null = signed out. Offline: the last token (or null). */
  ensureToken: async (opts?: { force?: boolean }): Promise<string | null> => {
    if (!isBrowser()) return null;
    // a support visit has no refresh: its token lives until the visit ends
    if (supportVisit) return access && access.exp > Date.now() ? access.token : null;
    bc();
    if (!opts?.force && access && access.exp - Date.now() > marginOf(access)) return access.token;
    if (!inflight) {
      inflight = refreshShared().finally(() => {
        inflight = null;
      });
    }
    try {
      return await inflight;
    } catch {
      return auth.getToken();
    }
  },
  /** After a v2 sign-in (password, 2-step, invite): the token and its expiry. A legacy token is traded at the next call. */
  setToken: (token: string, expiresAt?: string | null): void => {
    if (!isBrowser()) return;
    bc();
    if (expOf(token) - Date.now() > 60 * 60_000 && !expiresAt) {
      // a 7-day legacy token (an API without auth v2, a test-key link): the next call trades it for a cookie session
      access = null;
      exchangeRetryAt = 0;
      store()?.setItem(AUTH_TOKEN_KEY, token);
      return;
    }
    store()?.removeItem(AUTH_TOKEN_KEY);
    remember(token, expiresAt);
  },
  /** Forget this tab's session without calling the API (other tabs too) */
  removeToken: (): void => {
    if (!isBrowser()) return;
    clearLocal();
    if (supportVisit) return;
    bc()?.postMessage({ type: "signed_out" });
  },
  /** Sign out: ends the cookie session on the API, then forgets it in every tab */
  signOut: async (): Promise<void> => {
    if (!isBrowser()) return;
    // Forget it here first (callers navigate away at once), then end the cookie session; keepalive lets the request
    // finish after the page is gone. Offline: the session ends by itself (idle timeout).
    auth.removeToken();
    if (supportVisit) return; // the visit ends through /platform/support-visit/end, never the cookie session
    try {
      await post("/auth/logout", { app: APP }, undefined, true);
    } catch {
      // nothing to do
    }
  },
  /** True when this browser has (or may have) a session: a token in memory, the session hint, or an old token */
  isAuthenticated: (): boolean => {
    if (!isBrowser()) return false;
    if (supportVisit) return !!(access && access.exp > Date.now());
    return !!(access && access.exp > Date.now()) || !!store()?.getItem(HINT_KEY) || !!legacyToken();
  },
  /** Stable for one sign-in (the session id; an old token's tail): "ask once per session" prompts key on it */
  sessionKey: (token: string): string => {
    const sid = claimOf(token, "sid");
    return typeof sid === "string" && sid ? sid : token.slice(-32);
  },
  /** Why the last refresh ended the session ("reuse", "expired", "mfa", …), for the sign-in page's message */
  lastEndReason: (): string | null => lastEndReason,
  /**
   * M8 support visit (POST /users/auth/support-visit): the read-only token, in this tab's memory only. Nothing is
   * stored, nothing is shared with other tabs (their own session stays), and nothing refreshes it: it ends with the visit.
   */
  startSupportVisit: (token: string, expiresAt?: string | null): void => {
    if (!isBrowser()) return;
    supportVisit = true;
    if (timer) clearTimeout(timer);
    timer = null;
    access = { token, exp: (expiresAt ? Date.parse(expiresAt) : 0) || expOf(token) || Date.now() + 30 * 60_000 };
  },
  /** True in a support-visit tab */
  isSupportVisit: (): boolean => supportVisit,
  /** Called when another tab signs out */
  onSignedOut: (fn: () => void): (() => void) => {
    signedOutListeners.add(fn);
    return () => signedOutListeners.delete(fn);
  },
};
