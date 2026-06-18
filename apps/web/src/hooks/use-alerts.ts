"use client";

/**
 * Hook: useAlerts — fetches alerts from real API or mock data.
 * Gate: alerts (REAL — falls back to mock if backend unreachable).
 */
import { useQuery } from "@tanstack/react-query";
import { mockAlerts } from "@/lib/mock/data/alerts";
import { AlertListResponseSchema } from "@/types/alerts";
import type { AlertListResponse } from "@/types/alerts";

// TODO: import { alertService } from "@/lib/api/services/alerts";

export function useAlerts() {
  return useQuery<AlertListResponse>({
    queryKey: ["alerts"],
    queryFn: async () => {
      // TODO: when backend REAL, fetch from alertService
      const raw = mockAlerts.list();
      return AlertListResponseSchema.parse(raw);
    },
    staleTime: 30 * 1000, // 30s — alerts are time-sensitive
  });
}
