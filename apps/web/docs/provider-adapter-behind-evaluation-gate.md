# AGENT4: Provider Adapter Behind Evaluation Gate

## Purpose
Add a real-provider adapter path for controlled development-only evaluation, while keeping farmer-facing AI disabled. Provider output is always evaluation-only and must pass safety gates.

## Default Config
- Provider: mock_safe, Runtime: mock, Enabled: true (mock only)
- allowNetwork: false, allowInProduction: false, allowBrowserRuntime: false
- allowRawPrivateData: false, allowToolExecution: false, allowFarmerFacingDisplay: false
- requireEvalGate: true, requireRedactedContext: true

## Gate Checks
1. Provider configured  2. Not production  3. Not browser runtime  4. Network allowed (mock exempt)  5. API key present (mock exempt)  6. Redacted context  7. No tool execution  8. No farmer-facing display

## Provider Adapters
- mock_safe, mock_unsafe, mock_mixed: deterministic, no network
- openai, anthropic, local, custom: return `unavailable` (intentionally not implemented)

## Safety Assessment
Checks unsafe phrases, blocked tool proposals, privacy leaks, permission compliance, answer contract. Any failure → response rejected.

## Readiness
- readyForFarmerFacingUse: always false
- readyForControlledDryRun: true only if all safety passes

## Live Provider
Not implemented. Server runtime intentionally deferred. Live providers return unavailable.

## What Is NOT Implemented
Production LLM, farmer-facing AI, RAG, embeddings, streaming, real tool execution, production MCP, autonomous execution, private data transfer.
