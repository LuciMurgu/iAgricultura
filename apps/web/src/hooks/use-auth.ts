/**
 * Zustand auth store.
 * Manages the current user state and auth actions.
 * Persists nothing to localStorage — session state lives in the server cookie.
 */
"use client";

import { create } from "zustand";
import { authService } from "@/lib/api/services/auth";
import { ApiError, NetworkError } from "@/lib/api/client";
import type { User, LoginRequest } from "@/types/auth";

interface AuthState {
  /** Null when not authenticated or before checkAuth completes. */
  user: User | null;
  /** True while checkAuth/login are in flight. */
  isLoading: boolean;
  /** Non-null when the last auth action failed. */
  error: string | null;
  /** True once checkAuth() has resolved (prevents flash of login page). */
  isInitialized: boolean;
}

interface AuthActions {
  /** Attempt login with email/password. Throws on failure. */
  login: (credentials: LoginRequest) => Promise<void>;
  /** Clear session on the server and reset local state. */
  logout: () => Promise<void>;
  /**
   * Check whether the current session cookie is valid.
   * Called once on app mount in the protected layout.
   */
  checkAuth: () => Promise<void>;
  /** Clear any displayed error message. */
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.login(credentials);
      set({ user, isLoading: false, isInitialized: true });
    } catch (err) {
      let message = "Autentificare eșuată. Verificați credențialele.";
      if (err instanceof NetworkError) {
        message = "Conexiune indisponibilă. Verificați rețeaua.";
      } else if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          message = "Email sau parolă incorecte.";
        } else if (err.detail) {
          message = err.detail;
        }
      }
      set({ isLoading: false, error: message });
      throw err; // re-throw so the form can also react if needed
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch {
      // Best-effort — even if the request fails, clear local state
    } finally {
      set({ user: null, isLoading: false, isInitialized: true, error: null });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      set({ user, isLoading: false, isInitialized: true });
    } catch {
      // 401 or network error → not authenticated, show login
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },

  clearError: () => set({ error: null }),
}));

/** Convenience selector — true when user is logged in. */
export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.user !== null);
}
