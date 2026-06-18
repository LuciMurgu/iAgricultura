/**
 * Cooperative + Bidding Zod schemas.
 * Gate: MOCK — no backend endpoint yet.
 * Source: MOCK_STRATEGY.md + PROMPT_SEQUENCE.md Prompt 09
 */
import { z } from "zod";

// ── Farmer ────────────────────────────────────────────────────────────

export const FarmerSchema = z.object({
  id: z.string(),
  name: z.string(),
  commune: z.string(),
  area_ha: z.number(),
  crop: z.string(),
  estimated_tons: z.number(),
});
export type Farmer = z.infer<typeof FarmerSchema>;

// ── Bid ───────────────────────────────────────────────────────────────

export const BidSchema = z.object({
  id: z.string(),
  buyer_name: z.string(),
  price_per_ton: z.number(),
  local_market_price: z.number(),
  advantage_ron: z.number(),
  volume_tons: z.number(),
  deadline: z.string(),
  status: z.enum(["active", "accepted", "expired", "rejected"]),
  delivery_location: z.string(),
  payment_terms: z.string(),
});
export type Bid = z.infer<typeof BidSchema>;

// ── Cluster ───────────────────────────────────────────────────────────

export const ClusterSchema = z.object({
  id: z.string(),
  name: z.string(),
  crop: z.string(),
  quality_grade: z.string(),
  total_tons: z.number(),
  farmer_count: z.number().int(),
  your_tons: z.number(),
  your_percentage: z.number(),
  farmers: z.array(FarmerSchema),
  active_bids: z.array(BidSchema),
  status: z.enum(["forming", "active", "closed"]),
});
export type Cluster = z.infer<typeof ClusterSchema>;
