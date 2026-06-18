# Demo/Local State Pilot Audit

## Purpose

Audit all interactive demo/local state flows for safety and clarity before farmer pilot.

## Audit Table

| Route | Local Flow | Persistence | Reset | Safe Copy | Issues |
|-------|-----------|-------------|-------|-----------|--------|
| `/setup` | Setup wizard form | In-memory React state | ✓ "Resetează starea demo" | "Pas demo salvat pentru verificare" | None |
| `/setup` | Skip/defer step | In-memory | ✓ Included in reset | "Omis (demo)" / "Amânat" | None |
| `/cooperative` | Pool expression | Demo/mock | N/A (static mock) | Uses mock data | None |
| `/cooperative-intelligence` | Insight sharing | Demo/mock | N/A (static mock) | Uses mock data | None |
| `/ask` | Question templates | Static (no state) | N/A | "Nu este chatbot liber" | None |

## Rules

1. Success messages say "demo" or "local" if not persisted
2. Reset demo state exists where local state changes
3. No backend persistence implied
4. No "submitted" language unless clearly "demo"
5. No "sent" language unless actually sent
6. No "saved permanently"
7. No "official"

## Current Status

All local flows use safe copy. Setup wizard is the only flow with mutable local state, and it has:
- In-memory React state (resets on reload)
- Explicit "Resetează starea demo" button
- "Pas demo salvat pentru verificare" success message
- "demo" badge on all cards

No localStorage or backend persistence is used anywhere.
