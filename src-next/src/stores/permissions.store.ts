import { create } from "zustand";
import { IRole, IPermissions } from "@/types";
import { api } from "@/lib/api";
import { useAuthStore } from "./auth.store";

interface PermissionsState {
  roles: IRole[];
  permissions: Record<string, IPermissions>;
  userPermissions: IPermissions;
  isLoading: boolean;
  error: string | null;

  // Computed feature access flags
  hasAccess: {
    question: boolean;
    user: boolean;
    test: boolean;
    pattern: boolean;
    batch: boolean;
    role: boolean;
    subject: boolean;
  };

  // Actions
  fetchRoles: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  createRole: (name: string, permissions?: Record<string, boolean>) => Promise<boolean>;
  updateRole: (id: string, data: Partial<IRole>) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;
  addMember: (roleId: string, memberId: string) => Promise<boolean>;
  removeMember: (roleId: string, memberId: string) => Promise<boolean>;
  computeUserPermissions: () => void;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  roles: [],
  permissions: {},
  userPermissions: {},
  isLoading: false,
  error: null,
  hasAccess: {
    question: false,
    user: false,
    test: false,
    pattern: false,
    batch: false,
    role: false,
    subject: false,
  },

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.roles.getAll();
      const roles: IRole[] = response.data.data || [];

      // Build permissions map by role ID
      const permissions: Record<string, IPermissions> = {};
      roles.forEach((role) => {
        permissions[role._id] = role.permissions || {};
      });

      set({ roles, permissions, isLoading: false });
      get().computeUserPermissions();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch roles";
      set({ error: message, isLoading: false });
    }
  },

  hasPermission: (permission: string) => {
    const { userPermissions } = get();
    return userPermissions[permission] === true;
  },

  createRole: async (name: string, permissions?: Record<string, boolean>) => {
    try {
      await api.roles.create({ name, permissions });
      await get().fetchRoles();
      return true;
    } catch {
      return false;
    }
  },

  updateRole: async (id: string, data: Partial<IRole>) => {
    try {
      await api.roles.update(id, data);
      await get().fetchRoles();
      return true;
    } catch {
      return false;
    }
  },

  deleteRole: async (id: string) => {
    try {
      await api.roles.delete(id);
      await get().fetchRoles();
      return true;
    } catch {
      return false;
    }
  },

  addMember: async (roleId: string, memberId: string) => {
    try {
      await api.roles.addMember(roleId, memberId);
      await get().fetchRoles();
      return true;
    } catch {
      return false;
    }
  },

  removeMember: async (roleId: string, memberId: string) => {
    try {
      await api.roles.removeMember(roleId, memberId);
      await get().fetchRoles();
      return true;
    } catch {
      return false;
    }
  },

  computeUserPermissions: () => {
    const { roles, permissions } = get();
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser || !currentUser.roles) {
      set({ userPermissions: {}, hasAccess: getDefaultAccess() });
      return;
    }

    // Merge permissions from all user roles
    const userPermissions: IPermissions = {};
    currentUser.roles.forEach((roleId) => {
      const rolePerms = permissions[roleId] || {};
      Object.entries(rolePerms).forEach(([key, value]) => {
        if (value) userPermissions[key] = true;
      });
    });

    // Compute feature access flags
    const hasAccess = {
      question:
        userPermissions["question:read"] || userPermissions["question:read_global"],
      user: userPermissions["user:read"],
      test: userPermissions["test:read"] || userPermissions["test:read_global"],
      pattern: userPermissions["pattern:read"],
      batch: userPermissions["batch:read"],
      role: userPermissions["role:read"],
      subject: userPermissions["subject:read"],
    };

    set({ userPermissions, hasAccess });
  },
}));

function getDefaultAccess() {
  return {
    question: false,
    user: false,
    test: false,
    pattern: false,
    batch: false,
    role: false,
    subject: false,
  };
}
