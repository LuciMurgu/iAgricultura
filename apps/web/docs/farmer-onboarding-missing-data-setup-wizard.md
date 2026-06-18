# Farmer Onboarding and Missing Data Setup Wizard

## Purpose

FOP17 creates the practical setup layer that helps a farmer build a useful Farm Context Pack step by step. AgroUnu now has 15+ ledgers and missing-data warnings — the farmer needs a guided path, not a long list.

## Why Onboarding After Farm Context Pack

A Farm Context Pack is only useful if the farmer knows how to complete it. This wizard answers:
1. What data is missing?
2. Which missing data matters first?
3. Which steps support funding/buying/selling/fields/AI copilot?
4. Which steps require documents or specialist review?
5. Which steps can be skipped?
6. What should NOT be treated as official proof?

## Minimum Useful Farm Context v1

| # | Area | Required |
|---|------|----------|
| 1 | Farm name, county, farm type | Yes |
| 2 | At least one parcel + current crop | Yes |
| 3 | Documents/evidence checklist visible | Yes |
| 4 | Trust/privacy acknowledged | Yes |
| 5 | Invoice source | No (high) |
| 6 | Products/categories | No (high) |
| 7 | Harvest/storage | No (high) |
| 8+ | Soil, water, cash-flow, cooperative | No (medium-optional) |

## Setup Areas (16)

farm_profile, parcels_and_crops, invoices_and_procurement, products_and_applications, harvests_and_storage, field_observations, soil_and_nutrients, water_and_workability, documents_and_evidence, funding_readiness, cooperative_and_market, cash_flow, trust_and_sharing, knowledge_and_questions, scenarios, unknown

## Onboarding Paths (6)

| Path | Target Outcome | Effort |
|------|---------------|--------|
| Vreau finanțare | funding | ~30 min |
| Vreau să cumpăr mai bine | buy_better | ~15 min |
| Vreau să vând mai bine | sell_better | ~20 min |
| Vreau să înțeleg câmpurile | field_decisions | ~20 min |
| Vreau documente pregătite | documents | ~10 min |
| Vreau să pot întreba AgroUnu | ai_copilot | ~10 min |

## Skip/Defer Model

- Skipping does NOT hide the issue
- Skip consequence always visible
- Skipped required_first keeps minimumUsefulContextReady false
- Deferred steps can be resumed
- All state is demo/in-memory (reset on reload)

## Route

`/setup` → `src/app/(auth)/setup/page.tsx`

## Dashboard Integration

When minimum context not ready → setup card (amber) before guidance cards.
When ready → small green confirmation.

## More Page Integration

`/setup` listed under "Ghidare" group alongside "Întreabă AgroUnu".

## Relationship to Other Modules

- **Farm Context Pack** (FOP1): Reads context health, missing domains
- **Outcome Navigation** (FOP16): Setup card as outcome guidance
- **Guided Copilot Shell** (FOP16): AI readiness depends on setup
- **All FOP2-FOP15 Ledgers**: Setup steps map to ledger routes
- **Trust Controls**: Privacy/sharing step

## Safe Language Rules

### Never Use (EN)
official registration, official declaration, APIA/ANAF/AFIR submitted, verified legally, cadastral proof, eligibility confirmed, compliance confirmed, document approved, official approval, diagnosis, prescription, apply/buy/sell now, contract created, payment triggered, production consent stored, GDPR compliant

### Never Use (RO)
înregistrare/declarație oficială, depus la APIA/ANAF/AFIR, verificat juridic, dovadă cadastrală, eligibilitate/conformitate confirmată, document/aprobare oficială, diagnostic, prescripție, aplică/cumpără/vinde acum, contract creat, plată declanșată, consimțământ producție stocat, conform GDPR

## What Is NOT Implemented

- Production onboarding / auth / identity
- Official APIA/ANAF/AFIR submissions
- Live imports / file uploads
- Legal verification / GDPR consent storage
- Cadastral validation
- Diagnosis / prescription / eligibility / compliance
- Marketplace / contracts / payments

## Future Roadmap

- Production onboarding persistence
- Farm account setup / role invitations
- Import from e-Factura/APIA after legal review
- Guided document upload
- Offline mobile setup
- Adviser/accountant-assisted onboarding
- Consent-backed sharing setup
- AI copilot readiness gate
