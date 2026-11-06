/*
  M7b Branding (platform contract docs/m7a-api.md "Branding (M7b)"): /platform/admin/branding/* through the gateway.
  Platform answers its fields at the top level (no { data } wrapper).
*/
import axios, { type AxiosError } from "axios";
import { API_GATEWAY } from "./ai-admin";

const AUTH_TOKEN_KEY = "auth_token";

export interface BrandImage {
  assetId: string;
  url: string;
  contentType: string;
  width: number | null;
  height: number | null;
}
export interface BrandView {
  id: string | null;
  state: "default" | "draft" | "published";
  version: number;
  primary: string;
  accent: string;
  logo: BrandImage | null;
  icon: BrandImage | null;
  baseVersion: number | null;
  restoredFrom: number | null;
  createdByName: string | null;
  publishedAt: string | null;
  publishedByName: string | null;
  updatedAt: string | null;
}
export interface BrandingState {
  live: BrandView;
  draft: BrandView | null;
  changes: string[];
  checks: { primary: { contrastWithWhite: number; passes: boolean } };
}
export interface BrandingPage extends BrandingState {
  tenant: { id: string; slug: string; displayName: string; instituteName: string };
  addresses: { student: string | null; admin: string | null };
  limits: { maxBytes: number; types: string[]; minLogoWidth: number; minIconSize: number };
}
export interface UploadedAsset extends BrandImage {
  kind: "logo" | "icon";
  bytes: number;
  cleaned: boolean;
}

const http = axios.create({ baseURL: `${API_GATEWAY}/platform/admin/branding` });
http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem(AUTH_TOKEN_KEY);
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (e: AxiosError) => {
    if (e.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = "/login?expired=1";
    }
    return Promise.reject(e);
  }
);

export const brandingApi = {
  get: () => http.get<BrandingPage>("").then((r) => r.data),
  saveDraft: (body: { primary?: string; accent?: string; logoAssetId?: string | null; iconAssetId?: string | null }) => http.put<BrandingState>("/draft", body).then((r) => r.data),
  upload: (kind: "logo" | "icon", file: File) =>
    http
      .post<{ asset: UploadedAsset }>("/assets", file, { params: { kind, name: file.name }, headers: { "Content-Type": file.type || "application/octet-stream" } })
      .then((r) => r.data.asset),
  publish: (draftId: string) => http.post<{ live: BrandView; previous: BrandView; changes: string[]; liveOn: string | null }>("/publish", { draftId }).then((r) => r.data),
  history: (before?: number) => http.get<{ items: BrandView[]; nextBefore: number | null; liveVersion: number; draftRestoredFrom: number | null }>("/history", { params: { before, limit: 20 } }).then((r) => r.data),
  restore: (version: number) => http.post<BrandingState>(`/history/${version}/restore`).then((r) => r.data),
};
