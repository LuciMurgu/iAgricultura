# Current Limitations

To maintain absolute transparency regarding the state of this portfolio project, the following limitations are explicitly stated.

## Documented Limitations

- **Frontend/Demo Foundation:** Many modules (e.g., FOP Ledgers, Setup Wizard) are currently implemented as robust, deterministic frontend shells using mock data adapters.
- **No Production Backend:** There is currently no active connection to a production Postgres database for all modules.
- **No Live AI/LLM:** The Guided Copilot shell is prepared, but it does not currently make live API calls to an LLM provider.
- **No Live Integrations:** There is no live synchronization with APIA, ANAF, e-Factura, Sentinel, or live market data feeds.
- **No Official Compliance:** The system does not provide official eligibility checks, legal compliance, or certification.
- **No Diagnosis/Prescription:** The system does not perform agronomic diagnosis or generate prescriptions.
- **No Commerce:** There are no marketplace, contract generation, or payment execution capabilities.
- **Validation in Progress:** Farmer pilot validation and feedback capture are structured and pending execution.

## Why These Limitations Are Intentional

These gaps are not oversights; they are strict architectural decisions.

1. **Safety First:** Building the deterministic safety boundaries, the Safe Answer Format, and the missing-data handlers *before* connecting a live, unpredictable LLM guarantees that the AI will be constrained upon integration.
2. **Staged Validation:** It is cheaper and faster to validate the Outcome Navigation and Setup Wizard concepts with farmers using a fast, deterministic UI before spending months integrating heavy government APIs.
3. **Avoiding Overclaims:** By explicitly stating what the system cannot do, we build trust with stakeholders and prevent the "vaporware" perception common in AI startups.
4. **Context Before Autonomy:** An AI agent is only as good as its tools and context. Building the Farm Context Pack and the internal tool contracts had to precede building the agent itself.
