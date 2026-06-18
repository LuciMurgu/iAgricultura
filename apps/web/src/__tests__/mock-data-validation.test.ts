/**
 * Zod schema validation tests — ensures every mock data file
 * validates against its corresponding Zod schema.
 *
 * Prompt 04 done-when criterion:
 * "All Zod schemas validate their corresponding mock data (write a test)"
 */
import { describe, it, expect } from "vitest";

import { InvoiceListResponseSchema, InvoiceListItemSchema } from "@/types/invoices";
import { AlertSchema, AlertListResponseSchema } from "@/types/alerts";
import { StockItemSchema, StockOverviewResponseSchema, StockBalanceSchema } from "@/types/stock";
import { DashboardStatsSchema, ActionFeedItemSchema } from "@/types/dashboard";
import { ParcelSchema, ParcelListSchema } from "@/types/parcels";
import { ClusterSchema, BidSchema } from "@/types/cooperative";
import { LeaseContractSchema } from "@/types/arenda";
import { ETransportDeclarationSchema } from "@/types/e-transport";
import { CarbonParcelSchema } from "@/types/carbon";
import { ApiaChecklistItemSchema } from "@/types/apia-vault";

import { mockInvoices } from "@/lib/mock/data/invoices";
import { mockAlerts } from "@/lib/mock/data/alerts";
import { mockStock } from "@/lib/mock/data/stock";
import { mockActionFeed } from "@/lib/mock/data/action-feed";
import { mockParcels } from "@/lib/mock/data/parcels";
import { mockCooperative } from "@/lib/mock/data/cooperative";
import { mockBidding } from "@/lib/mock/data/bidding";
import { mockArenda } from "@/lib/mock/data/arenda";
import { mockETransport } from "@/lib/mock/data/e-transport";
import { mockCarbon } from "@/lib/mock/data/carbon";
import { mockApiaVault } from "@/lib/mock/data/apia-vault";

// ── Invoices ─────────────────────────────────────────────────────────

describe("Invoice schemas", () => {
  it("validates invoice list response", () => {
    const data = mockInvoices.list();
    const result = InvoiceListResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates each invoice individually", () => {
    const data = mockInvoices.list();
    for (const invoice of data.items) {
      const result = InvoiceListItemSchema.safeParse(invoice);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 15 invoices", () => {
    expect(mockInvoices.list().items.length).toBeGreaterThanOrEqual(15);
  });
});

// ── Alerts ───────────────────────────────────────────────────────────

describe("Alert schemas", () => {
  it("validates alert list response", () => {
    const data = mockAlerts.list();
    const result = AlertListResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates each alert individually", () => {
    const data = mockAlerts.list();
    for (const alert of data.items) {
      const result = AlertSchema.safeParse(alert);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 8 alerts", () => {
    expect(mockAlerts.list().items.length).toBeGreaterThanOrEqual(8);
  });
});

// ── Stock ────────────────────────────────────────────────────────────

describe("Stock schemas", () => {
  it("validates stock overview response", () => {
    const data = mockStock.list();
    const result = StockOverviewResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates each stock item with extended fields", () => {
    const data = mockStock.list();
    for (const item of data.balances) {
      const result = StockItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    }
  });

  it("validates stock items as base balance schema too", () => {
    const data = mockStock.list();
    for (const item of data.balances) {
      const result = StockBalanceSchema.safeParse(item);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 10 items", () => {
    expect(mockStock.list().balances.length).toBeGreaterThanOrEqual(10);
  });
});

// ── Dashboard / Action Feed ──────────────────────────────────────────

describe("Action feed schemas", () => {
  it("validates each feed item", () => {
    const items = mockActionFeed.list();
    for (const item of items) {
      const result = ActionFeedItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 10 items", () => {
    expect(mockActionFeed.list().length).toBeGreaterThanOrEqual(10);
  });
});

// ── Parcels ──────────────────────────────────────────────────────────

describe("Parcel schemas", () => {
  it("validates parcel list", () => {
    const data = mockParcels.list();
    const result = ParcelListSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates each parcel individually", () => {
    for (const parcel of mockParcels.list()) {
      const result = ParcelSchema.safeParse(parcel);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 6 parcels", () => {
    expect(mockParcels.list().length).toBeGreaterThanOrEqual(6);
  });

  it("each parcel has sensors", () => {
    for (const parcel of mockParcels.list()) {
      expect(parcel.sensors.length).toBeGreaterThan(0);
    }
  });
});

// ── Cooperative ──────────────────────────────────────────────────────

describe("Cooperative schemas", () => {
  it("validates each cluster", () => {
    for (const cluster of mockCooperative.list()) {
      const result = ClusterSchema.safeParse(cluster);
      expect(result.success).toBe(true);
    }
  });

  it("cluster has at least 8 farmers", () => {
    const cluster = mockCooperative.list()[0];
    expect(cluster.farmers.length).toBeGreaterThanOrEqual(8);
  });
});

// ── Bidding ──────────────────────────────────────────────────────────

describe("Bidding schemas", () => {
  it("validates each bid", () => {
    for (const bid of mockBidding.list()) {
      const result = BidSchema.safeParse(bid);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 3 bids", () => {
    expect(mockBidding.list().length).toBeGreaterThanOrEqual(3);
  });
});

// ── Arendă ───────────────────────────────────────────────────────────

describe("Arendă (lease) schemas", () => {
  it("validates each lease contract", () => {
    for (const lease of mockArenda.list()) {
      const result = LeaseContractSchema.safeParse(lease);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 6 leases", () => {
    expect(mockArenda.list().length).toBeGreaterThanOrEqual(6);
  });

  it("expiring leases sorted first", () => {
    const leases = mockArenda.list();
    const firstExpiring = leases.findIndex((l) => l.status === "expiring");
    const firstActive = leases.findIndex((l) => l.status === "active");
    if (firstExpiring >= 0 && firstActive >= 0) {
      expect(firstExpiring).toBeLessThan(firstActive);
    }
  });
});

// ── e-Transport ──────────────────────────────────────────────────────

describe("e-Transport schemas", () => {
  it("validates each declaration", () => {
    for (const decl of mockETransport.list()) {
      const result = ETransportDeclarationSchema.safeParse(decl);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 4 declarations", () => {
    expect(mockETransport.list().length).toBeGreaterThanOrEqual(4);
  });
});

// ── Carbon ───────────────────────────────────────────────────────────

describe("Carbon credit schemas", () => {
  it("validates each carbon parcel", () => {
    for (const c of mockCarbon.list()) {
      const result = CarbonParcelSchema.safeParse(c);
      expect(result.success).toBe(true);
    }
  });

  it("contains at least 3 parcels", () => {
    expect(mockCarbon.list().length).toBeGreaterThanOrEqual(3);
  });
});

// ── APIA Vault ───────────────────────────────────────────────────────

describe("APIA Vault schemas", () => {
  it("validates vault structure", () => {
    const vault = mockApiaVault.get();
    expect(vault.checklist.length).toBeGreaterThan(0);
    for (const item of vault.checklist) {
      const result = ApiaChecklistItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    }
  });

  it("has partial completion", () => {
    const vault = mockApiaVault.get();
    expect(vault.completed_items).toBeLessThan(vault.total_items);
    expect(vault.completed_items).toBeGreaterThan(0);
  });
});
