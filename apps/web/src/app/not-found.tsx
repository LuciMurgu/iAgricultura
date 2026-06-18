/**
 * Custom not-found page with navigation back to dashboard.
 */
import { Button } from "@/components/ui/button";
import { SearchX, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <SearchX className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          Pagina nu a fost găsită
        </h1>
        <p className="text-sm text-slate-500">
          Adresa accesată nu există sau a fost mutată.
        </p>
        <Button asChild className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Panou principal
          </Link>
        </Button>
      </div>
    </div>
  );
}
