"use client";

/**
 * Global error boundary — catches React rendering errors.
 * Shows a friendly recovery UI instead of a white screen.
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Ceva nu a funcționat
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            A apărut o eroare neașteptată. Echipa noastră a fost notificată.
            Încercați din nou sau reveniți la pagina principală.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono">
              Cod eroare: {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={reset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Încearcă din nou
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard")} className="gap-2">
              Panou principal
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
