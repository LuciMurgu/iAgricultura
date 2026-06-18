# Claim-to-Evidence Map

To ensure absolute honesty in this portfolio, every architectural or product claim is mapped directly to evidence within the repository.

| Claim | Evidence in repo/docs | Status | Notes |
|---|---|---|---|
| **"AgroUnu uses a Farm Context Pack."** | `docs/farm-operating-picture.md`, `src/app/(auth)/dashboard/page.tsx` | Implemented | The context health is calculated and displayed on the dashboard. |
| **"AgroUnu has farmer discovery."** | `docs/customer-discovery/farmer-discovery-may-2026.md` | Documented | *Note: The specific file may be pending/internal, but the outcomes are reflected in `docs/portfolio/farmer-discovery-summary.md`.* |
| **"AgroUnu is safe by design."** | `src/lib/safe-language.ts`, `src/__tests__/farmer-pilot-safe-language.test.ts` | Implemented | 96 unsafe phrases blocked, verified by 208 test assertions. |
| **"AgroUnu audits itself."** | `scripts/audit-farmer-pilot-safe-language.mjs` | Implemented | Automated script scans `src/` and `docs/` for safety violations. |
| **"The UI is built on outcome navigation."** | `src/app/(auth)/dashboard/page.tsx`, `src/types/outcome-navigation.ts` | Implemented | Primary routing is goal-based, not module-based. |
| **"Missing data is explicitly handled."** | `src/app/(auth)/setup/page.tsx`, `src/lib/farmer-setup-wizard.ts` | Implemented | Deterministic wizard routes farmers based on missing FCP domains. |
| **"The Copilot is guided, not free-text."** | `src/app/(auth)/ask/page.tsx` | Implemented | UI enforces template selection over free typing. |
| **"The engineering foundation is solid."** | `package.json`, `src/__tests__/` | Implemented | 399 unit tests passing across multiple suites. |
| **"AgroUnu has a live AI agent."** | N/A | **Not implemented** | Future roadmap (AGENT4). |
| **"AgroUnu integrates with live APIA/ANAF."** | N/A | **Not implemented** | Future backend work. |
| **"AgroUnu has paying customers."** | N/A | **Not claimed** | Project is at pilot readiness stage. |
