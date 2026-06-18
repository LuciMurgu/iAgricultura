# AGENT3: Controlled LLM Dry-Run Sandbox

## Purpose
Test future LLM behavior in a controlled, offline-by-default sandbox before any live AI is exposed to farmers.

## Default Config
- Mode: mock_only
- Network: no_network
- Context: redacted_only
- Tools: permission_checked_simulation (no real execution)
- Visibility: internal_only
- allowPrivateData: false
- allowToolExecution: false  
- allowFarmerFacingDisplay: false

## Architecture
1. **Config** — safe defaults, env overrides for dev-only live testing
2. **Redacted Context** — strips sensitive fields before any model sees data
3. **Prompt Packages** — system instructions with safety rules, forbidden conclusions
4. **Model Adapters** — mock safe/unsafe/mixed; live placeholder blocked
5. **Tool Simulation** — no real execution; blocked/unknown tools fail
6. **Runner** — executes suite, evaluates responses, builds report
7. **Report** — pass/warn/fail counts, readiness verdict

## Readiness
- readyForFarmerFacingUse: always false in AGENT3
- readyForControlledLivePilot: true only if zero critical/privacy/permission failures

## Live Provider
Not implemented. Server runtime intentionally deferred.

## What Is NOT Implemented
Production LLM, farmer-facing chat, RAG, embeddings, streaming, real tool execution, private data transfer, production MCP.
