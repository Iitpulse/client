import { create } from "zustand";
import { ITest, IExam, ISubject, IPattern, TestStatus } from "@/types";
import { api } from "@/lib/api";

export interface TestsState {
  // Test data - simple flat array
  tests: ITest[];

  // Metadata
  exams: IExam[];
  subjects: ISubject[];
  patterns: IPattern[];

  // Current test being edited/viewed
  currentTest: ITest | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setTests: (tests: ITest[]) => void;
  fetchTests: (status?: TestStatus) => Promise<void>;
  fetchTestById: (id: string) => Promise<ITest | null>;
  fetchExams: () => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchPatterns: () => Promise<void>;
  createTest: (data: Partial<ITest>) => Promise<ITest | null>;
  updateTest: (data: Partial<ITest> & { id: string }) => Promise<boolean>;
  deleteTest: (id: string) => void;
  publishTest: (id: string) => Promise<boolean>;
  setCurrentTest: (test: ITest | null) => void;
  clearError: () => void;
}

export const useTestsStore = create<TestsState>((set, get) => ({
  tests: [],
  exams: [],
  subjects: [],
  patterns: [],
  currentTest: null,
  isLoading: false,
  error: null,

  setTests: (tests: ITest[]) => set({ tests }),

  fetchTests: async (status?: TestStatus) => {
    set({ isLoading: true, error: null });
    try {
      // Normalize status to lowercase for API
      const normalizedStatus = status?.toLowerCase() as "active" | "inactive" | "ongoing" | "expired" | undefined;
      const response = normalizedStatus
        ? await api.tests.getByStatus(normalizedStatus)
        : await api.tests.getAll();
      const tests: ITest[] = response.data?.tests || response.data?.data || response.data || [];
      set({ tests: Array.isArray(tests) ? tests : [], isLoading: false });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch tests";
      set({ error: message, isLoading: false });
    }
  },

  fetchTestById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.tests.getById(id);
      // Backend returns test directly, not wrapped in { data: {...} }
      const test: ITest = response.data?.data || response.data;
      set({ currentTest: test, isLoading: false });
      return test;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch test";
      set({ error: message, isLoading: false });
      return null;
    }
  },

  fetchExams: async () => {
    try {
      const response = await api.exams.getAll();
      // Backend returns array directly
      const exams = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      set({ exams });
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    }
  },

  fetchSubjects: async () => {
    try {
      const response = await api.subjects.getAll();
      // Backend returns array directly
      const subjects = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      set({ subjects });
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  },

  fetchPatterns: async () => {
    try {
      const response = await api.patterns.getAllNoPagination();
      // Backend may return array or { data: [...] }
      const patterns = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      set({ patterns });
    } catch (error) {
      console.error("Failed to fetch patterns:", error);
    }
  },

  createTest: async (data: Partial<ITest>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.tests.create(data);
      const newTest: ITest = response.data.data;
      await get().fetchTests();
      set({ isLoading: false });
      return newTest;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create test";
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateTest: async (data: Partial<ITest> & { id: string }) => {
    set({ isLoading: true, error: null });
    try {
      await api.tests.update(data);
      await get().fetchTests();
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update test";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteTest: (id: string) => {
    const { tests } = get();
    set({ tests: tests.filter((t) => t._id !== id) });
  },

  publishTest: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.tests.publish(id);
      await get().fetchTests();
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to publish test";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  setCurrentTest: (test) => set({ currentTest: test }),
  clearError: () => set({ error: null }),
}));
