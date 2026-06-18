"use client";

/**
 * Hook: useInvoices — fetches invoice list from real API or mock data.
 * Gate: invoices (REAL — falls back to mock if backend returns empty or errors).
 */
import { useQuery } from "@tanstack/react-query";
import { isFeatureReal } from "@/lib/mock/feature-gates";
import { mockInvoices } from "@/lib/mock/data/invoices";
import { apiClient } from "@/lib/api/client";
import { InvoiceListResponseSchema } from "@/types/invoices";
import type { InvoiceListResponse } from "@/types/invoices";

interface InvoiceQueryParams {
  status?: string;
  page?: number;
  page_size?: number;
}

export function useInvoices(params: InvoiceQueryParams = {}) {
  const gate = isFeatureReal("invoices");

  return useQuery<InvoiceListResponse>({
    queryKey: ["invoices", params],
    queryFn: async () => {
      if (gate) {
        try {
          const response = await apiClient.get<unknown>("/api/v1/invoices", {
            params: {
              ...(params.status && params.status !== "all" ? { status: params.status } : {}),
              ...(params.page ? { page: params.page } : {}),
              ...(params.page_size ? { page_size: params.page_size } : {}),
            },
          });
          const parsed = InvoiceListResponseSchema.parse(response.data);
          // If real API returns data, use it; if empty, fall through to mock
          if (parsed.items.length > 0 || parsed.total === 0) {
            return parsed;
          }
        } catch {
          // Fall through to mock on error
        }
      }
      const raw = mockInvoices.list(params);
      return InvoiceListResponseSchema.parse(raw);
    },
    staleTime: 30 * 1000, // 30s — invoices change frequently
  });
}
