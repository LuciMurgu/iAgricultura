import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Design token smoke test */}
        <div className="space-y-2">
          <div className="h-8 w-full rounded bg-brand-700" />
          <div className="h-4 w-full rounded bg-brand-200" />
          <div className="grid grid-cols-5 gap-1">
            <div className="h-6 rounded bg-status-synced" />
            <div className="h-6 rounded bg-status-review" />
            <div className="h-6 rounded bg-status-blocked" />
            <div className="h-6 rounded bg-status-exported" />
            <div className="h-6 rounded bg-status-pending" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground">Farm Copilot</h1>
        <p className="text-muted-foreground font-sans">
          Asistent de achiziții și inteligență de marjă pentru ferme din România.
        </p>
        <p className="text-xs font-mono text-muted-foreground">
          IBM Plex Mono · design tokens OK
        </p>

        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Autentificare
        </Link>
      </div>
    </main>
  );
}
