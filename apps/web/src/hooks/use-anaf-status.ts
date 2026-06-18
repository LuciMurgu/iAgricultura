/**
 * React Query hook for ANAF SPV status.
 *
 * Rules:
 * - Never throws — returns null if backend fails or farm_id is unavailable
 * - Refreshes every 5 minutes (status is low-volatility)
 * - No retry on failure (avoids hammering a broken ANAF service)
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { anafService } from "@/lib/api/services/anaf";
import { useAuthStore } from "@/hooks/use-auth";
import type { AnafStatus } from "@/types/anaf";

export function useAnafStatus(): AnafStatus | null {
  const farmId = useAuthStore((s) => s.user?.farm_id);

  const { data } = useQuery({
    queryKey: ["anaf-status", farmId],
    queryFn: () => anafService.getStatus(farmId!),
    enabled: !!farmId,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
    // Return null on error rather than throwing
    throwOnError: false,
  });

  return data ?? null;
}
