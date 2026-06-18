# Regional and Cooperative Intelligence Aggregation

## Purpose

FOP15 provides a privacy-preserving, anonymized, threshold-protected regional intelligence layer. It aggregates cooperative signals across farms without exposing individual farm data.

## Why This Matters

- Farmers are stronger together when trust is protected
- Cooperative decisions need aggregate patterns, not private exposure
- Buying/selling coordination starts with non-binding evidence
- Regional knowledge needs can guide training/adviser sessions
- AI answers are safer when regional signals are privacy-filtered

## What This Is NOT

- NOT raw peer-farm data sharing
- NOT a marketplace, auction, or buyer matching
- NOT price fixing or coordinated pricing
- NOT official statistics
- NOT GDPR compliance implementation
- NOT contracts, payments, or settlement
- NOT buyer/supplier recommendation or ranking

## Data Model

### Aggregation Rules
Define privacy boundaries per data category: min group size, consent requirements, sensitivity level, what can/cannot be shown.

### Aggregate Metrics
Anonymized signals from multiple farms: crop area, pool volumes, buying interest, funding needs, soil/water gaps. Values suppressed or bucketed when privacy rules require.

### Regional Insights
Patterns derived from aggregate metrics: buy-together signals, sell-together signals, funding clusters, water/soil gaps, knowledge needs. Each includes safe next step and what-not-to-assume.

### Cooperative Aggregate Opportunities
Non-binding opportunities for group action: collective buying, non-binding selling coordination, funding preparation, training sessions. Always marked as non-binding.

### Privacy Suppressions
Records of what was hidden and why: group too small, missing consent, sensitive category. Transparent suppression.

## Privacy Rules

| Sensitivity | Min Group Size | Exact Values | Consent Required |
|------------|---------------|-------------|-----------------|
| Low | 3 | Allowed | No |
| Medium | 5 | Bucketed | No |
| High | 10 | Suppressed | Yes |
| Restricted | N/A | Never shown | Yes |

## Relationship to Other Modules

- **Farm Context Pack**: Feeds aggregate health and missing context signals
- **Cooperative Pool**: Pool volumes feed aggregate metrics when threshold passes
- **Market Signals**: Buy/sell signals feed aggregate insights
- **Trust Controls**: Consent status drives suppression decisions
- **Knowledge/Playbooks**: Common needs generate training insights
- **Scenario Sandbox**: Non-binding opportunities provide scenario context

## Safe Language Rules

### Never Use
- Individual farm price/debt/yield
- Best/recommended buyer/supplier
- Coordinate/fix price
- Contract signed/payment pending
- GDPR compliant / legal compliance guaranteed
- Official statistics
- Raw peer/invoice data

### Always Use
- Aggregate signal, anonymized, threshold-protected
- Non-binding opportunity, coordinator review
- Common evidence gap, needs review
- Not market recommendation, not contract

## Future Roadmap

- Production consent storage
- Role-based access control
- Aggregate audit logs
- Privacy-preserving analytics
- Coordinator-reviewed regional reports
- Legal/competition review before market features
- Official statistics adapter after source review

## Required Disclaimer

"This layer organizes anonymized or aggregated cooperative intelligence for review. It does not expose individual farm data, create prices, recommend buyers or suppliers, coordinate contracts, create payments, certify compliance, or implement production legal/GDPR compliance."
