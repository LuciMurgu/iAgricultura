/**
 * Mock arendă (lease) contracts — 6+ leases with varied payment types.
 * Real village names near Iași. Realistic 7-year terms.
 */
import type { LeaseContract } from "@/types/arenda";

const LEASES: LeaseContract[] = [
  {
    id: "L-01",
    owner_name: "Ion Munteanu",
    area_ha: 45,
    location: "Copou Nord",
    commune: "Iași",
    start_date: "2019-10-01",
    end_date: "2026-05-20",
    duration_years: 7,
    payment_type: "fixed_crop",
    payment_description: "600 kg/ha grâu",
    status: "expiring",
    days_remaining: 45,
    annual_cost_ron: 32400,
  },
  {
    id: "L-02",
    owner_name: "Maria Vasilescu",
    area_ha: 62,
    location: "Bârnova",
    commune: "Bârnova",
    start_date: "2022-03-15",
    end_date: "2029-03-15",
    duration_years: 7,
    payment_type: "mixed",
    payment_description: "500 kg/ha grâu + 200 RON/ha",
    status: "active",
    days_remaining: null,
    annual_cost_ron: 49600,
  },
  {
    id: "L-03",
    owner_name: "Gheorghe Rusu",
    area_ha: 28,
    location: "Tomești Sud",
    commune: "Tomești",
    start_date: "2023-01-01",
    end_date: "2030-01-01",
    duration_years: 7,
    payment_type: "fixed_crop",
    payment_description: "700 kg/ha grâu",
    status: "active",
    days_remaining: null,
    annual_cost_ron: 23520,
  },
  {
    id: "L-04",
    owner_name: "Elena Mihalache",
    area_ha: 38,
    location: "Rediu",
    commune: "Rediu",
    start_date: "2020-10-01",
    end_date: "2027-10-01",
    duration_years: 7,
    payment_type: "cash",
    payment_description: "850 RON/ha",
    status: "active",
    days_remaining: null,
    annual_cost_ron: 32300,
  },
  {
    id: "L-05",
    owner_name: "Constantin Popa",
    area_ha: 55,
    location: "Ciurea Est",
    commune: "Ciurea",
    start_date: "2021-04-01",
    end_date: "2028-04-01",
    duration_years: 7,
    payment_type: "mixed",
    payment_description: "400 kg/ha grâu + 350 RON/ha",
    status: "active",
    days_remaining: null,
    annual_cost_ron: 45650,
  },
  {
    id: "L-06",
    owner_name: "Vasile Dumitru",
    area_ha: 72,
    location: "Miroslava",
    commune: "Miroslava",
    start_date: "2019-09-01",
    end_date: "2026-06-15",
    duration_years: 7,
    payment_type: "fixed_crop",
    payment_description: "650 kg/ha grâu",
    status: "expiring",
    days_remaining: 71,
    annual_cost_ron: 56160,
  },
];

export const mockArenda = {
  list: () =>
    [...LEASES].sort((a, b) => {
      // Expiring first
      if (a.status === "expiring" && b.status !== "expiring") return -1;
      if (a.status !== "expiring" && b.status === "expiring") return 1;
      return (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999);
    }),
  getById: (id: string) => LEASES.find((l) => l.id === id) ?? null,
};
