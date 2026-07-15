# Current Limitations

To maintain absolute transparency regarding the state of this project, the
following limitations are explicitly stated.

## What is real today

- **Production backend, live:** a FastAPI backend (~16k lines, 500+ tests) is
  deployed at `api.iagricultura.ro` (Render + Supabase Postgres). It provides
  real auth (cookie sessions, bcrypt), the full invoice pipeline (e-Factura
  XML parsing → product normalization → benchmark comparison → validation →
  stock movements → alerts), SAGA export, ANAF SPV integration, and a
  self-service signup flow with admin approval emails.
- **Frontend features wired to that backend:** auth, invoice list, and ANAF
  sync status. The mapping is tracked per-feature in
  [`src/lib/mock/feature-gates.ts`](../../src/lib/mock/feature-gates.ts) —
  the single source of truth for what is real vs mock.

## Documented Limitations

- **Mock-backed frontend modules:** most of the newer product surface (FOP
  ledgers, setup wizard, cooperative intelligence, parcels, bidding, carbon,
  outcome navigation, ...) runs on deterministic mock data adapters. Several
  of these (stock, alerts, invoice detail, SAGA export) already have real
  backend endpoints and are awaiting gate flips; the rest have no backend yet.
- **No Live AI/LLM:** The Guided Copilot shell is prepared, but it does not
  currently make live API calls to an LLM provider.
- **Partial live integrations:** ANAF e-Factura integration is implemented in
  the backend (OAuth, sync, ZIP extraction), but the public demo runs with
  auto-sync disabled. There is no live synchronization with APIA, Sentinel,
  or market data feeds.
- **No Official Compliance:** The system does not provide official
  eligibility checks, legal compliance, or certification.
- **No Diagnosis/Prescription:** The system does not perform agronomic
  diagnosis or generate prescriptions.
- **No Commerce:** There are no marketplace, contract generation, or payment
  execution capabilities.
- **Validation in Progress:** Farmer pilot validation and feedback capture
  are structured and pending execution.

## Why These Limitations Are Intentional

These gaps are not oversights; they are strict architectural decisions.

1. **Safety First:** Building the deterministic safety boundaries, the Safe Answer Format, and the missing-data handlers *before* connecting a live, unpredictable LLM guarantees that the AI will be constrained upon integration.
2. **Staged Validation:** It is cheaper and faster to validate the Outcome Navigation and Setup Wizard concepts with farmers using a fast, deterministic UI before spending months integrating heavy government APIs.
3. **Avoiding Overclaims:** By explicitly stating what the system cannot do, we build trust with stakeholders and prevent the "vaporware" perception common in AI startups.
4. **Context Before Autonomy:** An AI agent is only as good as its tools and context. Building the Farm Context Pack and the internal tool contracts had to precede building the agent itself.
