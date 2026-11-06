// M7b auth v2 calls for the admin app (api-users docs/m7b-auth.md): sign-in with 2-step, Profile security, sessions,
// Owner, staff invites. Sign-in answers set the refresh cookie, so those calls go withCredentials.
import axios from "axios";
import { apiUsers } from "./api";
import { auth } from "./session";
import { withSession } from "./auth-axios";

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

/** Public sign-in calls: cookies on, no session redirect (their pages show the errors) */
const signInHttp = withSession(
  axios.create({ baseURL: `${API_GATEWAY}/users`, headers: { "Content-Type": "application/json", "x-iitp-csrf": "1" }, withCredentials: true }),
  { skipAuthRedirect: true }
);

export const MFA_TICKET_HEADER = "x-mfa-ticket";
export const REAUTH_HEADER = "x-reauth-token";

export type MfaMethod = "passkey" | "totp" | "recovery";
export interface SignedIn {
  status: "signed_in";
  token: string;
  expiresAt: string;
  session: { id: string; app: "admin" | "student" };
  recoveryCodesLeft?: number;
}
export type SignInAnswer = SignedIn | { status: "mfa_required"; ticket: string; methods: MfaMethod[]; email: string } | { status: "mfa_setup_required"; ticket: string; email: string };

export interface Security {
  mfa: {
    required: boolean;
    enabled: boolean;
    totp: { enabled: boolean; addedAt: string | null };
    passkeys: Array<{ id: string; name: string; createdAt: string; lastUsedAt: string | null; device: string | null }>;
    recoveryCodes: { remaining: number; createdAt: string | null };
  };
  trustedDevices: number;
}
export interface SessionRow {
  id: string;
  app: "admin" | "student";
  device: string | null;
  ipMasked: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  current: boolean;
}
export interface InviteRow {
  id: string;
  email: string;
  name: string | null;
  roles: Array<{ id: string; name: string }>;
  status: "pending" | "accepted" | "expired" | "revoked";
  invitedBy: { id: string; name: string } | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  lastSentAt: string | null;
  userType?: string;
}
export interface PublicInvite {
  status: "pending";
  email: string;
  name: string | null;
  institute: { name: string };
  invitedBy: { name: string } | null;
  roles: Array<{ id: string; name: string }>;
  host: string | null;
  mfaRequired: boolean;
  legal: { terms: string; privacy: string };
}

const data = <T>(r: { data: { data?: T } & Record<string, unknown> }): T => (r.data.data ?? (r.data as unknown as T)) as T;
const ticketCfg = (ticket?: string | null) => (ticket ? { headers: { [MFA_TICKET_HEADER]: ticket } } : {});
const reauthCfg = (token: string) => ({ headers: { [REAUTH_HEADER]: token } });

/** Keeps the answer's token when it is a session (sign-in, 2-step, set-up with a ticket, invite accept) */
export function keepSession<T>(a: T): T {
  const s = (a as { signIn?: SignedIn } & Partial<SignedIn>) ?? {};
  const signed = s.status === "signed_in" ? (s as SignedIn) : s.signIn?.status === "signed_in" ? s.signIn : null;
  if (signed?.token) auth.setToken(signed.token, signed.expiresAt);
  return a;
}

export const authV2 = {
  login: async (email: string, password: string) =>
    keepSession(data<SignInAnswer>(await signInHttp.post("/auth/login", { email, password, app: "admin", session: "cookie" }))),
  passkeyOptions: async (ticket: string) => data<{ options: PublicKeyCredentialRequestOptionsJSON }>(await signInHttp.post("/auth/mfa/passkey/options", { ticket })).options,
  verify: async (body: { ticket: string; method: MfaMethod; code?: string; credential?: unknown; trustDevice?: boolean }) =>
    keepSession(data<SignedIn>(await signInHttp.post("/auth/mfa/verify", body))),

  security: async (ticket?: string | null) => data<Security>(await (ticket ? signInHttp : apiUsers).get("/me/security", ticketCfg(ticket))),
  totpStart: async (ticket?: string | null) =>
    data<{ secret: string; otpauthUrl: string; keyGroups: string[] | string }>(await (ticket ? signInHttp : apiUsers).post("/me/security/totp/start", {}, ticketCfg(ticket))),
  totpConfirm: async (code: string, ticket?: string | null) =>
    keepSession(data<{ enabled: true; recoveryCodes?: string[]; signIn?: SignedIn }>(await (ticket ? signInHttp : apiUsers).post("/me/security/totp/confirm", { code }, ticketCfg(ticket)))),
  totpRemove: async (reauth: string) => data<unknown>(await apiUsers.delete("/me/security/totp", reauthCfg(reauth))),
  passkeyCreateOptions: async (ticket?: string | null) =>
    data<{ options: PublicKeyCredentialCreationOptionsJSON }>(await (ticket ? signInHttp : apiUsers).post("/me/security/passkeys/options", {}, ticketCfg(ticket))).options,
  passkeyAdd: async (credential: unknown, name?: string, ticket?: string | null) =>
    keepSession(
      data<{ passkey: Security["mfa"]["passkeys"][number]; recoveryCodes?: string[]; signIn?: SignedIn }>(
        await (ticket ? signInHttp : apiUsers).post("/me/security/passkeys", { credential, ...(name ? { name } : {}) }, ticketCfg(ticket))
      )
    ),
  passkeyRename: async (id: string, name: string) => data<unknown>(await apiUsers.patch(`/me/security/passkeys/${encodeURIComponent(id)}`, { name })),
  passkeyRemove: async (id: string, reauth: string) => data<unknown>(await apiUsers.delete(`/me/security/passkeys/${encodeURIComponent(id)}`, reauthCfg(reauth))),
  newRecoveryCodes: async (reauth: string) => data<{ codes: string[] }>(await apiUsers.post("/me/security/recovery-codes", {}, reauthCfg(reauth))),

  sessions: async () => data<{ sessions: SessionRow[] }>(await apiUsers.get("/me/sessions")).sessions,
  endSession: async (id: string) => data<unknown>(await apiUsers.delete(`/me/sessions/${encodeURIComponent(id)}`)),
  endAll: async (reauth: string, includeCurrent: boolean) => data<unknown>(await apiUsers.post("/me/sessions/revoke-all", { includeCurrent }, reauthCfg(reauth))),

  owner: async () => data<{ owner: { id: string; name: string; email: string } | null }>(await apiUsers.get("/admin/owner")).owner,
  transferOwner: async (userId: string, reauth: string) => data<unknown>(await apiUsers.post("/admin/owner/transfer", { userId }, reauthCfg(reauth))),
  resetMfa: async (userId: string, reauth: string) => data<unknown>(await apiUsers.post(`/admin/users/${encodeURIComponent(userId)}/mfa/reset`, {}, reauthCfg(reauth))),

  invites: async (status?: InviteRow["status"]) => data<{ invites: InviteRow[] }>(await apiUsers.get("/admin/invites", { params: status ? { status } : {} })).invites,
  invite: async (body: { email: string; name?: string; userType: "teacher" | "admin" | "operator" | "manager"; roleIds?: string[]; message?: string }) =>
    data<{ invite: InviteRow }>(await apiUsers.post("/admin/invites", body)).invite,
  resendInvite: async (id: string) => data<unknown>(await apiUsers.post(`/admin/invites/${encodeURIComponent(id)}/resend`, {})),
  revokeInvite: async (id: string) => data<unknown>(await apiUsers.delete(`/admin/invites/${encodeURIComponent(id)}`)),
  publicInvite: async (token: string) => data<PublicInvite>(await signInHttp.get(`/public/invites/${encodeURIComponent(token)}`)),
  // Accepting runs outside /users/auth, where the refresh cookie is not sent, so api-users cannot end an earlier
  // account's session on this browser itself (docs/m7b-auth.md §3 "Account switch"): end it first.
  acceptInvite: async (token: string, body: { password: string; name?: string; phone?: string; legal: { terms: string; privacy: string } }) => {
    if (auth.isAuthenticated()) await auth.signOut();
    return keepSession(
      data<SignInAnswer & { user: { id: string; userType: string }; mfaRequired: boolean }>(
        await signInHttp.post(`/public/invites/${encodeURIComponent(token)}/accept`, { ...body, session: "cookie" })
      )
    );
  },
};

/* ─────────────────────────────── WebAuthn (passkeys) ─────────────────────────────── */

type PKC = typeof PublicKeyCredential & {
  parseCreationOptionsFromJSON?: (o: PublicKeyCredentialCreationOptionsJSON) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (o: PublicKeyCredentialRequestOptionsJSON) => PublicKeyCredentialRequestOptions;
};

export const passkeysSupported = () => typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined" && !!navigator.credentials;

const b64uToBuf = (s: string): ArrayBuffer => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out.buffer;
};
const bufToB64u = (buf: ArrayBuffer | null | undefined): string | undefined => {
  if (!buf) return undefined;
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function credentialJSON(c: PublicKeyCredential): unknown {
  const withJson = c as PublicKeyCredential & { toJSON?: () => unknown };
  if (typeof withJson.toJSON === "function") return withJson.toJSON();
  const r = c.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  const response: Record<string, unknown> = { clientDataJSON: bufToB64u(r.clientDataJSON) };
  if ("attestationObject" in r && r.attestationObject) {
    response.attestationObject = bufToB64u(r.attestationObject);
    response.transports = typeof r.getTransports === "function" ? r.getTransports() : [];
  } else {
    response.authenticatorData = bufToB64u(r.authenticatorData);
    response.signature = bufToB64u(r.signature);
    response.userHandle = bufToB64u(r.userHandle);
  }
  return { id: c.id, rawId: bufToB64u(c.rawId), type: c.type, response, clientExtensionResults: c.getClientExtensionResults(), authenticatorAttachment: c.authenticatorAttachment ?? undefined };
}

export async function createPasskey(options: PublicKeyCredentialCreationOptionsJSON): Promise<unknown> {
  const P = PublicKeyCredential as PKC;
  const publicKey: PublicKeyCredentialCreationOptions = P.parseCreationOptionsFromJSON
    ? P.parseCreationOptionsFromJSON(options)
    : {
        ...(options as unknown as PublicKeyCredentialCreationOptions),
        challenge: b64uToBuf(options.challenge),
        user: { ...options.user, id: b64uToBuf(options.user.id) },
        excludeCredentials: (options.excludeCredentials ?? []).map((c) => ({ ...c, id: b64uToBuf(c.id) })) as PublicKeyCredentialDescriptor[],
      };
  const c = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!c) throw new Error("No passkey was made");
  return credentialJSON(c);
}

export async function getPasskey(options: PublicKeyCredentialRequestOptionsJSON): Promise<unknown> {
  const P = PublicKeyCredential as PKC;
  const publicKey: PublicKeyCredentialRequestOptions = P.parseRequestOptionsFromJSON
    ? P.parseRequestOptionsFromJSON(options)
    : {
        ...(options as unknown as PublicKeyCredentialRequestOptions),
        challenge: b64uToBuf(options.challenge),
        allowCredentials: (options.allowCredentials ?? []).map((c) => ({ ...c, id: b64uToBuf(c.id) })) as PublicKeyCredentialDescriptor[],
      };
  const c = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!c) throw new Error("No passkey was used");
  return credentialJSON(c);
}

/** "Chrome on Windows" for a passkey's default name */
export function thisDevice(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPad/.test(ua) ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "this device";
  return `${b} on ${os}`;
}
