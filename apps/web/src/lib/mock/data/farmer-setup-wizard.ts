/**
 * Mock farmer setup wizard — demo data adapter.
 * Gate: MOCK. Builds FarmerSetupWizardSummary from existing mock data.
 */
import type { FarmerSetupWizardSummary } from "@/types/farmer-setup-wizard";
import { buildFarmerSetupWizardSummary } from "@/lib/farmer-setup-wizard";

function buildDemoSummary(): FarmerSetupWizardSummary {
  return buildFarmerSetupWizardSummary({});
}

let _cached: FarmerSetupWizardSummary | null = null;

export const mockFarmerSetupWizard = {
  getSummary: (): FarmerSetupWizardSummary => {
    if (!_cached) _cached = buildDemoSummary();
    return _cached;
  },
  getStepById: (id: string) => {
    const s = mockFarmerSetupWizard.getSummary();
    return s.steps.find((st) => st.id === id);
  },
  getPathById: (id: string) => {
    const s = mockFarmerSetupWizard.getSummary();
    return s.onboardingPaths.find((p) => p.id === id);
  },
  getMinimumUsefulContextRequirements: () => {
    const s = mockFarmerSetupWizard.getSummary();
    return s.requirements;
  },
};
