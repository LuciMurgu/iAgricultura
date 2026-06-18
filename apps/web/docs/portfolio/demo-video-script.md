# Demo Video Script

## Target Audience
Technical clients, EIT mentors, investors, technical reviewers.

## Tone
Confident, factual, structured. Avoid AI hype words.

---

### 0:00–0:30 Problem
**(Visual: A messy desk with invoices, APIA maps, and a phone ringing.)**
**Speaker:** "Building AI for agriculture isn't about wrapping an LLM in a chatbot and hoping it doesn't hallucinate. It's a high-stakes, regulated domain. A wrong AI suggestion here means crop failure or lost funding. AgroUnu solves this by building a deterministic shell around the AI."

### 0:30–1:15 Architecture Idea
**(Visual: The Architecture Overview Mermaid diagram.)**
**Speaker:** "We don't start with generation. We start with structure. The architecture separates the probabilistic AI from the deterministic reality. Everything routes through what we call the Farm Context Pack—a strict, versioned data structure representing the exact state of the farm."

### 1:15–2:30 Farm Context Pack
**(Visual: The `/setup` wizard, showing missing data handling.)**
**Speaker:** "Honesty is a feature. If data is missing, the system doesn't guess. It explicitly flags the missing domains and routes the farmer to an outcome-based setup wizard. This deterministic foundation ensures the future AI agent is grounded in verifiable reality."

### 2:30–3:30 Farmer Outcome Navigation
**(Visual: Sidebar navigation highlighting 'Finanțare', 'Cumpără', 'Vinde'.)**
**Speaker:** "Farmers don't want technical ledgers. They want outcomes. The UI routes them based on their immediate goals—funding readiness, buying cheaper inputs, or selling harvests better. This also acts as an intent classifier for the internal tool gateway."

### 3:30–4:30 Guided Copilot
**(Visual: The `/ask` screen with guided templates.)**
**Speaker:** "We explicitly abandoned the 'free chatbot' model. The Guided Copilot uses structured templates. It forces the system to pull from the Evidence Vault and the Farm Context Pack, clearly flagging answers that require human review from an agronomist or accountant."

### 4:30–5:30 Safety and Human Review
**(Visual: A dashboard card showing the 'Necesită specialist' badge.)**
**Speaker:** "Safety is enforced at the code level. The system is explicitly blocked from issuing diagnoses, prescriptions, eligibility guarantees, or triggering payments. It is an augmentation tool that prepares the data so the human expert can make the final call."

### 5:30–6:30 Engineering Proof
**(Visual: Terminal running `vitest run` showing 399 passing tests, followed by the safe-language audit script.)**
**Speaker:** "This isn't a mock-up. It's a heavily tested engineering foundation. We have strict Zod schemas matching the backend, pure deterministic state transitions, and an automated audit script that continuously scans the codebase to ensure blocked, unsafe phrases never make it to the UI."

### 6:30–7:00 Next Step
**(Visual: The Next Build Roadmap document.)**
**Speaker:** "The foundation is verified. The next step is connecting the live Procurement backend vertical slice and finalizing the internal Tool Gateway, moving us toward a secure, MCP-compatible agentic operating system."
