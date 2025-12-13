import axios, { AxiosInstance, AxiosError } from "axios";

const AUTH_TOKEN_KEY = "auth_token";

// API Gateway URL
const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

// Create axios instance with interceptors
function createApiClient(service: "users" | "questions" | "tests"): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_GATEWAY}/${service}`,
    headers: {
      "Content-Type": "application/json",
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
      if (error.response?.status === 401) {
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

// API clients for each service
export const apiUsers = createApiClient("users");
export const apiQuestions = createApiClient("questions");
export const apiTests = createApiClient("tests");

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
  },
  users: {
    getStudents: (params?: { page?: number; size?: number }) =>
      apiUsers.get("/student", { params }),
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
      apiUsers.patch("/student/update", { id, ...data }),
    deleteStudent: (id: string) => apiUsers.delete("/student/delete", { data: { id } }),
    // Teacher CRUD
    createTeacher: (data: unknown) => apiUsers.post("/teacher/create", data),
    updateTeacher: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/teacher/update", { id, ...data }),
    deleteTeacher: (id: string) => apiUsers.delete("/teacher/delete", { data: { id } }),
    // Admin CRUD
    createAdmin: (data: unknown) => apiUsers.post("/admin/create", data),
    updateAdmin: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/admin/update", { id, ...data }),
    deleteAdmin: (id: string) => apiUsers.delete("/admin/delete", { data: { id } }),
    // Operator CRUD
    createOperator: (data: unknown) => apiUsers.post("/operator/create", data),
    updateOperator: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/operator/update", { id, ...data }),
    deleteOperator: (id: string) => apiUsers.delete("/operator/delete", { data: { id } }),
    // Manager CRUD
    createManager: (data: unknown) => apiUsers.post("/manager/create", data),
    updateManager: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/manager/update", { id, ...data }),
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
    getAll: () => apiUsers.get("/batch"),
    create: (data: unknown) => apiUsers.post("/batch/create", data),
    update: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/batch/update", { id, ...data }),
    delete: (id: string) => apiUsers.delete("/batch/delete", { data: { id } }),
  },
  institutes: {
    getAll: () => apiUsers.get("/institute"),
    create: (data: unknown) => apiUsers.post("/institute/create", data),
    update: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/institute/update", { id, ...data }),
    delete: (id: string) =>
      apiUsers.delete("/institute/delete", { data: { id } }),
  },
  questions: {
    getMCQ: (params?: { page?: number; size?: number; subject?: string }) =>
      apiQuestions.get("/mcq/all", { params }),
    getNumerical: (params?: { page?: number; size?: number; subject?: string }) =>
      apiQuestions.get("/numerical/all", { params }),
    getParagraph: (params?: { page?: number; size?: number; subject?: string }) =>
      apiQuestions.get("/paragraph/all", { params }),
    getMatrix: (params?: { page?: number; size?: number; subject?: string }) =>
      apiQuestions.get("/matrix/all", { params }),
    getById: (id: string, type: string) =>
      apiQuestions.get(`/${type}/question/${id}`),
    create: (type: string, data: unknown) =>
      apiQuestions.post(`/${type}/new`, data),
    update: (type: string, id: string, data: unknown) =>
      apiQuestions.put(`/${type}/update/${id}`, data),
    delete: (type: string, id: string) =>
      apiQuestions.delete(`/${type}/delete`, { data: { id } }),
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
    deleteChapter: (subjectId: string, chapterId: string) =>
      apiQuestions.post("/subject/chapter/delete", { subjectId, chapterId }),
    deleteTopic: (subjectId: string, chapterId: string, topic: string) =>
      apiQuestions.post("/subject/topic/delete", { subjectId, chapterId, topic }),
  },
  tests: {
    getAll: (params?: { page?: number; size?: number; status?: string }) =>
      apiTests.get("/test", { params }),
    getRecent: (limit?: number) =>
      apiTests.get("/test/recent", { params: { limit } }),
    getById: (id: string) => apiTests.get(`/test/${id}`),
    create: (data: unknown) => apiTests.post("/test/create", data),
    update: (data: unknown) => apiTests.patch("/test/update", data),
    delete: (id: string) => apiTests.delete(`/test/delete/${id}`),
    publish: (id: string) => apiTests.patch("/test/publish", { id }),
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
    getById: (id: string) => apiTests.get(`/pattern/${id}`),
    create: (data: unknown) => apiTests.post("/pattern/create", data),
    update: (data: unknown) => apiTests.patch("/pattern/update", data),
    delete: (id: string) => apiTests.delete(`/pattern/delete/${id}`),
    duplicate: (id: string, newName: string) =>
      apiTests.post("/pattern/duplicate", { id, newName }),
  },
  exams: {
    getAll: () => apiTests.get("/exam"),
    create: (data: { name: string; fullName?: string }) =>
      apiTests.post("/exam/create", data),
    update: (data: unknown) => apiTests.patch("/exam/update", data),
    delete: (id: string) => apiTests.delete(`/exam/delete/${id}`),
  },
};

export default api;
