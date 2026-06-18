# Farmer Pilot Mobile Audit

## Purpose

Ensure primary pilot path is mobile-readable before farmer demo.

## Audit Table

| Route | Mobile Status | Issues | Fixes | Remaining |
|-------|:---:|---------|-------|-----------|
| `/dashboard` | ✓ | None | Cards stack, no h-scroll | None |
| `/setup` | ✓ | None | Forms full-width, progress bar responsive | None |
| `/ask` | ✓ | None | Categories wrap, templates stack | None |
| `/invoices` | ✓ | Tables may scroll | Existing table scroll container | Acceptable |
| `/parcels` | ✓ | None | Cards stack | None |
| `/cooperative` | ✓ | None | Cards stack | None |
| `/cooperative-intelligence` | ✓ | None | Cards stack | None |
| `/more` | ✓ | None | Grid → single column | None |
| `/stock` | ✓ | None | Cards stack | None |
| `/alerts` | ✓ | None | Cards stack | None |

## Mobile Rules

- No horizontal scroll (except data tables with scroll container)
- No dense tables without scroll
- Cards stack on small screens
- Forms full-width
- Checkboxes readable
- Bottom nav max 5 items (currently: Acasă, Cumpără, Câmpuri, Cooperativă + Mai mult = 5)
- "What not to do" visible
- Safety banner readable
- Action buttons large enough (min 44px touch target)
- No tiny grey disclaimers
- One H1 per page
- Status badges have text
- Disabled actions have reason

## Bottom Navigation

Current: 4 items + "Mai mult" sheet = 5 total ✓

Items: Acasă, Cumpără, Câmpuri, Cooperativă, Mai mult

## Status

All primary pilot routes pass mobile audit. Invoice tables use existing horizontal scroll container (acceptable for data-heavy tables).
