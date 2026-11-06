// Auth for every admin axios client (auth v2, lib/session.ts): a fresh access token on each request, one refresh + retry
// on a 401, then "session expired" sign-in. The re-auth dialog's 401 WRONG_PASSWORD and the sign-in calls are left to
// their pages.
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { auth } from "./session";

const PAGE_HANDLES_401 = /\/auth\/(login|reauth|refresh|logout|mfa\/)|\/public\/invites\//;

export function toSignIn(): void {
  if (typeof window === "undefined") return;
  auth.removeToken();
  // Admin-Auth "session-expired": the login page explains why (not on the login page itself).
  const reason = auth.lastEndReason();
  if (!window.location.pathname.startsWith("/login")) window.location.href = `/login?expired=1${reason === "mfa" ? "&mfa=1" : ""}`;
}

export function withSession<T extends AxiosInstance>(client: T, options?: { skipAuthRedirect?: boolean }): T {
  client.interceptors.request.use(async (config) => {
    if (typeof window !== "undefined" && !config.headers.Authorization) {
      const token = await auth.ensureToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  client.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const cfg = error.config as (InternalAxiosRequestConfig & { _iitpRetried?: boolean }) | undefined;
      if (error.response?.status === 401 && typeof window !== "undefined" && !PAGE_HANDLES_401.test(cfg?.url ?? "")) {
        if (cfg && !cfg._iitpRetried) {
          cfg._iitpRetried = true;
          const fresh = await auth.ensureToken({ force: true });
          if (fresh) {
            cfg.headers.Authorization = `Bearer ${fresh}`;
            return client.request(cfg);
          }
        }
        if (!options?.skipAuthRedirect) toSignIn();
      }
      return Promise.reject(error);
    }
  );
  return client;
}

/** fetch() with the session's token: one refresh + retry on 401 (streams, uploads, PDFs). 401 after that = sign in. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const go = (token: string | null) => fetch(input, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  let res = await go(await auth.ensureToken());
  if (res.status === 401) {
    const fresh = await auth.ensureToken({ force: true });
    if (fresh) res = await go(fresh);
  }
  return res;
}
