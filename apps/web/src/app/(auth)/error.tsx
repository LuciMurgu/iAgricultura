"use client";

/**
 * Route-level error boundary for authenticated pages.
 * Catches errors within the (auth) layout group.
 */
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Eroare" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Pagina nu a putut fi încărcată
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {error.message || "A apărut o eroare neașteptată. Încercați din nou."}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono">
              {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={reset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reîncearcă
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                Panou principal
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
