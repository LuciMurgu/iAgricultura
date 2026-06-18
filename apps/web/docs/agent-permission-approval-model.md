# PERMISSION1: Agent Permission and Approval Model

## Purpose

Before AgroUnu can operate as a real AI workspace, every agent action must be classified into a permission level. This deterministic model ensures high-risk actions are blocked, medium-risk actions require farmer approval, and safe actions proceed with full transparency.

## Permission Levels

| Level | Description | Example |
|-------|-------------|---------|
| explain | Read-only explanation | "Ce înseamnă acest indicator?" |
| organize | Group/visualize data | Generate chart, build table |
| prepare_draft | Create draft documents | Report draft, briefing |
| recommend_human_review | Suggest specialist | "Verifică cu agronomul" |
| demo_local_write | Save locally | Demo note, demo task |
| request_farmer_approval | Ask farmer to confirm | Share with accountant |
| blocked_high_risk | Always blocked | Diagnosis, payment, contract |

## Blocked Actions

The agent **cannot**: diagnose crops, prescribe treatments, recommend fertilizer/pesticide rates, confirm eligibility, sign contracts, issue invoices, trigger payments, select buyers/suppliers, certify quality, or declare compliance.

## Challenge Behavior

When a farmer requests a blocked action, the agent responds with:
1. Why this is risky
2. What evidence is missing
3. A safer alternative
4. Who should review

No scolding. Calm, respectful, evidence-based.

## Demo/Local Limitations

- All approvals are demo/local and resettable
- No production authorization, legal consent, or GDPR compliance
- No backend persistence
- No external action execution
