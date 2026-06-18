/**
 * Mock carbon credit eligibility — 3 parcels with different status.
 */
import type { CarbonParcel } from "@/types/carbon";

const CARBON_PARCELS: CarbonParcel[] = [
  {
    parcel_id: "P-01",
    parcel_name: "Parcela Copou Nord",
    area_ha: 45,
    eligible: true,
    practice: "No-till + cultură de acoperire",
    estimated_credits: 18,
    estimated_value_eur: 540,
    verification_status: "verified",
    notes: "Practică no-till confirmată prin imagini satelitare și declarație APIA.",
  },
  {
    parcel_id: "P-03",
    parcel_name: "Parcela Tomești Sud",
    area_ha: 28,
    eligible: true,
    practice: "Rotație diversificată + green manure",
    estimated_credits: 8.4,
    estimated_value_eur: 252,
    verification_status: "pending",
    notes: "Se așteaptă verificarea documentelor de rotație a culturilor.",
  },
  {
    parcel_id: "P-06",
    parcel_name: "Parcela Miroslava",
    area_ha: 72,
    eligible: false,
    practice: "Lucrare convențională",
    estimated_credits: 0,
    estimated_value_eur: 0,
    verification_status: "rejected",
    notes: "Parcela utilizează lucrare convențională. Necesită tranziție la minimum-tillage pentru eligibilitate.",
  },
];

export const mockCarbon = {
  list: () => CARBON_PARCELS,
  getByParcelId: (parcelId: string) =>
    CARBON_PARCELS.find((c) => c.parcel_id === parcelId) ?? null,
};
