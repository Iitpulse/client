/* Copy of api-ai src/contracts/m6.ts (binding; keep identical, add fields only). Docs: api-ai docs/m6-api.md. */
/**
 * M6 contract (redesign complete for one institute): auth + sign-up + profile wizard, users drawer + import, roles,
 * batches + centres (Setup), exams + exam UI templates, audit log reader, patterns for all 5 types, scoring for all 5
 * types, test builder (+ AI test builder), question picker, live Monitor + extra time, Calendar + reschedule,
 * answer-key fix with re-scoring, paragraph/matrix question shapes, image-equation flag, .docx import.
 * Binding shapes; see docs/m6-api.md. No dependencies: the admin and student apps may copy this file.
 * Implementers may ADD fields, never rename or remove (list additions under "Changes" in docs/m6-api.md).
 *
 * Owners: users = auth, sign-up, onboarding, me, users, imports, roles, batches, centres, test links, audit reader;
 * questions = question shapes, media, image-equation flag, taxonomy tree, import confirm, picker internals;
 * tests = patterns, exams, exam UI templates, admin tests list, builder paper, readiness, picker, monitor, extra time,
 * calendar, reschedule, key fix + re-score, scoring, student exam payload;
 * ai = AI test builder (SSE), paper parse v2 (.docx), image-to-LaTeX drafts, Excel template v2.
 * All routes go through the gateway (`/users/…`, `/questions/…`, `/tests/…`, `/ai/…`); no new gateway prefix.
 * Auth: staff tokens unless a route says "public" or "student"; 403 STAFF_ONLY for students, 401 without code.
 */

export type IsoDateTime = string; // UTC ISO with Z
export type IsoDate = string; // YYYY-MM-DD, IST calendar date
/** Bank content: HTML with inline LaTeX ($…$). Render with MathText. */
export type RichText = string;
/** AI-written prose: plain text with inline LaTeX, no HTML, no URLs. */
export type AiText = string;

export type QuestionType = "single" | "multiple" | "integer" | "paragraph" | "matrix";
/** Child questions of a paragraph set */
export type ChildType = "single" | "multiple" | "integer";
export type Difficulty = "easy" | "medium" | "hard";
export type UserType = "student" | "teacher" | "admin" | "operator" | "manager";
export type TestState = "draft" | "scheduled" | "live" | "ended";
export type ResultMode = "immediately" | "atTheEndOfTest" | "autoAfterXDays" | "manual";
export type Lang = "en" | "hi";

export interface Ref {
  id: string;
  name: string;
}
export interface TestRef {
  testId: string;
  name: string;
  shortName: string | null;
}
export interface PersonRef {
  id: string;
  name: string;
  /** "Academic head", "Teacher" … (first role name), null for students */
  role: string | null;
  userType: UserType | null;
}

/** Offset pagination used by every M6 list (page from 1) */
export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Answer of every soft delete (questions, drafts, patterns, templates, exams, taxonomy, centres-archive, tests in draft).
 * "Undo" in the toast = `POST undo.path` (same auth) before `undo.until`.
 */
export interface SoftDeleteResponse {
  now: IsoDateTime;
  deleted: { type: string; id: string };
  undo: { method: "POST"; path: string; until: IsoDateTime } | null;
}

/** Field-level validation error: 400 VALIDATION_ERROR details (the forms' top error summary + field errors) */
export interface FieldErrors {
  /** key = form field path ("email", "options.D", "children.1.answer", "sections.0.subsections.1.toAttempt") */
  fields: Record<string, { code: string; message: string }>;
}

/* ═══════════════════════════════ cross-cutting: re-auth ═══════════════════════════════ */

/** Header that carries a re-auth token on the five password-confirmed actions */
export const REAUTH_HEADER = "x-reauth-token";

/** POST /users/auth/reauth { password } → 200; 401 WRONG_PASSWORD { triesLeft }; 429 TOO_MANY_ATTEMPTS { retryAfterSeconds } */
export interface ReauthRequest {
  password: string;
}
export interface ReauthResponse {
  now: IsoDateTime;
  /** JWT signed with AUTH_KEY: { sub, typ: "reauth" }, 5 minutes; every service verifies it locally */
  reauthToken: string;
  expiresAt: IsoDateTime;
}

/* ═══════════════════════════════ users: auth ═══════════════════════════════ */

/** POST /users/auth/login (changed: optional `app`) */
export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  /** "admin": a student account answers 403 STUDENT_ACCOUNT and gets no token */
  app?: "admin" | "student";
}

/** details of 403 STUDENT_ACCOUNT */
export interface StudentAccountDetails {
  studentPortalUrl: string;
}
/** details of 429 LOGIN_LOCKED (10 wrong tries in 15 min pause the account 15 min, across instances) */
export interface LoginLockedDetails {
  retryAfterSeconds: number;
}

/** GET /users/me (new): who is signed in, effective permissions; 401 SESSION_REVOKED when the token predates a sign-out of other devices */
export interface MeResponse {
  now: IsoDateTime;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    userType: UserType;
    roles: Ref[];
    /** Union of the permission keys of the user's roles (admins: every key in the catalog) */
    permissions: string[];
    /** null = all centres */
    centre: Ref | null;
    passwordChangedAt: IsoDateTime | null;
    lastActiveAt: IsoDateTime | null;
  };
  tenant: { id: string; name: string };
}

/** PATCH /users/me { name?, email?, phone? } → MeResponse. Changing the email signs out other devices (SESSION_REVOKED there). */
export interface MeUpdateRequest {
  name?: string;
  email?: string;
  /** 10-digit Indian mobile or null */
  phone?: string | null;
}

/** POST /users/me/password → 204; 400 WRONG_PASSWORD | WEAK_PASSWORD | PASSWORD_MISMATCH. Other devices stay signed in. */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Minimum length for every new or changed password (sign-up, create user, set password, reset, change, import rows) */
export const MIN_PASSWORD_LENGTH = 8;

/** GET /users/meta/locations (any signed-in user; also public for sign-up) */
export interface LocationsResponse {
  now: IsoDateTime;
  /** The tenant's city list (tnt_iitpulse: ["Indore"]); every City field is a combobox over this list */
  cities: string[];
  /** States of those cities (["Madhya Pradesh"]) */
  states: string[];
  /** Class values: "6"…"12", "Dropper" */
  standards: string[];
  streams: Array<"PCM" | "PCB" | "PCMB" | "Commerce" | "Arts">;
  mediums: Array<"English" | "Hindi" | "Other">;
}

/* ═══════════════════════════════ users: public sign-up + profile wizard ═══════════════════════════════ */

/** GET /users/public/promo/:code (public, 30/min per IP) → 200; 400 PROMO_LENGTH; 404 PROMO_INVALID */
export interface PromoCheckResponse {
  now: IsoDateTime;
  code: string;
  batch: Ref;
  institute: { name: string };
}

/** POST /users/otp/email/send { email } → 204; 409 EMAIL_TAKEN; 429 OTP_COOLDOWN { retryAfterSeconds } (60 s between sends) */
export interface OtpSendRequest {
  email: string;
}
/** POST /users/otp/email/verify { email, emailotp } → 204; 400 OTP_WRONG { triesLeft }; 410 OTP_EXPIRED (10 min, 5 tries) */
export interface OtpVerifyRequest {
  email: string;
  emailotp: string;
}

/** POST /users/student/create-student (changed): password ≥ 8, terms, answers a token */
export interface SignupRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  name: string;
  /** 10 digits */
  contact: string;
  dob: IsoDate;
  /** exactly 6 letters or digits */
  promoCode: string;
  acceptedTerms: true;
}
export interface SignupResponse {
  now: IsoDateTime;
  token: string;
  user: { id: string; name: string; batch: Ref };
}

export interface OnboardingFields {
  gender: "Male" | "Female" | "Other" | null;
  address: string | null;
  city: string | null;
  state: string | null;
  standard: string | null;
  school: string | null;
  stream: string | null;
  medium: string | null;
  parentName: string | null;
  parentPhone: string | null;
}

/** GET /users/student/me/onboarding (student) */
export interface OnboardingResponse {
  now: IsoDateTime;
  /** true while not completed: the wizard opens after sign-in (once per session) */
  required: boolean;
  completedAt: IsoDateTime | null;
  skippedAt: IsoDateTime | null;
  values: OnboardingFields;
  /** Same lists as /users/meta/locations */
  options: Omit<LocationsResponse, "now">;
}

/** PATCH /users/student/:id/onboarding (changed): partial save per step; `complete: true` on "Save profile" */
export interface OnboardingSaveRequest extends Partial<OnboardingFields> {
  step?: 1 | 2 | 3;
  complete?: boolean;
}

/* ═══════════════════════════════ users: people (Users page + drawer) ═══════════════════════════════ */

export type UserStatus = "active" | "deactivated";

/** GET /users/admin/users?type=&q=&batchId=&centreId=&standard=&status=&page=&pageSize=&sort= */
export interface UserListQuery {
  type: UserType;
  q?: string;
  batchId?: string;
  centreId?: string;
  standard?: string;
  status?: UserStatus | "all";
  page?: number;
  /** 25 default, 100 max */
  pageSize?: number;
  sort?: "name" | "created" | "lastActive" | "validTill";
}

export interface UserListItem {
  id: string;
  type: UserType;
  name: string;
  email: string;
  phone: string | null;
  centre: Ref | null;
  status: UserStatus;
  validTill: IsoDate | null;
  /** students */
  batch: Ref | null;
  standard: string | null;
  /** teachers: subjects and batches ("No batch yet" when empty) */
  subjects: Ref[];
  batches: Ref[];
  /** staff */
  roles: Ref[];
  lastActiveAt: IsoDateTime | null;
}

export interface UserListResponse {
  now: IsoDateTime;
  items: UserListItem[];
  pageInfo: PageInfo;
  /** Tab counts with every filter except `type` and `q`: "Students 8,732 · Teachers 46 · Admins 4 …" */
  counts: Record<UserType, number>;
}

/** GET /users/admin/users/:id */
export interface UserDetail extends UserListItem {
  dob: IsoDate | null;
  gender: "Male" | "Female" | "Other" | null;
  address: string | null;
  city: string | null;
  state: string | null;
  school: string | null;
  stream: string | null;
  medium: string | null;
  parentName: string | null;
  parentPhone: string | null;
  validFrom: IsoDate | null;
  promoCode: string | null;
  onboardingCompletedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

/** POST /users/admin/users (create, any type) and PATCH /users/admin/users/:id (edit; every field optional) */
export interface UserWriteRequest {
  type: UserType;
  name: string;
  email: string;
  phone: string;
  /** create only; ≥ 8 */
  password?: string;
  confirmPassword?: string;
  dob?: IsoDate | null;
  gender?: "Male" | "Female" | "Other" | null;
  address?: string | null;
  /** must be in the tenant's list: 400 INVALID_CITY */
  city?: string | null;
  state?: string | null;
  /** null = all centres (staff) */
  centreId?: string | null;
  status?: UserStatus;
  validFrom?: IsoDate | null;
  validTill?: IsoDate | null;
  /** extra roles; the type's own role is implied */
  roleIds?: string[];
  student?: {
    standard: string | null;
    /** one batch per student today; must be at the student's centre (400 BATCH_NOT_AT_CENTRE) */
    batchIds: string[];
    stream: string | null;
    medium: string | null;
    school: string | null;
    parentName: string | null;
    parentPhone: string | null;
  };
  teacher?: { subjectIds: string[]; batchIds: string[] };
}
/** 409 EMAIL_TAKEN / PHONE_TAKEN details: who has it ("Already used by Aarav Jain · open") */
export interface TakenDetails {
  field: "email" | "phone";
  user: { id: string; name: string; type: UserType };
}

/** POST /users/admin/users/bulk */
export interface UserBulkRequest {
  ids: string[];
  action: "moveBatch" | "extendValidity" | "deactivate" | "activate" | "delete";
  batchId?: string;
  validTill?: IsoDate;
}
export interface UserBulkResponse {
  now: IsoDateTime;
  done: string[];
  failed: Array<{ id: string; code: string }>;
}

/**
 * GET /users/admin/users/:id/delete-impact. Owner (5 Nov): "Delete" = deactivate + anonymise (students) / deactivate
 * (teachers, staff); "Erase everything" (POST …/:id/erase) is the only permanent erase.
 */
export interface DeleteImpact {
  now: IsoDateTime;
  user: { id: string; name: string; type: UserType };
  /** what DELETE does for this type */
  deleteAction: "deactivateAndAnonymise" | "deactivate";
  /** kept by delete/anonymise (shown as "Removed student"); removed by erase */
  attempts: number;
  results: number;
  doubts: number;
  anonymisedAt: IsoDateTime | null;
  /** tests still being written by this student: delete, anonymise and erase answer 409 STUDENT_WRITING */
  writingNow: TestRef[];
}

/** Display name of an anonymised student everywhere names are resolved */
export const REMOVED_STUDENT_NAME = "Removed student";

/** DELETE /users/admin/users/:id, POST …/:id/anonymise, POST …/:id/erase (all: DELETE_USER + x-reauth-token) */
export interface DeleteUserResponse {
  now: IsoDateTime;
  id: string;
  action: "deactivated" | "anonymised" | "erased";
  /** erase: tests and ai confirmations (a leased job retries until both are true) */
  erase: { users: boolean; tests: boolean; ai: boolean } | null;
  auditEventId: string;
}

/* ═══════════════════════════════ users: import from Excel ═══════════════════════════════ */

export type ImportKind = "students" | "teachers";
export type ImportRowState = "ready" | "exists" | "fix";

/** POST /users/admin/imports (multipart: file, kind, defaultBatchId?) → 201 ImportSession; kept 24 h */
export interface ImportSession {
  now: IsoDateTime;
  id: string;
  kind: ImportKind;
  fileName: string;
  defaultBatch: Ref | null;
  expiresAt: IsoDateTime;
  status: "checked" | "importing" | "done" | "stopped" | "failed";
  counts: { read: number; ready: number; exists: number; fix: number };
  /** File-level problems (upload-error state): missing columns, unreadable type, too large */
  fileProblems: Array<{ code: "MISSING_COLUMNS" | "UNSUPPORTED_FILE" | "FILE_TOO_LARGE" | "TOO_MANY_ROWS"; message: string; columns?: string[] }>;
  progress: { done: number; total: number; secondsLeft: number | null } | null;
  result: { added: number; updated: number; skippedExisting: number; failed: number; batches: Ref[] } | null;
}

/** GET /users/admin/imports/:id/rows?state=&page=&pageSize= */
export interface ImportRowsResponse {
  now: IsoDateTime;
  items: ImportRow[];
  pageInfo: PageInfo;
}
export interface ImportRow {
  row: number;
  state: ImportRowState;
  values: Record<string, string>;
  problems: Array<{ column: string; code: string; message: string }>;
  /** exists: the account it matches */
  match: { id: string; name: string; by: "email" | "phone" } | null;
}
/** PATCH /users/admin/imports/:id/rows/:row { values } → ImportRow (re-checked) */
export interface ImportRowFixRequest {
  values: Record<string, string>;
}
/** POST /users/admin/imports/:id/start { onExisting } → 202 ImportSession; POST …/stop → ImportSession; GET …/failed.xlsx */
export interface ImportStartRequest {
  onExisting: "skip" | "update";
}

/* ═══════════════════════════════ users: roles ═══════════════════════════════ */

/** GET /users/admin/permissions/catalog: the rows of the Roles matrix, mapped to the real keys */
export interface PermissionCatalog {
  now: IsoDateTime;
  areas: Array<{
    area: string;
    hint: string;
    /** View column: one or two boxes ("Own" / "All") */
    view: Array<{ label: string; key: string }>;
    create: string | null;
    edit: string | null;
    delete: string | null;
    also: Array<{ label: string; key: string }>;
  }>;
  /** M7b role templates (users docs/m7b-permissions.md §2): starting points for "New role" (POST … { templateKey }) */
  templates?: RoleTemplate[];
}
export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  scopeKind: string;
  permissions: string[];
}

/** New permission key (M6): run AI generation (assist, bulk drafts, AI test builder, paper parse with a model, image-to-LaTeX) */
export const PERMISSION_USE_AI_TOOLS = "USE_AI_TOOLS";

/** GET /users/admin/roles */
export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  members: number;
  /** Admin: every permission, cannot be edited or deleted */
  locked: boolean;
  /** Student: members come from batches, cannot be added here */
  system: "admin" | "student" | null;
  permissions: string[];
}
export interface RoleListResponse {
  now: IsoDateTime;
  items: RoleListItem[];
}
/** POST /users/admin/roles { name, description?, copyFromRoleId? }; PATCH /users/admin/roles/:id { name?, description?, permissions? } */
export interface RoleWriteRequest {
  name?: string;
  description?: string | null;
  copyFromRoleId?: string | null;
  /** M7b: start from a role template (teacher | content_editor | operator | manager); explicit permissions still win */
  templateKey?: string | null;
  permissions?: string[];
}
export interface RoleWriteResponse {
  now: IsoDateTime;
  role: RoleListItem;
  /** "Teacher saved · 46 people updated" */
  membersAffected: number;
}
/** GET /users/admin/roles/:id/members?q=&page= */
export interface RoleMembersResponse {
  now: IsoDateTime;
  items: Array<{ user: PersonRef & { email: string }; batches: Ref[]; addedAt: IsoDateTime | null }>;
  pageInfo: PageInfo;
}
/** POST /users/admin/roles/:id/members { userIds } (staff only: 400 STUDENT_NOT_ALLOWED); DELETE /users/admin/roles/:id/members/:userId (Undo = add again) */
export interface RoleMembersAddRequest {
  userIds: string[];
}

/* ═══════════════════════════════ users: batches, promo codes, centres ═══════════════════════════════ */

export const PROMO_CODE_PATTERN = "^[A-Z0-9]{6}$";

export interface PromoCode {
  code: string;
  /** false: not 6 characters (legacy); students can't use it — "Regenerate" */
  valid: boolean;
}

/** GET /users/admin/batches?q=&centreId=&medium=&page=&pageSize=&sort=name */
export interface BatchListItem {
  id: string;
  name: string;
  centre: Ref | null;
  medium: string;
  exams: Ref[];
  promoCodes: PromoCode[];
  students: number;
  teachers: number;
  archivedAt: IsoDateTime | null;
}
export interface BatchListResponse {
  now: IsoDateTime;
  items: BatchListItem[];
  pageInfo: PageInfo;
  /** "26 batches · 8,732 students · 46 teachers" (all batches, no filters) */
  summary: { batches: number; students: number; teachers: number };
  /** "1 code can't be used: it isn't 6 characters" */
  invalidCodes: number;
  /** "3 teachers have no batch" banner */
  unassignedTeachers: Array<PersonRef & { subjects: Ref[] }>;
}
/** GET /users/admin/batches/:id */
export interface BatchDetail extends BatchListItem {
  teacherList: Array<PersonRef & { subjects: Ref[] }>;
  /** "38 students joined with a code this month" (IST month) */
  joinedWithCodeThisMonth: number;
  createdAt: IsoDateTime;
}
/** POST /users/admin/batches; PATCH /users/admin/batches/:id */
export interface BatchWriteRequest {
  name?: string;
  centreId?: string;
  medium?: "English" | "Hindi";
  examIds?: string[];
  /** each exactly 6 letters/digits, upper-cased; 400 PROMO_LENGTH, 409 PROMO_TAKEN { code } */
  promoCodes?: string[];
  teacherIds?: string[];
}
/** POST /users/admin/batches/promo-codes/generate { count? } → unused codes ("Make one for me" / "Regenerate") */
export interface PromoGenerateResponse {
  now: IsoDateTime;
  codes: string[];
}
/** POST /users/admin/batches/assign-teachers ("Assign 2 teachers") */
export interface AssignTeachersRequest {
  assignments: Array<{ teacherId: string; batchIds: string[] }>;
}

/** GET /users/admin/centres; POST; PATCH /:id; POST /:id/archive (409 CENTRE_HAS_BATCHES { batches }); POST /:id/restore */
export interface Centre {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string;
  mode: "offline" | "online";
  batches: number;
  students: number;
  archivedAt: IsoDateTime | null;
}
export interface CentreListResponse {
  now: IsoDateTime;
  items: Centre[];
}
export interface CentreWriteRequest {
  name?: string;
  code?: string | null;
  address?: string | null;
  city?: string;
  mode?: "offline" | "online";
}

/* ═══════════════════════════════ users: student test links ═══════════════════════════════ */

/** GET /users/admin/test-links?testId=&batchId= */
export interface TestLinksResponse {
  now: IsoDateTime;
  test: TestRef & { opensAt: IsoDateTime | null; closesAt: IsoDateTime | null };
  batch: Ref;
  /** links stop working at test close (moved with a reschedule) */
  expiresAt: IsoDateTime | null;
  madeAt: IsoDateTime | null;
  /** "104 links · 12 opened" */
  counts: { links: number; opened: number; studentsWithoutLink: number };
  items: Array<{ student: { id: string; name: string; phone: string | null }; url: string; opens: number; lastOpenedAt: IsoDateTime | null }>;
}
/** POST /users/admin/test-links { testId, batchId } → TestLinksResponse (makes links for students who have none) */
export interface TestLinksMakeRequest {
  testId: string;
  batchId: string;
}
/** POST /users/admin/test-links/renew { testId, studentId } → the new link; the old one stops at once (LINK_REVOKED) */
export interface TestLinkRenewRequest {
  testId: string;
  studentId: string;
}

/* ═══════════════════════════════ users: audit log reader ═══════════════════════════════ */

export type AuditVerb = "added" | "changed" | "deleted" | "restored" | "imported" | "signedIn" | "signInFailed" | "other";

/** GET /users/admin/audit/events?q=&actorId=&verb=&about=&involving=&from=&to=&cursor=&limit= */
export interface AuditListQuery {
  q?: string;
  actorId?: string;
  verb?: AuditVerb;
  /** target type: student, teacher, staff, batch, centre, role, exam, test, pattern, template, question, subject, chapter, topic, sign-in */
  about?: string;
  /** a user id: events where they are the actor OR the target (Users drawer "History") */
  involving?: string;
  targetType?: string;
  targetId?: string;
  /** IST date range; default last 7 days */
  from?: IsoDateTime;
  to?: IsoDateTime;
  cursor?: string;
  /** 10–100, default 50 ("Load 50 more") */
  limit?: number;
}
export interface AuditListItem {
  id: string;
  occurredAt: IsoDateTime;
  actor: PersonRef | { id: null; name: string; role: null; userType: null };
  verb: AuditVerb;
  action: string;
  /** "Student", "Test", "Questions", "Sign-in" */
  kind: string;
  /** Names, never ids: "Aarav Jain", "JEE Main Mock 11" */
  what: string;
  /** "Batches, Valid till" / "Results published to 212 students" */
  details: string;
}
export interface AuditListResponse {
  now: IsoDateTime;
  items: AuditListItem[];
  nextCursor: string | null;
  /** "Showing 10 of 1,284 events" (exact up to 10,000, else null = "10,000+") */
  total: number | null;
}
/** GET /users/admin/audit/events/:id */
export interface AuditDetail extends AuditListItem {
  /** "Chrome on Windows" from the user agent */
  device: string | null;
  /** masked: "49.36.•••.•••" */
  ipMasked: string | null;
  about: { type: string; label: string; context: string | null } | null;
  /** names resolved: "Batches: JEE 2027 · Indore B → JEE 2027 · Indore A"; redacted fields show "changed" */
  changes: Array<{ field: string; before: string | null; after: string | null; redacted?: boolean }>;
  technical: { eventId: string; requestId: string | null; source: string | null; service: string; metadata: Record<string, unknown> | null };
  /** "Everything about Aarav Jain (14 events)" */
  relatedCount: number;
}
/** GET /users/admin/audit/people?q= (actor combobox: names, students included) */
export interface AuditPeopleResponse {
  now: IsoDateTime;
  items: PersonRef[];
}
/** POST /users/admin/audit/export { filters (AuditListQuery without cursor/limit) } */
export interface AuditExportResponse {
  now: IsoDateTime;
  /** ≤ 5,000 events: "ready" with a download URL now; more: "emailed" (link by email within ~5 min, valid 24 h) */
  mode: "ready" | "emailed";
  events: number;
  downloadUrl: string | null;
  emailTo: string | null;
  expiresAt: IsoDateTime | null;
}

/* ═══════════════════════════════ questions: shapes ═══════════════════════════════ */

export interface LangBlock {
  question: RichText;
  options?: Array<{ id: string; value: RichText }>;
  solution?: RichText;
}

export interface ParagraphChild {
  id: string;
  type: ChildType;
  en: LangBlock;
  hi: LangBlock | null;
  correctAnswers?: string[];
  correctAnswer?: { from: number; to: number };
}

/** Paragraph question (changed: separate Hindi passage). `paragraph` (string) stays as the English passage for old readers. */
export interface ParagraphShape {
  type: "paragraph";
  passage: { en: RichText; hi: RichText | null };
  /** 1–8 children, in order; tests keep them together in this order */
  questions: ParagraphChild[];
}

/** Matrix question (changed: List I / List II as fields). Rows A, B, C…; columns P, Q, R… */
export interface MatrixShape {
  type: "matrix";
  en: { question: RichText; solution?: RichText };
  hi: { question: RichText; solution?: RichText } | null;
  matrix: {
    /** 2–6 rows */
    listI: Array<{ id: string; en: RichText; hi: RichText | null }>;
    /** 2–6 rows */
    listII: Array<{ id: string; en: RichText; hi: RichText | null }>;
    /** row id → matching column ids (≥ 1 per row; a row can have more than one) */
    matches: Record<string, string[]>;
  };
}

/** Image attributes the bank keeps on every <img> in RichText */
export interface ImageAttrs {
  src: string;
  alt: string;
  "data-size"?: "small" | "medium" | "full";
  /** "true": this image is an equation and needs LaTeX (never blocks; tests warn) */
  "data-needs-latex"?: "true";
}

/** POST /questions/admin/media (multipart `file`: PNG, JPG or SVG, ≤ 2 MB; SVG sanitised) → 201; 400 UNSUPPORTED_IMAGE / IMAGE_TOO_LARGE */
export interface MediaUploadResponse {
  now: IsoDateTime;
  url: string;
  key: string;
  width: number | null;
  height: number | null;
}

/** Added to M5 BankListItem / QuestionSearchResponse and to the picker rows */
export interface QuestionFlags {
  /** images marked data-needs-latex="true" (stem, options, solution, passage, children, lists) */
  needsLatex: number;
  hasSolution: boolean;
  hasHindi: boolean;
}

/** details of 409 QUESTION_IN_LIVE_TEST (edit or delete while a test using it is live) */
export interface QuestionInLiveTestDetails {
  test: TestRef & { closesAt: IsoDateTime };
  writing: number;
}

/** Added to M5 QuestionUsageResponse.usage[id] (tests): the editor's "In 2 tests", live lock and scheduled note */
export interface QuestionUsageM6 {
  tests: number;
  lastUsedAt: IsoDateTime | null;
  live: Array<TestRef & { closesAt: IsoDateTime }>;
  scheduled: Array<TestRef & { opensAt: IsoDateTime }>;
}

/** GET /questions/admin/taxonomy?q= : Subjects & chapters tree with question counts (deleted left out) */
export interface TaxonomyTreeResponse {
  now: IsoDateTime;
  totals: { subjects: number; chapters: number; questions: number };
  subjects: Array<{
    id: string;
    name: string;
    questions: number;
    chapters: Array<{ id: string; name: string; questions: number; topics: Array<{ id: string; name: string; questions: number }> }>;
  }>;
}
/** details of 409 TAXONOMY_IN_USE ("318 questions use it") */
export interface TaxonomyInUseDetails {
  questions: number;
}

/* ═══════════════════════════════ tests: patterns ═══════════════════════════════ */

/**
 * Marking of one sub-section (replaces markingScheme.correct[] levels; the old shape is still accepted and read, see doc).
 * `partial` levels: multiple = "k correct options, none wrong"; matrix = "k rows right, none wrong"; others: none.
 */
export interface Marking {
  /** all correct / all rows right */
  correct: number;
  /** ≤ 0; any wrong option / any wrong row / wrong answer */
  incorrect: number;
  partial: Array<{ count: number; marks: number }>;
}

export interface PatternSubsection {
  id: string;
  name: string;
  description: string | null;
  type: QuestionType;
  /** paragraph only: questions per set and their type ("mixed" = each child keeps its own type) */
  paragraph: { setSize: number; childType: ChildType | "mixed" } | null;
  /** questions (paragraph: child questions = sets × setSize) */
  totalQuestions: number;
  /** ≤ totalQuestions; extra answers beyond this are not marked */
  toAttempt: number;
  marking: Marking;
}
export interface PatternSection {
  id: string;
  name: string;
  subject: Ref | null;
  subsections: PatternSubsection[];
}
export interface Pattern {
  id: string;
  name: string;
  exam: Ref;
  durationMinutes: number;
  sections: PatternSection[];
  totals: { sections: number; questions: number; toAttempt: number; marks: number };
  /** non-deleted tests built on it */
  usedBy: number;
  /** usedBy > 0: only name and duration can change (PATTERN_LOCKED) */
  locked: boolean;
  lastUsedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
/** GET /tests/admin/patterns?q=&examId=&sort=lastUsed|name|created&page= */
export interface PatternListResponse {
  now: IsoDateTime;
  items: Array<Omit<Pattern, "sections"> & { types: QuestionType[]; negative: boolean }>;
  pageInfo: PageInfo;
}
/** POST /tests/admin/patterns; PUT /tests/admin/patterns/:id (locked: only name, durationMinutes) */
export interface PatternWriteRequest {
  name: string;
  examId: string;
  durationMinutes: number;
  sections: Array<Omit<PatternSection, "subject"> & { subjectId: string | null }>;
}

/* ═══════════════════════════════ tests: exams + exam UI templates ═══════════════════════════════ */

/** GET /tests/admin/exams?includeDeleted=1 */
export interface ExamListItem {
  id: string;
  shortName: string;
  fullName: string | null;
  description: string | null;
  defaultTemplate: Ref | null;
  patterns: number;
  tests: number;
  status: "active" | "deleted";
  deletedAt: IsoDateTime | null;
  /** deleted exams can be restored for 30 days */
  restoreUntil: IsoDateTime | null;
}
/** POST /tests/admin/exams (a new exam gets a copy of the NTA standard template as its default); PATCH /:id */
export interface ExamWriteRequest {
  shortName?: string;
  fullName?: string | null;
  description?: string | null;
  defaultTemplateId?: string;
}
/** details of 409 EXAM_IN_USE ("2 tests are open or scheduled … after the last one closes on Wed 18 Nov") */
export interface ExamInUseDetails {
  tests: Array<TestRef & { opensAt: IsoDateTime | null; closesAt: IsoDateTime | null }>;
  lastClosesAt: IsoDateTime | null;
}

/** Labels on the frozen NTA screen a template may reword (≤ 32 characters each) */
export type WordingKey = "clear" | "saveNext" | "saveMarkReview" | "markReviewNext" | "submit" | "notAnswered";

export interface InstructionsDoc {
  heading: string;
  /** Blocks of numbered lines; placeholders {test name} {duration} {questions} {marks} {negative marks} */
  blocks: Array<{ id: "general" | "navigating" | "answering" | "sections" | string; title: string; lines: string[] }>;
  declaration: string;
}

export interface ExamTools {
  calculator: "off" | "basic" | "scientific";
  markForReview: boolean;
  viewQuestionPaper: boolean;
  viewInstructions: boolean;
  languageSwitch: boolean;
  roughSheet: boolean;
}

/** Exam UI template v2 (wording, instructions, tools only; NTA colours, fonts and layout are fixed) */
export interface ExamTemplate {
  id: string;
  name: string;
  exam: Ref;
  isDefault: boolean;
  wording: Record<Lang, Record<WordingKey, string>>;
  instructions: Record<Lang, InstructionsDoc>;
  tools: ExamTools;
  usedBy: number;
  /** "2 labels changed · shorter instructions" */
  summary: string;
  updatedAt: IsoDateTime;
}
/** GET /tests/admin/templates?examId= */
export interface TemplateListResponse {
  now: IsoDateTime;
  defaults: Array<{ exam: Ref; template: Ref }>;
  items: ExamTemplate[];
}
/** POST /tests/admin/templates { name, examId, copyFromId? }; PUT /tests/admin/templates/:id; POST /:id/make-default; POST /:id/duplicate; DELETE /:id (409 TEMPLATE_IN_USE) */
export interface TemplateWriteRequest {
  name?: string;
  examId?: string;
  copyFromId?: string | null;
  wording?: Partial<Record<Lang, Partial<Record<WordingKey, string>>>>;
  instructions?: Partial<Record<Lang, InstructionsDoc>>;
  tools?: Partial<ExamTools>;
}
/** details of 409 TEMPLATE_IN_USE */
export interface TemplateInUseDetails {
  defaultFor: Ref | null;
  tests: number;
}
/** GET /tests/admin/templates/:id/preview?testId=&lang= : instructions with placeholders filled, for the preview pane */
export interface TemplatePreviewResponse {
  now: IsoDateTime;
  lang: Lang;
  test: { name: string; durationMinutes: number; questions: number; marks: number; negativeMarks: string };
  heading: string;
  blocks: Array<{ title: string; lines: string[] }>;
  declaration: string;
  wording: Record<WordingKey, string>;
  tools: ExamTools;
}

/* ═══════════════════════════════ tests: admin list, builder, paper, readiness ═══════════════════════════════ */

/** GET /tests/admin/tests?state=&q=&batchId=&examId=&from=&to=&page=&pageSize=25|50|100 (live first, then by window) */
export interface AdminTestListItem extends TestRef {
  state: TestState;
  /** the last publish attempt failed after it was accepted ("Not published") */
  publishFailed: { at: IsoDateTime; code: string } | null;
  exam: Ref | null;
  pattern: Ref | null;
  questions: { filled: number; needed: number };
  maxMarks: number;
  batches: Ref[];
  opensAt: IsoDateTime | null;
  closesAt: IsoDateTime | null;
  resultMode: ResultMode;
  /** null = not published; "Due 20 Nov" = resultDueAt */
  resultPublishedAt: IsoDateTime | null;
  resultDueAt: IsoDateTime | null;
  attempts: { assigned: number | null; started: number; submitted: number; autoSubmitted: number; flagged: number } | null;
  linksMade: number;
  keyCorrectedAt: IsoDateTime | null;
}
export interface AdminTestListResponse {
  now: IsoDateTime;
  items: AdminTestListItem[];
  pageInfo: PageInfo;
  counts: Record<TestState | "all", number>;
}

/** POST /tests/admin/tests { name, examId, patternId } → 201 { test: TestSettings } (draft, empty paper from the pattern) */
export interface TestCreateRequest {
  name: string;
  examId: string;
  patternId: string;
}

export interface FullscreenPolicy {
  enabled: boolean;
  /** exits allowed (1–10) */
  maxExits: number;
  /** after the last allowed exit */
  action: "warn" | "submit";
}

/** GET /tests/admin/tests/:id → { test }; PATCH /tests/admin/tests/:id (settings only; never the paper) */
export interface TestSettings {
  id: string;
  name: string;
  shortName: string | null;
  noteForStudents: string | null;
  exam: Ref;
  pattern: Ref & { durationMinutes: number };
  state: TestState;
  batches: Ref[];
  /** "2 batches · 214 students" */
  assignedStudents: number | null;
  opensAt: IsoDateTime | null;
  closesAt: IsoDateTime | null;
  durationMinutes: number;
  /** "Late-save grace" (0–15 min) */
  graceMinutes: number;
  template: Ref;
  resultMode: ResultMode;
  resultAfterDays: number | null;
  fullscreenPolicy: FullscreenPolicy;
  /** someone submitted: only name, note, hideResult change (TEST_LOCKED) */
  lockedBySubmissions: boolean;
  keyCorrections: KeyCorrection[];
  updatedAt: IsoDateTime;
}
export type TestSettingsPatch = Partial<Pick<TestSettings, "name" | "shortName" | "noteForStudents" | "opensAt" | "closesAt" | "graceMinutes" | "resultMode" | "resultAfterDays" | "fullscreenPolicy">> & {
  batchIds?: string[];
  templateId?: string;
};
/** PATCH answer on a published, unopened test whose time or batches changed */
export interface TestSettingsPatchResponse {
  now: IsoDateTime;
  test: TestSettings;
  /** students sent a new notice (0 for drafts) */
  notified: number;
}

export type SlotSource = "ai" | "manual";

/** GET /tests/admin/tests/:id/paper : the builder's sections and the picker's tally */
export interface PaperView {
  now: IsoDateTime;
  revision: number;
  filled: number;
  needed: number;
  sections: Array<{
    id: string;
    name: string;
    subject: Ref | null;
    subsections: Array<{
      id: string;
      name: string;
      type: QuestionType;
      paragraph: PatternSubsection["paragraph"];
      marking: Marking;
      need: number;
      have: number;
      slots: Array<{
        n: number;
        /** paragraph: the set's question id; its children take n … n + count − 1 */
        questionId: string;
        count: number;
        type: QuestionType;
        source: SlotSource;
        stemPreview: string;
        difficulty: Difficulty | null;
        chapter: string | null;
        flags: QuestionFlags;
      }>;
      mix: Record<Difficulty | "unset", number>;
      chapters: Array<{ name: string; count: number }>;
    }>;
  }>;
  warnings: { withoutSolution: number; needsLatex: number };
}
/** PUT /tests/admin/tests/:id/paper/subsections/:subsectionId { questionIds, expectedRevision } (add, remove, replace, reorder) */
export interface SubsectionPutRequest {
  questionIds: string[];
  /** 409 PAPER_CHANGED when another save happened since */
  expectedRevision: number;
}
export interface PaperWriteResponse {
  now: IsoDateTime;
  paper: PaperView;
  /** "Undo" restores this revision: POST /tests/admin/tests/:id/paper/restore { revision } */
  previousRevision: number;
  rejected: Array<{ questionId: string; reason: "WRONG_TYPE" | "WRONG_SUBJECT" | "SET_SIZE" | "SUBSECTION_FULL" | "DUPLICATE" | "QUESTION_NOT_FOUND" | "DELETED" }>;
}

/** GET /tests/admin/tests/:id/readiness ("Ready to publish? 2 checks left") */
export interface ReadinessResponse {
  now: IsoDateTime;
  canPublish: boolean;
  checks: Array<{
    code: "NAME_EXAM_PATTERN" | "WINDOW" | "BATCHES" | "QUESTIONS" | "WITHOUT_SOLUTION" | "NEEDS_LATEX" | "TEMPLATE";
    level: "ok" | "blocking" | "warning";
    /** values for the client's copy: { filled, needed } / { students, batches } / { count, where: ["Physics Q7"] } */
    facts: Record<string, unknown>;
  }>;
}
/** POST /tests/admin/tests/:id/publish → { now, test, notified }; 409 NOT_READY { checks }; a failure after acceptance sets publishFailed */
export interface PublishResponse {
  now: IsoDateTime;
  test: TestSettings;
  notified: number;
}

/* ═══════════════════════════════ tests: question picker ═══════════════════════════════ */

/** POST /tests/admin/tests/:id/picker/search */
export interface PickerSearchRequest {
  subsectionId: string;
  q?: string;
  chapterIds?: string[];
  topicIds?: string[];
  difficulty?: Difficulty | "unset";
  /** "Not in the last 4 tests" of these batches (default 4 when true) */
  notInLastTests?: number | null;
  hasSolution?: boolean;
  hasHindi?: boolean;
  sort?: "leastUsed" | "newest" | "difficulty";
  page?: number;
  pageSize?: number;
}
export interface PickerRow {
  questionId: string;
  type: QuestionType;
  stemPreview: string;
  difficulty: Difficulty | null;
  chapter: string | null;
  flags: QuestionFlags;
  /** paragraph sets: number of children and their types */
  set: { count: number; childTypes: ChildType[] } | null;
  /** "In this test · Q7" / "Set 1" */
  inThisTest: { n: number; subsectionId: string } | null;
  /** "Used in Mock 11" when used by one of the recent tests */
  recentTest: TestRef | null;
  lastUsed: (TestRef & { at: IsoDateTime }) | null;
  timesUsed: number;
  /** null = can be added; else why not ("This section takes sets of 3") */
  blockedReason: "WRONG_SET_SIZE" | "WRONG_CHILD_TYPE" | "SUBSECTION_FULL" | null;
}
export interface PickerSearchResponse {
  now: IsoDateTime;
  items: PickerRow[];
  pageInfo: PageInfo;
  /** "5 of 41 shown · 1 hidden: used in Mock 11" */
  hiddenRecent: number;
  slotsLeft: number;
}
/** GET /tests/admin/tests/:id/picker/questions/:questionId : preview (stem, options, key, passage + children, lists) */
export interface PickerPreview {
  now: IsoDateTime;
  question: { id: string; type: QuestionType; en: LangBlock; hi: LangBlock | null; correctAnswers?: string[]; correctAnswer?: { from: number; to: number } } & Partial<Omit<ParagraphShape, "type">> & Partial<Pick<MatrixShape, "matrix">>;
}
/** POST /tests/admin/tests/:id/picker/fill-preview ("Fill by rule"; Swap = same call with swapOut) */
export interface FillPreviewRequest {
  subsectionId: string;
  chapterIds: string[];
  mix: Partial<Record<Difficulty, number>>;
  skipRecent: boolean;
  onlyWithSolution: boolean;
  onlyWithHindi: boolean;
  /** replace one proposed question, keeping the others */
  swapOut?: string;
  proposed?: string[];
  seed?: number;
}
export interface FillPreviewResponse {
  now: IsoDateTime;
  matching: number;
  slotsLeft: number;
  proposed: PickerRow[];
  /** fewer matched than slots: { chapter, wanted, available } */
  shortfalls: Array<{ chapter: string | null; difficulty: Difficulty | null; wanted: number; available: number }>;
  seed: number;
}

/* ═══════════════════════════════ tests: live Monitor + extra time ═══════════════════════════════ */

export type MonitorStatus = "writing" | "submitted" | "notStarted" | "autoSubmitted" | "offline";

/** GET /tests/admin/tests/:id/monitor?filter=&q=&batchId=&page=&pageSize= (poll every 15 s) */
export interface MonitorResponse {
  now: IsoDateTime;
  test: TestRef & { state: TestState; opensAt: IsoDateTime | null; closesAt: IsoDateTime | null; questions: number; batches: Ref[]; resultMode: ResultMode };
  assigned: number | null;
  tiles: {
    writing: number;
    submitted: number;
    notStarted: number;
    /** not started but signed in with their link (before open: "41 waiting") */
    waiting: number;
    neverOpened: number;
    autoSubmitted: number;
    /** in progress, last autosave > 2 min ago */
    offline: number;
    /** fullscreen exits ≥ exitsFlagAt */
    exitsFlagged: number;
  };
  /** "2+ fullscreen exits · limit is 3": policy maxExits − 1 when the policy is on, else 3 (M5 threshold) */
  exitsFlagAt: number;
  exitsLimit: number | null;
  items: MonitorRow[];
  pageInfo: PageInfo;
}
export interface MonitorRow {
  student: { id: string; name: string; batch: Ref | null; phone: string | null };
  status: MonitorStatus;
  /** "3rd fullscreen exit" / "Time ran out" / "Opened the link at 9:40 AM" / "Never opened the link" */
  reason: "exitLimit" | "timeUp" | "openedLink" | "neverOpened" | "waitingOnInstructions" | null;
  reasonAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  answered: number;
  /** seconds left on their own clock (extra time included); null when not writing */
  secondsLeft: number | null;
  fullscreenExits: number;
  /** last autosave (or link open / submit) */
  lastSeenAt: IsoDateTime | null;
  extraMinutes: number;
}
/** GET /tests/admin/tests/:id/monitor/students/:studentId */
export interface MonitorStudentDetail {
  now: IsoDateTime;
  row: MonitorRow;
  answeredBySection: Array<{ section: string; answered: number }>;
  markedForReview: number;
  exitsAllowed: number | null;
  timeline: Array<{
    at: IsoDateTime;
    kind: "linkOpened" | "started" | "fullscreenExit" | "answerSaved" | "noContact" | "extraTime" | "submitted" | "autoSubmitted";
    /** fullscreenExit: { durationSeconds|null, action: "warned"|"submitted" }; answerSaved: { question: "Maths Q9" }; extraTime: { minutes, by, reason } */
    data: Record<string, unknown>;
  }>;
}
/** POST /tests/admin/tests/:id/monitor/students/:studentId/extra-time (no force-submit exists) */
export interface ExtraTimeRequest {
  minutes: 5 | 10 | 15 | 30;
  /** required (owner), 3–300 chars; stored in the audit event */
  reason: string;
}
export interface ExtraTimeResponse {
  now: IsoDateTime;
  expiresAt: IsoDateTime;
  secondsLeft: number;
  extraMinutes: number;
  auditEventId: string;
}
/** GET /tests/admin/tests/:id/monitor.csv : same columns as the table */
export type MonitorCsv = string;

/* ═══════════════════════════════ tests: calendar + reschedule ═══════════════════════════════ */

/** GET /tests/admin/calendar?from=&to=&batchIds=&examId= (IST days; ≤ 62 days) */
export interface CalendarResponse {
  now: IsoDateTime;
  tests: Array<
    TestRef & {
      state: TestState;
      publishFailed: boolean;
      opensAt: IsoDateTime;
      closesAt: IsoDateTime;
      batches: Ref[];
      pattern: (Ref & { durationMinutes: number }) | null;
      resultMode: ResultMode;
      attempts: { assigned: number | null; submitted: number } | null;
      /** published, not open yet, and not live: may be dragged */
      movable: boolean;
    }
  >;
  /** "Results: Mock 11" / "Mock 11 key corrected" markers */
  resultEvents: Array<{ date: IsoDate; test: TestRef; kind: "published" | "keyCorrected" }>;
  /** same batch, overlapping windows ("Clash · Indore A") */
  clashes: Array<{ date: IsoDate; batch: Ref; testIds: string[] }>;
}
/** POST /tests/admin/tests/:id/reschedule { opensAt, closesAt, confirm } ; confirm=false answers the impact only */
export interface RescheduleRequest {
  opensAt: IsoDateTime;
  closesAt: IsoDateTime;
  confirm: boolean;
}
export interface RescheduleResponse {
  now: IsoDateTime;
  from: { opensAt: IsoDateTime | null; closesAt: IsoDateTime | null };
  to: { opensAt: IsoDateTime; closesAt: IsoDateTime };
  /** published: students told the old time get a new notice */
  notify: number;
  /** links keep working and now close at the new close */
  linksExpireAt: IsoDateTime | null;
  applied: boolean;
  clashes: CalendarResponse["clashes"];
}

/* ═══════════════════════════════ tests: answer-key fix + re-score ═══════════════════════════════ */

export interface AnswerKey {
  optionIds?: string[];
  range?: { from: number; to: number };
  /** matrix: row id → column ids */
  matches?: Record<string, string[]>;
}

/** POST /tests/admin/tests/:id/key-fix/preview */
export interface KeyFixPreviewRequest {
  /** the paper question (a paragraph child: the child's id) */
  questionId: string;
  /**
   * Owner (6 Nov): changeKey = replace the key with newKey; acceptAlso = newKey AND every key in acceptKeys get full
   * marks ("Accept B or C"); drop = every submission gets full marks for it, answered or not (newKey ignored).
   * Absent = changeKey.
   */
  mode?: "changeKey" | "acceptAlso" | "drop";
  acceptKeys?: AnswerKey[];
  newKey: AnswerKey;
  /** also correct the bank question (default true) */
  updateBank?: boolean;
  /** why the key changes (8 Nov: required, 3–500 characters; audited, shown in the admin "key corrected" notes) */
  reason: string;
}
export interface KeyFixPreview {
  now: IsoDateTime;
  previewId: string;
  expiresAt: IsoDateTime;
  n: number;
  oldKey: AnswerKey;
  newKey: AnswerKey;
  /** "re-scoring updates 212 results" */
  submissions: number;
  scoresChange: number;
  /** students whose mark on the question changes = who see "key corrected" */
  studentsNotified: number;
  marksUp: number;
  marksDown: number;
  ranksChange: number;
  averageBefore: number;
  averageAfter: number;
  resultPublished: boolean;
  mode: "changeKey" | "acceptAlso" | "drop";
  /** biggest movers first, up to 20 (the preview's Student / Score / Rank table) */
  examples: Array<{ student: { id: string; name: string }; score: { before: number; after: number }; rank: { before: number; after: number } }>;
  /** students who get the short "key corrected" email (mark changed and results emails on) */
  emailed: number;
  /** additions (8 Nov): the reason as saved, the fixed question's section average, the top 10 change (board fix-impact "Top 10 · 2 in, 2 out · Topper unchanged") */
  reason?: string;
  sectionAverage?: { name: string; before: number; after: number } | null;
  top10?: { in: number; out: number; topperChanged: boolean; entered: Array<{ id: string; name: string }>; left: Array<{ id: string; name: string }> };
}
/** POST /tests/admin/tests/:id/key-fix { previewId, reason? } → 202 { correction }; poll GET /tests/admin/tests/:id/key-fix/:correctionId */
export interface KeyCorrection {
  id: string;
  status: "running" | "done" | "failed";
  mode: "changeKey" | "acceptAlso" | "drop";
  acceptKeys: AnswerKey[];
  /** "Re-scoring JEE Main Mock 11 · 140 of 212" */
  progress: { done: number; total: number };
  scoresChanged: number;
  ranksChanged: number;
  averageAfter: number | null;
  emailed: number;
  n: number;
  questionId: string;
  oldKey: AnswerKey;
  newKey: AnswerKey;
  by: PersonRef;
  at: IsoDateTime;
  rescored: number;
  studentsNotified: number;
  auditEventId: string | null;
  /** additions (8 Nov): the batch average before the re-score, why the key changed (null for corrections before 8 Nov) */
  averageBefore?: number | null;
  reason?: string | null;
}

/** Added to the student result (GET /tests/student/results/:testId) and review question */
export interface StudentKeyCorrectionNote {
  n: number;
  questionId: string;
  correctedAt: IsoDateTime;
  oldKey: AnswerKey;
  newKey: AnswerKey;
  /** this student's mark on the question before → after */
  yourMarks: { before: number; after: number };
  mode: "changeKey" | "acceptAlso" | "drop";
  /** "Your score went from 243 to 248 and your rank from 17 to 14" (rank null while not final) */
  yourScore: { before: number; after: number };
  yourRank: { before: number | null; after: number | null };
  /** admin student report only (8 Nov): why the key changed; never sent to students */
  reason?: string | null;
}

/* ═══════════════════════════════ tests: results publish confirm ═══════════════════════════════ */

/** GET /tests/admin/tests/:id/result-publish-preview ("Publish results for Maths Sectional 3?") */
export interface ResultPublishPreview {
  now: IsoDateTime;
  test: TestRef & { resultMode: ResultMode; resultDueAt: IsoDateTime | null };
  students: number;
  absent: number;
  /** students with email results on (students only; no parent emails, owner 5 Nov) */
  emailed: number;
  aiReviewUnlocks: boolean;
  /** addition (8 Nov): whether "Publish now" works, else the code POST …/results/publish would answer */
  publishNow?: PublishNowCheck;
}

/**
 * "Publish now" (8 Nov). POST /tests/admin/tests/:id/results/publish [PUBLISH_RESULT]: Manual publishes; "After N days"
 * publishes early (the automatic date moves to now). 409 codes: ALREADY_PUBLISHED (students see them: Immediately, At
 * close after the close, or published), TEST_NOT_ENDED (not closed yet, or a student's extra time still running),
 * RESULT_HIDDEN (results hidden in the test's settings), NO_SUBMISSIONS. "Results out" emails follow from the
 * notifications job once the rank is final.
 */
export interface PublishNowCheck {
  allowed: boolean;
  code: "ALREADY_PUBLISHED" | "TEST_NOT_ENDED" | "RESULT_HIDDEN" | "NO_SUBMISSIONS" | null;
  message: string | null;
}
export interface PublishResultsNowResponse {
  now: IsoDateTime;
  publishedAt: IsoDateTime;
  students: number;
  emailed: number;
  test: AdminTestSummary;
}

/** GET /tests/admin/tests/:id/summary [READ_TEST or VIEW_RESULT] (8 Nov): one list row plus the header facts of Results, Analysis and the student report */
export interface AdminTestSummary extends AdminTestListItem {
  kind: string | null;
  isDeleted: boolean;
  durationMinutes: number;
  resultAfterDays: number | null;
  hideResult: boolean;
  /** students can see their result now */
  resultVisible: boolean;
  fullscreenPolicy: FullscreenPolicy;
  submissions: number;
  autoSubmitted: number;
  settlesAt: IsoDateTime | null;
  /** ranks are final (no attempt can still be running) */
  settled: boolean;
  publishNow: PublishNowCheck;
}
export interface AdminTestSummaryResponse {
  now: IsoDateTime;
  test: AdminTestSummary;
}

/**
 * GET /tests/admin/dashboard/chapter-accuracy?lastN=3&subjects=Physics&batchIds=&limit=10 [VIEW_RESULT] (8 Nov; board
 * Admin-Dashboard "teacher"): a scoped role's batches (narrowed by batchIds), an institute-wide caller's batchIds or every
 * batch; the last lastN (1–10) closed tests of those batches with a submission, newest first; accuracy = right /
 * attempted over those batches' submitters, weakest first (then most attempted).
 */
export interface ChapterAccuracyResponse {
  now: IsoDateTime;
  /** null = every batch */
  batchIds: string[] | null;
  lastN: number;
  tests: Array<TestRef & { closesAt: IsoDateTime | null; students: number }>;
  chapters: Array<{ subject: string; chapter: string; questions: number; attempted: number; right: number; accuracyPercent: number | null; perTest: Array<{ testId: string; accuracyPercent: number | null }> }>;
  /** "Rotational motion: 41% right in Mock 11" */
  weakestInLastTest: { test: TestRef; subject: string; chapter: string; accuracyPercent: number; attempted: number } | null;
}

/* ═══════════════════════════════ tests: student exam payload (compat with the frozen NTA screens) ═══════════════════════════════ */

/**
 * Extra fields on each question of GET /tests/test/student/:testId. Paragraph sets arrive flattened: one question per
 * child (its own id, type and options) with the passage prepended to its stem; matrix arrives as `matrix` with rows and
 * columns for the NTA-style grid. See doc "Student exam payload".
 */
export interface StudentExamQuestionExtras {
  /** the question's own type (the store must prefer it over the sub-section type); matrix = NTA-style grid (owner, 5 Nov) */
  type: "single" | "multiple" | "integer" | "matrix";
  /** original bank type */
  sourceType: QuestionType;
  /** paragraph children */
  set: { setId: string; index: number; count: number; passage: { en: RichText; hi: RichText | null } } | null;
  /** matrix: grid rows (List I, A–D…) and columns (List II, P–T…) */
  matrix: { rows: Array<{ id: string; en: RichText; hi: RichText | null }>; columns: Array<{ id: string; en: RichText; hi: RichText | null }> } | null;
  markingScheme: { correct: number[]; incorrect: number };
}
/** Ticked cells per row: { A: ["P"], B: ["Q", "R"] } */
export type MatrixAnswer = Record<string, string[]>;

/** One question's entry in save-progress / submit / resume (sections[].subSections[].questions[qid]) */
export interface StudentAnswerEntry {
  selectedOptions?: string[];
  enteredAnswer?: number;
  /** matrix only */
  matrix?: MatrixAnswer;
  timeTakenInSeconds?: number;
  status?: string;
}

/** Template delivered with the test (v2); shown on the frozen exam and instructions screens (owner, 5 Nov) */
export interface StudentExamTemplate {
  id: string;
  /** instructions placeholders already filled for this test */
  wording: Record<Lang, Record<WordingKey, string>>;
  instructions: Record<Lang, InstructionsDoc>;
  tools: ExamTools;
}
/** POST /tests/test/save-progress (added: events); response adds attempt.expiresAt (extra time) */
export interface SaveProgressExtras {
  events?: Array<{ kind: "fullscreenExit"; at: IsoDateTime; durationSeconds: number | null }>;
}
export interface SaveProgressResponseExtras {
  attempt: { expiresAt: IsoDateTime; extraMinutes: number };
}

/* ═══════════════════════════════ ai: AI test builder ═══════════════════════════════ */

/** POST /ai/admin/tests/:testId/build → text/event-stream (JSON errors before the stream) */
export interface TestBuildRequest {
  /** "Describe the test" (optional, ≤ 1,000 chars) */
  description: string;
  options: {
    /** "Weak topics from Mock 11": weight the batches' weakest chapters in that test */
    weakTopicsFromTestId: string | null;
    /** "Skip recently used": skip questions in the batches' last N tests (default 4) */
    skipRecentTests: number | null;
  };
  /** keep hand-picked slots (default true); false = "Replace my 9 hand-picked questions too" */
  keepManual: boolean;
  expectedRevision: number;
}

/** What the model writes (validated by code; the bank is then filled deterministically by tests) */
export interface TestBuildSpec {
  subsections: Array<{
    subsectionId: string;
    /** chapter ids from the given list only; counts sum to the slots to fill */
    chapters: Array<{ chapterId: string; count: number }>;
    mix: Partial<Record<Difficulty, number>>;
  }>;
  notes: AiText;
}

export type TestBuildStage = "readingPattern" | "picking" | "balancing";

/**
 *   event: start   data: { build: TestBuild (status running), quota }
 *   event: stage   data: { stage }                             (labels "Reading the pattern…", "Picking 75 questions…", "Balancing difficulty…")
 *   event: done    data: { build: TestBuild, paper: PaperView } (status done | failed)
 */
export type TestBuildStreamEvent =
  | { event: "start"; data: { build: TestBuild; quota: { usedToday: number; perDay: number; resetsAt: IsoDateTime } } }
  | { event: "stage"; data: { stage: TestBuildStage; picked?: number; total?: number } }
  | { event: "done"; data: { build: TestBuild; paper: PaperView | null } };

export interface TestBuild {
  id: string;
  testId: string;
  status: "running" | "done" | "failed";
  /** "Built 72 of 75" */
  built: number;
  total: number;
  keptManual: number;
  replaced: number;
  shortfalls: Array<{ subsectionId: string; chapter: string; wanted: number; available: number }>;
  /** Undo ("One click, until you leave the page") */
  previousRevision: number | null;
  error: { code: string; message: string } | null;
  credits: number;
  modelId: string | null;
  createdAt: IsoDateTime;
}

/* ═══════════════════════════════ ai: paper parse v2 (.docx direct) + image-to-LaTeX ═══════════════════════════════ */

/** POST /ai/admin/parse (multipart: file, defaults) — .docx, .pdf, .xlsx (template), .png/.jpg (photos), ≤ 20 MB; text via /admin/parse-text */
export interface ParseDefaults {
  subjectId?: string;
  /** null = "Let AI suggest per question" */
  chapterId?: string | null;
  difficulty?: Difficulty;
}

export type ParseRowFlag =
  | "EQUATION_WAS_IMAGE" // "Equation was an image · check the LaTeX" (image kept, data-needs-latex)
  | "DIAGRAM_WMF" // "A drawing could not be kept · upload it as PNG" (Word-drawn shapes, charts; WMF/EMF drawings are drawn to PNG and kept)
  | "NO_ANSWER" // "No answer in the key"
  | "LOW_CONFIDENCE"
  | "PARTIAL";

export interface ParsedQuestionV2 {
  /** stable within the job ("p12") */
  id: string;
  /** paper order, 1-based */
  n: number;
  type: QuestionType;
  en: LangBlock;
  hi: LangBlock | null;
  correctAnswers?: string[];
  correctAnswer?: { from: number; to: number };
  passage?: ParagraphShape["passage"];
  questions?: ParagraphChild[];
  matrix?: MatrixShape["matrix"];
  subject?: string;
  chapter?: string;
  topics?: string[];
  difficulty?: Difficulty;
  flags: ParseRowFlag[];
  confidence: number;
}

export interface ParseJobV2 {
  jobId: string;
  fileName: string;
  kind: "docx" | "pdf" | "image" | "text" | "xlsx";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  /** "Page 9 of 15 · 41 questions so far · about 30 s left" */
  progress: { unit: "page" | "chunk"; done: number; total: number; questionsSoFar: number; secondsLeft: number | null } | null;
  /** failed: READ_FAILED (blurry scan, no text) | AI_PAUSED | AI_UNAVAILABLE | FILE_TOO_LARGE; creditsUsed 0 on READ_FAILED */
  error: { code: string; message: string } | null;
  creditsUsed: number;
  modelUsed: boolean;
  createdAt: IsoDateTime;
  finishedAt: IsoDateTime | null;
}
/** GET /ai/admin/parse/jobs?active=1 ("show it under Import in the bank"); POST /ai/admin/parse/jobs/:jobId/cancel */
export interface ParseJobListResponse {
  now: IsoDateTime;
  jobs: ParseJobV2[];
}

/** POST /questions/ai/confirm (changed): all 5 types, source tag; answers counts for the done step */
export interface ImportConfirmRequestV2 {
  questions: Array<ParsedQuestionV2 & { subjectId: string; chapterIds: string[]; topicIds?: string[] }>;
  sourceTag?: string | null;
  jobId?: string | null;
}
export interface ImportConfirmResponseV2 {
  created: number;
  questionIds: string[];
  bySubject: Array<{ subject: string; count: number }>;
  withoutHindi: number;
  needsLatex: number;
}

/* ── assist on paragraph and matrix (owner, 5 Nov: in M6) ── */

/** M5 AssistRequest + M6 kinds; childId: solution draft for one paragraph child only */
export interface AssistRequestM6 {
  kind: DraftKindM6;
  target?: LatexAssistTarget;
  childId?: string;
}
/** translation payload for every type (single/multiple/integer as M5) */
export interface TranslationPayloadM6 {
  hi: {
    question: RichText;
    options?: Array<{ id: string; value: RichText }>;
    solution?: RichText;
    /** paragraph: the Hindi passage */
    passage?: RichText;
    /** paragraph: per child, same ids and option ids in order */
    children?: Array<{ id: string; question: RichText; options?: Array<{ id: string; value: RichText }>; solution?: RichText }>;
    /** matrix: Hindi text per row, same ids */
    matrix?: { listI: Array<{ id: string; value: RichText }>; listII: Array<{ id: string; value: RichText }> };
  };
}
/** solution payload: paragraph = per child; matrix = one solution with stated matches */
export interface SolutionPayloadM6 {
  solution?: RichText;
  statedAnswer?: { optionIds?: string[]; value?: number; matches?: MatrixAnswer } | null;
  children?: Array<{ childId: string; solution: RichText; statedAnswer: { optionIds?: string[]; value?: number } | null; keyAgreement: "agrees" | "disagrees" | "unknown" }>;
}

/** M5 DraftKind gains "latex" (image-to-LaTeX, "Convert with AI") */
export type DraftKindM6 = "tags" | "translation" | "solution" | "latex";
/** POST /ai/admin/questions/:questionId/assist { kind: "latex", target } (SSE as M5) */
export interface LatexAssistTarget {
  /** where the image sits: "en.options.D", "en.question", "passage.en", "questions.2.en.solution", "matrix.listII.R.en" */
  field: string;
  imageSrc: string;
}
export interface LatexPayload {
  field: string;
  imageSrc: string;
  /** inline LaTeX that replaces the image (without $ delimiters) */
  latex: string;
}

/* ═══════════════════════════════ ai: features, limits ═══════════════════════════════ */

export type AdminAiFeatureM6 = "autoTag" | "translate" | "solutionDraft" | "batchSummary" | "answerKeyCheck" | "testBuilder" | "imageToLatex" | "parse";

export const ADMIN_AI_LIMITS_M6: Record<"testBuilder" | "imageToLatex", { perDay: number; perUserPerHour: number }> = {
  testBuilder: { perDay: 60, perUserPerHour: 20 },
  imageToLatex: { perDay: 500, perUserPerHour: 120 },
};

/* ═══════════════════════════════ internal (HMAC token, never via the gateway) ═══════════════════════════════ */

/** tests ← ai: POST /internal/tests/:testId/build-from-spec */
export interface BuildFromSpecRequest {
  spec: TestBuildSpec;
  keepManual: boolean;
  skipRecentTests: number | null;
  expectedRevision: number;
  buildId: string;
  actor: { type: "user"; id: string; role: string | null };
  seed: number;
}
export interface BuildFromSpecResponse {
  paper: PaperView;
  previousRevision: number;
  built: number;
  total: number;
  keptManual: number;
  replaced: number;
  shortfalls: TestBuild["shortfalls"];
}
/** tests ← ai: POST /internal/tests/:testId/build-input : pattern, slots, taxonomy available per subsection, weak chapters */
export interface BuildInputResponse {
  test: TestRef & { exam: string | null; batches: Ref[] };
  subsections: Array<{ subsectionId: string; section: string; subject: string | null; type: QuestionType; slotsToFill: number; manualKept: number; chapters: Array<{ chapterId: string; name: string; available: number }> }>;
  weakChapters: Array<{ chapterId: string | null; chapter: string; subject: string; accuracyPercent: number }>;
  revision: number;
}
/** tests ← questions: POST /internal/tests/question-locks { questionIds } */
export interface QuestionLocksResponse {
  locks: Record<string, { live: Array<TestRef & { closesAt: IsoDateTime; writing: number }>; scheduled: Array<TestRef & { opensAt: IsoDateTime }> }>;
}
/** tests ← questions: POST /internal/tests/questions-changed { questionIds } → { refreshed: testIds } (snapshots of unopened tests) */
export interface QuestionsChangedRequest {
  questionIds: string[];
}
/** questions ← tests: POST /internal/questions/picker-select { filter, excludeIds?, limit ≤ 5000 } */
export interface PickerSelectRequest {
  filter: {
    subjectId?: string | null;
    type: QuestionType;
    chapterIds?: string[];
    topicIds?: string[];
    difficulty?: Difficulty | "unset";
    q?: string;
    hasSolution?: boolean;
    hasHindi?: boolean;
    /** paragraph */
    setSize?: number;
    childType?: ChildType | "mixed";
  };
  excludeIds?: string[];
  limit: number;
}
export interface PickerSelectResponse {
  questions: Array<{ id: string; type: QuestionType; difficulty: Difficulty | null; chapterIds: string[]; chapter: string | null; flags: QuestionFlags; set: PickerRow["set"]; createdAt: IsoDateTime }>;
  truncated: boolean;
}
/** questions ← tests: POST /internal/questions/snapshots { questionIds ≤ 200 } : full content for paper snapshots and previews */
export interface SnapshotsResponse {
  questions: Array<Record<string, unknown> & { id: string; type: QuestionType; updatedAt: IsoDateTime }>;
  notFound: string[];
}
/** questions|tests ← users: POST /internal/<service>/labels { refs: [{ type, id }] } (audit reader names) */
export interface LabelsResponse {
  labels: Record<string, { label: string; context: string | null } | null>;
}
/** tests|ai ← users: GET /internal/tests/students/:id/footprint ; POST /internal/{tests,ai}/students/:id/erase ("Erase everything" only) */
export interface StudentFootprint {
  attempts: number;
  results: number;
  doubts?: number;
  writingNow: TestRef[];
}
/** users ← tests: POST /internal/users/test-links/opens { testId } → per student first/last link open; POST /internal/users/test-links/expiry { testId, expiresAt } */
export interface TestLinkOpensResponse {
  opens: Record<string, { firstOpenedAt: IsoDateTime; lastOpenedAt: IsoDateTime; opens: number }>;
}
/** users ← tests: POST /internal/users/students { ids ≤ 1000 } (Monitor rows) */
export interface InternalStudentsResponse {
  students: Array<{ id: string; name: string; batch: Ref | null; phone: string | null; status: UserStatus }>;
  notFound: string[];
}
/** questions ← tests: POST /internal/questions/apply-key (key fix with updateBank; audit question.key_corrected in the same transaction) */
export interface ApplyKeyRequest {
  questionId: string;
  /** paragraph child: the set's id + childId */
  childId?: string | null;
  key: AnswerKey;
  testId: string;
  correctionId: string;
  actor: { type: "user"; id: string; role: string | null };
}
/** users ← tests: POST /internal/users/notify kinds added in M6 (all sent; see doc "Emails") */
export type NotifyKindM6 = "testPublished" | "testRescheduled" | "keyCorrected" | "testLink";

/* ═══════════════════════════════ error codes added in M6 ═══════════════════════════════ */

export type M6ErrorCode =
  | "VALIDATION_ERROR" // 400 details FieldErrors
  | "STAFF_ONLY" // 403
  | "FORBIDDEN" // 403 details { permission }: the role lacks the key
  | "REAUTH_REQUIRED" // 403: missing / expired / other user's x-reauth-token
  | "WRONG_PASSWORD" // 401 (reauth, me/password: 400) details { triesLeft }
  | "TOO_MANY_ATTEMPTS" // 429 details { retryAfterSeconds }
  | "LOGIN_LOCKED" // 429 details { retryAfterSeconds }
  | "ACCOUNT_DISABLED" // 403: deactivated account
  | "STUDENT_ACCOUNT" // 403 details { studentPortalUrl }: student on the staff console
  | "SESSION_REVOKED" // 401: token older than a sign-out of other devices
  | "WEAK_PASSWORD" // 400: < 8 characters
  | "PASSWORD_MISMATCH" // 400
  | "RESET_TOKEN_INVALID" // 400: used, replaced or older than 30 minutes
  | "EMAIL_TAKEN" // 409 details TakenDetails (sign-up: no details)
  | "PHONE_TAKEN" // 409 details TakenDetails
  | "OTP_WRONG" // 400 details { triesLeft }
  | "OTP_EXPIRED" // 410
  | "OTP_COOLDOWN" // 429 details { retryAfterSeconds }
  | "PROMO_LENGTH" // 400: not 6 characters
  | "PROMO_INVALID" // 404
  | "PROMO_TAKEN" // 409 details { code }
  | "INVALID_CITY" // 400 details { allowed }
  | "BATCH_NOT_AT_CENTRE" // 400
  | "STUDENT_WRITING" // 409 details { tests }: delete / anonymise / erase while the student writes a test
  | "STUDENT_NOT_ALLOWED" // 400: students can't be added to a role
  | "ROLE_LOCKED" // 409: Admin role
  | "ROLE_HAS_MEMBERS" // 409 details { members }
  | "NAME_TAKEN" // 409: role / pattern / template / exam / batch name
  | "CENTRE_HAS_BATCHES" // 409 details { batches }
  | "IMPORT_NOT_FOUND" // 404
  | "IMPORT_EXPIRED" // 410: older than 24 h
  | "UNSUPPORTED_FILE" // 400
  | "FILE_TOO_LARGE" // 413 details { maxBytes }
  | "TOO_MANY_ROWS" // 400 details { max }
  | "MISSING_COLUMNS" // 400 details { columns }
  | "UNSUPPORTED_IMAGE" // 400: not PNG/JPG/SVG
  | "IMAGE_TOO_LARGE" // 413: > 2 MB
  | "QUESTION_IN_LIVE_TEST" // 409 details QuestionInLiveTestDetails
  | "TAXONOMY_IN_USE" // 409 details TaxonomyInUseDetails
  | "PATTERN_LOCKED" // 409 details { usedBy }: questions/marks of a pattern used by tests
  | "PATTERN_IN_USE" // 409 details { tests }: delete
  | "EXAM_IN_USE" // 409 details ExamInUseDetails
  | "TEMPLATE_IN_USE" // 409 details TemplateInUseDetails
  | "TEST_NOT_FOUND" // 404
  | "TEST_LOCKED" // 409: submissions exist / opened
  | "TEST_LIVE" // 409 details { writing, closesAt }: delete or move while live
  | "TEST_ENDED" // 409: move an ended test
  | "NOT_READY" // 409 details { checks }: publish with blocking checks
  | "PAPER_CHANGED" // 409 details { revision }
  | "SUBSECTION_NOT_FOUND" // 404
  | "ATTEMPT_NOT_RUNNING" // 409: extra time for a student not writing
  | "KEY_FIX_PREVIEW_EXPIRED" // 410 (15 minutes)
  | "KEY_FIX_RUNNING" // 409
  | "UNSUPPORTED_TYPE" // 409 (no longer for paragraph/matrix assist, owner 5 Nov)
  | "ADMIN_AI_DAILY_LIMIT" // 429 (M5 shape)
  | "AI_RATE_LIMITED" // 429
  | "AI_PAUSED" // 503
  | "AI_UNAVAILABLE" // 503
  | "BUILD_RUNNING" // 409 details { buildId }: one AI build per test at a time
  | "READ_FAILED" // 422: the paper could not be read (no credits used)
  | "NOT_IMPLEMENTED" // 501: *_DB = mongo
  | "INTERNAL"; // 500

/** Monitor: no autosave for this long while in progress = "Offline" (owner) */
export const MONITOR_OFFLINE_AFTER_SECONDS = 120;
/** Monitor refresh interval */
export const MONITOR_POLL_SECONDS = 15;
/** Soft-delete Undo windows */
export const UNDO_WINDOW_SECONDS = { toast: 6, examRestoreDays: 30 } as const;

/* ═══════════════════════════════ batches 4/5 (approved 6 Nov, canvas v153) ═══════════════════════════════ */

/** Student test keys / links: exactly 6 characters from an unambiguous alphabet (owner, 6 Nov) */
export const TEST_KEY_LENGTH = 6;

/** Default Teacher role (seed, owner 6 Nov): can add questions; cannot create tests or add students */
export const TEACHER_ROLE_SEED: string[] = [
  "READ_QUESTION", "CREATE_QUESTION", "UPDATE_QUESTION", "USE_AI_TOOLS",
  "READ_TEST", "VIEW_RESULT", "READ_PATTERN", "READ_EXAM", "READ_BATCH", "READ_SUBJECT", "MANAGE_TOPIC",
  "READ_USER", "READ_ENTITY_HISTORY",
];

/* ── student: test gate (before the frozen /instructions) ── */

export type GateState = "ready" | "opensSoon" | "closed" | "submitted" | "notAssigned" | "resume" | "notFound";

/** GET /tests/student/tests/:testId/gate (student). link-expired / link-used come from POST /users/student/auth/login-with-key; unsupported / offline are client checks */
export interface StudentGateResponse {
  now: IsoDateTime;
  state: GateState;
  test: { testId: string; name: string; questions: number; durationMinutes: number; maxMarks: number; subjects: string[]; opensAt: IsoDateTime | null; closesAt: IsoDateTime | null } | null;
  /** notAssigned: the test's batches vs yours */
  batches: { test: Ref[]; yours: Ref | null } | null;
  /** resume */
  attempt: { startedAt: IsoDateTime; expiresAt: IsoDateTime; answered: number; total: number; lastSavedAt: IsoDateTime | null; fullscreenExits: number; exitsAllowed: number | null } | null;
  /** submitted */
  submission: { submittedAt: IsoDateTime; receiptId: string; resultVisible: boolean; resultAt: IsoDateTime | null; resultHidden: boolean } | null;
  /** fullscreen policy and reminder preference for the copy ("We'll also email you 1 hour before") */
  fullscreenPolicy: FullscreenPolicy;
  reminderEmailOn: boolean;
}

/* ── student: offline-safe submit, answer history ── */

/** One answer change or question visit, logged by the exam store */
export interface AnswerLogEntry {
  questionId: string;
  at: IsoDateTime;
  kind: "visit" | "answer" | "clear" | "markReview";
  /** answer: the new value */
  value?: { selectedOptions?: string[]; enteredAnswer?: number; matrix?: MatrixAnswer } | null;
}
/** Added to POST /tests/test/save-progress and /submit */
export interface SubmitExtras {
  /** device clock at the moment the student pressed Submit (or the timer hit 0) */
  submittedAtDevice?: IsoDateTime;
  /** entries since the last acknowledged save (idempotent by questionId + at + kind) */
  answerLog?: AnswerLogEntry[];
}
/** POST /tests/test/submit answer (added fields; Student-Submitted) */
export interface SubmitResponseM6 {
  receiptId: string;
  /** recorded time: the device time when ≤ deadline, else the deadline */
  submittedAt: IsoDateTime;
  answered: number;
  total: number;
  timeUsedSeconds: number;
  autoSubmitted: { reason: "timeUp" | "exitLimit" } | null;
  /** answers changed after the deadline that were not counted */
  ignoredLateChanges: number;
  resultVisible: boolean;
  resultHidden: boolean;
  /** when the result opens (pending) */
  resultAt: IsoDateTime | null;
  /** when the rank is final (settle time) */
  rankAt: IsoDateTime | null;
  resultsEmailOn: boolean;
}

/* ── student: result states, review ── */

/** Added to GET /tests/student/results/:testId (Student-ResultStates) */
export interface StudentResultExtras {
  publishedAt: IsoDateTime | null;
  /** "updated Wed 4 Nov" */
  updatedAt: IsoDateTime | null;
  keyCorrections: StudentKeyCorrectionNote[];
  /** null while not final: "After the test closes · 118 of 212 have submitted so far" */
  rank: { rank: number; of: number; percentile: number } | null;
  rankPending: { availableAt: IsoDateTime; submittedSoFar: number; assigned: number | null } | null;
  timeUsedSeconds: number;
  durationSeconds: number;
  /** "Most time on Maths: 1 h 2 min" */
  sections: Array<{ name: string; score: number; maxScore: number; correct: number; partial: number; wrong: number; skipped: number; timeSeconds: number }>;
}
/** details of 403 RESULT_HIDDEN ("Your institute isn't sharing scores for this test") */
export interface ResultHiddenDetails {
  submittedAt: IsoDateTime;
  receiptId: string;
}
/** details of 404 NO_SUBMISSION (changed: the state the page needs) */
export interface NoSubmissionDetails {
  state: "inProgress" | "upcoming" | "missed";
  opensAt: IsoDateTime | null;
  closesAt: IsoDateTime | null;
  attempt: { answered: number; total: number; secondsLeft: number } | null;
}
/** Review question additions (Student-Review): matrix grid and paragraph */
export interface ReviewQuestionExtras {
  type: QuestionType;
  set: { setId: string; index: number; count: number; nFrom: number; nTo: number; passage: { en: RichText; hi: RichText | null } } | null;
  matrix: {
    rows: Array<{ id: string; en: RichText; hi: RichText | null }>;
    columns: Array<{ id: string; en: RichText; hi: RichText | null }>;
    yours: MatrixAnswer;
    key: MatrixAnswer;
    rowOutcomes: Record<string, "right" | "wrong" | "blank">;
  } | null;
  /** the marking rule line ("+4 all correct · +1 per correct option · −2 any wrong") as data */
  marking: Marking;
  keyCorrection: StudentKeyCorrectionNote | null;
}

/* ── admin: results table, student report, AI review ── */

/** GET /tests/admin/tests/:id/results?q=&batchId=&flagged=1&sort=rank|name|score&page= ; GET …/results.csv */
export interface AdminResultsResponse {
  now: IsoDateTime;
  items: Array<{
    /** phone: addition (8 Nov), READ_USER only, else null */
    student: { id: string; name: string; batch: Ref | null; phone?: string | null };
    rank: number;
    score: number;
    maxScore: number;
    sections: Array<{ name: string; score: number }>;
    timeUsedSeconds: number;
    submittedAt: IsoDateTime;
    autoSubmitted: { reason: "timeUp" | "exitLimit" } | null;
    fullscreenExits: number | null;
    flagged: boolean;
    /** last key correction moved them: "was 243 · was rank 17" */
    before: { score: number; rank: number } | null;
  }>;
  pageInfo: PageInfo;
  keyCorrections: KeyCorrection[];
  /**
   * additions (8 Nov): sort = rank|name|score|time|submitted|exits|s<i> (i-th section) with dir asc|desc (default rank /
   * name ascending, the rest descending); flagged=1 (at the integrity line) or flagged=any (any exit or auto-submit);
   * q also matches phone digits when phones are shown. `summary` and `batches` cover every row the caller may see
   * (before q / batch / flag filters); `student.phone` only with READ_USER (as the Users page), else null.
   */
  sort?: { by: string; dir: "asc" | "desc" };
  summary?: {
    appeared: number;
    autoSubmitted: number;
    flagged: number;
    withFlags: number;
    average: number;
    median: number;
    q1: number;
    q3: number;
    highest: { score: number; student: { id: string; name: string } } | null;
    sections: Array<{ name: string; average: number }>;
  };
  batches?: Ref[];
  phones?: boolean;
}

/** GET /tests/admin/tests/:id/students/:studentId/report (Admin-StudentReport overview + print) */
export interface StudentReportResponse {
  now: IsoDateTime;
  student: { id: string; name: string; batch: Ref | null; phone: string | null; removed: boolean };
  test: TestRef & { maxScore: number; durationMinutes: number; questions: number; opensAt: IsoDateTime | null };
  /** not written: why ("She never opened her link") */
  notWritten: { linkOpened: boolean; startedAt: null; closedAt: IsoDateTime | null } | null;
  submission: {
    submittedAt: IsoDateTime;
    how: "self" | "timeUp" | "exitLimit";
    score: number;
    batchAverage: number;
    rank: number | null;
    of: number;
    topPercent: number | null;
    accuracyPercent: number;
    counts: { correct: number; partial: number; wrong: number; skipped: number };
    timeUsedSeconds: number;
    fullscreenExits: number | null;
    /** vs the previous mock (M5 rule) */
    vsPrevious: { test: TestRef; scoreDelta: number; unit: "marks" | "percentPoints"; rankBefore: number | null } | null;
  } | null;
  subjects: Array<{ name: string; score: number; maxScore: number; right: number; wrong: number; skipped: number; timeSeconds: number; batchAverage: number }>;
  /** time use per subject + unused / cut off by an auto-submit */
  timeUse: { bySubject: Array<{ name: string; seconds: number }>; leftSeconds: number; leftReason: "unused" | "cutOff" };
  /** last 5 tests of the same exam and kind, oldest first, this one included */
  lastTests: Array<TestRef & { score: number; maxScore: number; rank: number | null; of: number | null; at: IsoDateTime }>;
  /** weakest first, all chapters (the client shows 6) */
  chapters: Array<{ subject: string; chapter: string; questions: number; right: number; wrong: number; skipped: number; marks: number; accuracyPercent: number; batchAccuracyPercent: number }>;
  /** attempt events with times (link opened, started, each fullscreen exit with duration, submit) */
  timeline: MonitorStudentDetail["timeline"];
  keyCorrections: StudentKeyCorrectionNote[];
}
/** GET …/students/:studentId/report/questions?subject= : the question-by-question table and the print answer grid */
export interface StudentReportQuestionsResponse {
  now: IsoDateTime;
  items: Array<{
    n: number;
    questionId: string;
    subject: string;
    chapter: string | null;
    type: QuestionType;
    set: { nFrom: number; nTo: number } | null;
    yours: { optionIds?: string[]; value?: number; matrix?: MatrixAnswer } | null;
    key: AnswerKey;
    outcome: "correct" | "partial" | "wrong" | "skipped";
    marks: number;
    timeSeconds: number;
    batchAverageSeconds: number | null;
    keyCorrected: boolean;
    /** additions (8 Nov): option letters in paper order (single / multiple; [] otherwise), "A, C" labels; "C or B" after "accept also" */
    options?: Array<{ id: string; letter: string }>;
    yoursLabel?: string | null;
    keyLabel?: string | null;
  }>;
}
/** GET …/students/:studentId/report/questions/:n : one question opened (content, shares, visits, changes) */
export interface StudentReportQuestionDetail {
  now: IsoDateTime;
  n: number;
  question: PickerPreview["question"];
  yours: StudentReportQuestionsResponse["items"][number]["yours"];
  marks: number;
  maxMarks: number;
  timeSeconds: number;
  batchAverageSeconds: number | null;
  /** "Visits 2 · changed A → B at 10:31 AM" (from the answer log; null for attempts before M6) */
  visits: number | null;
  changes: Array<{ at: IsoDateTime; from: string | null; to: string | null }> | null;
  /** "How the batch answered" (fractions 0–1; integer: top values; matrix: per row-column cell) */
  shares: Record<string, number>;
  /** additions (8 Nov), as on the questions list */
  options?: Array<{ id: string; letter: string }>;
  yoursLabel?: string | null;
  keyLabel?: string | null;
}

/** GET /ai/admin/tests/:testId/students/:studentId/review : the AI review the student sees (M3 SummaryResponse shape) */
export interface AdminStudentReviewResponse {
  now: IsoDateTime;
  /** "generating" | "ready" | "not_applicable" (reasons M3 + "AI_PAUSED", "NOT_SUBMITTED") */
  status: "ready" | "generating" | "not_applicable";
  reason: string | null;
  marksLost: number;
  marksExplained: number;
  leaks: Array<{ title: string; marksLost: number; note: string; questionNs: number[]; kind: "concept" | "time" | "skip" | "careless" }>;
  other: { marksLost: number; note: string } | null;
  generatedAt: IsoDateTime | null;
}

/* ── emails ── */

/** Every email users sends (Email-Templates board); staffInvite is M7b */
export type EmailKind =
  | "resultsOut" // score + rank; off with emailResults
  | "testReminder" // 1 hour before; off with testReminders (only this kind)
  | "emailOtp" // sign-up code; account email, always
  | "passwordReset" // student and staff; account email, always
  | "testLink" // teacher-sent sign-in link; always
  | "keyCorrected" // old → new score; off with emailResults
  | "testPublished" // off with testPublished (added 6 Nov: own switch, StudentPreferences.testPublished)
  | "testRescheduled"; // off with testPublished

/** users ← tests: POST /internal/users/notify (changed): per-student facts for the templates */
export interface NotifyRequestM6 {
  kind: EmailKind;
  test: { id: string; name: string; opensAt?: IsoDateTime | null; closesAt?: IsoDateTime | null; questions?: number; durationMinutes?: number; maxMarks?: number };
  studentIds: string[];
  /** resultsOut: score, maxScore, rank, of, batch; keyCorrected: n(s), score before/after */
  perStudent?: Record<string, Record<string, unknown>>;
  /** idempotency: kind + test + student + this key are sent once */
  dedupeKey: string;
}
/** POST /users/admin/test-links/email { testId, batchId, studentIds? } (Email-Templates "Test sign-in link") */
export interface TestLinksEmailRequest {
  testId: string;
  batchId: string;
  /** default: every student of the batch with a link and an email */
  studentIds?: string[];
}
export interface TestLinksEmailResponse {
  now: IsoDateTime;
  sent: number;
  skippedNoEmail: number;
  skippedRemoved: number;
}

export type M6B45ErrorCode =
  | "STAFF_ACCOUNT" // 403 details { adminUrl }: staff account on the student app
  | "TEST_NOT_OPEN" // 409 details { opensAt }: start before open (the /instructions inline message)
  | "TEST_CLOSED" // 409 details { closedAt }
  | "ALREADY_SUBMITTED" // 409 details { submittedAt, receiptId }
  | "NOT_ASSIGNED" // 403 details { testBatches, yourBatch }
  | "SUBMIT_TOO_LATE" // 409 details { deadline, graceUntil }: arrived after deadline + grace (the auto-submit already used the saved answers)
  | "RESULT_HIDDEN" // 403 details ResultHiddenDetails
  | "LINK_INVALID" // 404
  | "LINK_EXPIRED" // 410
  | "LINK_REVOKED" // 410
  | "LINK_USED"; // 409: a test link signs in once

/* ═══════════════════ M6 review additions (owner, 6 Nov 2026: staging review, design-gaps E2) ═══════════════════ */

export type PublishWarningCode = "NEEDS_LATEX" | "WITHOUT_SOLUTION" | "EMPTY_KEY" | "MISSING_HINDI" | "OVERLAP" | "TEMPLATE_MISSING";

/** GET /tests/admin/tests/:id/publish-preview [UPDATE_TEST]: the "Publish <test>?" confirm. Publishing stays POST …/publish. */
export interface PublishPreview {
  now: IsoDateTime;
  /** false when a readiness check blocks (the confirm then lists `blocking` and offers "Fix") */
  canPublish: boolean;
  test: {
    testId: string;
    name: string;
    shortName: string;
    exam: { id: string; name: string } | null;
    opensAt: IsoDateTime | null;
    closesAt: IsoDateTime | null;
    durationMinutes: number;
    /** gradable items (paragraph children count) */
    questions: number;
    totalMarks: number;
  };
  template: { id: string; name: string; languageSwitch: boolean; calculator: boolean; roughSheet: boolean };
  /** students = active students of that batch (null when users can't be reached) */
  batches: Array<{ id: string; name: string; students: number | null }>;
  /** distinct students across the batches; null when users can't be reached */
  students: number | null;
  /** students told = `students`; emailed = those whose "Test published" switch is on (null = unknown) */
  notify: { students: number | null; emailed: number | null; emailOff: number | null; removed: number | null };
  /** readiness checks at level "blocking" (ReadinessResponse.checks shape) */
  blocking: ReadinessResponse["checks"];
  warnings: Array<{
    code: PublishWarningCode;
    count: number;
    /** "Physics Q7" style labels, at most 20 */
    where: string[];
    /** OVERLAP: the other tests of the same batches whose window overlaps */
    tests?: Array<{ testId: string; name: string; opensAt: IsoDateTime | null; closesAt: IsoDateTime | null; batch: { id: string; name: string } }>;
  }>;
}

/** users ← tests: POST /internal/users/notify/preview {kind, studentIds ≤ 1000}: notify's rules, nothing sent */
export interface NotifyPreviewResponse {
  willSend: number;
  skippedByPreference: number;
  skippedRemoved: number;
  /** no usable email address */
  noEmail: number;
  notFound: number;
}

/** Added to M4 PracticeQuestion / PracticeCheck for redo and revision sets (all 5 types) */
export interface PracticeQuestionExtrasM6 {
  /** a paragraph child: its set's passage */
  passage?: { en: RichText; hi: RichText | null } | null;
  /** a matrix question: the grid (answer with check body { matrix: { A: ["P"] } }) */
  matrix?: { rows: Array<{ id: string; en: RichText; hi: RichText | null }>; columns: Array<{ id: string; en: RichText; hi: RichText | null }> } | null;
}
export interface PracticeCheckExtrasM6 {
  yourAnswer: { optionIds?: string[]; value?: number; matrix?: Record<string, string[]> };
  correctAnswer: { optionIds?: string[]; range?: { min: number; max: number }; matches?: Record<string, string[]> };
}

/** POST /tests/student/results/:testId/redo */
export interface RedoRequest {
  /** "wrong" (default) = wrong or partial; "wrongAndSkipped" adds skipped */
  include?: "wrong" | "wrongAndSkipped";
  /** Batch 7: time from the source test (⌈duration × n ÷ question count⌉ minutes); default untimed. `minutes` is ignored. */
  timed?: boolean;
}

/** Batch 7: the source test's rule for one question (redo/revision sets; null for bank practice) */
export interface PracticeMarking {
  correct: number;
  incorrect: number;
  /** partial marks by count (multiple-correct options / matrix rows right), as the pattern says */
  partial: Array<{ count: number; marks: number }>;
}
/** Batch 7 additions: PracticeQuestion.marking, PracticeCheck.marks / maxMarks, PracticeSet.timed / score */
export interface PracticeScoreM6 {
  question: { marking: PracticeMarking | null };
  check: { marks: number | null; maxMarks: number | null };
  set: { timed: boolean; score: { marks: number; maxMarks: number; checked: number; total: number } | null };
}
export interface RedoResponse {
  now: IsoDateTime;
  /** false: the set made earlier for this test + include came back */
  created: boolean;
  /** M4 PracticeSet; questions carry PracticeQuestionExtrasM6 */
  set: { id: string; title: string; createdAt: IsoDateTime; minutes: number | null; questions: Array<Record<string, unknown>> };
}

export interface RevisionItem {
  id: string;
  questionId: string;
  testId: string;
  test: { name: string; shortName: string };
  /** paper number in that test */
  n: number;
  type: "single" | "multiple" | "integer" | "matrix";
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  /** the student's outcome in that test */
  outcome: "correct" | "partial" | "wrong" | "skipped";
  /** plain text, ≤ 140 chars */
  stemPreview: string;
  note: string | null;
  addedAt: IsoDateTime;
  /** Batch 7: the source test's rule for this question */
  marking: PracticeMarking | null;
}
/** GET /tests/student/revision?subject=&chapter=&testId=&q=&page=&pageSize= */
export interface RevisionList {
  now: IsoDateTime;
  items: RevisionItem[];
  total: number;
  page: number;
  pageSize: number;
  facets: { subjects: Array<{ subject: string; count: number }>; chapters: Array<{ subject: string; chapter: string; count: number }> };
}
/** POST /tests/student/revision */
export interface RevisionAddRequest {
  items: Array<{ testId: string; questionId: string; note?: string | null }>;
}
export interface RevisionAddResponse {
  now: IsoDateTime;
  added: number;
  /** already in the list (from this or another test) */
  already: number;
  items: RevisionItem[];
}
/** POST /tests/student/revision/practice: ids, or a filter (newest 100) */
export interface RevisionPracticeRequest {
  ids?: string[];
  subject?: string;
  chapter?: string;
  /** Batch 7: ⌈sum of the items' seconds per question ÷ 60⌉ minutes; default untimed. `minutes` is ignored. */
  timed?: boolean;
}

export type M6ReviewErrorCode =
  | "NOTHING_TO_REDO" // 404: no question qualifies
  | "NOTHING_TO_PRACTISE" // 404: no revision item matches the ids / filter
  | "REVISION_FULL" // 409 details { limit: 2000 }
  | "REVISION_ITEM_NOT_FOUND"; // 404

/* ═══════════════════ Under-18 guardian consent (owner, 6 Nov 2026: build, don't block) — users ═══════════════════ */

export type GuardianConsentState = "notRequired" | "needsDob" | "missing" | "waiting" | "expired" | "confirmed";

/** GET/POST /users/student/me/guardian-consent, POST …/resend */
export interface GuardianConsentStatus {
  now: IsoDateTime;
  /** null when the date of birth is unknown */
  required: boolean | null;
  status: GuardianConsentState;
  guardian: { name: string | null; emailMasked: string } | null;
  requestedAt: IsoDateTime | null;
  expiresAt: IsoDateTime | null;
  confirmedAt: IsoDateTime | null;
  lastSentAt: IsoDateTime | null;
  /** when "Send again" works (one a minute, 5 a day) */
  resendAvailableAt: IsoDateTime | null;
}
/** POST /users/student/me/guardian-consent */
export interface GuardianConsentRequest {
  guardianEmail: string;
  guardianName?: string | null;
}
/** GET /users/public/guardian-consent/:token, POST …/confirm { agree: true, guardianName? } */
export interface GuardianConsentPublic {
  now: IsoDateTime;
  status: "pending" | "confirmed";
  student: { firstName: string };
  institute: { name: string };
  guardian: { name: string | null; emailMasked: string };
  expiresAt: IsoDateTime;
  confirmedAt: IsoDateTime | null;
  versions: { terms: string; privacy: string };
}
/** Admin user rows and detail (students; null for staff) */
export interface AdminGuardianConsent {
  required: boolean | null;
  status: GuardianConsentState;
  confirmedAt: IsoDateTime | null;
}
export type GuardianConsentErrorCode =
  | "CONSENT_NOT_REQUIRED" // 409
  | "DOB_REQUIRED" // 409
  | "NOTHING_TO_RESEND" // 409
  | "CONSENT_LINK_INVALID" // 404
  | "CONSENT_LINK_EXPIRED" // 410
  | "CONSENT_ALREADY_CONFIRMED"; // 409
