import axios, { AxiosInstance, AxiosError } from "axios";

const AUTH_TOKEN_KEY = "auth_token";

// API Gateway URL
const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

// Create axios instance with interceptors
function createApiClient(
  service: "users" | "questions" | "tests",
  options?: { skipAuthRedirect?: boolean }
): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_GATEWAY}/${service}`,
    headers: {
      "Content-Type": "application/json",
    },
    // Serialize arrays in a format Express understands (sub=a&sub=b instead of sub[]=a&sub[]=b)
    paramsSerializer: {
      indexes: null, // This removes the [] brackets from array params
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Only redirect to login on 401 if not a public endpoint
      if (error.response?.status === 401 && !options?.skipAuthRedirect) {
        // Token expired or invalid
        if (typeof window !== "undefined") {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

// Public API client (no auth redirect on 401)
function createPublicApiClient(service: "users" | "questions" | "tests"): AxiosInstance {
  return createApiClient(service, { skipAuthRedirect: true });
}

// API clients for each service
export const apiUsers = createApiClient("users");
export const apiQuestions = createApiClient("questions");
export const apiTests = createApiClient("tests");

// Public API client for unauthenticated endpoints (signup, OTP, etc.)
export const apiUsersPublic = createPublicApiClient("users");

// Auth helpers
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
  setToken: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  removeToken: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
  isAuthenticated: (): boolean => {
    return !!auth.getToken();
  },
};

// API endpoints organized by service
export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiUsers.post("/auth/login", credentials),
    logout: () => apiUsers.post("/auth/logout"),
    verifyPassword: (password: string) =>
      apiUsers.post("/auth/verify-password", { password }),
  },
  otp: {
    // Email OTP endpoints
    sendEmail: (email: string) => apiUsersPublic.post("/otp/email/send", { email }),
    verifyEmail: (email: string, emailotp: string) =>
      apiUsersPublic.post("/otp/email/verify", { email, emailotp }),
    // Phone OTP endpoints (legacy)
    sendPhone: (number: string) => apiUsersPublic.post("/otp/send", { number }),
    verifyPhone: (number: string, otp: string) =>
      apiUsersPublic.post("/otp/verify", { number, otp }),
  },
  registration: {
    createStudent: (data: unknown) =>
      apiUsersPublic.post("/student/create-student", data),
    getClasses: () => apiUsersPublic.get("/class/public"),
    completeOnboarding: (id: string, data: unknown) =>
      apiUsers.patch(`/student/${id}/onboarding`, data),
  },
  users: {
    getStudents: (params?: { page?: number; size?: number }) =>
      apiUsers.get("/student", { params }),
    getStudentById: (id: string) => apiUsers.get(`/student/${id}`),
    getTeachers: (params?: { page?: number; size?: number }) =>
      apiUsers.get("/teacher", { params }),
    getAdmins: (params?: { page?: number; size?: number }) =>
      apiUsers.get("/admin", { params }),
    getOperators: (params?: { page?: number; size?: number }) =>
      apiUsers.get("/operator", { params }),
    getManagers: (params?: { page?: number; size?: number }) =>
      apiUsers.get("/manager", { params }),
    getUserById: (id: string) => apiUsers.get(`/users/${id}`),
    // Student CRUD
    createStudent: (data: unknown) => apiUsers.post("/student/create", data),
    updateStudent: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/student/${id}`, data),
    deleteStudent: (id: string) => apiUsers.delete("/student/delete", { data: { id } }),
    restoreStudent: (id: string) => apiUsers.post(`/student/${id}/restore`),
    // Teacher CRUD
    createTeacher: (data: unknown) => apiUsers.post("/teacher/create", data),
    updateTeacher: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/teacher/${id}`, data),
    deleteTeacher: (id: string) => apiUsers.delete("/teacher/delete", { data: { id } }),
    // Admin CRUD
    createAdmin: (data: unknown) => apiUsers.post("/admin/create", data),
    updateAdmin: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/admin/${id}`, data),
    deleteAdmin: (id: string) => apiUsers.delete("/admin/delete", { data: { id } }),
    // Operator CRUD
    createOperator: (data: unknown) => apiUsers.post("/operator/create", data),
    updateOperator: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/operator/${id}`, data),
    deleteOperator: (id: string) => apiUsers.delete("/operator/delete", { data: { id } }),
    // Manager CRUD
    createManager: (data: unknown) => apiUsers.post("/manager/create", data),
    updateManager: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/manager/${id}`, data),
    deleteManager: (id: string) => apiUsers.delete("/manager/delete", { data: { id } }),
  },
  roles: {
    // New Fastify backend uses /roles (not /roles/all)
    getAll: () => apiUsers.get("/roles"),
    getById: (id: string) => apiUsers.get(`/roles/${id}`),
    create: (data: unknown) => apiUsers.post("/roles", data),
    update: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/roles/${id}`, data),
    delete: (id: string) => apiUsers.delete(`/roles/${id}`),
    addMember: (roleId: string, memberId: string) =>
      apiUsers.post("/roles/addMember", { role: roleId, member: memberId }),
    removeMember: (roleId: string, member: unknown) =>
      apiUsers.post("/roles/removeMember", { role: roleId, member }),
  },
  batches: {
    getAll: (params?: { includeDeleted?: boolean }) =>
      apiUsers.get("/batch", { params }),
    getById: (id: string) => apiUsers.get(`/batch/${id}`),
    create: (data: unknown) => apiUsers.post("/batch", data),
    update: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/batch/${id}`, data),
    delete: (id: string) => apiUsers.delete(`/batch/${id}`),
    restore: (id: string) => apiUsers.post(`/batch/${id}/restore`),
  },
  institutes: {
    // New Fastify routes use path params instead of query params
    getAll: () => apiUsers.get("/institute"),
    getById: (id: string) => apiUsers.get(`/institute/${id}`),
    create: (data: unknown) => apiUsers.post("/institute", data),
    update: (id: string, data: Record<string, unknown>) =>
      apiUsers.put(`/institute/${id}`, data),
    delete: (id: string) => apiUsers.delete(`/institute/${id}`),
  },
  questions: {
    getMCQ: (params?: Record<string, unknown>) =>
      apiQuestions.get("/mcq/all", { params }),
    getNumerical: (params?: Record<string, unknown>) =>
      apiQuestions.get("/numerical/all", { params }),
    getParagraph: (params?: Record<string, unknown>) =>
      apiQuestions.get("/paragraph/all", { params }),
    getMatrix: (params?: Record<string, unknown>) =>
      apiQuestions.get("/matrix/all", { params }),
    getById: (id: string, type: string) =>
      apiQuestions.get(`/${type}/question/${id}`),
    create: (type: string, data: unknown) =>
      apiQuestions.post(`/${type}/new`, data),
    update: (type: string, id: string, data: unknown) =>
      apiQuestions.put(`/${type}/update/${id}`, data),
    delete: (type: string, id: string) =>
      apiQuestions.delete(`/${type}/delete`, { data: { id } }),
    restore: (type: string, id: string) =>
      apiQuestions.post(`/${type}/restore/${id}`),
    autoGenerate: (type: string, params: unknown) =>
      apiQuestions.get(`/${type}/autogenerate`, { params }),
  },
  subjects: {
    getAll: () => apiQuestions.get("/subject/subjects"),
    getChapters: (subjectId?: string) =>
      apiQuestions.get("/subject/chapter", { params: { subject: subjectId } }),
    getAllChapters: () => apiQuestions.get("/subject/chapter/all"),
    getAllTopics: () => apiQuestions.get("/subject/topic/all"),
    create: (data: { name: string }) =>
      apiQuestions.post("/subject/create", data),
    createChapter: (data: { subjectId: string; name: string; topics?: string[] }) =>
      apiQuestions.post("/subject/create-chapter", data),
    createTopic: (data: { subjectId: string; chapterId: string; topic: string }) =>
      apiQuestions.post("/subject/create-topic", data),
    deleteSubject: (id: string) =>
      apiQuestions.delete("/subject/subjects", { data: { id } }),
    restoreSubject: (id: string) =>
      apiQuestions.post(`/subject/${id}/restore`),
    deleteChapter: (subjectId: string, chapterId: string) =>
      apiQuestions.post("/subject/chapter/delete", { subjectId, chapterId }),
    deleteTopic: (subjectId: string, chapterId: string, topic: string) =>
      apiQuestions.post("/subject/topic/delete", { subjectId, chapterId, topic }),
  },
  tests: {
    getAll: (params?: { page?: number; size?: number; status?: string }) =>
      apiTests.get("/test", { params }),
    getByStatus: (status: "active" | "ongoing" | "inactive" | "expired", batch?: string) =>
      apiTests.get("/test", { params: { status, batch } }),
    getRecent: (count?: number) =>
      apiTests.get("/test/recent", { params: { count: count || 5 } }),
    getById: (id: string) => apiTests.get(`/test/${id}`),
    create: (data: unknown) => apiTests.post("/test/create", data),
    update: (data: unknown) => apiTests.patch("/test/update", data),
    delete: (id: string) => apiTests.delete(`/test/delete/${id}`),
    restore: (id: string) => apiTests.post(`/test/${id}/restore`),
    publish: (id: string) => apiTests.patch("/test/publish", { id }),
    publishResult: (id: string) => apiTests.patch("/test/publish-result", { id }),
    toggleResult: (id: string, hideResult: boolean) =>
      apiTests.patch("/test/toggle-result", { id, hideResult }),
    getStudentResult: (testId: string) =>
      apiTests.get("/test/result/student", { params: { testId } }),
    getAdminResult: (testId: string) =>
      apiTests.get("/test/result/admin", { params: { testId } }),
  },
  patterns: {
    getAll: (params?: { page?: number; size?: number }) =>
      apiTests.get("/pattern", { params }),
    getAllNoPagination: () => apiTests.get("/pattern/all"),
    getByExam: (exam: string) =>
      apiTests.get("/pattern", { params: { exam } }),
    getById: (id: string) => apiTests.get(`/pattern/${id}`),
    create: (data: unknown) => apiTests.post("/pattern/create", data),
    update: (data: unknown) => apiTests.patch("/pattern/update", data),
    delete: (id: string) => apiTests.delete(`/pattern/delete/${id}`),
    restore: (id: string) => apiTests.post(`/pattern/${id}/restore`),
    duplicate: (id: string, newName: string) =>
      apiTests.post("/pattern/duplicate", { id, newName }),
  },
  exams: {
    getAll: (params?: { page?: number; size?: number; sortBy?: string; sortOrder?: "asc" | "desc"; includeDeleted?: boolean }) =>
      apiTests.get("/exam", { params }),
    getAllNoPagination: () => apiTests.get("/exam/all"),
    create: (data: { name: string; fullName?: string; description?: string }) =>
      apiTests.post("/exam/create", data),
    update: (data: { id: string; name?: string; fullName?: string; description?: string }) =>
      apiTests.patch("/exam/update", data),
    delete: (id: string) => apiTests.delete(`/exam/delete/${id}`),
    restore: (id: string) => apiTests.post(`/exam/${id}/restore`),
  },
  sources: {
    getAll: () => apiQuestions.get("/source/all"),
    create: (data: { name: string }) => apiQuestions.post("/source/create", data),
  },
  bulk: {
    // Template downloads
    downloadTemplate: (type: "students" | "teachers" | "batches") =>
      apiUsers.get(`/bulk/template/${type}`, { responseType: "blob" }),
    getColumns: (type: "students" | "teachers" | "batches") =>
      apiUsers.get(`/bulk/columns/${type}`),
    // Preview before import
    previewStudents: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUsers.post("/bulk/students/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    previewTeachers: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUsers.post("/bulk/teachers/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    previewBatches: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUsers.post("/bulk/batches/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    // Import
    importStudents: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUsers.post("/bulk/students", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    importTeachers: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUsers.post("/bulk/teachers", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    importBatches: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiUsers.post("/bulk/batches", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    // Bulk delete
    deleteStudents: (ids: string[]) =>
      apiUsers.post("/bulk/students/delete", { ids }),
    deleteTeachers: (ids: string[]) =>
      apiUsers.post("/bulk/teachers/delete", { ids }),
    deleteBatches: (ids: string[]) =>
      apiUsers.post("/bulk/batches/delete", { ids }),
    // Bulk export
    exportStudents: (ids?: string[], format: "csv" | "xlsx" = "xlsx") =>
      apiUsers.post("/bulk/students/export", { ids, format }, { responseType: "blob" }),
    exportTeachers: (ids?: string[], format: "csv" | "xlsx" = "xlsx") =>
      apiUsers.post("/bulk/teachers/export", { ids, format }, { responseType: "blob" }),
    exportBatches: (ids?: string[], format: "csv" | "xlsx" = "xlsx") =>
      apiUsers.post("/bulk/batches/export", { ids, format }, { responseType: "blob" }),
  },
  // AI Question Parsing endpoints
  aiParsing: {
    // Parse file asynchronously (returns job ID)
    parseFile: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiQuestions.post("/ai/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    // Parse file synchronously (for smaller files)
    parseFileSync: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiQuestions.post<{ success: boolean; data: AIParseResult }>("/ai/parse-sync", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    // Parse raw text
    parseText: (content: string) =>
      apiQuestions.post<{ success: boolean; data: AIParseResult }>("/ai/parse-text", { content }),
    // Get job status
    getJobStatus: (jobId: string) =>
      apiQuestions.get<{ success: boolean; data: AIParseJobStatus }>(`/ai/parse-status/${jobId}`),
    // Confirm and save questions
    confirmQuestions: (questions: Array<{
      type: "single" | "multiple";
      difficulty: "easy" | "medium" | "hard";
      en: { question: string; options: Array<{ id: string; value: string }>; solution?: string };
      hi?: { question: string; options: Array<{ id: string; value: string }>; solution?: string };
      correctAnswers: string[];
      subject: string;
      chapters: Array<{ name: string; topics: string[] }>;
      exams?: string[];
      sources?: string[];
    }>) => apiQuestions.post("/ai/confirm", { questions }),
  },
  // Audit log endpoints
  audit: {
    query: (params?: AuditLogQueryParams) =>
      apiUsers.get("/audit", { params }),
    getEntityHistory: (entityType: string, entityId: string, params?: { page?: number; limit?: number }) =>
      apiUsers.get(`/audit/entity/${entityType}/${entityId}`, { params }),
    getUserActivity: (userId: string, params?: { page?: number; limit?: number }) =>
      apiUsers.get(`/audit/user/${userId}`, { params }),
    getActions: () => apiUsers.get("/audit/actions"),
    getEntityTypes: () => apiUsers.get("/audit/entity-types"),
  },
  // UI Template endpoints
  uiTemplates: {
    getAll: (params?: { page?: number; size?: number; includeDeleted?: boolean }) =>
      apiTests.get("/ui-template", { params }),
    getAllNoPagination: () => apiTests.get("/ui-template/all"),
    getPresets: () => apiTests.get<{ success: boolean; data: UITemplatePreset[] }>("/ui-template/presets"),
    getDefault: () => apiTests.get<{ success: boolean; data: TestUITemplate }>("/ui-template/default"),
    getById: (id: string) => apiTests.get<{ success: boolean; data: TestUITemplate }>(`/ui-template/${id}`),
    create: (data: Omit<TestUITemplate, "_id" | "createdBy" | "createdAt" | "modifiedAt">) =>
      apiTests.post("/ui-template/create", data),
    createFromPreset: (data: { presetKey: string; name: string; description?: string; isDefault?: boolean }) =>
      apiTests.post("/ui-template/create-from-preset", data),
    update: (data: Partial<TestUITemplate> & { id: string }) =>
      apiTests.patch("/ui-template/update", data),
    setDefault: (id: string) => apiTests.post(`/ui-template/${id}/set-default`),
    duplicate: (id: string, name: string) =>
      apiTests.post(`/ui-template/${id}/duplicate`, { name }),
    delete: (id: string) => apiTests.delete(`/ui-template/delete/${id}`),
    restore: (id: string) => apiTests.post(`/ui-template/${id}/restore`),
  },
};

// AI Question Parsing types
export interface ParsedQuestion {
  id: string;
  type: "single" | "multiple";
  difficulty: "easy" | "medium" | "hard";
  en: {
    question: string;
    options: Array<{ id: string; value: string }>;
    solution?: string;
  };
  hi?: {
    question: string;
    options: Array<{ id: string; value: string }>;
    solution?: string;
  };
  correctAnswers: string[];
  subject?: string;
  chapter?: string;
  topics?: string[];
  confidence: number;
  chunkIndex?: number;
}

export interface AIParseResult {
  questions: ParsedQuestion[];
  invalidQuestions: Array<{ question: ParsedQuestion; reason: string }>;
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  totalChunks: number;
  processingTime: number;
  errors: string[];
}

export interface AIParseJobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  totalChunks: number;
  questions?: ParsedQuestion[];
  invalidQuestions?: Array<{ question: ParsedQuestion; reason: string }>;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

// Audit log types
export interface AuditLogEntry {
  _id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "BULK_CREATE" | "BULK_DELETE" | "LOGIN" | "LOGOUT";
  entityType: string;
  entityId: string;
  entityName?: string;
  userId: string;
  userName?: string;
  userType: string;
  instituteId?: string;
  timestamp: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogQueryParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
  instituteId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// UI Template types
export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  border: string;
}

export interface Typography {
  fontFamily: string;
  questionFontSize: "small" | "medium" | "large";
  optionFontSize: "small" | "medium" | "large";
}

export interface Layout {
  questionPanelPosition: "left" | "center";
  navigationPosition: "top" | "bottom" | "right";
  showTimer: boolean;
  showQuestionPalette: boolean;
  compactMode: boolean;
}

export interface Branding {
  logoUrl?: string;
  instituteName?: string;
  showLogo: boolean;
  headerText?: string;
  footerText?: string;
}

export interface ButtonStyles {
  borderRadius: "none" | "small" | "medium" | "large" | "full";
  variant: "solid" | "outline" | "ghost";
}

export interface Animations {
  enableTransitions: boolean;
  questionTransition: "none" | "fade" | "slide";
}

export interface TestUITemplate {
  _id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  colorScheme: ColorScheme;
  typography: Typography;
  layout: Layout;
  branding: Branding;
  buttonStyles: ButtonStyles;
  animations: Animations;
  previewImageUrl?: string;
  instituteId?: string;
  isPreset?: boolean;
  createdBy?: {
    userType: string;
    id: string;
    name?: string;
  };
  createdAt?: string;
  modifiedAt?: string;
}

export interface UITemplatePreset {
  key: string;
  name: string;
  description: string;
  colorScheme: ColorScheme;
  typography: Typography;
  layout: Layout;
  branding: Branding;
  buttonStyles: ButtonStyles;
  animations: Animations;
}

export default api;
