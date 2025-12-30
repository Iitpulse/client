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
    getAll: () => apiUsers.get("/batch"),
    create: (data: unknown) => apiUsers.post("/batch/create", data),
    update: (id: string, data: Record<string, unknown>) =>
      apiUsers.patch("/batch/update", { id, ...data }),
    delete: (id: string) => apiUsers.delete("/batch/delete", { data: { id } }),
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
    getByStatus: (status: "active" | "ongoing" | "inactive" | "expired", batch?: string) =>
      apiTests.get("/test", { params: { status, batch } }),
    getRecent: (count?: number) =>
      apiTests.get("/test/recent", { params: { count: count || 5 } }),
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
    getByExam: (exam: string) =>
      apiTests.get("/pattern", { params: { exam } }),
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
  sources: {
    getAll: () => apiQuestions.get("/source/all"),
    create: (data: { name: string }) => apiQuestions.post("/source/create", data),
  },
};

export default api;
