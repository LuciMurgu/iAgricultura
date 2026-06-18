/**
 * Feature Gate Registry — Farm Copilot
 *
 * Controls whether data comes from the real FastAPI backend
 * or from a local mock data file.
 *
 * To promote a MOCK feature to REAL:
 * 1. Verify backend endpoint is deployed and returning data
 * 2. Validate Zod schema against real API response
 * 3. Update the service function in lib/api/services/
 * 4. Flip isReal: false → true here
 * 5. Commit with "GATE FLIP: {feature}" in message
 *
 * Sources:
 *   - REAL endpoints: /api/v1/ on NEXT_PUBLIC_API_URL
 *   - MOCK sources: lib/mock/data/{feature}.ts
 */

export const FEATURE_GATES = {
  /** POST /api/v1/auth/login */
  auth: { isReal: true },

  /**
   * GET /api/v1/dashboard/feed (partial — some real, some mock).
   * Keep isReal: false until the full feed endpoint is complete.
   */
  actionFeed: { isReal: false },

  /** GET /api/v1/invoices — hook calls the real API, mock only as fallback. */
  invoices: { isReal: true },

  /**
   * GET /api/v1/invoices/:id — detail rail is still mock-backed.
   * Flip to true once invoice-right-rail.tsx fetches from the API.
   */
  invoiceDetail: { isReal: false },

  /**
   * GET /api/v1/stock — hook (use-stock.ts) still returns mock only.
   * Flip to true once a stock service is wired.
   */
  stock: { isReal: false },

  /**
   * GET /api/v1/alerts — hook (use-alerts.ts) still returns mock only.
   * Flip to true once an alert service is wired.
   */
  alerts: { isReal: false },

  /** GET /api/v1/anaf/status */
  anafSync: { isReal: true },

  /**
   * POST /api/v1/export/saga — the export page currently simulates the call.
   * Flip to true once the bulk export endpoint is wired and downloads a file.
   */
  sagaExport: { isReal: false },

  // ── MOCKED (no backend yet) ──────────────────────────────────────

  /** Parcel map + satellite data — lib/mock/data/parcels.ts */
  parcels: { isReal: false },

  /** Virtual sensor readings (PINNs) — lib/mock/data/sensors.ts */
  sensors: { isReal: false },

  /** Cooperative clusters (DBSCAN) — lib/mock/data/cooperative.ts */
  cooperative: { isReal: false },

  /** Grain bidding offers — lib/mock/data/bidding.ts */
  bidding: { isReal: false },

  /** Lease contract manager — lib/mock/data/arenda.ts */
  arenda: { isReal: false },

  /** e-Transport UIT codes — lib/mock/data/e-transport.ts */
  eTransport: { isReal: false },

  /** Carbon credit eligibility — lib/mock/data/carbon.ts */
  carbon: { isReal: false },

  /** APIA evidence vault — lib/mock/data/apia-vault.ts */
  apiaVault: { isReal: false },

  /** Regional cooperative intelligence — lib/mock/data/regional-cooperative-intelligence.ts */
  regionalIntelligence: { isReal: false },

  /** Outcome navigation + guided copilot — lib/mock/data/outcome-navigation.ts */
  outcomeNavigation: { isReal: false },

  /** Farmer onboarding/setup wizard — lib/mock/data/farmer-setup-wizard.ts */
  farmerSetupWizard: { isReal: false },

  /** Farmer pilot readiness — lib/farmer-pilot-readiness.ts */
  farmerPilotReadiness: { isReal: false },
} as const;

export type FeatureGateKey = keyof typeof FEATURE_GATES;

/**
 * Returns whether a feature is backed by the real API.
 */
export function isFeatureReal(key: FeatureGateKey): boolean {
  return FEATURE_GATES[key].isReal;
}

/**
 * Returns whether a feature still shows demo/mock data, so the UI can render
 * a visible "Date demo" indicator. Inverse of isFeatureReal.
 */
export function isDemoData(key: FeatureGateKey): boolean {
  return !FEATURE_GATES[key].isReal;
}
