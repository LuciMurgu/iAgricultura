# MOCK_STRATEGY.md — Feature Gate & Mock Data Architecture

## Principle

Every feature in AgroUnu looks fully functional to the user. Under the hood, a feature gate determines whether data comes from the real FastAPI backend or from a local mock data file. The component code is identical in both cases.

**When the backend catches up, you flip one boolean. Zero component refactoring.**

## Feature Gate Registry

| Feature | Gate Key | Status | Backend Endpoint | Mock File |
|---------|----------|--------|-----------------|-----------|
| Auth / Login | `auth` | REAL | POST /api/v1/auth/login | — |
| Dashboard Action Feed | `actionFeed` | MIXED | GET /api/v1/dashboard/feed (partial) | action-feed.ts |
| Invoices List | `invoices` | REAL | GET /api/v1/invoices | — |
| Invoice Detail | `invoiceDetail` | REAL | GET /api/v1/invoices/:id | — |
| Stock Overview | `stock` | REAL | GET /api/v1/stock | — |
| Alerts | `alerts` | REAL | GET /api/v1/alerts | — |
| ANAF Sync Status | `anafSync` | REAL | GET /api/v1/anaf/status | — |
| SAGA Export | `sagaExport` | REAL | POST /api/v1/export/saga | — |
| Parcel Map | `parcels` | MOCK | — | parcels.ts |
| Virtual Sensors | `sensors` | MOCK | — | sensors.ts |
| Cooperative Clusters | `cooperative` | MOCK | — | cooperative.ts |
| Bidding / Offers | `bidding` | MOCK | — | bidding.ts |
| Arendă Manager | `arenda` | MOCK | — | arenda.ts |
| e-Transport UIT | `eTransport` | MOCK | — | e-transport.ts |
| Carbon Credits | `carbon` | MOCK | — | carbon.ts |
| APIA Evidence Vault | `apiaVault` | MOCK | — | apia-vault.ts |

## Implementation

### Feature Gate Hook

```typescript
// lib/mock/feature-gates.ts
export const FEATURE_GATES = {
  auth:          { isReal: true },
  actionFeed:    { isReal: false },  // Mixed — some real, some mock
  invoices:      { isReal: true },
  invoiceDetail: { isReal: true },
  stock:         { isReal: true },
  alerts:        { isReal: true },
  anafSync:      { isReal: true },
  sagaExport:    { isReal: true },
  parcels:       { isReal: false },
  sensors:       { isReal: false },
  cooperative:   { isReal: false },
  bidding:       { isReal: false },
  arenda:        { isReal: false },
  eTransport:    { isReal: false },
  carbon:        { isReal: false },
  apiaVault:     { isReal: false },
} as const;

// hooks/use-feature-gate.ts
export function useFeatureGate(key: keyof typeof FEATURE_GATES) {
  return FEATURE_GATES[key];
}
```

### Data Hook Pattern

```typescript
// hooks/use-parcels.ts
import { useQuery } from '@tanstack/react-query';
import { useFeatureGate } from './use-feature-gate';
import { parcelService } from '@/lib/api/services/parcels';
import { mockParcels } from '@/lib/mock/data/parcels';
import { ParcelListSchema } from '@/types/parcels';

export function useParcels() {
  const gate = useFeatureGate('parcels');
  
  return useQuery({
    queryKey: ['parcels'],
    queryFn: async () => {
      const raw = gate.isReal
        ? await parcelService.list()
        : mockParcels.list();
      return ParcelListSchema.parse(raw); // Validates BOTH real and mock
    },
  });
}
```

## Mock Data Requirements

### Quality Standard
Mock data must be **indistinguishable** from real data. A pilot farmer looking at the screen should believe they're seeing their own farm's data.

### Romanian Realism Checklist
- [ ] Supplier names are real Romanian companies (Bayer România, Alcedo, Petrom, Pioneer)
- [ ] CUI numbers are real format (RO + 6-8 digits)
- [ ] Product names use correct Romanian agricultural terminology
- [ ] Prices are realistic 2026 RON values
- [ ] Dates are in the current season (spring 2026 for planting)
- [ ] Village and commune names are real places near Iași
- [ ] Parcel sizes are realistic (5-80 ha, typical for Moldovan farms)
- [ ] Crop types match the season and region (wheat, corn, rapeseed, sunflower)
- [ ] NDVI values are plausible for the growth stage
- [ ] Weather data matches Iași climate patterns

### Mock Data Files Structure

Each mock file exports a service-like object with the same interface as the real service:

```typescript
// lib/mock/data/parcels.ts
import { Parcel } from '@/types/parcels';

const PARCELS: Parcel[] = [
  {
    id: 'P-01',
    name: 'Parcela Copou Nord',
    area: 45,
    crop: 'Grâu de toamnă',
    commune: 'Iași',
    ndvi: 0.72,
    moisture: 28,
    status: 'ok',
    lastSatelliteUpdate: '2026-04-03T08:00:00Z',
    apiaRegistered: true,
    geotagPhotos: 3,
  },
  // ... more parcels with same level of detail
];

export const mockParcels = {
  list: () => PARCELS,
  getById: (id: string) => PARCELS.find(p => p.id === id) ?? null,
};
```

## Transition Checklist

When backend implements a mocked feature:

1. [ ] Backend endpoint is deployed and returning data
2. [ ] Zod schema in types/ validated against real API response
3. [ ] Service function in lib/api/services/ calls the real endpoint
4. [ ] Feature gate flipped: `isReal: false` → `isReal: true`
5. [ ] Mock data file kept as test fixture (moved to __fixtures__/)
6. [ ] Playwright e2e test passes against real endpoint
7. [ ] PR reviewed with "GATE FLIP: {feature}" in commit message
