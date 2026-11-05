/* Copy of api-ai src/contracts/m5.ts (binding; keep identical, add fields only). Docs: api-ai docs/m5-api.md. */
/**
 * M5 contract (admin dashboard, question bank search, AI assist + drafts, bulk AI jobs, results insights, batch summary,
 * answer-key check, "Why B", duplicate check, audit events). Binding shapes; see docs/m5-api.md.
 * No dependencies: the admin app may copy this file. Implementers may ADD fields, never rename or remove.
 *
 * Owners: tests = overview, live, result insights, question usage, add to test, internal ai inputs;
 * questions = search, duplicates, internal for-ai / taxonomy / select / apply-draft;
 * ai = assist (SSE), drafts, bulk jobs, batch summary, key check, insight, Excel template.
 * All routes go through the gateway (`apiTests` /tests/admin/…, `apiQuestions` /questions/admin/…, `apiAi` /ai/admin/…).
 * Auth: staff tokens (userType ≠ "student"), 403 STAFF_ONLY otherwise, 401 without code.
 */

export type IsoDateTime = string; // UTC ISO with Z
export type IsoDate = string; // YYYY-MM-DD, IST calendar date
/** Bank content: HTML with inline LaTeX ($…$). Render with MathText. */
export type RichText = string;
/** AI-written prose: plain text with inline LaTeX, no HTML, no URLs. */
export type AiText = string;

export type QuestionType = "single" | "multiple" | "integer" | "paragraph" | "matrix";
export type Difficulty = "easy" | "medium" | "hard";
export type TestState = "draft" | "scheduled" | "live" | "ended";
export type TestKind = "full" | "sectional" | "custom";
export type AiStatus = "ready" | "generating" | "not_applicable";

export interface TestRef {
  testId: string;
  name: string;
  shortName: string | null;
}

/* ═══════════════════════════════ tests ═══════════════════════════════ */

/** GET /tests/admin/overview */
export interface AdminOverview {
  now: IsoDateTime;
  /** Non-deleted tests by state (Admin-Tests tabs, Dashboard) */
  counts: Record<TestState | "all", number>;
  /** Published tests whose window opens in the current IST month ("18 · 6 full mocks · 12 sectionals") */
  thisMonth: { tests: number; byKind: Record<TestKind, number> };
  attention: {
    /** Draft tests, soonest opening first ("Mock 13 is still a draft · Opens 22 Nov · 12 questions short") */
    draftTests: Array<TestRef & { opensAt: IsoDateTime | null; filled: number; needed: number; short: number }>;
    /** Ended, result not published and not "immediately"; max 3, newest first */
    unpublishedResults: Array<TestRef & { closedAt: IsoDateTime }>;
  };
  /** Most recently published result with ≥ 1 submission ("Avg score · Mock 11  172 /300  +9 vs Mock 10") */
  latestResult:
    | (TestRef & {
        publishedAt: IsoDateTime;
        appeared: number;
        assigned: number | null;
        average: number;
        maxScore: number;
        previous: PreviousMock | null;
        /** average − previous.average, rounded to 1 decimal; null without a previous mock */
        averageDelta: number | null;
      })
    | null;
}

/** The "vs Mock 10" test (rule in docs/m5-api.md, "Previous mock") */
export interface PreviousMock extends TestRef {
  closedAt: IsoDateTime;
  average: number;
  maxScore: number;
}

/** GET /tests/admin/live (poll every 30 s while visible) */
export interface LiveTestsResponse {
  now: IsoDateTime;
  tests: LiveTest[];
}

export interface LiveTest extends TestRef {
  opensAt: IsoDateTime;
  closesAt: IsoDateTime;
  /** Active students of the test's batches; null when users is unreachable */
  assigned: number | null;
  submitted: number;
  /** Attempt in progress and not past its expiry */
  writing: number;
  /** assigned − submitted − writing, floored at 0; null when assigned is null */
  notStarted: number | null;
  /** submitted + writing (Admin-Tests "146 / 212") */
  started: number;
  autoSubmitted: number;
}

/** GET /tests/admin/tests/:testId/result-insights */
export interface ResultInsights {
  now: IsoDateTime;
  test: TestRef & { maxScore: number; resultPublished: boolean };
  appeared: number;
  assigned: number | null;
  autoSubmitted: number;
  average: number;
  previous: PreviousMock | null;
  averageDelta: number | null;
  /** Per section subject, paper order */
  subjects: Array<{
    subject: string;
    average: number;
    maxScore: number;
    /** Previous mock's average for the same subject name; null if none */
    previousAverage: number | null;
    delta: number | null;
  }>;
  integrity: IntegrityInsights;
}

export interface IntegrityInsights {
  /** Fullscreen exits at or above this flag a student ("3+ fullscreen exits") */
  threshold: number;
  /** Students with fullscreenExits ≥ threshold ("Integrity flags 4") */
  flaggedCount: number;
  /** false when no submission of this test has a recorded count (all submitted before M5) */
  recorded: boolean;
  /** Every submission with exits > 0 or auto-submitted (the Flags column and "Flagged only") */
  students: Array<{
    studentId: string;
    /** null = not recorded (submitted before M5) */
    fullscreenExits: number | null;
    flagged: boolean;
    autoSubmitted: boolean;
  }>;
}

/** POST /tests/admin/question-usage { questionIds } (1–200) */
export interface QuestionUsageRequest {
  questionIds: string[];
}
export interface QuestionUsageResponse {
  now: IsoDateTime;
  /** Every requested id is present; ids in no test have tests: 0 */
  usage: Record<string, { tests: number; lastUsedAt: IsoDateTime | null }>;
}

/** POST /tests/admin/tests/:testId/questions { questionIds, sectionId? } (1–100); draft or not-yet-opened tests only (409 TEST_LOCKED) */
export interface AddToTestRequest {
  questionIds: string[];
  /**
   * Optional section of the test (the picker's "Section"; added 5 Nov). Absent / null: each question goes into the first
   * section of its subject with a sub-section of its type that has room. Given: only that section is used, same subject
   * and type rules (else skipped NO_MATCHING_SUBSECTION / SUBSECTIONS_FULL); not in the test: 404 SECTION_NOT_FOUND.
   */
  sectionId?: string | null;
}
export interface AddToTestResponse {
  now: IsoDateTime;
  added: Array<{ questionId: string; sectionId: string; subsectionId: string; n: number }>;
  skipped: Array<{ questionId: string; reason: "ALREADY_IN_TEST" | "NO_MATCHING_SUBSECTION" | "SUBSECTIONS_FULL" | "QUESTION_NOT_FOUND" }>;
  filled: number;
  needed: number;
}

/* ═══════════════════════════════ questions ═══════════════════════════════ */

/** Filters shared by GET /questions/admin/search and the bulk selection */
export interface QuestionFilter {
  q?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: Difficulty | "unset";
  type?: QuestionType;
  /** English solution empty (paragraph: any child without one) */
  missingSolution?: boolean;
  /** No chapter or no difficulty */
  untagged?: boolean;
  /** No Hindi stem, or the Hindi stem equals the English one */
  hindiMissing?: boolean;
}

/**
 * GET /questions/admin/search?q=&subjectId=&chapterId=&topicId=&difficulty=&type=&missingSolution=1&untagged=1
 *   &hindiMissing=1&page=1&pageSize=25&sort=updated|created|id     (pageSize 0–100; 0 = counts only)
 */
export interface QuestionSearchResponse {
  now: IsoDateTime;
  items: BankListItem[];
  page: number;
  pageSize: number;
  /** Matching all filters */
  total: number;
  counts: {
    /** Every filter except type (the tabs); `all` = sum */
    byType: Record<QuestionType | "all", number>;
    /** Every filter except the three flags (the chips "Missing solution · 214", "Untagged · 87") */
    missingSolution: number;
    untagged: number;
    hindiMissing: number;
  };
}

export interface BankListItem {
  id: string;
  type: QuestionType;
  subject: { id: string; name: string } | null;
  chapters: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string; chapterId: string }>;
  difficulty: Difficulty | null;
  /** First ~160 chars of the English stem as plain text, LaTeX kept */
  stemPreview: string;
  hasSolution: boolean;
  hasHindi: boolean;
  isProofRead: boolean;
  /** Why it matched q (null without q) */
  match: "id" | "tag" | "text" | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** POST /questions/admin/duplicates (1–100 items) */
export interface DuplicateCheckRequest {
  items: Array<{
    /** Echoed back (editor: anything; BulkUpload: the parsed question's id) */
    key: string;
    /** English stem, HTML allowed, ≤ 20,000 chars */
    text: string;
    type?: QuestionType;
    subjectId?: string;
    /** The question's own id when editing */
    excludeId?: string;
  }>;
  /** pg_trgm similarity, 0.3–0.95, default 0.6 */
  threshold?: number;
}
export interface DuplicateCheckResponse {
  now: IsoDateTime;
  threshold: number;
  results: Array<{
    key: string;
    /** Up to 5, best first */
    matches: Array<{ questionId: string; similarity: number; stemPreview: string; type: QuestionType; chapter: string | null }>;
  }>;
}

/* ═══════════════════════════════ ai: drafts ═══════════════════════════════ */

export type DraftKind = "tags" | "translation" | "solution";
export type DraftStatus = "generating" | "ready" | "failed" | "accepted" | "discarded" | "superseded";
export type AdminAiFeature = "autoTag" | "translate" | "solutionDraft" | "batchSummary" | "answerKeyCheck";

export interface TagsPayload {
  /** Only set when the question has no subject */
  subject: { id: string; name: string } | null;
  chapters: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string; chapterId: string }>;
  difficulty: Difficulty;
}

/** Same shape as the bank's language block; option ids identical to the English ones, same order */
export interface TranslationPayload {
  hi: {
    question: RichText;
    options?: Array<{ id: string; value: RichText }>;
    /** Present when the English solution exists */
    solution?: RichText;
  };
}

export interface SolutionPayload {
  /** HTML-free text with LaTeX and line breaks; stored as the English solution */
  solution: RichText;
  /** The final answer the draft states, normalised: option ids, or a number for integer questions */
  statedAnswer: { optionIds?: string[]; value?: number } | null;
}

export type DraftPayload = TagsPayload | TranslationPayload | SolutionPayload;

export interface DraftChecks {
  /** translation: every math segment of the English kept byte for byte */
  latexIntact?: boolean;
  /** translation: English math segments missing from the Hindi */
  missingMath?: string[];
  /** translation: control characters (\r \t \f \b \v …) found inside math */
  controlChars?: boolean;
  /** translation: images / media URLs kept */
  imagesIntact?: boolean;
  /** translation: option ids identical and in order */
  optionIdsMatch?: boolean;
  /** tags: names the model gave that are not in the taxonomy (dropped) */
  droppedNames?: string[];
  /** solution: stated answer vs the key ("disagrees with the answer key") */
  keyAgreement?: "agrees" | "disagrees" | "unknown";
  /** A repair retry ran */
  repaired?: boolean;
  /** translation: math in the Hindi that the English does not have (added by ai) */
  extraMath?: string[];
  /** translation: share of the stem's letters outside math and tags in Devanagari; null = too few to judge (added by ai) */
  devanagariShare?: number | null;
  /** Every failed check as a sentence (the editor's failed-translation message) (added by ai) */
  problems?: string[];
}

export interface AiDraft {
  id: string;
  questionId: string;
  kind: DraftKind;
  status: DraftStatus;
  /** null while generating; for failed drafts the last attempt when there was one */
  payload: DraftPayload | null;
  /** The question's current values for the same fields (to show the change: "Medium → Hard?") */
  current: DraftPayload | null;
  checks: DraftChecks;
  /** For the review list */
  question: { id: string; type: QuestionType; stemPreview: string };
  /** failed: why (code: AI_UNAVAILABLE | DRAFT_CHECK_FAILED | NO_VALID_TAGS | QUESTION_NOT_FOUND | INTERNAL) */
  error: { code: string; message: string } | null;
  baseHash: string;
  jobId: string | null;
  modelId: string | null;
  createdBy: { id: string; name: string | null };
  createdAt: IsoDateTime;
  decidedBy: { id: string; name: string | null } | null;
  decidedAt: IsoDateTime | null;
  /** ready drafts expire 30 days after creation */
  expiresAt: IsoDateTime | null;
  /** accepted with a teacher-edited payload (added by ai) */
  edited?: boolean;
  /** accepted: the question.ai_draft_accepted audit row (added by ai) */
  auditEventId?: string;
}

export interface AdminAiQuota {
  feature: AdminAiFeature;
  usedToday: number;
  perDay: number;
  resetsAt: IsoDateTime;
}

/** POST /ai/admin/questions/:questionId/assist  → text/event-stream (or a JSON error before the stream starts) */
export interface AssistRequest {
  kind: DraftKind;
}

/**
 * Events, in order (": ping" comments every 15 s):
 *   event: start  data: { draft (status generating), quota }
 *   event: delta  data: { part, text }      translation (stem) and solution only; append to that part
 *   event: done   data: { draft }           status ready | failed; payload is the FINAL text (replace the streamed one)
 * A dropped stream: GET /ai/admin/drafts/:draftId until it leaves "generating".
 */
export type AssistStreamEvent =
  | { event: "start"; data: { draft: AiDraft; quota: AdminAiQuota } }
  | { event: "delta"; data: { part: "stem" | "solution"; text: string } }
  | { event: "done"; data: { draft: AiDraft } };

/** GET /ai/admin/drafts?questionId=&jobId=&kind=&status=ready&cursor=   (50 per page, newest first) */
export interface DraftListResponse {
  now: IsoDateTime;
  items: AiDraft[];
  nextCursor: string | null;
  /** Totals for the same filters, by status */
  counts: Partial<Record<DraftStatus, number>>;
}

/** POST /ai/admin/drafts/:draftId/accept */
export interface DraftAcceptRequest {
  /** The teacher's edited version (same shape as the draft's payload); checks run again */
  payload?: DraftPayload;
  /** Accept although the question changed since the draft (recorded in the audit event) */
  force?: boolean;
}
export interface DraftAcceptResponse {
  now: IsoDateTime;
  draft: AiDraft;
  question: { id: string; updatedAt: IsoDateTime; baseHash: string };
  auditEventId: string;
}

/** POST /ai/admin/drafts/decide (1–100), applied one by one */
export interface DraftDecideRequest {
  decisions: Array<{ draftId: string; action: "accept" | "discard"; payload?: DraftPayload; force?: boolean }>;
}
export interface DraftDecideResponse {
  now: IsoDateTime;
  results: Array<{ draftId: string; ok: boolean; draft: AiDraft | null; code: M5ErrorCode | null }>;
}

/* ═══════════════════════════════ ai: bulk jobs ═══════════════════════════════ */

export type BulkKind = DraftKind;

/** POST /ai/admin/bulk/preview */
export interface BulkPreviewRequest {
  kind: BulkKind;
  selection: { questionIds: string[] } | { filter: QuestionFilter };
  /** Redo questions that already have Hindi / a solution / tags (default false) */
  includeExisting?: boolean;
}

export type BulkSkipReason = "HAS_HINDI" | "HAS_SOLUTION" | "ALREADY_TAGGED" | "UNSUPPORTED_TYPE" | "DRAFT_GENERATING" | "QUESTION_NOT_FOUND";

export interface BulkPreview {
  now: IsoDateTime;
  previewId: string;
  expiresAt: IsoDateTime;
  kind: BulkKind;
  feature: AdminAiFeature;
  /** Questions that will get a draft (≤ 500) */
  count: number;
  skipped: Partial<Record<BulkSkipReason, number>>;
  estimate: {
    /** route credits × count (what the tenant is charged; credit = ai_settings.credit_cost_paise) */
    credits: number;
    creditsPerQuestion: number;
    /** Provider cost incl. the 1.05 fee, primary model, latest ai_model_prices row. IIT-PULSE only (hidden from tenants from M8/M9) */
    costPaise: number;
    modelId: string;
    /** measured = last 30 days of ai_usage for the feature (≥ 20 calls); default = spike token counts */
    basis: "measured" | "default";
    /** Rough minutes at concurrency 3 */
    minutes: number;
  };
  quota: AdminAiQuota & {
    /** How many of `count` fit today; the rest wait for midnight IST */
    fitsToday: number;
  };
  /** false: starting would answer 409 AI_BUDGET_LOW or 503 AI_PAUSED */
  canStart: boolean;
  blockedBy: "AI_PAUSED" | "AI_BUDGET_LOW" | "JOB_RUNNING" | null;
}

/** POST /ai/admin/bulk/jobs { previewId } → 202 { now, job } */
export interface BulkStartRequest {
  previewId: string;
}

export type BulkJobStatus = "queued" | "running" | "waiting" | "paused" | "done" | "failed" | "cancelled";

export interface BulkJob {
  id: string;
  kind: BulkKind;
  status: BulkJobStatus;
  /** "Tagging chapter & difficulty" etc. is the client's label for kind; the API sends no copy */
  total: number;
  progress: {
    /** Questions finished (ready + failed) — "2 of 3" */
    done: number;
    ready: number;
    failed: number;
  };
  estimate: BulkPreview["estimate"];
  /** Credits actually settled so far */
  creditsUsed: number;
  /** waiting: when today's cap resets; paused: null */
  resumesAt: IsoDateTime | null;
  /** paused / failed: AI_PAUSED | AI_BUDGET_LOW | AI_UNAVAILABLE | INTERNAL */
  reason: string | null;
  createdBy: { id: string; name: string | null };
  createdAt: IsoDateTime;
  finishedAt: IsoDateTime | null;
}

/* ═══════════════════════════════ ai: results and analysis ═══════════════════════════════ */

/** GET /ai/admin/tests/:testId/summary  (poll every 3 s up to 60 s while generating) */
export interface BatchSummaryResponse {
  now: IsoDateTime;
  status: AiStatus;
  /** not_applicable: "NO_SUBMISSIONS" | "TOO_FEW_SUBMISSIONS" (< 5) */
  reason: string | null;
  summary: {
    /** ≤ 220 chars: the Dashboard "Summary" line */
    headline: AiText;
    /** ≤ 900 chars, one paragraph: the Results card and "Copy for WhatsApp" */
    text: AiText;
    /** 0–2, plain sentences ("Run a 30-min revision on torque and lever arms for JEE 2027 A") */
    suggestions: Array<{ kind: "revise" | "practice" | "other"; text: AiText }>;
    basedOn: { submissions: number; previous: TestRef | null };
  } | null;
  generatedAt: IsoDateTime | null;
}

/** GET /ai/admin/tests/:testId/key-check */
export interface KeyCheckResponse {
  now: IsoDateTime;
  status: AiStatus;
  /** not_applicable: "TOO_FEW_SUBMISSIONS" (< 10) | "NOT_CLOSED" (window still open for someone) */
  reason: string | null;
  /** generating after a failed model call: next retry */
  retryAt: IsoDateTime | null;
  /** Questions the rule flagged (max 10), most suspicious first; empty = nothing looks wrong */
  flags: KeyCheckFlag[];
  checkedQuestions: number;
  checkedAt: IsoDateTime | null;
}

export interface KeyCheckFlag {
  n: number;
  questionId: string;
  type: "single" | "multiple" | "integer";
  chapter: string | null;
  /** The key: option ids + letters, or the integer range */
  key: { optionIds?: string[]; letters?: string[]; range?: { min: number; max: number } };
  /** The popular non-key answer */
  popular: { optionIds?: string[]; letters?: string[]; value?: number; share: number; topTenCount: number };
  rule: "topTenChoseNonKey" | "negativeDiscrimination";
  discrimination: number | null;
  /** null when the model call never succeeded (rule result only) */
  aiVerdict: "keyLooksWrong" | "keyLooksRight" | "unsure" | null;
  /** The model's own answer */
  aiAnswer: { optionIds?: string[]; letters?: string[]; value?: number } | null;
  /** 2–5 sentences of working */
  reasoning: AiText | null;
  /** Submissions whose score would change if the key changed ("re-scoring updates 212 results") */
  affectedResults: number;
}

/** GET /ai/admin/tests/:testId/questions/:questionId/insight  ("✦ Why B") */
export interface QuestionInsightResponse {
  now: IsoDateTime;
  status: AiStatus;
  /** not_applicable: "NO_COMMON_WRONG_OPTION" | "TOO_FEW_SUBMISSIONS" | "UNSUPPORTED_TYPE" */
  reason: string | null;
  insight: {
    n: number;
    /** The most chosen wrong option */
    option: { id: string; letter: string; share: number };
    /** ≤ 280 chars: "B is exactly twice the answer: students used the full length $L$ as the lever arm." */
    text: AiText;
    /** Optional short teaching cue ("Worth 5 minutes in class."), "" if none */
    cue: AiText;
  } | null;
  generatedAt: IsoDateTime | null;
}

/* ═══════════════════════════════ audit (server-kit 0.4) ═══════════════════════════════ */

export interface AuditActor {
  /** user = an institute's admin/teacher/student (role = userType); staff = platform staff; service = internal caller */
  type: "user" | "staff" | "system" | "service";
  id: string | null;
  /** Legacy userType from the token (admin, teacher, …) */
  role?: string | null;
  /** Impersonation (M8): the platform staff member acting as this user */
  impersonatedBy?: string | null;
}

/** One row of audit_events (append-only; iitp_app may INSERT and SELECT only). @iitpulse/server-kit/audit AuditEventRow. */
export interface AuditEvent {
  id: string; // uuid v7
  tenantId: string;
  occurredAt: IsoDateTime;
  service: "users" | "questions" | "tests" | "ai" | "gateway" | "platform";
  /** "<object>.<past-tense verb>": question.ai_draft_accepted, ai_draft.discarded, ai_job.started, ai_job.cancelled, test.questions_added */
  action: string;
  actorType: AuditActor["type"];
  actorId: string | null;
  actorRole: string | null;
  actorImpersonatedBy: string | null;
  targetType: string | null;
  targetId: string | null;
  /** Short human text, ≤ 500 chars */
  summary: string;
  /** { [field or path]: { from, to } } or { redacted: true }; texts over 1000 chars as { sha256, length } */
  diff: Record<string, { from?: unknown; to?: unknown; redacted?: true }> | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  requestIp: string | null;
  requestUserAgent: string | null;
}

/** metadata of question.ai_draft_accepted */
export interface DraftAcceptedMetadata {
  draftId: string;
  kind: DraftKind;
  feature: AdminAiFeature;
  modelId: string | null;
  promptVersion: string;
  jobId: string | null;
  edited: boolean;
  forced: boolean;
}

/* ═══════════════════════════════ internal (HMAC token, never via the gateway) ═══════════════════════════════ */

/** questions: POST /internal/questions/for-ai { questionIds } (≤ 50) */
export interface ForAiResponse {
  questions: Array<{
    id: string;
    type: QuestionType;
    subject: { id: string; name: string } | null;
    chapters: Array<{ id: string; name: string }>;
    topics: Array<{ id: string; name: string; chapterId: string }>;
    difficulty: Difficulty | null;
    en: { question: RichText; options?: Array<{ id: string; value: RichText }>; solution?: RichText };
    hi: { question: RichText; options?: Array<{ id: string; value: RichText }>; solution?: RichText } | null;
    correctAnswers: string[] | null;
    answerRange: { min: number; max: number } | null;
    baseHash: string;
    updatedAt: IsoDateTime;
  }>;
  notFound: string[];
}

/** questions: POST /internal/questions/taxonomy { subjectId } */
export interface TaxonomyResponse {
  subject: { id: string; name: string };
  chapters: Array<{ id: string; name: string; topics: Array<{ id: string; name: string }> }>;
}

/** questions: POST /internal/questions/select { filter?, questionIds?, limit } */
export interface SelectRequest {
  filter?: QuestionFilter;
  questionIds?: string[];
  limit: number;
}
export interface SelectResponse {
  questions: Array<{ id: string; type: QuestionType; hasSolution: boolean; hasHindi: boolean; untagged: boolean }>;
  /** More matched than limit */
  truncated: boolean;
  notFound: string[];
}

/** questions: POST /internal/questions/apply-draft (one transaction with audit.emit) */
export interface ApplyDraftRequest {
  questionId: string;
  draftId: string;
  kind: DraftKind;
  feature: AdminAiFeature;
  modelId: string | null;
  promptVersion: string;
  jobId: string | null;
  baseHash: string;
  force: boolean;
  edited: boolean;
  payload: DraftPayload;
  actor: AuditActor;
}
export interface ApplyDraftResponse {
  question: { id: string; updatedAt: IsoDateTime; baseHash: string };
  auditEventId: string;
}

/** tests: GET /internal/ai/closed-tests?since=ISO */
export interface ClosedTestsResponse {
  tests: Array<TestRef & { closedAt: IsoDateTime; submissions: number; lastSubmittedAt: IsoDateTime | null }>;
}

/** tests: POST /internal/ai/batch-summary-input { testId } — aggregates only, no student ids or names */
export interface BatchSummaryInput {
  test: TestRef & { kind: TestKind; examName: string | null; maxScore: number; batches: Array<{ id: string; name: string }> };
  appeared: number;
  assigned: number | null;
  average: number;
  previous: PreviousMock | null;
  subjects: ResultInsights["subjects"];
  chapters: Array<{ subject: string; chapter: string; questions: number; attempted: number; correct: number; accuracyPercent: number; previousAccuracyPercent: number | null }>;
  /** Groups of questions many students skipped together ("63 students skipped all three integral questions") */
  skipClusters: Array<{ chapter: string; questionNs: number[]; studentsSkippedAll: number; solvedSimilarInPreviousPercent: number | null }>;
  /** Wrong options that drew ≥ 20 % of answers */
  commonWrongOptions: Array<{ n: number; questionId: string; chapter: string | null; letter: string; share: number; correctShare: number }>;
}

/** tests: POST /internal/ai/key-check-input { testId } — single / multiple / integer questions only */
export interface KeyCheckInput {
  test: TestRef;
  submissions: number;
  questions: Array<{
    n: number;
    questionId: string;
    type: "single" | "multiple" | "integer";
    chapter: string | null;
    stem: RichText;
    options: Array<{ id: string; letter: string; value: RichText }>;
    solution: RichText | null;
    key: { optionIds?: string[]; range?: { min: number; max: number } };
    /** Share of all answers per option id (integer: per distinct value, top 5) */
    shares: Record<string, number>;
    topTen: Record<string, number>;
    skippedShare: number;
    discrimination: number | null;
    /** Submissions whose score on this question would change under each alternative key option */
    affectedByOption: Record<string, number>;
  }>;
}

/** tests: POST /internal/ai/question-insight-input { testId, questionId } */
export interface QuestionInsightInput {
  test: TestRef;
  submissions: number;
  question: KeyCheckInput["questions"][number];
}

/* ═══════════════════════════════ error codes added in M5 ═══════════════════════════════ */

export type M5ErrorCode =
  | "VALIDATION_ERROR" // 400
  | "STAFF_ONLY" // 403: a student token
  | "TEST_NOT_FOUND" // 404
  | "TEST_LOCKED" // 409: add to test on a test that has opened
  | "SECTION_NOT_FOUND" // 404: add to test with a sectionId that is not in the test (added 5 Nov)
  | "QUESTION_NOT_FOUND" // 404
  | "UNSUPPORTED_TYPE" // 409: assist on a paragraph / matrix question
  | "DRAFT_NOT_FOUND" // 404
  | "DRAFT_NOT_READY" // 409: accept while generating / failed
  | "DRAFT_ALREADY_DECIDED" // 409: accepted / discarded / superseded
  | "DRAFT_STALE" // 409 details { changedFields: string[] }: the question changed since the draft (accept with force)
  | "DRAFT_CHECK_FAILED" // 422 details { checks: DraftChecks }: an edited payload breaks the checks
  | "PREVIEW_NOT_FOUND" // 404
  | "PREVIEW_EXPIRED" // 410: older than 15 minutes
  | "SELECTION_TOO_LARGE" // 400 details { max: 500 }
  | "NOTHING_TO_DO" // 409: every selected question was skipped
  | "JOB_NOT_FOUND" // 404
  | "JOB_RUNNING" // 409 details { jobId }: one active bulk job per kind
  | "TOO_MANY_ITEMS" // 400: duplicates > 100 items, usage > 200 ids, add-to-test > 100 ids, decide > 100
  | "ADMIN_AI_DAILY_LIMIT" // 429 details { feature, perDay, resetsAt }
  | "AI_RATE_LIMITED" // 429 details { retryAfterSeconds } + Retry-After: per staff user per hour
  | "AI_BUDGET_LOW" // 409 details { reason: "studentReserve" }: the job would pass 60 % of the monthly budget
  | "AI_PAUSED" // 503: platform pause flag or monthly budget spent
  | "AI_UNAVAILABLE" // 503: every model in the route failed
  | "NOT_IMPLEMENTED" // 501: QUESTIONS_DB / TESTS_DB = mongo
  | "INTERNAL"; // 500: generic message, never DB details

/** details of 429 ADMIN_AI_DAILY_LIMIT */
export interface AdminAiDailyLimitDetails {
  feature: AdminAiFeature;
  perDay: number;
  resetsAt: IsoDateTime;
}

/** Default per-tenant daily caps and per-user hourly caps (constants in M5) */
export const ADMIN_AI_LIMITS: Record<AdminAiFeature, { perDay: number; perUserPerHour: number | null }> = {
  autoTag: { perDay: 1000, perUserPerHour: 120 },
  translate: { perDay: 300, perUserPerHour: 60 },
  solutionDraft: { perDay: 150, perUserPerHour: 60 },
  batchSummary: { perDay: 200, perUserPerHour: null },
  answerKeyCheck: { perDay: 100, perUserPerHour: null },
};

/** Fullscreen exits at or above this flag a student (Results "3+ fullscreen exits") */
export const INTEGRITY_FULLSCREEN_THRESHOLD = 3;
