/**
 * Mock bidding — 3 active bids from Ameropa, Cargill, Bunge.
 * Prices: realistic spring 2026 wheat market RON/t.
 * Local market reference: ~1.200 RON/t for B1 wheat in Iași region.
 */
import type { Bid } from "@/types/cooperative";

const BIDS: Bid[] = [
  {
    id: "BID-001",
    buyer_name: "Ameropa Grains SA",
    price_per_ton: 1285,
    local_market_price: 1200,
    advantage_ron: 85,
    volume_tons: 2850,
    deadline: "2026-04-10",
    status: "active",
    delivery_location: "Silo Ameropa — Port Constanța",
    payment_terms: "Plată la 14 zile de la livrare",
  },
  {
    id: "BID-002",
    buyer_name: "Cargill România SRL",
    price_per_ton: 1260,
    local_market_price: 1200,
    advantage_ron: 60,
    volume_tons: 2000,
    deadline: "2026-04-12",
    status: "active",
    delivery_location: "Silo Cargill — Buzău",
    payment_terms: "Plată la 7 zile de la livrare",
  },
  {
    id: "BID-003",
    buyer_name: "Bunge România SRL",
    price_per_ton: 1310,
    local_market_price: 1200,
    advantage_ron: 110,
    volume_tons: 1500,
    deadline: "2026-04-15",
    status: "active",
    delivery_location: "Silo Bunge — Giurgiu",
    payment_terms: "Plată la 21 zile de la livrare, avans 30%",
  },
];

export const mockBidding = {
  list: () => BIDS,
  getActive: () => BIDS.filter((b) => b.status === "active"),
  getById: (id: string) => BIDS.find((b) => b.id === id) ?? null,
};
