/**
 * Farmer Pilot Readiness — pure deterministic logic.
 * FOP18 — builds readiness summary from context, setup, navigation state.
 */
import type {
  FarmerPilotArea,
  FarmerPilotReadinessStatus,
  FarmerPilotReadinessCheck,
  FarmerPilotReadinessSummary,
} from "@/types/farmer-pilot-readiness";
import { FARMER_PILOT_DISCLAIMER } from "@/types/farmer-pilot-readiness";
import { assertSafeLanguage } from "@/lib/safe-language";

// ── Label helpers ────────────────────────────────────────────────────

const STATUS_LABELS: Record<FarmerPilotReadinessStatus, string> = {
  ready_for_farmer_demo: "Pregătit pentru demo fermier",
  ready_with_minor_gaps: "Pregătit cu lacune minore",
  not_ready_missing_core_flow: "Nepregătit — flux de bază lipsă",
  not_ready_route_errors: "Nepregătit — erori de rute",
  demo_only: "Doar demo",
};
export function getFarmerPilotReadinessStatusLabel(s: FarmerPilotReadinessStatus): string {
  return STATUS_LABELS[s] ?? s;
}

const AREA_LABELS: Record<FarmerPilotArea, string> = {
  home: "Acasă", setup: "Configurare", context: "Context fermă",
  ask_agrounu: "Întreabă AgroUnu", funding: "Finanțare",
  buy_better: "Cumpără mai bine", sell_better: "Vinde mai bine",
  fields: "Câmpuri", documents: "Documente", trust: "Încredere",
  mobile: "Mobil", safety_language: "Limbaj sigur",
  demo_state: "Stare demo", route_integrity: "Integritate rute",
};
export function getFarmerPilotAreaLabel(a: FarmerPilotArea): string {
  return AREA_LABELS[a] ?? a;
}

// ── Safe language for pilot readiness ────────────────────────────────

export function assertFarmerPilotReadinessSafeLanguage(text: string) {
  return assertSafeLanguage(text);
}

// ── Core pilot routes ────────────────────────────────────────────────

interface PilotRouteConfig {
  id: string;
  area: FarmerPilotArea;
  href: string;
  title: string;
  isCorePilot: boolean;
}

const PILOT_ROUTES: PilotRouteConfig[] = [
  { id: "r-home", area: "home", href: "/dashboard", title: "Panou principal", isCorePilot: true },
  { id: "r-setup", area: "setup", href: "/setup", title: "Configurare fermă", isCorePilot: true },
  { id: "r-ask", area: "ask_agrounu", href: "/ask", title: "Întreabă AgroUnu", isCorePilot: true },
  { id: "r-invoices", area: "buy_better", href: "/invoices", title: "Facturi / Cumpără", isCorePilot: true },
  { id: "r-parcels", area: "fields", href: "/parcels", title: "Parcele / Câmpuri", isCorePilot: true },
  { id: "r-coop", area: "sell_better", href: "/cooperative", title: "Cooperativă / Vinde", isCorePilot: true },
  { id: "r-more", area: "route_integrity", href: "/more", title: "Mai mult", isCorePilot: false },
  { id: "r-coop-int", area: "sell_better", href: "/cooperative-intelligence", title: "Inteligență cooperativă", isCorePilot: false },
  { id: "r-stock", area: "buy_better", href: "/stock", title: "Stoc", isCorePilot: false },
  { id: "r-alerts", area: "buy_better", href: "/alerts", title: "Alerte", isCorePilot: false },
  { id: "r-arenda", area: "fields", href: "/arenda", title: "Arendă", isCorePilot: false },
  { id: "r-saga", area: "documents", href: "/saga-export", title: "Export SAGA", isCorePilot: false },
  { id: "r-settings", area: "trust", href: "/settings", title: "Setări", isCorePilot: false },
];

// ── Readiness checks builder ─────────────────────────────────────────

export interface PilotReadinessInput {
  /** Available route hrefs in the app (if known). */
  availableRoutes?: string[];
  /** Setup wizard summary if available. */
  setupMinimumContextReady?: boolean;
  setupCompletionPercent?: number;
  /** Outcome navigation available. */
  outcomeNavigationAvailable?: boolean;
  /** Guided copilot shell available. */
  guidedCopilotAvailable?: boolean;
  /** Sample farmer-facing text for safe-language check. */
  sampleTexts?: string[];
  /** Mobile bottom nav item count. */
  mobileNavItemCount?: number;
  /** Demo state is resettable. */
  demoStateResettable?: boolean;
}

export function buildPilotReadinessChecks(input: PilotReadinessInput): FarmerPilotReadinessCheck[] {
  const checks: FarmerPilotReadinessCheck[] = [];
  const routes = input.availableRoutes ?? PILOT_ROUTES.map((r) => r.href);

  // Route integrity checks
  for (const r of PILOT_ROUTES) {
    const available = routes.includes(r.href);
    if (r.isCorePilot) {
      checks.push({
        id: `chk-${r.id}`, area: r.area, title: `Rută pilot: ${r.title}`,
        status: available ? "pass" : "fail",
        explanation: available ? `${r.href} disponibilă.` : `${r.href} lipsă — flux de bază afectat.`,
        safeNextStep: available ? "Nicio acțiune necesară." : `Verifică ruta ${r.href}.`,
        relatedHref: r.href,
      });
    } else {
      checks.push({
        id: `chk-${r.id}`, area: r.area, title: `Rută secundară: ${r.title}`,
        status: available ? "pass" : "warning",
        explanation: available ? `${r.href} disponibilă.` : `${r.href} lipsă — rută secundară.`,
        safeNextStep: available ? "Nicio acțiune necesară." : `Opțional: adaugă ${r.href}.`,
        relatedHref: r.href,
      });
    }
  }

  // Setup readiness
  checks.push({
    id: "chk-setup-ctx", area: "setup", title: "Context minim util",
    status: input.setupMinimumContextReady ? "pass" : "warning",
    explanation: input.setupMinimumContextReady
      ? "Contextul minim util este pregătit."
      : `Configurare ${input.setupCompletionPercent ?? 0}% completă — fermierul va vedea date lipsă.`,
    safeNextStep: input.setupMinimumContextReady
      ? "Nicio acțiune necesară."
      : "Completează configurarea înainte de demo.",
    relatedHref: "/setup",
  });

  // Outcome navigation
  checks.push({
    id: "chk-outcome-nav", area: "home", title: "Navigare pe rezultate",
    status: input.outcomeNavigationAvailable !== false ? "pass" : "warning",
    explanation: input.outcomeNavigationAvailable !== false
      ? "Navigarea pe rezultate este activă."
      : "Navigarea pe rezultate nu este confirmată.",
    safeNextStep: "Verifică sidebar și mobile nav.",
  });

  // Guided copilot
  checks.push({
    id: "chk-copilot", area: "ask_agrounu", title: "Copilot ghidat",
    status: input.guidedCopilotAvailable !== false ? "pass" : "warning",
    explanation: input.guidedCopilotAvailable !== false
      ? "Copilotul ghidat este disponibil."
      : "Copilotul ghidat nu este confirmat.",
    safeNextStep: "Verifică /ask.",
    relatedHref: "/ask",
  });

  // Safe language
  const sampleText = (input.sampleTexts ?? []).join(" ");
  if (sampleText.length > 0) {
    const langCheck = assertSafeLanguage(sampleText);
    checks.push({
      id: "chk-safe-lang", area: "safety_language", title: "Limbaj sigur în texte pilot",
      status: langCheck.safe ? "pass" : "fail",
      explanation: langCheck.safe
        ? "Nicio expresie nesigură detectată."
        : `Expresii nesigure: ${langCheck.violations.slice(0, 5).join(", ")}.`,
      safeNextStep: langCheck.safe
        ? "Nicio acțiune necesară."
        : "Corectează expresiile nesigure.",
    });
  } else {
    checks.push({
      id: "chk-safe-lang", area: "safety_language", title: "Limbaj sigur în texte pilot",
      status: "pass",
      explanation: "Verificarea se face prin teste unitare.",
      safeNextStep: "Rulează testele de limbaj sigur.",
    });
  }

  // Mobile
  const navCount = input.mobileNavItemCount ?? 5;
  checks.push({
    id: "chk-mobile-nav", area: "mobile", title: "Navigare mobilă (max 5 itemi)",
    status: navCount <= 5 ? "pass" : "fail",
    explanation: navCount <= 5
      ? `Navigare mobilă: ${navCount} itemi.`
      : `Navigare mobilă: ${navCount} itemi — maxim 5.`,
    safeNextStep: navCount <= 5 ? "Nicio acțiune necesară." : "Reduce itemii de navigare mobilă.",
  });

  // Demo state
  checks.push({
    id: "chk-demo-state", area: "demo_state", title: "Stare demo resetabilă",
    status: input.demoStateResettable !== false ? "pass" : "warning",
    explanation: input.demoStateResettable !== false
      ? "Starea demo poate fi resetată."
      : "Resetarea stării demo nu este confirmată.",
    safeNextStep: "Verifică butonul de resetare pe /setup.",
    relatedHref: "/setup",
  });

  return checks;
}

// ── Status calculator ────────────────────────────────────────────────

export function calculateFarmerPilotReadinessStatus(
  checks: FarmerPilotReadinessCheck[],
): FarmerPilotReadinessStatus {
  const fails = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const coreRouteFails = checks.filter(
    (c) => c.status === "fail" && PILOT_ROUTES.some((r) => `chk-${r.id}` === c.id && r.isCorePilot),
  ).length;

  if (coreRouteFails > 0) return "not_ready_missing_core_flow";
  if (fails > 0) return "not_ready_route_errors";
  if (warnings > 0) return "ready_with_minor_gaps";
  return "ready_for_farmer_demo";
}

// ── Sorting ──────────────────────────────────────────────────────────

const STATUS_ORDER: Record<string, number> = { fail: 0, warning: 1, pass: 2, not_applicable: 3 };

export function sortFarmerPilotReadinessChecks(
  checks: FarmerPilotReadinessCheck[],
): FarmerPilotReadinessCheck[] {
  return [...checks].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
}

// ── Summary builder ──────────────────────────────────────────────────

export function buildFarmerPilotReadinessSummary(
  input: PilotReadinessInput,
): FarmerPilotReadinessSummary {
  const checks = buildPilotReadinessChecks(input);
  const status = calculateFarmerPilotReadinessStatus(checks);
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return {
    status,
    checkCount: checks.length,
    passCount,
    warningCount,
    failCount,
    corePilotPathReady: checks
      .filter((c) => PILOT_ROUTES.some((r) => `chk-${r.id}` === c.id && r.isCorePilot))
      .every((c) => c.status === "pass"),
    mobilePilotReady: checks.find((c) => c.id === "chk-mobile-nav")?.status === "pass",
    safeLanguageReady: checks.find((c) => c.id === "chk-safe-lang")?.status === "pass",
    demoStateReady: checks.find((c) => c.id === "chk-demo-state")?.status === "pass",
    checks,
    disclaimer: FARMER_PILOT_DISCLAIMER,
  };
}
