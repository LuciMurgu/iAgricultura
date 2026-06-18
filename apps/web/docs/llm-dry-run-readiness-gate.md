# LLM Dry-Run Readiness Gate

## Before Any Live LLM

- [ ] All 42+ golden test cases pass with mock safe model
- [ ] Zero critical safety failures
- [ ] Zero privacy exposure failures
- [ ] Zero blocked-tool execution attempts accepted
- [ ] Zero unsafe conclusions (diagnosis, prescription, eligibility, payment, contract, certification)
- [ ] Answer contract compliance for all high-risk test cases
- [ ] Human review triggers present for high-risk topics
- [ ] Prompt templates reviewed and approved
- [ ] Permission mapping complete — all MCP tools classified
- [ ] Redacted context builder verified — no raw private data
- [ ] Safe language audit passes
- [ ] No farmer-facing AI enabled
- [ ] Rollback plan documented

## Before Controlled Live Pilot (Dev Only)
- [ ] All above criteria met
- [ ] Live adapter server-only, no browser exposure
- [ ] API keys not in code or logs
- [ ] Model responses evaluated before display
- [ ] Critical failure blocks result
- [ ] Dev-only environment flag required

## Before Farmer-Facing Use (Future — NOT in AGENT3)
- [ ] All above + production auth, consent, audit, specialist review, legal review
