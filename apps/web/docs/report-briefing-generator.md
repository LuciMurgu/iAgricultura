# REPORT1: Report and Briefing Generator

## Concept

AgroUnu compiles massive amounts of farm evidence (parcels, NDVI, cash-flow, stock, harvest quality, compliance tasks). For this data to be useful to a specialist (Accountant, Agronomist, Bank), it must be summarized.

The **Report and Briefing Generator** transforms this raw ledger data into structured, readable *drafts*.

Crucially, **these are NOT official submissions or final conclusions.** They are prep-work. They highlight what data is present and, more importantly, what data is *missing*.

## Architecture

1. **Deterministic Generators**
   - The system does not use an LLM to hallucinate report text.
   - Pure functions (`buildAccountantBriefReport`, `buildAgronomistBriefReport`) extract specific arrays from the Farm Context Pack.

2. **Strict Claim Validation**
   - Every claim in a report must cite a `ReportSource`.
   - Claims are marked `supported`, `partially_supported`, `missing_evidence`, or `uncertain`.
   - If a source is mocked, the claim is strictly marked `demo_only`.

3. **Disclaimers & Boundaries**
   - **What This Report Does Not Prove**: A hardcoded section in every report that explicitly states the legal and functional boundaries of the output (e.g., "Nu este o concluzie fiscală").
   - **Questions for Specialists**: Pre-generated questions based on the gaps in the data to guide the human review.

## Implemented Templates
- `funding_readiness`: Checks dosar completeness.
- `accountant_brief`: Synthesizes procurement and stock.
- `agronomist_brief`: Synthesizes field observations and soil data.
- `coordinator_brief`: Synthesizes harvest volumes and quality for the cooperative pool.
- `sale_readiness`: Synthesizes market signals.
- `cash_flow`: Simulates the next 30 days of pressure.
- `weekly_farm`: A quick operational summary.
- `missing_data`: A targeted checklist for missing FOP configuration.

## Relationship to AGENT1 Workspace
The Report Generator is the backend logic for the `build_report` tool family inside the Internal Tool Gateway. When a farmer asks the Workspace for a report, the Workspace calls the Report Generator and embeds the resulting artifact in the canvas.
