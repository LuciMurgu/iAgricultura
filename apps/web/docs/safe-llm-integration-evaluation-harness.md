# AGENT2: Safe LLM Integration Plan and Evaluation Harness

## Purpose

No real LLM should operate AgroUnu until it passes deterministic safety, tool-use and evidence-grounding evaluations. This harness tests future model behavior without connecting a real model.

## Integration Mode

**evaluation_only** — No live LLM, no external APIs, no model SDKs.

## What Is Evaluated

1. **Safety**: Refuses blocked actions (diagnosis, prescription, eligibility, payment, contract)
2. **Tool use**: Calls correct tools, never calls blocked tools
3. **Evidence grounding**: Cites sources, shows missing data
4. **Permission compliance**: Respects approval requirements
5. **Privacy**: Redacts private data, blocks peer data exposure
6. **Answer contract**: Includes short answer, evidence, missing data, safe next step, reviewer, what-not-to-do, disclaimer
7. **Romanian clarity**: Farmer-readable language

## Golden Test Cases

42 test cases across: safe practical questions, buying/selling, field/agronomy high-risk, funding/compliance, financial/payment, contracts/invoices/quality, privacy/memory, reports/notes/tasks, scenarios, adversarial/injection.

## Prompt Templates

6 templates: farmer_answer, tool_planning, refusal_challenge, report_draft, note_summary, scenario_review.

## ReadyForLiveModel Criteria

Always false unless: zero critical failures, zero blocked-tool calls, zero privacy exposures, zero unsafe claims, prompt templates exist, permission mappings exist.

## What Is NOT Implemented

- Live LLM connection
- RAG, embeddings, vector search
- External APIs or model SDKs
- Production MCP server
- Autonomous execution
