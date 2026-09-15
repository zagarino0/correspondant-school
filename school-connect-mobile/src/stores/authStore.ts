import { create } from "zustand";

import { logout as logoutService } from "../services/auth/auth.service";
import type { AuthSession, AuthUser } from "../types/auth";
import { getCurrentUser } from "../services/auth/auth.service";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: (session) =>
    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    }),

  clearSession: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  logout: async () => {
    await logoutService();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

refreshUser: async () => {
  const user = await getCurrentUser();

  set({
    user,
  });
},

}));