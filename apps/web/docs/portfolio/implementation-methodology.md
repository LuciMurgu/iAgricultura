# Implementation Methodology

## Working Method

Building AgroUnu required a highly structured methodology to ensure that the use of AI coding agents resulted in a cohesive, safe architecture rather than a disjointed collection of generated code snippets.

The implementation followed an 11-step sequence:

1. **Domain Discovery:** Deconstructing the agricultural sector into discrete data objects (invoices, parcels, harvests, compliance).
2. **Farmer Discovery:** Identifying the actual pain points (funding, buying, selling) rather than assuming technological needs.
3. **Safety Boundaries:** Defining exactly what the system is legally and operationally forbidden from doing.
4. **Farm Context Pack:** Architecting the central, deterministic data structure.
5. **Deterministic Ledgers:** Building the frontend Farm Operating Picture (FOP) views mapping to those domains.
6. **Evidence Vault:** Designing the document linkage system.
7. **Outcome Navigation:** Shifting the UI from technical modules to goal-oriented routing.
8. **Guided Copilot:** Implementing the structured query templates instead of a free chatbot.
9. **Pilot Feedback Preparation:** Creating the audit tools and readiness checks for live farmer validation.
10. **Agent/Tool Roadmap:** Designing the internal APIs the future LLM will use.
11. **Backend Vertical Slice:** *(Next phase)* Connecting the UI to the live FastAPI backend.

## How Prompts Were Used

Prompts were never used to "write the app." They were used as architectural specifications. Every interaction with the coding agents started with defining the invariants:
- "This must be a pure function."
- "Do not use localStorage."
- "Adhere to the Zod schema."
- "Do not use the word 'guaranteed'."

## How Coding Agents Were Controlled

Agents were treated as junior developers under a strict Principal Architect. 
- Large tasks were broken into discrete "FOP" (Farm Operating Picture) phases.
- The agent was required to write tests *first* or immediately alongside the code.
- If an agent generated an overly complex solution or added an external dependency, the work was rejected and re-prompted for simplicity.

## Why Tests, Docs, and Safe Language Matter

In an AI-assisted development workflow, documentation and tests are the only things keeping the project from collapsing into entropy.
- **Tests (399 passing):** Ensure that as the agent modifies one ledger, it doesn't break the Farm Context Pack assumptions.
- **Docs (FOP 1-18):** Provide the necessary high-level context back to the agent in subsequent sessions, overcoming context-window amnesia.
- **Safe Language Audit:** An automated check is necessary because LLMs inherently default to helpful, confident, and often legally dangerous language. The script enforces the safety boundary programmatically.
