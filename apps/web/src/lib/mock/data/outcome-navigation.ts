/**
 * Mock outcome navigation — demo data adapter.
 * Gate: MOCK. Builds OutcomeNavigationSummary from existing mock data.
 */
import type { OutcomeNavigationSummary } from "@/types/outcome-navigation";
import {
  buildFarmerOutcomeRouteGroups,
  buildOutcomeGuidanceCards,
  buildGuidedCopilotShellSummary,
  buildOutcomeNavigationSummary,
} from "@/lib/outcome-navigation";

function buildDemoSummary(): OutcomeNavigationSummary {
  const ctx = {
    existingRoutes: [
      "/dashboard", "/invoices", "/stock", "/alerts", "/saga-export",
      "/parcels", "/arenda", "/cooperative", "/cooperative-intelligence",
      "/settings", "/ask", "/more",
    ],
  };
  const routeGroups = buildFarmerOutcomeRouteGroups(ctx);
  const guidanceCards = buildOutcomeGuidanceCards(ctx);
  const copilotShell = buildGuidedCopilotShellSummary(ctx);
  return buildOutcomeNavigationSummary({ routeGroups, guidanceCards, copilotShell });
}

let _cached: OutcomeNavigationSummary | null = null;

export const mockOutcomeNavigation = {
  getSummary: (): OutcomeNavigationSummary => {
    if (!_cached) _cached = buildDemoSummary();
    return _cached;
  },
  getRouteGroups: () => buildFarmerOutcomeRouteGroups({}),
  getGuidanceCards: () => buildOutcomeGuidanceCards({}),
  getCopilotShell: () => buildGuidedCopilotShellSummary({}),
};
