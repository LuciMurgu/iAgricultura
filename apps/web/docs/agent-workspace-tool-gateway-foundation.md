# AGENT1: Workspace + Internal Tool Gateway Foundation

## Concept

AgroUnu is an AI-operated platform where the farmer remains the ultimate decision-maker. To avoid the unreliability and legal risks of "free chatbots," we implemented the **Workspace** and **Internal Tool Gateway**.

The Workspace is a visual canvas where the farmer can ask guided questions. Behind the scenes, the Internal Tool Gateway translates these intents into safe, deterministic function calls that query the Farm Context Pack, evaluate missing data, and generate specific artifacts (charts, checklists, reports) instead of rambling text.

## Architecture

1. **Guided Intent Classification**
   - The user selects a template or types a query.
   - Deterministic keyword matching categorizes the intent (e.g., `funding`, `cash_flow`, `buying`).
   - High-risk intents (e.g., "Sunt eligibil?", "Cât azot aplic?") are instantly blocked and routed to human review.

2. **Tool Gateway**
   - Pure functions acting as the internal API.
   - Tools are categorized by Safety Level:
     - `read_only`: Can inspect the ledger.
     - `draft_only`: Generates reports for human review.
     - `demo_local_write`: Saves temporary notes.
     - `blocked_high_risk`: Exists in the ontology but is hard-blocked from execution.
   - These tools represent the foundation for a future Model Context Protocol (MCP) server.

3. **Workspace Canvas**
   - Presents the `AgentWorkspaceSession`.
   - Renders `AgentWorkspaceArtifacts`: Visual data representations that include source citations and highlight missing data.
   - Never hallucinates numeric values.
   - Adheres strictly to the safe-language boundary (e.g., no "AI recommendation", no "guaranteed results").

## What is NOT implemented (Deliberately)
- **No LLM Integration:** The current classification is deterministic to prove the architecture works before introducing probabilistic failure modes.
- **No MCP Server:** The tools are designed to the MCP standard but are not yet exposed via the server protocol.
- **No Autonomous Action:** The system prepares data; it does not execute payments or sign contracts.

## Future Path
- **AGENT4:** Connect the Tool Gateway to an actual LLM via MCP once the safety boundaries are fully validated with farmers in PILOT1.
