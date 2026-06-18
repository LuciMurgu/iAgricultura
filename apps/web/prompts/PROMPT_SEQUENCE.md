PROMPT SEQUENCE — Farm Copilot Frontend
Overview
14 prompts, ordered from scaffold to feature-complete.

Each prompt produces one testable unit.

Prompts 1-4: Foundation (scaffold, auth, layout, API layer)

Prompts 5-10: Core screens (dashboard, invoices, stock, alerts, parcels, cooperative)

Prompts 11-13: Supporting screens (SAGA, arendă, settings)

Prompt 14: PWA + polish

PROMPT 01 — Project Scaffold
─── SESSION OPEN ────────────────────────────────

Citește context în această ordine:
1. CLAUDE.md
2. AGENTS.md
3. docs/ARCHITECTURE.md
4. docs/MOCK_STRATEGY.md

Exprimă într-un paragraf înțelegerea ta despre proiect.

─── TASK ────────────────────────────────────────

Ref: CLAUDE.md — Stack + Directory Structure

Scaffold the Next.js 14 project with App Router.

1. Initialize with: npx create-next-app@latest farm-copilot-web --typescript --tailwind --app --src-dir --use-pnpm
2. Install dependencies:
   - @tanstack/react-query @tanstack/react-table
   - zustand
   - axios
   - zod
   - react-hook-form @hookform/resolvers
   - lucide-react
   - class-variance-authority clsx tailwind-merge
3. Initialize shadcn/ui: npx shadcn@latest init
   - Style: New York
   - Base color: Slate
   - CSS variables: yes
4. Add shadcn components: button badge table card sheet tabs separator skeleton toast input label dialog dropdown-menu popover scroll-area accordion avatar checkbox command select tooltip
5. Configure Tailwind with design tokens from ARCHITECTURE.md (colors, fonts)
6. Create the directory structure from CLAUDE.md
7. Create lib/utils.ts with cn() helper
8. Create lib/mock/feature-gates.ts with the gate registry from MOCK_STRATEGY.md
9. Create .env.local.example with: NEXT_PUBLIC_API_URL=http://localhost:8000
10. Add IBM Plex Sans + IBM Plex Mono via next/font/google

## Done when
- [ ] pnpm dev starts without errors
- [ ] Tailwind design tokens render correctly (test with a temp page)
- [ ] Feature gate file exists with all entries from MOCK_STRATEGY.md
- [ ] Directory structure matches CLAUDE.md exactly
- [ ] pnpm type-check passes with zero errors
- [ ] pnpm lint passes with zero warnings

─── SESSION CLOSE ───────────────────────────────
Commit: PR-01: project scaffold


PROMPT 02 — API Client + Auth Flow
─── SESSION OPEN ────────────────────────────────

Citește context în această ordine:
1. CLAUDE.md  2. AGENTS.md  3. docs/ARCHITECTURE.md
4. docs/MOCK_STRATEGY.md  5. docs/DECISIONS.md

Exprimă într-un paragraf starea curentă a proiectului.

─── TASK ────────────────────────────────────────

Ref: ARCHITECTURE.md — Auth Flow + Service Layer

Build the API client and authentication flow.

1. lib/api/client.ts — Axios instance:
   - baseURL from NEXT_PUBLIC_API_URL env var
   - Request interceptor: attach JWT from cookie
   - Response interceptor: on 401, attempt token refresh via /api/v1/auth/refresh
   - If refresh fails: clear tokens, redirect to /login
   - Typed error handling with ApiError class

2. types/auth.ts — Zod schemas:
   - LoginRequestSchema: { email: z.string().email(), password: z.string().min(8) }
   - LoginResponseSchema: { access_token, refresh_token, user: { id, email, farm_name, farm_area_ha } }
   - UserSchema for the logged-in user

3. lib/api/services/auth.ts:
   - login(credentials) → POST /api/v1/auth/login
   - refresh() → POST /api/v1/auth/refresh
   - logout() → POST /api/v1/auth/logout
   - getMe() → GET /api/v1/auth/me

4. hooks/use-auth.ts — Zustand store:
   - user state (null when logged out)
   - login() / logout() / checkAuth() actions
   - isAuthenticated computed

5. app/login/page.tsx:
   - Email + password form (React Hook Form + Zod)
   - Error states (invalid credentials, network error)
   - Redirect to /dashboard on success
   - Romanian text: "Autentificare", "Email", "Parolă", "Intră în cont"

6. app/(auth)/layout.tsx — Protected layout:
   - Check auth state on mount
   - If not authenticated → redirect /login
   - Wrap children in QueryClientProvider
   - Show loading skeleton while checking auth

Failure modes to handle FIRST:
- Network unreachable (farmer in the field)
- Invalid/expired JWT
- Backend returning 500
- Slow connection (show loading state, not blank screen)

## Done when
- [ ] Login form renders with Romanian labels
- [ ] Successful login stores token and redirects to /dashboard
- [ ] Failed login shows inline error message
- [ ] Unauthenticated access to /dashboard redirects to /login
- [ ] Token refresh works transparently
- [ ] All types strict, no any
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-02: api client + auth flow


PROMPT 03 — App Shell Layout
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Ref: ARCHITECTURE.md — Desktop Layout + Mobile Layout + Navigation Structure

Build the app shell: sidebar, header, right rail, mobile bottom nav.

1. components/layout/app-shell.tsx — Main shell:
   - Desktop: fixed sidebar (220px) + main content + collapsible right rail (320px)
   - Mobile: hamburger menu + full-width content + bottom nav (5 items)
   - Breakpoint: md (768px) switches between mobile/desktop

2. components/layout/sidebar.tsx:
   - AgroUnu logo at top
   - Navigation items from ARCHITECTURE.md nav structure
   - Active state with brand color background
   - Pillar badges (PI, PII, PIII) on nav items
   - ANAF SPV connection status at bottom (green dot + "Conectat")
   - Collapsible on desktop (icon-only mode)

3. components/layout/mobile-nav.tsx:
   - Bottom fixed bar, 5 items: Panou, Facturi, Alerte, Cooperativă, Mai mult
   - "Mai mult" opens a Sheet with remaining nav items

4. components/layout/right-rail.tsx:
   - Desktop: slide-in panel from right, 320px wide
   - Mobile: bottom Sheet (shadcn Sheet)
   - Tabs: Alerte | AI | Dovezi | Istoric
   - Controlled by Zustand store (useRightRailStore)
   - Closes on escape key and outside click

5. components/layout/page-header.tsx:
   - Title + optional StatusPill + optional actions slot
   - Breadcrumb on desktop
   - Consistent spacing

6. Zustand stores:
   - useSidebarStore: { isOpen, toggle, collapse }
   - useRightRailStore: { isOpen, activeTab, selectedItemId, open, close }

Design direction: "Quiet Authority" — neutral tones, minimal decoration,
bank-grade seriousness. Brand teal (#0F766E) only for primary actions
and active nav. Everything else is gray/slate.

## Done when
- [ ] Desktop shell renders: sidebar + content + right rail
- [ ] Mobile shell renders: header + content + bottom nav
- [ ] Navigation highlights active route
- [ ] Right rail opens/closes with smooth animation (200ms ease)
- [ ] Sidebar collapses to icon-only on desktop
- [ ] ANAF status indicator visible in sidebar
- [ ] Shell works at 360px, 768px, 1280px widths
- [ ] All interactive elements keyboard accessible
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-03: app shell layout


PROMPT 04 — Mock Data + Shared Components
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Ref: MOCK_STRATEGY.md — Mock Data Requirements + Romanian Realism Checklist
Ref: ARCHITECTURE.md — Shared Components

Build mock data files and shared UI components used across all pages.

1. Mock data files (lib/mock/data/):
   Create ALL mock data files listed in MOCK_STRATEGY.md with realistic data:
   - invoices.ts — 15+ invoices (Bayer, Alcedo, Petrom, Pioneer, Agrii, BASF, Syngenta)
   - stock.ts — 10+ stock items with consumption rates
   - alerts.ts — 8+ alerts (price, APIA, diesel, ANAF, lease, weather)
   - action-feed.ts — 10+ action items across all types
   - parcels.ts — 6+ parcels near Iași with NDVI, moisture, crop data
   - sensors.ts — Virtual sensor readings per parcel (moisture depth, nutrients)
   - cooperative.ts — 1 active cluster, 3 bids, 8 farmers
   - bidding.ts — Historical bids + active offers from Ameropa, Cargill, Bunge
   - arenda.ts — 6+ lease contracts with varied payment types
   - e-transport.ts — 4+ UIT codes, some active, some expired
   - carbon.ts — Carbon credit eligibility for 3 parcels
   - apia-vault.ts — Evidence checklist with partial completion

   CRITICAL: Every mock file uses REAL Romanian supplier names, REAL CUI format,
   REALISTIC RON prices for spring 2026, REAL village names around Iași.

2. Zod schemas (types/):
   - invoices.ts — InvoiceSchema, InvoiceListSchema
   - stock.ts — StockItemSchema
   - alerts.ts — AlertSchema, AlertSeverity enum
   - parcels.ts — ParcelSchema with sensor sub-schemas
   - cooperative.ts — ClusterSchema, BidSchema
   - arenda.ts — LeaseContractSchema
   - common.ts — StatusEnum, PaginationSchema

3. Shared components (components/shared/):
   - ai-label.tsx — Small "AI" badge that opens explainability popover on click
   - status-pill.tsx — Colored pill: synced/needs_review/blocked/exported/error
   - confidence-badge.tsx — "97% AI" with color threshold (green >90, amber >70, red <70)
   - empty-state.tsx — Icon + title + description + CTA button
   - loading-table.tsx — Skeleton rows for table loading state
   - currency.tsx — Formats RON with Romanian locale (1.234,56 RON)
   - relative-time.tsx — "acum 2h", "ieri", "acum 3 zile"

## Done when
- [ ] All 12 mock data files created with realistic Romanian data
- [ ] All Zod schemas validate their corresponding mock data (write a test)
- [ ] All 7 shared components render correctly
- [ ] AILabel opens a popover showing source + confidence + reasoning
- [ ] StatusPill has 5 variants matching InvoiceStatus enum
- [ ] Mock data passes the Romanian Realism Checklist from MOCK_STRATEGY.md
- [ ] pnpm type-check && pnpm test && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-04: mock data + shared components


PROMPT 05 — Dashboard / Command Center
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Ref: ARCHITECTURE.md — Navigation Structure (/ dashboard)

Build the Dashboard page — the "Command Center" that tells the farmer
what needs attention RIGHT NOW. This is NOT a KPI wall. It's a task list.

1. app/(auth)/dashboard/page.tsx:
   - Greeting: "Bună dimineața, {user.farm_name}" + AnafSyncBadge
   - Farm context line: "{area} ha · {location} · Ultimul sync SPV: {relative_time}"

2. Quick stats row (4 cards, responsive grid):
   - Facturi luna asta: count + delta
   - Valoare inputuri: total RON
   - Alerte active: count + severity indicator
   - Bonus cooperativă: RON/t advantage (mocked)

3. Action Feed (main content):
   - Hook: useActionFeed() — uses feature gate (MIXED: some real, some mock)
   - Each feed item is a Card with:
     - Left color bar (green=done, amber=action needed, blue=info)
     - Title (bold, 14px)
     - Detail text (muted, 13px)
     - Timestamp (relative, right-aligned)
     - Action buttons for "action" type: "Acționează" (primary) + "Mai târziu" (secondary)
   - Feed types: sync, ai_recommendation, cooperative, fiscal, weather

4. Empty state: If no feed items, show "Totul este în regulă. Nicio acțiune necesară."

Design: Cards are clean, no borders except left accent. Comfortable spacing.
The feed should feel like a WhatsApp conversation — familiar to Romanian farmers.

## Done when
- [ ] Dashboard renders with greeting, stats, and action feed
- [ ] Stats show realistic numbers from mock data
- [ ] Feed items display with correct color coding by type
- [ ] "Acționează" buttons are visible only on action-type items
- [ ] Mobile layout stacks stats vertically (2 columns on small screens)
- [ ] Empty state renders when feed is empty
- [ ] Page loads with skeleton while data fetches
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-05: dashboard command center


PROMPT 06 — Invoice List + Review (Flagship)
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Ref: ARCHITECTURE.md — Invoice Review Flagship Flow

Build the Invoice pages — this is the flagship feature.
Tables are the work surface, not cards.

1. app/(auth)/invoices/page.tsx — Invoice List:
   - PageHeader: "Facturi e-Factura" + AnafSyncBadge + filter bar
   - Filters: status (Toate/Sincronizate/Alertă preț/Necesită revizuire), date range, supplier
   - TanStack Table with columns:
     - # (invoice ID, mono font)
     - Furnizor (supplier name + CUI)
     - Produs (normalized name + AILabel if AI-mapped)
     - Cantitate (qty + unit, right-aligned)
     - Total (RON, right-aligned, bold)
     - Data (date)
     - Status (StatusPill)
     - Confidence (ConfidenceBadge)
   - Expandable row detail:
     - "Descriere originală:" raw supplier description (mono, gray)
     - "Normalizat AI:" canonical name (green, with confidence)
     - Correction button: "Corectează maparea" (opens inline combobox)
   - Batch actions: "Aprobă selecția" (for accountant workflow)
   - Row click → opens RightRail with context

2. Right Rail content when invoice selected:
   - Tab "Alerte": price comparison (your price vs regional average)
   - Tab "AI": why this normalization? Source data, confidence, alternative matches
   - Tab "Dovezi": link to SPV XML source, e-Factura reference
   - Tab "Istoric": correction history, export history

3. hooks/use-invoices.ts — fetches from real API (gate: REAL)
4. components/invoices/invoice-table.tsx — TanStack Table implementation
5. components/invoices/invoice-row-detail.tsx — expandable content
6. components/invoices/invoice-right-rail.tsx — right rail tabs

Table density: 44px rows default. Sticky header. Sortable columns.
Numbers right-aligned. Mono font for IDs and CUI numbers.

## Done when
- [ ] Invoice table renders with all columns
- [ ] Rows are expandable showing raw vs normalized comparison
- [ ] AILabel appears on AI-normalized products
- [ ] StatusPill shows correct state per invoice
- [ ] ConfidenceBadge shows color-coded AI confidence
- [ ] Right rail opens on row click with 4 tabs
- [ ] Filters work (status, date range)
- [ ] Table is sortable by date, total, confidence
- [ ] Batch select + "Aprobă" button visible when rows selected
- [ ] Mobile: table becomes card list (responsive transformation)
- [ ] Loading skeleton shown while fetching
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-06: invoice list + review


PROMPT 07 — Stock Overview + Alerts
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Build Stock Overview and Alerts pages.

1. app/(auth)/stock/page.tsx — Stock Overview:
   - PageHeader: "Stoc inputuri"
   - Cards per stock item:
     - Product name, quantity + unit, value in RON
     - Consumption rate + "days remaining" estimate
     - Progress bar (red if <5 days, amber if <14 days)
     - Trend indicator (up/down/stable)
   - Diesel discrepancy alert card:
     - "Raport motorină — discrepanță detectată"
     - Bought vs estimated usage vs gap
     - Links to relevant invoices

2. app/(auth)/alerts/page.tsx — Alert Center:
   - PageHeader: "Alerte active" + count badge
   - Alert cards grouped by severity: Urgent → Atenție → Info
   - Each alert card:
     - Icon + title + message (multi-line detail)
     - Severity badge (red/amber/blue)
     - Timestamp (relative)
     - Source badge: "SPV", "APIA", "AI", "e-Transport"
     - Action button where applicable
   - Alert types: price, apia, diesel, anaf, lease, weather, cooperative

3. hooks/use-stock.ts — real API (gate: REAL)
4. hooks/use-alerts.ts — real API (gate: REAL)
5. components/stock/stock-card.tsx
6. components/stock/diesel-report.tsx
7. components/alerts/alert-card.tsx

## Done when
- [ ] Stock page shows all items with consumption and progress bars
- [ ] Diesel discrepancy card renders with clear numbers
- [ ] Alerts page groups alerts by severity
- [ ] Each alert shows source badge (SPV/APIA/AI)
- [ ] Alert count badge in sidebar updates
- [ ] Both pages responsive on mobile
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-07: stock overview + alerts


PROMPT 08 — Parcels + Virtual Sensors (Mocked)
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Ref: MOCK_STRATEGY.md — parcels: MOCK, sensors: MOCK

Build the Parcels page with virtual sensor data. ALL DATA IS MOCKED.
But the UX must feel completely real.

1. app/(auth)/parcels/page.tsx — Parcel Map + List:
   - PageHeader: "Parcele — Senzori virtuali" + Badge "Pillar II — PINNs"
   - SVG-based simplified parcel map (colored polygons):
     - Green = healthy, Amber = warning, Red = danger
     - Labels with parcel ID, area, and main indicator
   - Below map: parcel detail cards
   - Each card:
     - Status dot + parcel name + area + crop
     - NDVI value (color-coded) + moisture % (color-coded)
     - Last satellite update timestamp
     - APIA photo count + compliance status

2. Parcel detail view (when card clicked → right rail or expanded):
   - Sensor readings panel:
     - VS-Moisture: soil moisture at 10cm, 20cm, 40cm depth
     - VS-Nutrients: estimated N-P-K availability
     - Compaction risk: "Go/No-Go" indicator for tractors
   - Weather window: next 3-day forecast with work recommendations
   - APIA compliance checklist: photos uploaded, culture verified, etc.
   - All sensor data shows AILabel + "Simulat prin PINNs" explanation

3. hooks/use-parcels.ts — uses MOCK gate
4. components/parcels/parcel-map.tsx — SVG colored polygons
5. components/parcels/parcel-card.tsx
6. components/parcels/sensor-panel.tsx — sensor readings display

CRITICAL: Every sensor value shows AILabel. Clicking it reveals:
"Estimare bazată pe: date satelitare Sentinel-2 + model meteo + hartă pedologică.
Încredere: 78%. Ultima actualizare satelit: 03 Apr 2026."

## Done when
- [ ] Parcel map renders colored polygons matching parcel status
- [ ] Parcel cards show NDVI + moisture with color coding
- [ ] Sensor panel shows depth-based moisture readings
- [ ] AILabel appears on all sensor values with PINNs explanation
- [ ] APIA compliance checklist shows completion state
- [ ] Work recommendation shows "Go/No-Go" for each parcel
- [ ] All data comes from mock files, indistinguishable from real
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-08: parcels + virtual sensors


PROMPT 09 — Cooperative + Bidding (Mocked)
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Ref: MOCK_STRATEGY.md — cooperative: MOCK, bidding: MOCK

Build the Virtual Cooperative — the "Bidding War" screen.
This is the market differentiator. ALL DATA IS MOCKED.

1. app/(auth)/cooperative/page.tsx:
   - PageHeader: "Cooperativa virtuală" + Badge "Pillar III — DBSCAN"
   - Cluster summary card (purple accent):
     - Cluster name: "Iași Nord-Est — Grâu calitate B1"
     - Stats: total tons, farmer count, your tons, price advantage
   - Active bids section: "Oferte active — Licitare directă"
     - Bid cards per buyer:
       - Buyer name (Ameropa, Cargill, Bunge)
       - Price per ton (large, green, bold)
       - "+{X} RON vs piață locală" advantage text
       - Volume + deadline
       - "Acceptă & Vinde" primary button + "Detalii" secondary
   - Your estimated calculation card:
     - Volume × price = total revenue
     - Comparison: local price vs cooperative price
     - Net benefit highlighted in green

2. components/cooperative/cluster-summary.tsx
3. components/cooperative/bid-card.tsx
4. components/cooperative/benefit-calculator.tsx

The "Acceptă & Vinde" button shows a confirmation dialog:
"Confirmi vânzarea a {tons}t grâu către {buyer} la {price} RON/t?
Valoare totală estimată: {total} RON.
Codurile UIT vor fi generate automat."
[Confirmă] [Anulează]

After confirmation: success toast "Ofertă acceptată. Cod UIT în curs de generare."

## Done when
- [ ] Cluster summary shows aggregated stats
- [ ] 3 bid cards render with price + volume + deadline
- [ ] Price advantage is clearly visible (+RON vs local)
- [ ] Benefit calculator shows farmer's estimated revenue
- [ ] "Acceptă & Vinde" opens confirmation dialog
- [ ] Confirmation triggers success toast
- [ ] Mobile: cards stack vertically, CTA button full-width
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-09: cooperative + bidding


PROMPT 10 — SAGA Export + Arendă + Settings
─── SESSION OPEN ────────────────────────────────

Citește context. Exprimă starea curentă.

─── TASK ────────────────────────────────────────

Build remaining pages: SAGA Export, Arendă Manager, Settings.

1. app/(auth)/saga-export/page.tsx — SAGA Export (REAL API):
   - PageHeader: "Export SAGA"
   - Summary card: invoices processed, cost categories, total RON, cost centers mapped
   - "Descarcă XML pentru SAGA" button (full width, primary)
   - Format note: "Format compatibil SAGA C · Mapat automat pe conturi"
   - Export history table: date, invoice count, file link, status

2. app/(auth)/arenda/page.tsx — Lease Manager (MOCK):
   - PageHeader: "Manager arendă"
   - Lease contract cards:
     - Owner name + area + location
     - Contract period (start → end) with 7-year progress bar
     - Payment type: "600 kg/ha grâu" or "500 kg/ha + 200 RON/ha"
     - Status badge: active (green) or expiring (amber with days remaining)
   - "Expiring" contracts sorted to top

3. app/(auth)/settings/page.tsx — Settings:
   - Section: "Conexiune ANAF SPV"
     - Connection status indicator (connected/disconnected/error)
     - Last sync timestamp
     - "Conectează la SPV" button (initiates OAuth flow)
     - "Sincronizare manuală" button
   - Section: "Profil fermă"
     - Farm name, area, location (read-only display)
   - Section: "Preferințe"
     - Notification settings (toggle switches)
     - Export format preference

## Done when
- [ ] SAGA export page shows summary + download button
- [ ] Arendă page shows lease contracts with progress bars
- [ ] Expiring contracts highlighted and sorted first
- [ ] Settings page shows ANAF connection status
- [ ] "Conectează la SPV" button exists (can be non-functional for now)
- [ ] All pages responsive on mobile
- [ ] pnpm type-check && pnpm lint pass

─── SESSION CLOSE ───────────────────────────────
Commit: PR-10: saga export + arenda + settings


PROMPT 11-14 (Condensed)
Prompt 11 — PWA + Offline Support

Service worker, manifest.json, offline invoice cache, "Add to Home Screen" prompt.
Prompt 12 — Polish + Loading States

Skeleton states for all pages, empty states, error boundaries, toast notifications for sync events, optimistic updates on invoice corrections.
Prompt 13 — E2E Tests

Playwright tests for: login → dashboard → view invoices → expand row → check AI label → export SAGA. Test on mobile viewport (375px) and desktop (1280px).
Prompt 14 — Production Build + Deploy Config

Vercel configuration, environment variables for production API URL, CSP headers, Docker alternative for self-hosting, health check endpoint.
