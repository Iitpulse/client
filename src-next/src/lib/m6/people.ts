/*
  M6 people & setup data (contract: api-ai docs/m6-api.md "users", types ../m6-contract): me/profile, locations, users
  list + drawer + bulk + delete family, imports, roles + catalog + members, batches + promo codes, centres, audit
  reader, plus Setup's exams (tests) and taxonomy (questions). All routes are live on dev and staging (users part 2,
  6 Nov), so these call the real API; errors are axios errors (read them with the kit's `apiError`).
  Every write sends `x-iitp-source` ("admin console · Users drawer") for the audit row.
*/
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiQuestions } from "../api";
import type {
  AuditDetail,
  AuditExportResponse,
  AuditListQuery,
  AuditListResponse,
  AuditPeopleResponse,
  BatchDetail,
  BatchListResponse,
  BatchWriteRequest,
  Centre,
  CentreListResponse,
  CentreWriteRequest,
  DeleteImpact,
  DeleteUserResponse,
  ExamListItem,
  ExamWriteRequest,
  ImportKind,
  ImportRowsResponse,
  ImportRow,
  ImportSession,
  LocationsResponse,
  MeResponse,
  MeUpdateRequest,
  PasswordChangeRequest,
  PermissionCatalog,
  PromoGenerateResponse,
  RoleListResponse,
  RoleMembersResponse,
  RoleWriteRequest,
  RoleWriteResponse,
  SoftDeleteResponse,
  TaxonomyTreeResponse,
  UserBulkRequest,
  UserBulkResponse,
  UserDetail,
  UserListQuery,
  UserListResponse,
  UserType,
  UserWriteRequest,
} from "../m6-contract";
import { m6Tests, m6Users, reauthHeader, source, unwrap } from "./client";

const get = async <T>(path: string, params?: object) => unwrap<T>((await m6Users.get(path, { params })).data);
const send = async <T>(method: "post" | "patch" | "delete" | "put", path: string, where: string, body?: unknown, reauth?: string) => {
  const cfg = { ...source(where), ...(reauth ? { headers: { ...source(where).headers, ...reauthHeader(reauth).headers } } : {}) };
  const r = method === "delete" ? await m6Users.delete(path, { ...cfg, data: body }) : await m6Users[method](path, body, cfg);
  return unwrap<T>(r.data);
};
/** Clean query params: drop empty strings. */
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));

/* ───────────── me, permissions ───────────── */

export function useMe() {
  return useQuery({ queryKey: ["m6", "me"], staleTime: 60_000, queryFn: () => get<MeResponse>("/me") });
}
/** Effective permission check: admins always pass (contract). Undefined while loading. */
/** The admin role id (users m7b-permissions §1: admin is a role, ROLE_ADMIN, never the userType). */
export const ADMIN_ROLE_ID = "ROLE_ADMIN";
/** An admin: holds the Admin role, or is the institute's Owner. `userType: "admin"` alone no longer counts (users 0013). */
export function isAdminUser(u: { roles?: Array<{ id: string }> | null; isOwner?: boolean; access?: { owner?: boolean } } | null | undefined): boolean {
  return !!u && (!!u.roles?.some((r) => r.id === ADMIN_ROLE_ID) || u.isOwner === true || u.access?.owner === true);
}

export function useCan() {
  const me = useMe();
  const u = me.data?.user;
  const can = (...keys: string[]) => !!u && (isAdminUser(u) || keys.some((k) => u.permissions.includes(k)));
  return { can, me: u ?? null, loading: me.isLoading, roleName: u?.roles[0]?.name ?? (u ? USER_TYPE_LABEL[u.userType] : null) };
}
export const meApi = {
  update: (b: MeUpdateRequest) => send<MeResponse>("patch", "/me", "Profile", b),
  password: (b: PasswordChangeRequest) => send<void>("post", "/me/password", "Profile", b),
};

export function useLocations() {
  return useQuery({ queryKey: ["m6", "locations"], staleTime: 30 * 60_000, queryFn: () => get<LocationsResponse>("/meta/locations") });
}

export const USER_TYPE_LABEL: Record<UserType, string> = { student: "Student", teacher: "Teacher", admin: "Admin", operator: "Operator", manager: "Manager" };

/* ───────────── users ───────────── */

export const peopleKeys = {
  users: (q: Partial<UserListQuery>) => ["m6", "people", "users", q] as const,
  user: (id: string) => ["m6", "people", "user", id] as const,
};
export function useUsers(q: UserListQuery, enabled = true) {
  return useQuery({
    queryKey: peopleKeys.users(q),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => get<UserListResponse>("/admin/users", clean({ ...q })),
  });
}
export function useUser(id: string | null) {
  return useQuery({ queryKey: peopleKeys.user(id ?? ""), enabled: !!id, queryFn: () => get<{ user?: UserDetail } & UserDetail>(`/admin/users/${encodeURIComponent(id!)}`).then((d) => (d.user ?? d) as UserDetail) });
}
export const usersApi = {
  create: (b: UserWriteRequest) => send<{ user?: UserDetail } & UserDetail>("post", "/admin/users", "Users drawer", b).then((d) => (d.user ?? d) as UserDetail),
  update: (id: string, b: Partial<UserWriteRequest>) => send<{ user?: UserDetail } & UserDetail>("patch", `/admin/users/${encodeURIComponent(id)}`, "Users drawer", b).then((d) => (d.user ?? d) as UserDetail),
  bulk: (b: UserBulkRequest, reauth?: string) => send<UserBulkResponse>("post", "/admin/users/bulk", "Users bulk bar", b, reauth),
  impact: (id: string) => get<DeleteImpact>(`/admin/users/${encodeURIComponent(id)}/delete-impact`),
  remove: (id: string, reauth: string) => send<DeleteUserResponse>("delete", `/admin/users/${encodeURIComponent(id)}`, "Users drawer", undefined, reauth),
  anonymise: (id: string, reauth: string) => send<DeleteUserResponse>("post", `/admin/users/${encodeURIComponent(id)}/anonymise`, "Users drawer", {}, reauth),
  erase: (id: string, reauth: string) => send<DeleteUserResponse>("post", `/admin/users/${encodeURIComponent(id)}/erase`, "Users drawer", {}, reauth),
  /** existing export: CSV of the given students */
  exportStudents: async (ids: string[]) => (await m6Users.post("/bulk/students/export", { ids, studentIds: ids }, { responseType: "blob", ...source("Users bulk bar") })).data as Blob,
  /** existing reset flow: emails a reset link to the person */
  sendReset: (email: string) => send<unknown>("post", "/reset-password/request", "Users drawer", { email }),
};
export function useInvalidatePeople() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["m6", "people"] });
    void qc.invalidateQueries({ queryKey: ["m6", "batches"] });
  };
}

/* ───────────── imports ───────────── */

export const importsApi = {
  upload: async (file: File, kind: ImportKind, defaultBatchId?: string | null, onProgress?: (p: number) => void) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    if (defaultBatchId) fd.append("defaultBatchId", defaultBatchId);
    const r = await m6Users.post("/admin/imports", fd, {
      params: clean({ kind, defaultBatchId }),
      headers: { "Content-Type": "multipart/form-data", ...source("Users import").headers },
      onUploadProgress: (e) => e.total && onProgress?.((e.loaded / e.total) * 100),
    });
    const d = unwrap<{ session?: ImportSession } & ImportSession>(r.data);
    return (d.session ?? d) as ImportSession;
  },
  session: (id: string) => get<{ session?: ImportSession } & ImportSession>(`/admin/imports/${id}`).then((d) => (d.session ?? d) as ImportSession),
  rows: (id: string, state: string, page: number, pageSize = 25) => get<ImportRowsResponse>(`/admin/imports/${id}/rows`, clean({ state, page, pageSize })),
  fixRow: (id: string, row: number, values: Record<string, string>) =>
    send<{ row?: ImportRow } & ImportRow>("patch", `/admin/imports/${id}/rows/${row}`, "Users import", { values }).then((d) => (d.row ?? d) as ImportRow),
  start: (id: string, onExisting: "skip" | "update") => send<{ session?: ImportSession } & ImportSession>("post", `/admin/imports/${id}/start`, "Users import", { onExisting }).then((d) => (d.session ?? d) as ImportSession),
  stop: (id: string) => send<{ session?: ImportSession } & ImportSession>("post", `/admin/imports/${id}/stop`, "Users import", {}).then((d) => (d.session ?? d) as ImportSession),
  failedXlsx: async (id: string) => (await m6Users.get(`/admin/imports/${id}/failed.xlsx`, { responseType: "blob" })).data as Blob,
  template: async (kind: ImportKind) => (await m6Users.get("/admin/imports/template.xlsx", { params: { kind }, responseType: "blob" })).data as Blob,
};

/** Save a Blob as a file. */
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ───────────── roles ───────────── */

export function useCatalog() {
  return useQuery({ queryKey: ["m6", "people", "catalog"], staleTime: 10 * 60_000, queryFn: () => get<PermissionCatalog>("/admin/permissions/catalog") });
}
export function useRoles() {
  return useQuery({ queryKey: ["m6", "people", "roles"], queryFn: () => get<RoleListResponse>("/admin/roles") });
}
export function useRoleMembers(id: string | null, q: string, page: number) {
  return useQuery({
    queryKey: ["m6", "people", "role-members", id, q, page],
    enabled: !!id,
    placeholderData: keepPreviousData,
    queryFn: () => get<RoleMembersResponse>(`/admin/roles/${encodeURIComponent(id!)}/members`, clean({ q, page, pageSize: 25 })),
  });
}
export const rolesApi = {
  create: (b: RoleWriteRequest) => send<RoleWriteResponse>("post", "/admin/roles", "Roles", b),
  update: (id: string, b: RoleWriteRequest) => send<RoleWriteResponse>("patch", `/admin/roles/${encodeURIComponent(id)}`, "Roles", b),
  remove: (id: string, reauth: string) => send<unknown>("delete", `/admin/roles/${encodeURIComponent(id)}`, "Roles", undefined, reauth),
  addMembers: (id: string, userIds: string[]) => send<unknown>("post", `/admin/roles/${encodeURIComponent(id)}/members`, "Roles · Members", { userIds }),
  removeMember: (id: string, userId: string) => send<unknown>("delete", `/admin/roles/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, "Roles · Members"),
};

/* ───────────── batches, centres ───────────── */

export function useBatchList(q: { q?: string; centreId?: string; medium?: string; page?: number; pageSize?: number; sort?: string; includeArchived?: string }) {
  return useQuery({
    queryKey: ["m6", "people", "batches", q],
    placeholderData: keepPreviousData,
    queryFn: () => get<BatchListResponse>("/admin/batches", clean({ ...q })),
  });
}
/** Every batch (pickers): first 100. */
export function useAllBatches(enabled = true) {
  return useQuery({ queryKey: ["m6", "people", "batches", "all"], enabled, staleTime: 60_000, queryFn: () => get<BatchListResponse>("/admin/batches", { pageSize: 100 }) });
}
export function useBatch(id: string | null) {
  return useQuery({
    queryKey: ["m6", "people", "batch", id],
    enabled: !!id,
    queryFn: () => get<{ batch?: BatchDetail } & BatchDetail>(`/admin/batches/${encodeURIComponent(id!)}`).then((d) => (d.batch ?? d) as BatchDetail),
  });
}
const B = "Setup · Batches";
export const batchesApi = {
  create: (b: BatchWriteRequest) => send<unknown>("post", "/admin/batches", B, b),
  update: (id: string, b: BatchWriteRequest) => send<unknown>("patch", `/admin/batches/${encodeURIComponent(id)}`, B, b),
  remove: (id: string, reauth: string) => send<SoftDeleteResponse>("delete", `/admin/batches/${encodeURIComponent(id)}`, B, undefined, reauth),
  archive: (id: string) => send<unknown>("post", `/admin/batches/${encodeURIComponent(id)}/archive`, B, {}),
  restore: (id: string) => send<unknown>("post", `/admin/batches/${encodeURIComponent(id)}/restore`, B, {}),
  generate: (count = 1) => send<PromoGenerateResponse>("post", "/admin/batches/promo-codes/generate", B, { count }),
  assignTeachers: (assignments: Array<{ teacherId: string; batchIds: string[] }>) => send<unknown>("post", "/admin/batches/assign-teachers", B, { assignments }),
};

export function useCentres() {
  return useQuery({ queryKey: ["m6", "people", "centres"], staleTime: 60_000, queryFn: () => get<CentreListResponse>("/admin/centres") });
}
const C = "Setup · Centres";
export const centresApi = {
  create: (b: CentreWriteRequest) => send<{ centre?: Centre } & Centre>("post", "/admin/centres", C, b),
  update: (id: string, b: CentreWriteRequest) => send<{ centre?: Centre } & Centre>("patch", `/admin/centres/${encodeURIComponent(id)}`, C, b),
  archive: (id: string) => send<unknown>("post", `/admin/centres/${encodeURIComponent(id)}/archive`, C, {}),
  restore: (id: string) => send<unknown>("post", `/admin/centres/${encodeURIComponent(id)}/restore`, C, {}),
};

/* ───────────── audit ───────────── */

export function useAudit(q: AuditListQuery, enabled = true) {
  return useQuery({ queryKey: ["m6", "people", "audit", q], enabled, placeholderData: keepPreviousData, queryFn: () => get<AuditListResponse>("/admin/audit/events", clean({ ...q })) });
}
export const auditApi = {
  list: (q: AuditListQuery) => get<AuditListResponse>("/admin/audit/events", clean({ ...q })),
  event: (id: string) => get<{ event?: AuditDetail } & AuditDetail>(`/admin/audit/events/${encodeURIComponent(id)}`).then((d) => (d.event ?? d) as AuditDetail),
  people: (q: string) => get<AuditPeopleResponse>("/admin/audit/people", clean({ q })),
  export: (filters: Omit<AuditListQuery, "cursor" | "limit">) => send<AuditExportResponse>("post", "/admin/audit/export", "Audit logs", { filters: clean({ ...filters }) }),
};

/* ───────────── Setup: exams (tests), taxonomy (questions) ───────────── */

export function useExamList(includeDeleted: boolean) {
  return useQuery({
    queryKey: ["m6", "exams", "setup", includeDeleted],
    queryFn: async () => {
      const d = unwrap<{ items?: ExamListItem[] } | ExamListItem[]>((await m6Tests.get("/admin/exams", { params: includeDeleted ? { includeDeleted: 1 } : {} })).data);
      return Array.isArray(d) ? d : d.items ?? [];
    },
  });
}
const E = "Setup · Exams";
export const examsApi = {
  create: async (b: ExamWriteRequest) => unwrap<unknown>((await m6Tests.post("/admin/exams", b, source(E))).data),
  update: async (id: string, b: ExamWriteRequest) => unwrap<unknown>((await m6Tests.patch(`/admin/exams/${encodeURIComponent(id)}`, b, source(E))).data),
  remove: async (id: string) => unwrap<SoftDeleteResponse>((await m6Tests.delete(`/admin/exams/${encodeURIComponent(id)}`, source(E))).data),
  restore: async (id: string) => unwrap<unknown>((await m6Tests.post(`/admin/exams/${encodeURIComponent(id)}/restore`, {}, source(E))).data),
};

export function useTaxonomy(q: string) {
  return useQuery({
    queryKey: ["m6", "taxonomy", q],
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap<TaxonomyTreeResponse>((await apiQuestions.get("/admin/taxonomy", { params: clean({ q }) })).data),
  });
}
const S = { headers: { "x-iitp-source": "admin console · Setup · Subjects" } };
export const taxonomyApi = {
  createSubject: (name: string) => apiQuestions.post("/subject/create", { name, chapters: [] }, S),
  renameSubject: (id: string, name: string) => apiQuestions.patch("/subject/subjects/name", { id, name }, S),
  createChapter: (subjectId: string, name: string) => apiQuestions.post("/subject/create-chapter", { subjectId, name, topics: [] }, S),
  renameChapter: (subjectId: string, chapterId: string, name: string) => apiQuestions.patch("/subject/update-chapter", { subjectId, chapterId, name }, S),
  createTopic: (subjectId: string, chapterId: string, topic: string) => apiQuestions.post("/subject/create-topic", { subjectId, chapterId, topic }, S),
  renameTopic: (subjectId: string, chapterId: string, oldTopic: string, newTopic: string) => apiQuestions.patch("/subject/update-topic", { subjectId, chapterId, oldTopic, newTopic }, S),
  /** 409 TAXONOMY_IN_USE {questions}; else SoftDeleteResponse (Undo via restore) */
  remove: async (kind: "subjects" | "chapters" | "topics", id: string) => unwrap<SoftDeleteResponse>((await apiQuestions.delete(`/admin/taxonomy/${kind}/${encodeURIComponent(id)}`, S)).data),
  restore: (kind: "subjects" | "chapters" | "topics", id: string) => apiQuestions.post(`/admin/taxonomy/${kind}/${encodeURIComponent(id)}/restore`, {}, S),
};
