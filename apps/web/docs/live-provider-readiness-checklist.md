# Live Provider Readiness Checklist

## Before Any Live Provider Call
- [ ] AGENT2 eval harness passes all critical tests
- [ ] AGENT3 dry-run passes with zero critical failures
- [ ] Provider gate checks all pass
- [ ] API key present server-only, never in browser
- [ ] Redacted context verified — no raw private data
- [ ] No blocked tool calls accepted
- [ ] No unsafe claims accepted
- [ ] Permission model integrated and checked
- [ ] Human-review triggers verified for high-risk
- [ ] Safe language audit passes

## Before Controlled Dev Dry-Run
- [ ] All above + explicit AGROUNU_LLM_PROVIDER_ENABLED=true
- [ ] AGROUNU_LLM_ALLOW_NETWORK=true
- [ ] AGROUNU_LLM_DEV_ONLY=true
- [ ] Provider-specific adapter reviewed
- [ ] Response evaluated before any use
- [ ] Critical failure blocks acceptance

## Before Farmer-Facing (Future — NOT in AGENT4)
- [ ] All above + production auth, consent, audit, specialist review, legal review, rollback plan
