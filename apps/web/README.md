# Farm Copilot — Web

Next.js 14 frontend (App Router). TypeScript, Tailwind, Shadcn UI, TanStack
Query, Zustand, Zod.

For repository-wide context (deployment, contributing, architecture overview),
see the root [`README.md`](../../README.md), [`DEPLOYMENT.md`](../../DEPLOYMENT.md),
and [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

This file is the **web-specific quickstart only**.

---

## Quickstart

Prerequisites: Node 20+ and pnpm.

```bash
pnpm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
pnpm dev
```

Open http://localhost:3000.

The frontend talks to the API at `NEXT_PUBLIC_API_URL`. Do **not** include
`/api/v1` in the URL; the axios client adds it.

---

## Stack

- **Framework**: Next.js 14, App Router
- **Styling**: Tailwind + Shadcn UI ("Quiet Authority" design system)
- **Data**: TanStack Query + Axios
- **State**: Zustand for auth and global UI state
- **Validation**: Zod schemas matching the backend Pydantic contracts

---

## Code layout

```
src/
├── app/             Pages and layouts (App Router)
├── components/      UI primitives + feature components
├── hooks/           TanStack Query hooks (use-invoices, use-auth, ...)
├── lib/
│   ├── api/         Axios client + service modules
│   └── mock/        Fixture data for feature gates (dev only)
├── stores/          Zustand stores
└── types/           Shared TS types and Zod schemas
```

---

## Feature gates and demo data

Hooks like [`hooks/use-invoices.ts`](src/hooks/use-invoices.ts) consult
[`lib/mock/feature-gates.ts`](src/lib/mock/feature-gates.ts) to decide whether
to call the real API or fall back to mock fixtures.

This is a showcase build: surfaces still backed by mock fixtures render a
visible "Date demo" indicator via
[`components/shared/demo-badge.tsx`](src/components/shared/demo-badge.tsx).
Use `isDemoData(key)` / `isFeatureReal(key)` to drive that label. When a
feature is wired to the backend, flip its gate to `isReal: true` and the badge
disappears automatically.

---

## Scripts

```bash
pnpm dev            Start dev server with hot reload
pnpm build          Production build
pnpm start          Run the production build locally
pnpm test           Vitest
pnpm e2e            Playwright end-to-end
pnpm type-check     tsc --noEmit
pnpm lint           ESLint
```

---

## Production build

```bash
pnpm build
pnpm start
```

The Next.js config sets `output: "standalone"`, so the build can be packaged
into a small container if needed. The default deployment target is Vercel
(see the project's [`vercel.json`](vercel.json) and root [`DEPLOYMENT.md`](../../DEPLOYMENT.md)).
