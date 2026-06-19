"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterRequestSchema, type RegisterRequest } from "@/types/auth";
import { authService } from "@/lib/api/services/auth";
import { ApiError, NetworkError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Register page — Creează cont.
 * Self-service signup. Accounts start pending; an admin approves them before
 * the user can log in. Mirrors the login page styling.
 */

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
  });

  async function onSubmit(data: RegisterRequest) {
    setServerError(null);
    try {
      const res = await authService.register(data);
      setSuccessMessage(res.message);
    } catch (err) {
      if (err instanceof NetworkError) {
        setServerError("Conexiune indisponibilă. Verificați rețeaua.");
      } else if (err instanceof ApiError) {
        setServerError(err.detail ?? "Înregistrare eșuată. Încercați din nou.");
      } else {
        setServerError("Înregistrare eșuată. Încercați din nou.");
      }
    }
  }

  const inputClass = (hasError: boolean) =>
    cn(
      "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
      "focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700",
      "transition-colors",
      hasError
        ? "border-red-400 bg-red-50"
        : "border-slate-300 bg-white hover:border-slate-400",
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-700 mb-4">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-white fill-current"
              aria-hidden="true"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8-2 8-2S14 1 8 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Farm Copilot</h1>
          <p className="text-sm text-slate-500 mt-1">Creează cont</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {successMessage ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                <svg
                  viewBox="0 0 20 20"
                  className="w-6 h-6 text-green-700 fill-current"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-700">{successMessage}</p>
              <Link
                href="/login"
                className="inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                ← Înapoi la autentificare
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {serverError && (
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
                  <span>{serverError}</span>
                </div>
              )}

              {/* Nume */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Nume complet
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ion Popescu"
                  {...register("name")}
                  className={inputClass(!!errors.name)}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ion@ferma.ro"
                  {...register("email")}
                  className={inputClass(!!errors.email)}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Nume fermă */}
              <div className="space-y-1.5">
                <label
                  htmlFor="farm_name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nume fermă
                </label>
                <input
                  id="farm_name"
                  type="text"
                  placeholder="Ferma Popescu SRL"
                  {...register("farm_name")}
                  className={inputClass(!!errors.farm_name)}
                />
                {errors.farm_name && (
                  <p className="text-xs text-red-600">{errors.farm_name.message}</p>
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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={inputClass(!!errors.password)}
                />
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                id="btn-register"
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white",
                  "bg-brand-700 hover:bg-brand-800 active:bg-brand-900",
                  "focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2",
                  "transition-colors",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                {isSubmitting ? (
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
                    Se creează...
                  </span>
                ) : (
                  "Creează cont"
                )}
              </button>
            </form>
          )}
        </div>

        {!successMessage && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Ai deja cont?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
              Autentifică-te
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
