# Tool Gateway and Agent Roadmap

## Purpose

The AI copilot within AgroUnu is designed to be tool-reliant, not knowledge-reliant. It should not scrape the DOM, guess at numbers, or generate responses based on its training weights. Instead, it interacts with the Farm Context Pack via a strict internal Tool Gateway.

### Phase 1: Internal Tool Gateway (Implemented - AGENT1)
- **Status:** Done.
- **What it is:** Pure deterministic logic layer mapping farmer intents to internal data readers and visual artifact generators.
- **Safety Proof:** Strict classification blocks high-risk intents (e.g., "Sunt eligibil?"). Tools are strictly typed by safety level (`read_only`, `draft_only`).

*(Note: These tools define the future architecture and are not yet implemented as live backend endpoints.)*

## Planned Internal Tool Contracts

### Farm Context
- `getFarmContext(farmId)`: Retrieves the core Farm Context Pack snapshot.
- `getSetupStatus(farmId)`: Returns the completion percentage and missing domains from the Setup Wizard.
- `getOutcomeNavigation(farmId)`: Returns the currently available and prioritized outcome paths.
- `getEvidenceVault(farmId, query)`: Searches the secure document storage.
- `getMissingData(farmId)`: Explicitly requests what data is known to be unavailable.

### Funding
- `getFundingReadiness(farmId)`: Calculates the percentage of context required for funding applications.
- `getComplianceReadiness(farmId)`: Checks current state against known compliance ledgers.
- `generateFundingBrief(farmId, target)`: Compiles a safe, factual summary of the farm's financial state.

### Buying
- `getProcurementReview(farmId)`: Summarizes recent input purchases and anomalies.
- `getInputExposure(farmId)`: Calculates the financial exposure to specific input categories (e.g., Nitrogen fertilizers).
- `getBuySideSignals(regionId)`: Retrieves aggregated cooperative/regional pricing signals.

### Selling
- `getStorageSaleReadiness(farmId)`: Summarizes harvested volume vs. sold volume.
- `getCooperativePoolStatus(coopId)`: Checks the status of regional pooling opportunities.
- `getQualityEvidence(farmId, lotId)`: Retrieves lab results or quality certificates from the Evidence Vault.
- `getSellSideSignals(regionId)`: Retrieves market demand and pricing signals.

### Fields
- `getParcelSummary(farmId)`: Returns the cadastral map and current crop rotation.
- `getFieldObservations(farmId)`: Returns recent scouting notes and alerts.
- `getWaterWorkability(farmId)`: Returns soil moisture and machine workability status.
- `getSoilNutrientReadiness(farmId)`: Returns the delta between soil tests and applied fertilizer.

### Risk
- `getCashFlowRisk(farmId)`: Highlights potential liquidity gaps based on the ledger.
- `getScenarioStressTest(farmId, scenarioParams)`: Runs a deterministic simulation (e.g., "What if wheat prices drop 15%?").

### Knowledge
- `getTrustedPlaybooks(query)`: Searches the curated library of agronomic and financial guides.
- `getKnowledgeContext(topic)`: Retrieves verified agricultural knowledge scoped to the region.

### Workspace
- `generateChartSpec(data, type)`: Requests a safe UI rendering of a chart.
- `generateTable(data, columns)`: Requests a safe UI rendering of a data table.
- `generateReport(sections)`: Compiles a multi-part briefing document.
- `createNote(content)`: Saves a user or agent note to the workspace.
- `createTask(description, assignee)`: Creates an actionable task.
- `saveWorkspaceArtifact(artifact)`: Persists a generated document for human review.

## MCP Direction

The Model Context Protocol (MCP) represents the future of secure AI tool use. AgroUnu's internal tool gateway is being designed to perfectly map to MCP specifications. 

MCP should be introduced *only after* stable internal tool contracts exist and are thoroughly tested deterministically. Once the internal API solidifies, exposing it as an MCP server will allow advanced LLMs (like Claude) to securely interact with the Farm Context Pack while strictly honoring the Agent Safety and Permission Model.
