// M8 support visits, institute side (server/platform docs/m8-api.md "Support visits"). A platform staff member opens
// https://<admin host>/support-visit#code=<code> from the platform console; this app redeems the single-use code at
// POST /users/auth/support-visit and keeps the read-only token in memory only (lib/session.ts startSupportVisit).
// The banner reads GET /platform/support-visit, page views go to POST /platform/support-visit/pages and "End visit"
// calls POST /platform/support-visit/end. Every write answers 403 READ_ONLY: the blocked-change toast.
import { notify } from "@/components/kit/Toast";

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

export const SUPPORT_VISIT_ENDED_PATH = "/support-visit?ended=1";

export interface SupportVisitSignIn {
  status: "signed_in";
  token: string;
  expiresAt: string;
  readOnly: true;
  visit: { id: string; staffName: string; reason: string; ticket: string | null; startedAt: string; expiresAt: string; institute: { name: string } };
}

export interface SupportVisitState {
  id: string;
  staff: { id: string; name: string };
  institute?: { id: string; displayName: string };
  reason: string;
  ticket: string | null;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  active: boolean;
  minutesLeft: number;
  minutes: number;
  pages: string[];
}

export class SupportVisitError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string
  ) {
    super(message);
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    headers["x-iitp-csrf"] = "1";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_GATEWAY}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; code?: string; message?: string; data?: unknown };
  if (!res.ok || data.success === false) throw new SupportVisitError(res.status, data.code ?? null, data.message ?? `Request failed (${res.status})`);
  return ((data as { data?: T }).data ?? data) as T;
}

export const supportVisitApi = {
  /** single-use 60-second code from the URL fragment → the read-only token */
  redeem: (code: string) => call<SupportVisitSignIn>("POST", "/users/auth/support-visit", { code }),
  state: (token: string) => call<{ visit: SupportVisitState }>("GET", "/platform/support-visit", undefined, token),
  page: (token: string, path: string) => call<{ ok: true }>("POST", "/platform/support-visit/pages", { path }, token),
  end: (token: string) => call<{ ok: true }>("POST", "/platform/support-visit/end", {}, token),
};

let lastToast = 0;
/** Platform-Impersonation "blocked-change": once per 3 s however many writes fail together */
export function notifyReadOnly(): void {
  if (Date.now() - lastToast < 3000) return;
  lastToast = Date.now();
  notify.error("You can't make changes during a support visit.", { description: "Ask the institute to do it, or note it on the ticket." });
}
