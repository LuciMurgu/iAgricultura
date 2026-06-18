# Next Build Roadmap

The foundation (FOP1–FOP18) is complete, providing a safe, deterministic, outcome-based shell. The following sequence defines the transition from a pilot UI to a production-ready AI operating system.

---

### 1. PILOT1 (Mode B)
**Purpose:** Update the deterministic UI based on real farmer pilot feedback.
**Why it matters:** Validates that the Outcome Navigation and missing-data assumptions actually resonate with users before building backend logic.
**What NOT to build:** Do not add backend persistence yet.

### 2. AGENT1 — Workspace + Internal Tool Gateway Foundation
**Purpose:** Implement the structural interface for the future AI agent. Define the exact TypeScript/Python signatures for the tools (e.g., `getFarmContext`, `getProcurementReview`).
**Why it matters:** Establishes the safe boundary through which the LLM will eventually interact with the ledgers.
**What NOT to build:** Do not connect to OpenAI/Anthropic yet.

### 3. REPORT1 — Report and Briefing Generator
**Purpose:** Create deterministic, template-based generation of PDF/UI briefings (e.g., "Funding Readiness Report") using the Farm Context Pack.
**Why it matters:** Proves the system can synthesize complex data into valuable artifacts without requiring an LLM.
**What NOT to build:** Do not use AI to write the reports.

### 4. MEMORY1 — Notes, Tasks and Meeting Memory
**Purpose:** Add basic CRUD functionality for the user and future agent to leave notes and tasks in the Workspace.
**Why it matters:** Provides the necessary persistence layer for an agent to maintain state across sessions.

### 5. PERMISSION1 — Agent Permission and Approval Model
**Purpose:** Implement the UI and logic for Level 4/5 permissions, requiring human cryptographic or UI sign-off before an action is executed.
**Why it matters:** Crucial for safety and legal liability before autonomous execution is permitted.

### 6. PV1 — Backend-Connected Procurement Review Vertical Slice
**Purpose:** Connect one specific ledger (e.g., Invoices/Buying) to the live FastAPI backend and Postgres database.
**Why it matters:** Proves the full stack works end-to-end for the most painful farmer problem (input costs).
**What NOT to build:** Do not connect all ledgers at once.

### 7. MCP1 — MCP-Compatible AgroUnu Tool Server
**Purpose:** Expose the internal Tool Gateway (built in AGENT1) via the standard Model Context Protocol.
**Why it matters:** Allows advanced agents (like Claude Desktop or future autonomous agents) to securely interact with the farm data using industry-standard protocols.

### 8. AGENT4 — Safe LLM Integration
**Purpose:** Connect the Guided Copilot UI to a live LLM, forcing it to use the MCP tools and enforcing the Safe Answer Format.
**Why it matters:** This is the culmination of the architecture—a safe, highly constrained AI assistant operating on verified evidence.
