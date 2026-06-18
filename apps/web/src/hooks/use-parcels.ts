"use client";

/**
 * Hook: useParcels — fetches parcel data from mock.
 * Gate: parcels (MOCK — no backend endpoint yet).
 */
import { useQuery } from "@tanstack/react-query";
import { mockParcels } from "@/lib/mock/data/parcels";
import { ParcelListSchema } from "@/types/parcels";
import type { Parcel } from "@/types/parcels";

export function useParcels() {
  return useQuery<Parcel[]>({
    queryKey: ["parcels"],
    queryFn: async () => {
      const raw = mockParcels.list();
      return ParcelListSchema.parse(raw);
    },
    staleTime: 5 * 60 * 1000, // 5 min — satellite data is low-volatility
  });
}
