/**
 * Mock alerts — 8+ alerts covering price, APIA, diesel, ANAF, lease, weather.
 * Source types: SPV, APIA, AI, e-Transport, Sistem.
 */
import type { Alert } from "@/types/alerts";

const ALERTS: Alert[] = [
  {
    id: "a0010001-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    alert_type: "suspicious_overpayment",
    severity: "urgent",
    title: "Suprapreț detectat — Roundup PowerMax",
    message: "Prețul de 70 RON/L este cu 42% peste media regională de 49,30 RON/L (ultimele 90 zile, 12 observații). Furnizor: Alcedo SRL.",
    confidence: 0.94,
    evidence: {
      your_price: 70.0,
      regional_median: 49.3,
      deviation_pct: 42.0,
      observation_count: 12,
      supplier: "Alcedo SRL",
    },
    created_at: "2026-03-18T14:20:00Z",
  },
  {
    id: "a0020002-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "d0e1f2a3-b4c5-6789-defa-890123456789",
    alert_type: "suspicious_overpayment",
    severity: "warning",
    title: "Preț motorină ridicat — OMV Petrom",
    message: "Prețul de 7,50 RON/L pentru motorină este cu 18% peste media curentă de 6,35 RON/L. Verificați dacă include transport.",
    confidence: 0.78,
    evidence: {
      your_price: 7.50,
      regional_median: 6.35,
      deviation_pct: 18.0,
      observation_count: 8,
      supplier: "OMV Petrom SA",
    },
    created_at: "2026-04-02T08:20:00Z",
  },
  {
    id: "a0030003-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "b4c5d6e7-f8a9-0123-bcde-234567890bcd",
    alert_type: "possible_duplicate",
    severity: "warning",
    title: "Posibilă factură duplicat — Syngenta",
    message: "Factura FCT-2026-001260 de la Syngenta România SRL are aceeași sumă (56.100 RON) și dată similară cu FCT-2026-001253. Verificați dacă este o achiziție separată.",
    confidence: 0.65,
    evidence: {
      this_invoice: "FCT-2026-001260",
      other_invoice: "FCT-2026-001253",
      same_supplier: true,
      same_amount: false,
      date_diff_days: 7,
    },
    created_at: "2026-04-04T15:25:00Z",
  },
  {
    id: "a0040004-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "e5f6a7b8-c9d0-1234-efab-345678901234",
    alert_type: "invoice_total_mismatch",
    severity: "urgent",
    title: "Diferență total factură — Agrii România",
    message: "Suma liniilor (33.840 RON) nu corespunde cu totalul declarat pe factură (34.560 RON). Diferență: 720 RON.",
    confidence: 1.0,
    evidence: {
      computed_total: 33840.0,
      declared_total: 34560.0,
      difference: 720.0,
    },
    created_at: "2026-03-25T09:25:00Z",
  },
  {
    id: "a0050005-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    alert_type: "suspicious_overpayment",
    severity: "info",
    title: "Preț erbicid peste medie — Alcedo",
    message: "Laudis OD la 170 RON/L — cu 12% peste media de 152 RON/L. Diferența este sub pragul de alertă dar merită monitorizată.",
    confidence: 0.55,
    evidence: {
      your_price: 170.0,
      regional_median: 152.0,
      deviation_pct: 12.0,
      observation_count: 5,
    },
    created_at: "2026-03-18T14:22:00Z",
  },
  {
    id: "a0060006-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "f2a3b4c5-d6e7-8901-fabc-012345678901",
    alert_type: "invoice_total_mismatch",
    severity: "warning",
    title: "Eroare extracție — Corteva Agriscience",
    message: "Factura FCT-2026-001258 nu a putut fi procesată complet. Câmpurile TVA și data scadenței lipsesc din XML-ul e-Factura.",
    confidence: 1.0,
    evidence: {
      missing_fields: ["vat_amount", "due_date"],
      source: "xml_parsing",
    },
    created_at: "2026-04-03T14:05:00Z",
  },
  {
    id: "a0070007-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "b4c5d6e7-f8a9-0123-bcde-234567890bcd",
    alert_type: "suspicious_overpayment",
    severity: "urgent",
    title: "Suprapreț fungicid — Syngenta",
    message: "Amistar Xtra la 245 RON/L este cu 35% peste media de 182 RON/L. Cel mai mare suprapreț detectat luna aceasta.",
    confidence: 0.91,
    evidence: {
      your_price: 245.0,
      regional_median: 182.0,
      deviation_pct: 35.0,
      observation_count: 9,
    },
    created_at: "2026-04-04T15:30:00Z",
  },
  {
    id: "a0080008-aaaa-bbbb-cccc-dddddddddddd",
    invoice_id: "b4c5d6e7-f8a9-0123-bcde-234567890bcd",
    alert_type: "suspicious_overpayment",
    severity: "warning",
    title: "Preț sămânță ridicat — Syngenta",
    message: "Sămânță rapiță NK Toccata la 1.850 RON/unitate dozare — cu 22% peste media de 1.517 RON. Verificați certificarea lotului.",
    confidence: 0.72,
    evidence: {
      your_price: 1850.0,
      regional_median: 1517.0,
      deviation_pct: 22.0,
      observation_count: 6,
    },
    created_at: "2026-04-04T15:32:00Z",
  },
];

export const mockAlerts = {
  list: () => ({ items: ALERTS, total: ALERTS.length }),
  getByInvoiceId: (invoiceId: string) =>
    ALERTS.filter((a) => a.invoice_id === invoiceId),
  getById: (id: string) => ALERTS.find((a) => a.id === id) ?? null,
};
