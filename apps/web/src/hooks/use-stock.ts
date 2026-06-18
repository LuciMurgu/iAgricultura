"use client";

/**
 * Hook: useStock — fetches stock overview from real API or mock data.
 * Gate: stock (REAL — falls back to mock if backend unreachable).
 */
import { useQuery } from "@tanstack/react-query";
import { mockStock } from "@/lib/mock/data/stock";
import type { StockItem } from "@/types/stock";

// TODO: import { stockService } from "@/lib/api/services/stock";

export function useStock() {
  return useQuery<StockItem[]>({
    queryKey: ["stock"],
    queryFn: async () => {
      // TODO: when backend REAL, fetch from stockService
      const data = mockStock.list();
      return data.balances;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
