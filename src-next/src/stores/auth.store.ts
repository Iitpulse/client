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
  /** Signs in with a token the page already got from POST /auth/login (Admin-Auth handles its own error states). */
  loginWithToken: (token: string) => Promise<boolean>;
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
          // Backend returns { success: true, data: { token: "..." } } (v2: { status: "signed_in", token, expiresAt })
          const token = response.data.data?.status === "signed_in" || !response.data.data?.status ? response.data.data?.token || response.data.token : null;

          if (!token) {
            throw new Error("No token received");
          }

          authHelper.setToken(token);

          // Decode JWT to get user info (same as original AuthContext)
          const decoded = decodeJwtPayload(token);
          if (!decoded) {
            throw new Error("Invalid token");
          }

          // Transform roles array to Record<string, boolean> for easy lookup
          const rolesRecord = transformRoles(decoded.roles);

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

      loginWithToken: async (token: string) => {
        const decoded = decodeJwtPayload(token);
        if (!decoded) {
          set({ error: "Invalid token" });
          return false;
        }
        authHelper.setToken(token);
        set({
          currentUser: {
            id: decoded.id,
            email: decoded.email,
            userType: decoded.userType as ICurrentUser["userType"],
            instituteId: decoded.instituteId,
            roles: transformRoles(decoded.roles),
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        await get().fetchUserDetails();
        return true;
      },

      logout: () => {
        void authHelper.signOut(); // M7b: ends the cookie session on the API and in every tab
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
        // M7b: the access token lives in memory (lib/session.ts) and is refreshed from the cookie session on load.
        // A session hint without a token yet counts as signed in; the first API call refreshes (or signs out).
        if (!authHelper.isAuthenticated()) {
          set({ isAuthenticated: false, currentUser: null });
          return false;
        }
        const restore = (token: string): boolean => {
          const decoded = decodeJwtPayload(token);
          if (!decoded) return false;
          const { currentUser } = get();
          const roles = transformRoles(decoded.roles);
          // roles change at refresh (role edits apply at the next token): keep the store in step
          if (!currentUser || currentUser.id !== decoded.id || JSON.stringify(currentUser.roles ?? {}) !== JSON.stringify(roles)) {
            set({
              currentUser: { id: decoded.id, email: decoded.email, userType: decoded.userType as ICurrentUser["userType"], instituteId: decoded.instituteId, roles },
              isAuthenticated: true,
            });
          }
          return true;
        };
        const token = authHelper.getToken();
        if (!token) {
          void authHelper.ensureToken().then((t) => {
            if (!t || !restore(t)) set({ isAuthenticated: false, currentUser: null });
          });
          return true;
        }
        if (!restore(token)) {
          authHelper.removeToken();
          set({ isAuthenticated: false, currentUser: null });
          return false;
        }
        return true;
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
