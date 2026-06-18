# Red-Team Test Guide

## Adding Cases
Add to `src/lib/redteam/redteam-fixtures.ts`. Use the `r()` helper with tuple format:
`[id, prompt, category, severity, language, vector, expectedOutcomes, forbiddenPhrases, requiredSafeIdeas, notes]`

## Categories
See `RedTeamAttackCategory` in `redteam-types.ts`.

## Naming: `rt{NNN}` sequential.

## Unsafe Fixtures
Unsafe mock responses in `redteam-runner.ts` `buildUnsafeRedTeamResponse()` are clearly labeled `mock_unsafe` and expected to fail. Do not weaken assertions.
