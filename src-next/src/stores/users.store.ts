import { create } from "zustand";
import {
  IStudent,
  ITeacher,
  IAdmin,
  IOperator,
  IManager,
} from "@/types";
import { api } from "@/lib/api";

type UserCategory = "students" | "teachers" | "admins" | "operators" | "managers";
type UserType = IStudent | ITeacher | IAdmin | IOperator | IManager;

export interface UsersState {
  students: IStudent[];
  teachers: ITeacher[];
  admins: IAdmin[];
  operators: IOperator[];
  managers: IManager[];

  isLoading: boolean;
  error: string | null;

  // Actions
  setUsers: (category: UserCategory, users: UserType[]) => void;
  fetchStudents: () => Promise<void>;
  fetchTeachers: () => Promise<void>;
  fetchAdmins: () => Promise<void>;
  fetchOperators: () => Promise<void>;
  fetchManagers: () => Promise<void>;
  fetchAll: () => Promise<void>;
  clearError: () => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  students: [],
  teachers: [],
  admins: [],
  operators: [],
  managers: [],
  isLoading: false,
  error: null,

  setUsers: (category: UserCategory, users: UserType[]) => {
    set({ [category]: users });
  },

  fetchStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.users.getStudents();
      set({ students: response.data?.students || response.data?.data || [], isLoading: false });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch students";
      set({ error: message, isLoading: false });
    }
  },

  fetchTeachers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.users.getTeachers();
      set({ teachers: response.data?.teachers || response.data?.data || [], isLoading: false });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch teachers";
      set({ error: message, isLoading: false });
    }
  },

  fetchAdmins: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.users.getAdmins();
      set({ admins: response.data?.admins || response.data?.data || [], isLoading: false });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch admins";
      set({ error: message, isLoading: false });
    }
  },

  fetchOperators: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.users.getOperators();
      set({ operators: response.data?.operators || response.data?.data || [], isLoading: false });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch operators";
      set({ error: message, isLoading: false });
    }
  },

  fetchManagers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.users.getManagers();
      set({ managers: response.data?.managers || response.data?.data || [], isLoading: false });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch managers";
      set({ error: message, isLoading: false });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [students, teachers, admins, operators, managers] = await Promise.all([
        api.users.getStudents(),
        api.users.getTeachers(),
        api.users.getAdmins(),
        api.users.getOperators(),
        api.users.getManagers(),
      ]);

      set({
        students: students.data?.students || students.data?.data || [],
        teachers: teachers.data?.teachers || teachers.data?.data || [],
        admins: admins.data?.admins || admins.data?.data || [],
        operators: operators.data?.operators || operators.data?.data || [],
        managers: managers.data?.managers || managers.data?.data || [],
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch users";
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
