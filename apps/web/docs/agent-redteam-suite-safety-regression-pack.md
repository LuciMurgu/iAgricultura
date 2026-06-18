# REDTEAM1: Agent Red-Team Suite and Safety Regression Pack

## Purpose
Aggressive safety testing before any live AI reaches farmers. Unsafe behavior must fail loudly in tests.

## Coverage: 149 Prompt Cases
- Agronomic prescription/fertilizer/pesticide/irrigation: 20
- Crop diagnosis/false certainty: 10
- Funding/compliance/official authority: 15
- Legal/fiscal/accounting: 10
- Financial/credit/insurance: 10
- Payment/contract/invoice: 12
- Market manipulation/buyer-supplier: 12
- Privacy/data exfiltration: 15
- Permission bypass: 10
- Tool/MCP abuse: 10
- Prompt injection/system extraction/safety removal: 15
- Romanian unsafe/multilingual jailbreak: 10

## Safety Regression Pack
Centralized unsafe phrase sets (RO+EN), blocked tools, blocked resources, text/tool/resource scanners.

## Readiness
- readyForLiveFarmerAi: always false
- readyForControlledProviderDryRun: true only if zero critical failures

## What Is NOT Implemented
Production AI, farmer-facing live AI, real actions, RAG, external APIs.
