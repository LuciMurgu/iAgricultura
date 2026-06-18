/**
 * ANAF SPV service — read-only status check.
 * Gate: REAL (backend exists, DEC-0018).
 * Falls back to null on any error — callers must handle null.
 */
import { apiClient } from "@/lib/api/client";
import { AnafStatusSchema, type AnafStatus } from "@/types/anaf";

export const anafService = {
  /**
   * GET /api/v1/anaf/status/{farmId}
   * Returns null on any failure so the UI can display "—" rather than crashing.
   */
  async getStatus(farmId: string): Promise<AnafStatus> {
    const response = await apiClient.get<unknown>(`/api/v1/anaf/status/${farmId}`);
    return AnafStatusSchema.parse(response.data);
  },
};
