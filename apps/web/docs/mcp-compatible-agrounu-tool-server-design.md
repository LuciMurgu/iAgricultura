# MCP1: MCP-Compatible AgroUnu Tool Server Design

## Purpose

This document defines the MCP-compatible contract for AgroUnu's future AI agent tool layer. It enables structured, permission-aware access to farm context, evidence, reports, memory, and safe tools through a standardized interface.

## Exposure Mode

**design_only** — No production server, no remote access, no public exposure. This is a contract design and local demo foundation.

## MCP Concepts

### Resources
URI-based data sources. Example: `agrounu://farm-context/summary`

### Tools
Named functions with input/output schemas and permission policies. Example: `get_farm_context_summary`

### Prompts
User-controlled workflow templates with forbidden conclusions. Example: `funding_readiness_brief`

## Resource Catalog

| URI | Sensitivity | Redacted |
|-----|-------------|----------|
| agrounu://farm-context/summary | farm_private | Yes |
| agrounu://farm-context/missing-data | public_demo | No |
| agrounu://setup/status | public_demo | No |
| agrounu://reports/templates | public_demo | No |
| agrounu://memory/summary | farm_private | Yes |
| agrounu://permissions/summary | public_demo | No |
| agrounu://cash-flow/risk-summary | high_sensitivity | Yes |

## Tool Safety Levels

| Level | Description |
|-------|-------------|
| read_only_safe | No side effects, public/demo data |
| read_only_sensitive | Redacted access to private data |
| draft_only | Generate drafts, no external action |
| demo_local_write | Save locally with farmer approval |
| requires_approval | Explicit farmer confirmation |
| blocked_high_risk | Always blocked |
| future_not_enabled | Not implemented |

## Blocked Tools

diagnose_crop_problem, recommend_fertilizer_rate, trigger_payment, sign_contract, confirm_eligibility, issue_invoice

## What Is NOT Implemented

- Production MCP server
- Remote access
- LLM calls, RAG, embeddings
- External APIs
- Raw private data exposure
- Payment/contract/invoice execution
- Diagnosis/prescription/eligibility/certification
- GDPR compliance claims

## Server Skeleton

Not added. MCP contract implemented as pure TypeScript definitions. Server runtime intentionally deferred to avoid premature production exposure.
