import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ICurrentUser, IUserBase } from "@/types";
import { api, auth as authHelper } from "@/lib/api";

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
          const { token, user } = response.data.data;

          authHelper.setToken(token);
          set({
            currentUser: user,
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

        // Decode JWT to check expiration
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          if (isExpired) {
            authHelper.removeToken();
            set({ isAuthenticated: false, currentUser: null });
            return false;
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
