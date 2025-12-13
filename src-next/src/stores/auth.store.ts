import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ICurrentUser, IUserBase } from "@/types";
import { api, auth as authHelper } from "@/lib/api";

// JWT payload structure from backend
interface JwtPayload {
  email: string;
  id: string;
  userType: string;
  instituteId?: string;
  roles: Array<{ id: string; from?: string; to?: string }>;
  exp: number;
}

// Helper to decode JWT payload
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

// Transform roles from JWT to Record<string, boolean> for easy lookup
// Handles multiple formats:
// 1. Array: [{ id: "ROLE_ADMIN" }]
// 2. Object: { ROLE_ADMIN: { ... } } or { ROLE_ADMIN: true }
function transformRoles(
  roles: Array<{ id: string }> | Record<string, unknown> | undefined
): Record<string, boolean> {
  if (!roles) return {};

  const rolesRecord: Record<string, boolean> = {};

  if (Array.isArray(roles)) {
    // Format: [{ id: "ROLE_ADMIN" }]
    roles.forEach((role) => {
      if (role.id) {
        rolesRecord[role.id] = true;
      }
    });
  } else if (typeof roles === "object") {
    // Format: { ROLE_ADMIN: { ... } } or { ROLE_ADMIN: true }
    Object.keys(roles).forEach((roleId) => {
      if (roles[roleId]) {
        rolesRecord[roleId] = true;
      }
    });
  }

  return rolesRecord;
}

interface AuthState {
  currentUser: ICurrentUser | null;
  userDetails: IUserBase | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setCurrentUser: (user: ICurrentUser | null) => void;
  fetchUserDetails: () => Promise<void>;
  checkAuth: () => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      userDetails: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.login({ email, password });
          // Backend returns { success: true, data: { token: "..." } }
          const token = response.data.data?.token || response.data.token;

          if (!token) {
            throw new Error("No token received");
          }

          authHelper.setToken(token);

          // Decode JWT to get user info (same as original AuthContext)
          const decoded = decodeJwtPayload(token);
          console.log("[Auth] Decoded JWT:", decoded);
          console.log("[Auth] Roles from JWT:", decoded?.roles);
          if (!decoded) {
            throw new Error("Invalid token");
          }

          // Transform roles array to Record<string, boolean> for easy lookup
          const rolesRecord = transformRoles(decoded.roles);
          console.log("[Auth] Transformed roles:", rolesRecord);

          const currentUser: ICurrentUser = {
            id: decoded.id,
            email: decoded.email,
            userType: decoded.userType as ICurrentUser["userType"],
            instituteId: decoded.instituteId,
            roles: rolesRecord,
          };

          set({
            currentUser,
            isAuthenticated: true,
            isLoading: false,
          });

          // Fetch full user details
          await get().fetchUserDetails();
          return true;
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Login failed";
          set({ error: message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        authHelper.removeToken();
        set({
          currentUser: null,
          userDetails: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setCurrentUser: (user) => {
        set({
          currentUser: user,
          isAuthenticated: !!user,
        });
      },

      fetchUserDetails: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          const response = await api.users.getUserById(currentUser.id);
          set({ userDetails: response.data.data });
        } catch (error) {
          console.error("Failed to fetch user details:", error);
        }
      },

      checkAuth: () => {
        const token = authHelper.getToken();
        if (!token) {
          set({ isAuthenticated: false, currentUser: null });
          return false;
        }

        // Decode JWT to check expiration and restore user
        try {
          const decoded = decodeJwtPayload(token);
          if (!decoded) {
            authHelper.removeToken();
            set({ isAuthenticated: false, currentUser: null });
            return false;
          }

          const isExpired = decoded.exp * 1000 < Date.now();
          if (isExpired) {
            authHelper.removeToken();
            set({ isAuthenticated: false, currentUser: null });
            return false;
          }

          // Restore currentUser from token if not already set or if roles are missing
          const { currentUser } = get();
          if (!currentUser || !currentUser.roles || Object.keys(currentUser.roles).length === 0) {
            const rolesRecord = transformRoles(decoded.roles);
            set({
              currentUser: {
                id: decoded.id,
                email: decoded.email,
                userType: decoded.userType as ICurrentUser["userType"],
                instituteId: decoded.instituteId,
                roles: rolesRecord,
              },
              isAuthenticated: true,
            });
          }

          return true;
        } catch {
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
