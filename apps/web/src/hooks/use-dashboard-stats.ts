"use client";

/**
 * Hook: useDashboardStats — combines mock data from various sources
 * into the dashboard stat cards.
 */
import { useQuery } from "@tanstack/react-query";
import { mockInvoices } from "@/lib/mock/data/invoices";
import { mockAlerts } from "@/lib/mock/data/alerts";
import { mockStock } from "@/lib/mock/data/stock";
import { mockBidding } from "@/lib/mock/data/bidding";
import type { DashboardStats } from "@/types/dashboard";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Aggregate from mock data (will be replaced by real endpoint)
      const invoices = mockInvoices.list();
      const alerts = mockAlerts.list();
      const stock = mockStock.list();
      const bids = mockBidding.getActive();

      const invoiceTotal = invoices.items.reduce(
        (sum, inv) => sum + (inv.total_amount ?? 0),
        0,
      );

      const stockValue = stock.balances.reduce(
        (sum, item) => sum + (item.value_ron ?? 0),
        0,
      );

      const criticalAlerts = alerts.items.filter(
        (a) => a.severity === "urgent",
      ).length;

      // Best bid advantage
      const _bestBid = bids.reduce(
        (best, bid) =>
          bid.advantage_ron > best.advantage_ron ? bid : best,
        bids[0],
      );

      return {
        invoice_count: invoices.total,
        invoice_total_ron: invoiceTotal,
        alert_count: alerts.total,
        critical_alert_count: criticalAlerts,
        stock_value_ron: stockValue,
        pending_review_count: invoices.items.filter(
          (i) => i.status === "needs_review",
        ).length,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
