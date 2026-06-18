# Farm Context Pack Architecture

## Purpose

The Farm Context Pack (FCP) is the structural foundation of the AgroUnu operating system. It is a highly typed, deterministic data object that represents the complete known state of a farm at a specific moment in time. 

Its primary purpose is to serve as the **ground truth layer** for both the frontend UI and the future AI copilot, ensuring that all guidance, scenarios, and answers are based on verified evidence rather than LLM assumptions.

## Schema Versioning and Domain Snapshots

The FCP is designed to be versioned. Because farm data changes constantly (new invoices, updated cadastral boundaries, weather events), the FCP operates on **Domain Snapshots**. An AI agent reasoning about a decision uses a specific snapshot of the FCP, ensuring reproducibility and auditability of the agent's logic.

## Source Mode

Every piece of data within the FCP is tagged with its origin.
- `real_records`: Verified data ingested from official systems (e-Factura, APIA) or uploaded evidence.
- `demo_records`: Mock data used for pilot demonstrations and onboarding.
- `mixed`: A combination of verified records and user estimations.
- `unavailable`: Explicitly null; the data is known to be missing.

## Completeness and Confidence

The FCP actively calculates its own health:
- **Completeness:** What percentage of the required domains are populated?
- **Confidence:** How trustworthy is the data? (e.g., APIA sync = High Confidence; 3-year-old manual entry = Low Confidence).

## Explicit State Management

The FCP strictly categorizes its domains to manage risk and UI presentation:
- **Missing Critical Domains:** Triggers the Setup Wizard. The system refuses to provide advanced guidance until these are resolved.
- **Demo-Only Domains:** Clearly flags to the user that the data being viewed is for illustration and cannot be used for official decisions.
- **High-Risk Domains:** Areas like Financials or Agronomic Prescriptions that require elevated confidence and explicit Human-in-the-Loop review.

## Why This Is Necessary for AI

LLMs are probabilistic engines; they are designed to guess the next token. If you ask an LLM, "Can I afford to buy this tractor?", without a rigid framework, it might invent a cash-flow projection based on generic farming averages. 

The Farm Context Pack acts as a deterministic cage around the probabilistic AI. By injecting the FCP into the system prompt or forcing the AI to query it via strict tools, we constrain the AI's reasoning space to the actual, verified reality of *this specific farm*.

## How It Prevents Hallucination

1. **Grounding:** The AI only "knows" what is in the FCP.
2. **Explicit Nulls:** If data is missing (e.g., `soil_nutrients: unavailable`), the FCP prevents the AI from guessing the soil type.
3. **Safety Prompts:** The system prompt instructs the AI to respond with "I lack the data to answer this" whenever an FCP domain is marked unavailable.

## How It Routes Farmers to Setup

When the UI or the AI detects that critical domains are missing from the FCP (e.g., `parcels_and_crops` is empty), the Outcome Navigation intercepts the user's request. Instead of showing an empty dashboard or allowing the AI to fail gracefully, the system proactively routes the farmer to the `farmer-setup-wizard`, turning a data deficiency into a clear, actionable onboarding step.

---

## Why a Chatbot Alone is Unsafe

Without structured farm context, an AI assistant may answer from assumptions derived from its pre-training data. Agriculture is highly localized and regulated. A generic chatbot might suggest applying a specific pesticide that is illegal in Romania, or assume a yield average that doesn't apply to the local soil type. The Farm Context Pack guarantees that the AI operates exclusively within the verified, localized, and legal boundaries of the specific farm operation.
