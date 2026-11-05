/*
  M6 admin API client for the tests area (contract: api-ai docs/m6-api.md, types ../m6-contract).
  Routes go through the gateway: /tests/admin/*, /users/admin/*, /users/auth/reauth, /ai/admin/*.

  Sample-data fallback (the tests and ai backends land M6 routes in stages): every read and write goes through
  `m6Call(area, real, fixture)`. Mode from NEXT_PUBLIC_M6_FIXTURES (default "auto"), overridable per browser with
  localStorage "iitp.m6.fixtures" = "auto" | "on" | "off":
    - auto: call the real route; when the route does not exist yet (Fastify's route-not-found 404, or 501
      NOT_IMPLEMENTED on a Mongo engine) the area switches to its typed fixture for this page load and the page
      shows a "Sample data" pill (useM6Source). Contract errors (TEST_NOT_FOUND, FORBIDDEN, …) pass through.
    - on: fixtures only (screenshots, QA of states). off: real only.
  States for screenshots (fixture mode only): localStorage "iitp.m6.scenario" = "empty" | "error" | "loading" |
  "forbidden" applies to reads.
*/
import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import { useSyncExternalStore } from "react";
import { AdminApiError, API_GATEWAY, apiError } from "../ai-admin";
import { REAUTH_HEADER, type ReauthResponse } from "../m6-contract";

export { AdminApiError, apiError };

const AUTH_TOKEN_KEY = "auth_token";

function client(prefix: "tests" | "users" | "ai"): AxiosInstance {
  const c = axios.create({
    baseURL: `${API_GATEWAY}/${prefix}`,
    headers: { "Content-Type": "application/json" },
    paramsSerializer: { indexes: null },
  });
  c.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem(AUTH_TOKEN_KEY);
      if (t) config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
  c.interceptors.response.use(
    (r) => r,
    (e: AxiosError) => {
      if (e.response?.status === 401 && typeof window !== "undefined" && !(e.config?.url ?? "").includes("/auth/reauth")) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = "/login";
      }
      return Promise.reject(e);
    }
  );
  return c;
}

export const m6Tests = client("tests");
export const m6Users = client("users");
export const m6Ai = client("ai");

/** `x-iitp-source` header for audit rows ("admin console · Patterns editor"). */
export function source(where: string): AxiosRequestConfig {
  return { headers: { "x-iitp-source": `admin console · ${where}` } };
}

/** Unwraps `{ success, data }` (M6 answers put the payload in data; some answer the fields at the top level). */
export function unwrap<T>(body: unknown): T {
  const b = body as { success?: boolean; data?: unknown } | null;
  if (b && typeof b === "object" && "success" in b && "data" in b && b.data !== undefined) return b.data as T;
  return body as T;
}

/* ─────────────────────────────── sample-data mode ─────────────────────────────── */

export type M6Area = "patterns" | "exams" | "templates" | "tests" | "paper" | "picker" | "monitor" | "calendar" | "links" | "aiBuild" | "reauth";
type Mode = "auto" | "on" | "off";
export type Scenario = "" | "empty" | "error" | "loading" | "forbidden";

function readLS(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function fixtureMode(): Mode {
  const ls = readLS("iitp.m6.fixtures");
  const v = (ls || process.env.NEXT_PUBLIC_M6_FIXTURES || "auto") as Mode;
  return v === "on" || v === "off" ? v : "auto";
}

export function scenario(): Scenario {
  const v = readLS("iitp.m6.scenario") as Scenario | null;
  return v && ["empty", "error", "loading", "forbidden"].includes(v) ? v : "";
}

const sampleAreas = new Set<M6Area>();
const listeners = new Set<() => void>();
function markSample(area: M6Area) {
  if (sampleAreas.has(area)) return;
  sampleAreas.add(area);
  listeners.forEach((l) => l());
}

/** True when the area answered from sample data on this page load (draws the "Sample data" pill). */
export function useM6Source(...areas: M6Area[]): "sample" | "live" {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => (areas.some((a) => sampleAreas.has(a) || fixtureMode() === "on") ? "sample" : "live"),
    () => "live"
  );
}

/** A route that does not exist yet on this backend (not a contract error). */
export function isMissingRoute(e: unknown): boolean {
  const ax = e as AxiosError<{ code?: string; message?: string }>;
  const status = ax?.response?.status;
  const body = ax?.response?.data;
  if (status === 501) return true;
  if (status !== 404) return false;
  const code = body?.code;
  if (code && code !== "FST_ERR_NOT_FOUND" && code !== "NOT_FOUND") return false;
  const msg = body?.message ?? "";
  return !code || /^Route .* not found/i.test(msg) || code === "FST_ERR_NOT_FOUND";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fromFixture<T>(fixture: () => T | Promise<T>, read: boolean): Promise<T> {
  await delay(read ? 180 : 260);
  if (read) {
    const s = scenario();
    if (s === "loading") return new Promise<T>(() => {});
    if (s === "error") throw new AdminApiError(500, "INTERNAL", "Something went wrong on our side. Please try again.");
    if (s === "forbidden") throw new AdminApiError(403, "FORBIDDEN", "Your role can't open this page.", { permission: "READ_TEST" });
  }
  return fixture();
}

/**
 * Runs the real call, or the typed fixture when the route is not there yet (see header). Errors are AdminApiError.
 * `read` marks GETs (scenarios apply to them only).
 */
export async function m6Call<T>(area: M6Area, real: () => Promise<T>, fixture: () => T | Promise<T>, read = false): Promise<T> {
  const mode = fixtureMode();
  if (mode === "on" || sampleAreas.has(area)) {
    if (mode !== "on") markSample(area);
    return fromFixture(fixture, read);
  }
  try {
    return await real();
  } catch (e) {
    if (mode === "auto" && isMissingRoute(e)) {
      markSample(area);
      return fromFixture(fixture, read);
    }
    throw apiError(e);
  }
}

/* ─────────────────────────────── errors ─────────────────────────────── */

export function errCode(e: unknown): string | null {
  return apiError(e).code;
}
export function errDetails<T = Record<string, unknown>>(e: unknown): T | null {
  return apiError(e).details as T | null;
}
/** Field errors of a 400 VALIDATION_ERROR, keyed by form path. */
export function fieldErrors(e: unknown): Record<string, string> {
  const err = apiError(e);
  if (err.code !== "VALIDATION_ERROR") return {};
  const f = (err.details as { fields?: Record<string, { message: string }> } | null)?.fields ?? {};
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.message]));
}
/** A fixture-side contract error (same shape the real route answers). */
export function fixtureError(status: number, code: string, message: string, details: Record<string, unknown> | null = null): AdminApiError {
  return new AdminApiError(status, code, message, details);
}

/* ─────────────────────────────── re-auth ─────────────────────────────── */

/**
 * POST /users/auth/reauth { password } → reauthToken (5 minutes). 401 WRONG_PASSWORD { triesLeft }, 429
 * TOO_MANY_ATTEMPTS. Sample mode: any password of 8+ characters works, "wrongpass" answers WRONG_PASSWORD.
 */
export async function reauth(password: string): Promise<string> {
  const r = await m6Call<ReauthResponse>(
    "reauth",
    async () => unwrap<ReauthResponse>((await m6Users.post("/auth/reauth", { password })).data),
    () => {
      if (password === "wrongpass" || password.length < 8) throw fixtureError(401, "WRONG_PASSWORD", "That password is wrong.", { triesLeft: 4 });
      return { now: new Date().toISOString(), reauthToken: "sample-reauth-token", expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() };
    }
  );
  return r.reauthToken;
}
export function reauthHeader(token: string): AxiosRequestConfig {
  return { headers: { [REAUTH_HEADER]: token } };
}

/* ─────────────────────────────── SSE (AI test builder) ─────────────────────────────── */

/** POST an SSE route; JSON answers are errors from before the stream (AdminApiError). Resolves when the stream ends. */
export async function postStream(
  path: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal
): Promise<"done" | "dropped"> {
  const token = readLS(AUTH_TOKEN_KEY);
  let res: Response;
  try {
    res = await fetch(`${API_GATEWAY}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new AdminApiError(0, null, "You seem to be offline. Check your connection and try again.");
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("text/event-stream") || !res.body) {
    const json = (await res.json().catch(() => null)) as { code?: string; message?: string; details?: Record<string, unknown> } | null;
    throw new AdminApiError(res.status, json?.code ?? null, json?.message || "This is not available right now.", json?.details ?? null);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let cut: number;
      while ((cut = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        let event = "message";
        const lines: string[] = [];
        for (const raw of block.split("\n")) {
          if (!raw || raw.startsWith(":")) continue;
          const i = raw.indexOf(":");
          const field = i < 0 ? raw : raw.slice(0, i);
          const val = i < 0 ? "" : raw.slice(i + 1).replace(/^ /, "");
          if (field === "event") event = val;
          else if (field === "data") lines.push(val);
        }
        if (!lines.length) continue;
        try {
          onEvent(event, JSON.parse(lines.join("\n")));
          if (event === "done") finished = true;
        } catch {
          /* ignore a malformed block */
        }
      }
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return "dropped";
  }
  return finished ? "done" : "dropped";
}
