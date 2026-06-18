/**
 * Mock cooperative — 1 active cluster, 8 farmers near Iași.
 * Gate: MOCK. Product: wheat quality B1.
 */
import type { Cluster } from "@/types/cooperative";

const CLUSTERS: Cluster[] = [
  {
    id: "CL-001",
    name: "Iași Nord-Est — Grâu calitate B1",
    crop: "Grâu de toamnă",
    quality_grade: "B1",
    total_tons: 2850,
    farmer_count: 8,
    your_tons: 380,
    your_percentage: 13.3,
    status: "active",
    farmers: [
      { id: "F-01", name: "Ferma Munteanu (dvs.)", commune: "Iași", area_ha: 300, crop: "Grâu de toamnă", estimated_tons: 380 },
      { id: "F-02", name: "Ferma Popescu", commune: "Bârnova", area_ha: 220, crop: "Grâu de toamnă", estimated_tons: 420 },
      { id: "F-03", name: "Ferma Ionescu", commune: "Rediu", area_ha: 180, crop: "Grâu de toamnă", estimated_tons: 340 },
      { id: "F-04", name: "Ferma Georgescu", commune: "Tomești", area_ha: 250, crop: "Grâu de toamnă", estimated_tons: 380 },
      { id: "F-05", name: "Ferma Dumitrescu", commune: "Ciurea", area_ha: 150, crop: "Grâu de toamnă", estimated_tons: 290 },
      { id: "F-06", name: "Ferma Popa", commune: "Miroslava", area_ha: 280, crop: "Grâu de toamnă", estimated_tons: 410 },
      { id: "F-07", name: "Ferma Radu", commune: "Aroneanu", area_ha: 190, crop: "Grâu de toamnă", estimated_tons: 320 },
      { id: "F-08", name: "Ferma Stan", commune: "Leţcani", area_ha: 160, crop: "Grâu de toamnă", estimated_tons: 310 },
    ],
    active_bids: [], // Bids are in bidding.ts
  },
];

export const mockCooperative = {
  list: () => CLUSTERS,
  getById: (id: string) => CLUSTERS.find((c) => c.id === id) ?? null,
};
