# Agent Safety and Permission Model

## Core Philosophy

AgroUnu operates in a high-stakes environment where an AI hallucination can lead to crop failure, compliance penalties, or financial loss. The AI must operate under a strict, verifiable permission model that prioritizes human review and explicit boundaries.

## Permission Levels

### Level 1 — Explain (Implemented concept)
The AI is permitted to read the Farm Context Pack and explain existing evidence and explicitly flag missing data. It acts as an intelligent lens over the data.

### Level 2 — Organize (Future)
The AI can structure information. It is permitted to create notes, checklists, and summaries within the user's workspace, provided they are clearly marked as AI-generated organizations of existing data.

### Level 3 — Prepare (Future)
The AI can synthesize data to prepare draft reports, funding briefings, and scenario comparisons. These artifacts are strictly drafts and require explicit human sign-off.

### Level 4 — Recommend Human Review (Implemented concept)
The AI is programmed to recognize its limits. It is explicitly permitted (and encouraged) to state: *"This decision requires review by your accountant/agronomist/funding adviser."*

### Level 5 — Execute After Explicit Approval (Blocked / Future Only)
The AI is **strictly blocked** from autonomous execution. In the future, after explicit cryptographic or UI-based approval from the farmer, the agent may share reports, send messages, or create calendar reminders.

## Blocked Actions (Strictly Prohibited)

Regardless of the permission level, the AI is explicitly blocked by the safety system from making claims or taking actions in the following categories:
- **Diagnose:** Identifying crop diseases or financial insolvency.
- **Prescribe:** Recommending specific chemical treatments or doses.
- **Apply/Spray/Irrigate Instructions:** Telling the farmer when to operate machinery.
- **Confirm Eligibility:** Guaranteeing the farm will receive a specific grant.
- **Submit Grants:** Interfacing with APIA/AFIR directly.
- **Sign Contracts:** Agreeing to lease or sale terms.
- **Issue Invoices:** Creating legally binding financial documents.
- **Trigger Payments:** Moving money.
- **Select Buyers:** Forcing a specific market transaction.
- **Take Loans:** Interacting with credit systems.
- **Certify Quality:** Validating harvest grades.
- **Declare Compliance:** Ensuring GDPR or environmental regulations are met.

## Audit and Review Future
- **Audit Log:** Every tool called by the agent will be logged with a timestamp and the specific Farm Context snapshot used.
- **Memory Review:** The farmer will have the ability to review and revoke any persistent memory or assumptions the agent has recorded.

## Safe Answer Format

To enforce this model, the Guided Copilot prompt architecture mandates a specific "Safe Answer Format" for all responses:

1. **Short Answer:** Direct response to the query.
2. **What I Checked:** Transparency on the tools/domains queried.
3. **Evidence Used:** Links to the specific invoices, parcels, or documents backing the answer.
4. **Missing Data:** Explicit statement of what is unknown.
5. **Safe Next Step:** A deterministic UI action (e.g., "Complete setup", "Review invoice").
6. **Who Should Review:** Tagging the necessary specialist (Agronomist, Accountant).
7. **What Not to Do Automatically:** Explicit disclaimers regarding the blocked actions.
8. **Offer to Create Artifact:** Suggesting a draft report, note, or task for the workspace.
