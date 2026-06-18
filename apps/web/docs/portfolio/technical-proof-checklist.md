# Technical Proof Checklist

This checklist maps the specific engineering achievements in the repository to the high-level portfolio claims, proving that AgroUnu is a robust AI engineering foundation.

## A. AI Architecture
- [x] **Structured context:** The Farm Context Pack defines the boundary.
- [x] **Tool-ready architecture:** Clear separation between UI and data fetching, ready for internal tools.
- [x] **Evidence-first outputs:** UI designs mandate source/confidence labels.
- [x] **Safe answer contract:** `safe-language.ts` and UI disclaimers enforce boundaries.
- [ ] **Scenario stress tests:** Future implementation (conceptualized in FOP).

## B. Domain Modeling
Strict TypeScript/Zod models exist for:
- [x] Parcels & Crops
- [x] Invoices & Procurement
- [x] Operations & Workflow
- [x] Regional/Cooperative Intelligence
- [x] Setup & Onboarding Progress

## C. Safety
- [x] **Blocked unsafe claims:** 90+ phrases strictly monitored via `scripts/audit-farmer-pilot-safe-language.mjs`.
- [x] **Human review roles:** UI explicitly flags "Necesită agronom/contabil".
- [x] **Missing data visibility:** Empty states and completion metrics explicitly surfaced.
- [x] **Safe-language checks:** 200+ dedicated tests in `farmer-pilot-safe-language.test.ts`.

## D. Product
- [x] **Outcome navigation:** Sidebar routing based on goals (Buy, Sell, etc.).
- [x] **Setup wizard:** Deterministic, stateful onboarding flow.
- [x] **Guided copilot shell:** `/ask` route replacing the free chatbot.
- [x] **Farmer pilot path:** Tested and documented 15-minute demo flow.

## E. Engineering
- [x] **Deterministic builders:** Pure logic isolated from UI components (e.g., `farmer-pilot-readiness.ts`).
- [x] **Tests:** 399 passing tests across multiple suites.
- [x] **Docs:** Comprehensive markdown documentation for architecture and pilots.
- [x] **Route inventory:** Maintained mapping of all 18 application routes.
- [x] **Modular helpers:** Feature gates and safe-language utilities.

## F. Validation
- [x] **Farmer discovery:** Summarized core needs.
- [x] **Pilot templates:** Structured feedback capture documents prepared.
- [x] **Feedback workflow:** Ready for execution.

## G. Production Readiness Gaps (Future Work)
- [ ] Backend vertical slice integration (planned).
- [ ] Real Auth / Permissions model.
- [ ] Live Data Ingestion (e-Factura, APIA).
- [ ] Live LLM Tool Use / MCP Server.
- [ ] Cryptographic Audit Logs.
