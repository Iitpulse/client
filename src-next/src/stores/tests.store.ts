import { create } from "zustand";
import { ITest, IExam, ISubject, IPattern, TestStatus } from "@/types";
import { api } from "@/lib/api";

interface TestsState {
  // Test data by status
  tests: {
    all: ITest[];
    ongoing: ITest[];
    upcoming: ITest[];
    completed: ITest[];
    draft: ITest[];
  };

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
  fetchTests: (status?: TestStatus) => Promise<void>;
  fetchTestById: (id: string) => Promise<ITest | null>;
  fetchExams: () => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchPatterns: () => Promise<void>;
  createTest: (data: Partial<ITest>) => Promise<ITest | null>;
  updateTest: (data: Partial<ITest> & { id: string }) => Promise<boolean>;
  deleteTest: (id: string) => Promise<boolean>;
  publishTest: (id: string) => Promise<boolean>;
  setCurrentTest: (test: ITest | null) => void;
  clearError: () => void;
}

export const useTestsStore = create<TestsState>((set, get) => ({
  tests: {
    all: [],
    ongoing: [],
    upcoming: [],
    completed: [],
    draft: [],
  },
  exams: [],
  subjects: [],
  patterns: [],
  currentTest: null,
  isLoading: false,
  error: null,

  fetchTests: async (status?: TestStatus) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.tests.getAll({ status });
      const tests: ITest[] = response.data.data || [];

      // Categorize tests by status
      const categorized = {
        all: tests,
        ongoing: tests.filter((t) => t.status === "ongoing"),
        upcoming: tests.filter((t) => t.status === "scheduled"),
        completed: tests.filter((t) => t.status === "completed"),
        draft: tests.filter((t) => t.status === "draft"),
      };

      set({ tests: categorized, isLoading: false });
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
      const test: ITest = response.data.data;
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
      set({ exams: response.data.data || [] });
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    }
  },

  fetchSubjects: async () => {
    try {
      const response = await api.subjects.getAll();
      set({ subjects: response.data.data || [] });
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  },

  fetchPatterns: async () => {
    try {
      const response = await api.patterns.getAllNoPagination();
      set({ patterns: response.data.data || [] });
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

  deleteTest: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.tests.delete(id);
      await get().fetchTests();
      set({ isLoading: false });
      return true;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to delete test";
      set({ error: message, isLoading: false });
      return false;
    }
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
