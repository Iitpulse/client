import { create } from "zustand";
import { PERMISSIONS } from "@/types";
import { api } from "@/lib/api";
import { useAuthStore } from "./auth.store";

// Role structure as returned by backend
interface IRoleFromBackend {
  id: string;
  _id?: string;
  name: string;
  permissions: string[]; // Array of permission strings like "READ_QUESTION"
  members: Array<{ id: string; userType: string }>;
  createdAt?: string;
  createdBy?: { id: string; userType: string };
}

export interface PermissionsState {
  allRoles: IRoleFromBackend[];
  permissions: Record<string, string[]>; // roleId -> permissions array
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
  createRole: (name: string) => Promise<IRoleFromBackend | null>;
  updateRole: (id: string, permissions: string[]) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;
  removeMember: (roleId: string, member: { id: string; userType: string }) => Promise<boolean>;
  resetPermissions: () => void;
}

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

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  allRoles: [],
  permissions: {},
  isLoading: false,
  error: null,
  hasAccess: getDefaultAccess(),

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log("[Permissions] Fetching roles...");
      const response = await api.roles.getAll();
      console.log("[Permissions] Response:", response.data);
      // Backend returns array directly or in response.data
      const roles: IRoleFromBackend[] = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      console.log("[Permissions] Parsed roles:", roles.length, "roles found");

      // Build permissions map by role ID
      const permissions: Record<string, string[]> = {};
      roles.forEach((role) => {
        const roleId = role.id || role._id;
        if (roleId) {
          permissions[roleId] = role.permissions || [];
        }
      });

      // Get current user to compute their permissions
      const currentUser = useAuthStore.getState().currentUser;
      const hasAccess = { ...getDefaultAccess() };
      console.log("[Permissions] Current user roles:", currentUser?.roles);

      if (currentUser?.roles) {
        // For each role the user has, check permissions
        roles.forEach((role) => {
          const roleId = role.id || role._id;
          if (!roleId) return;
          console.log("[Permissions] Checking role:", roleId, "user has it:", currentUser.roles?.[roleId]);
          // currentUser.roles is Record<string, boolean>, e.g., { "roleId1": true }
          if (currentUser.roles?.[roleId]) {
            const rolePerms = role.permissions || [];

            if (rolePerms.includes(PERMISSIONS.QUESTION.READ)) {
              hasAccess.question = true;
            }
            if (rolePerms.includes(PERMISSIONS.USER.READ)) {
              hasAccess.user = true;
            }
            if (rolePerms.includes(PERMISSIONS.TEST.READ)) {
              hasAccess.test = true;
            }
            if (rolePerms.includes(PERMISSIONS.PATTERN.READ)) {
              hasAccess.pattern = true;
            }
            if (rolePerms.includes(PERMISSIONS.BATCH.READ)) {
              hasAccess.batch = true;
            }
            if (rolePerms.includes(PERMISSIONS.ROLE.READ)) {
              hasAccess.role = true;
            }
            if (rolePerms.includes(PERMISSIONS.SUBJECT.READ)) {
              hasAccess.subject = true;
            }
          }
        });
      }

      console.log("[Permissions] Final hasAccess:", hasAccess);
      set({ allRoles: roles, permissions, hasAccess, isLoading: false });
    } catch (error: unknown) {
      console.error("[Permissions] Error fetching roles:", error);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to fetch roles";
      set({ error: message, isLoading: false, hasAccess: getDefaultAccess() });
    }
  },

  hasPermission: (permission: string) => {
    const { permissions } = get();
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser?.roles) return false;

    // Check if any of the user's roles have this permission
    return Object.keys(currentUser.roles).some((roleId) => {
      const rolePerms = permissions[roleId] || [];
      return rolePerms.includes(permission);
    });
  },

  createRole: async (name: string) => {
    const currentUser = useAuthStore.getState().currentUser;
    try {
      const response = await api.roles.create({
        name,
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: {
          id: currentUser?.id || "",
          userType: currentUser?.userType || "",
        },
      });
      const newRole = response.data;
      set((state) => ({
        allRoles: [...state.allRoles, newRole],
      }));
      return newRole;
    } catch {
      return null;
    }
  },

  updateRole: async (id: string, permissions: string[]) => {
    try {
      await api.roles.update(id, { permissions });
      set((state) => ({
        allRoles: state.allRoles.map((role) =>
          (role.id || role._id) === id ? { ...role, permissions } : role
        ),
        permissions: {
          ...state.permissions,
          [id]: permissions,
        },
      }));
      return true;
    } catch {
      return false;
    }
  },

  deleteRole: async (id: string) => {
    try {
      await api.roles.delete(id);
      set((state) => ({
        allRoles: state.allRoles.filter((role) => (role.id || role._id) !== id),
      }));
      return true;
    } catch {
      return false;
    }
  },

  removeMember: async (roleId: string, member: { id: string; userType: string }) => {
    try {
      await api.roles.removeMember(roleId, member);
      await get().fetchRoles();
      return true;
    } catch {
      return false;
    }
  },

  resetPermissions: () => {
    set({
      allRoles: [],
      permissions: {},
      hasAccess: getDefaultAccess(),
    });
  },
}));
