"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Protected layout — wraps all (auth) routes.
 * 1. Checks auth on mount via GET /api/v1/auth/me
 * 2. Redirects to /login if unauthenticated
 * 3. Shows loading skeleton while auth check is in flight
 * 4. Provides QueryClient + AppShell to all child pages
 *
 * Auth: cookie-based session, DEC-0017. No token storage.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized, checkAuth } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      void checkAuth();
    }
  }, [isInitialized, checkAuth]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  // Auth check in flight, or about to redirect — show skeleton, never the app.
  if (!isInitialized || !user) {
    return <AuthCheckSkeleton />;
  }

  return <AppShell>{children}</AppShell>;
}

function AuthCheckSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-brand-700 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-slate-500">Se verifică sesiunea...</p>
      </div>
    </div>
  );
}
