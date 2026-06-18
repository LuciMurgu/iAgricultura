# Outcome Navigation Case Study

## The Problem with Modules

Most B2B SaaS platforms and farm management systems are built around technical modules:
- The "Inventory" module
- The "Financials" module
- The "Agronomy" module
- The "Compliance" module

During the development of the Farm Operating Picture (FOP), it became clear that this modular approach is entirely backward for the end user. When a farmer needs a bank loan, they don't want to navigate to the Inventory module to find their stock, then to the Financials module to find their invoices, and then to the Compliance module to find their lease agreements.

**The farmer should not need to learn the system's database schema. The system should guide the farmer toward their goals.**

## The Shift to Outcome-Based Navigation

AgroUnu abstracts the complex, modular technical ledgers behind a clean, outcome-focused routing layer.

### Technical Modules (Behind the Scenes)
The architecture still relies on strict, decoupled ledgers to maintain data integrity:
- FOP Ledgers (Parcels, Applications, Invoices)
- Evidence Vault
- Scenario Sandbox
- Trusted Knowledge Library
- Setup Wizard
- Regional Intelligence

### Farmer-Facing Outcomes (The UI)
The primary navigation (sidebar and mobile bottom nav) presents clear, actionable goals:
- **Acasă (Home):** Proactive weekly decisions and context health.
- **Finanțare (Funding):** Aggregates data from Financials, Inventory, and Compliance to prove bankability.
- **Cumpără mai bine (Buy Better):** Aggregates invoices and regional intelligence to analyze input costs.
- **Vinde mai bine (Sell Better):** Aggregates harvest volumes, storage capacity, and market signals.
- **Câmpuri (Fields):** Aggregates cadastral data, agronomic observations, and workability.
- **Documente (Documents):** Aggregates the Evidence Vault across all ledgers.
- **Întreabă AgroUnu (Ask AgroUnu):** The guided copilot shell for safe querying.

## Why This Matters for AI

Outcome navigation is the critical precursor to a functional AI agent. By defining the UI around specific outcomes, we implicitly define the specific *tools* the future agent needs to call. 

If a farmer clicks "Cumpără mai bine", the system (and the future agent) knows it needs to load the `getProcurementReview` and `getBuySideSignals` tools. The outcome navigation acts as a high-level intent classifier, drastically reducing the complexity and risk of the AI workflow.
