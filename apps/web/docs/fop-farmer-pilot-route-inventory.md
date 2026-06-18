# Farmer Pilot Route Inventory

## Route Table

| Route | Purpose | Audience | Farmer-facing | Pilot path | Technical | Mobile ✓ | Trust banner | Empty state | Linked from | Test coverage |
|-------|---------|----------|:---:|:---:|:---:|:---:|:---:|:---:|-----------|:---:|
| `/dashboard` | Weekly decisions + context health | Farmer | ✓ | ✓ | | ✓ | Subtitle | ✓ | Sidebar, mobile | Unit |
| `/setup` | Setup wizard, missing data | Farmer | ✓ | ✓ | | ✓ | ✓ Banner | ✓ | Dashboard, /more | Unit |
| `/ask` | Guided copilot shell | Farmer | ✓ | ✓ | | ✓ | ✓ Banner | ✓ | Sidebar, /more | Unit |
| `/invoices` | Invoice analysis | Farmer | ✓ | ✓ | ✓ | ✓ | | ✓ | Sidebar | Unit |
| `/parcels` | Parcel map / crop | Farmer | ✓ | ✓ | ✓ | ✓ | | ✓ | Sidebar | Unit |
| `/cooperative` | Cooperative network | Farmer | ✓ | ✓ | ✓ | ✓ | | ✓ | Sidebar | Unit |
| `/cooperative-intelligence` | Regional signals | Farmer | ✓ | | ✓ | ✓ | | ✓ | /more | Unit |
| `/more` | Secondary nav | Farmer | ✓ | ✓ | | ✓ | | N/A | Sidebar | Unit |
| `/stock` | Stock levels | Farmer | ✓ | | ✓ | ✓ | | ✓ | /more, sidebar | Unit |
| `/alerts` | Active alerts | Farmer | ✓ | | ✓ | ✓ | | ✓ | /more, sidebar | Unit |
| `/arenda` | Lease contracts | Farmer | ✓ | | ✓ | ✓ | | ✓ | /more | Unit |
| `/saga-export` | Accounting export | Farmer | ✓ | | ✓ | ✓ | | ✓ | /more | Unit |
| `/settings` | Account settings | All | ✓ | | | ✓ | | ✓ | /more | Unit |
| `/login` | Auth | All | ✓ | | | ✓ | | N/A | Public | Unit |

## Future Routes (shown disabled in /more)

| Route | Status | Reason |
|-------|--------|--------|
| Finanțare | Unavailable | Demo — future module |
| Documente | Unavailable | Demo — future module |
| Încredere | Unavailable | Demo — future module |
| Scenarii | Unavailable | Demo — future module |
| Cunoștințe | Unavailable | Demo — future module |
| Context fermă | Unavailable | Demo — future module |

## Known Issues

- No standalone `/context` route (context is inline on dashboard via FOP1)
- Future routes shown disabled with "Viitor" badge
- All pilot routes build and pass tsc/lint/build

## Link Safety Rules

- No visible link points to a missing route
- Missing routes hidden or show disabled with reason
- Primary pilot path links verified in build
- Technical ledgers accessible from /more
