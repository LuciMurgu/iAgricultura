# AgroUnu: AI Engineering Proof (One-Page Summary)

## What AgroUnu Is
AgroUnu (Farm Copilot) is an evidence-based, AI-native operating system designed for Romanian crop farmers. It is built as a deterministic shell that securely houses advanced agentic workflows.

## What Problem It Solves
Farmers suffer from fragmented operational data, making it difficult to secure funding, negotiate input prices, or optimize harvest sales. They do not need a chatbot; they need a system that organizes their reality into verified context and guides them toward better business outcomes without hallucinating.

## AI Architecture
The architecture is centered on the **Farm Context Pack**—a strict, versioned data structure representing the exact state of the farm. The future LLM copilot interacts exclusively with this Context Pack via a secure **Tool Gateway**, preventing it from guessing or relying on generic pre-training data.

## Safety Model
The system enforces strict operational boundaries. It is explicitly programmed and tested to block high-risk actions. AgroUnu will never:
- Diagnose diseases
- Prescribe chemical treatments
- Guarantee funding eligibility
- Execute financial transactions

## Farmer Validation
Early discovery indicated farmers prioritize funding readiness, cheaper procurement, better sales, and risk reduction. The UI was restructured entirely around these outcomes (Outcome Navigation) rather than traditional technical modules.

## Engineering Proof
This repository serves as proof of rigorous AI engineering discipline:
- **399 Passing Tests** verifying domain logic and safety boundaries.
- **Automated Safe-Language Audit** ensuring 90+ high-risk phrases never appear in the UI.
- **Deterministic Missing-Data Handling** explicitly guiding users instead of hiding gaps.
- **Strict Zod/TypeScript Schemas** guaranteeing data integrity for the eventual backend.

## Current Limitations
AgroUnu is currently a hardened, pilot-ready UI foundation. It currently utilizes mocked, in-memory deterministic ledgers for demonstration purposes. It does not yet execute live LLM calls, connect to live government APIs (APIA/ANAF), or persist data to a production database.

## Next Step
The immediate next engineering phase is **AGENT1** (Workspace + Internal Tool Gateway Foundation) and **PV1** (Backend-connected Procurement Review), bridging the verified UI shell to the live FastAPI production backend.
