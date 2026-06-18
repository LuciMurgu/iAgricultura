"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Metadata } from "next";
import { LoginRequestSchema, type LoginRequest } from "@/types/auth";
import { useAuthStore } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Login page — Autentificare
 * Uses React Hook Form + Zod. Cookie-based session auth (DEC-0017).
 * Romanian-first UI per DOMAIN_GLOSSARY.md.
 */

export default function LoginPage() {
  const router = useRouter();
  const { login, checkAuth, user, isLoading, error, clearError, isInitialized } =
    useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
  });

  // If already logged in, skip to dashboard
  useEffect(() => {
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        router.replace("/dashboard");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate on successful login
  useEffect(() => {
    if (isInitialized && user) {
      router.replace("/dashboard");
    }
  }, [user, isInitialized, router]);

  async function onSubmit(data: LoginRequest) {
    clearError();
    try {
      await login(data);
      // Navigation happens via useEffect above
    } catch {
      // Error already set in the store. For field-level errors:
      const storeError = useAuthStore.getState().error;
      if (storeError?.includes("credential") || storeError?.includes("incorecte")) {
        setError("password", { message: storeError ?? "Credențiale incorecte." });
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-700 mb-4">
            {/* Simple leaf/farm icon using CSS */}
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-white fill-current"
              aria-hidden="true"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8-2 8-2S14 1 8 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Farm Copilot</h1>
          <p className="text-sm text-slate-500 mt-1">Autentificare</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Global error from server */}
            {error && !errors.password && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="w-4 h-4 mt-0.5 flex-shrink-0 fill-current"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-1-9v4a1 1 0 1 0 2 0V9a1 1 0 0 0-2 0zm1-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@ferma.ro"
                {...register("email")}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700",
                  "transition-colors",
                  errors.email
                    ? "border-red-400 bg-red-50"
                    : "border-slate-300 bg-white hover:border-slate-400",
                )}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Parolă */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Parolă
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700",
                  "transition-colors",
                  errors.password
                    ? "border-red-400 bg-red-50"
                    : "border-slate-300 bg-white hover:border-slate-400",
                )}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={isSubmitting || isLoading}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white",
                "bg-brand-700 hover:bg-brand-800 active:bg-brand-900",
                "focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2",
                "transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {isSubmitting || isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8V0C5.372 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Se verifică...
                </span>
              ) : (
                "Intră în cont"
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Farm Copilot · Sistem de achiziții pentru ferme din România
        </p>
      </div>
    </div>
  );
}
