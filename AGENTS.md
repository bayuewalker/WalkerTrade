# WalkerTrade Engineering Agent Contract

## Current product scope

**WalkerTrade Web Signal v0.1 only.**

Do not implement MT5, order execution, funded-account execution, or broker connectivity unless a future issue explicitly reactivates that scope.

## Mandatory context

Before coding, read:
1. `ARCHITECTURE.md`
2. `ROADMAP.md`
3. `WORKING_PLAN.md`
4. `docs/STRATEGY_SPEC.md`
5. The assigned GitHub issue

The issue is the implementation boundary.

## Codex workflow

- One GitHub issue per implementation branch/PR.
- Branch format: `codex/<issue-number>-short-name`
- PR title must reference the issue.
- Do not make unrelated refactors.
- Do not modify infrastructure unless the issue includes it.
- Add/update tests for changed behavior.
- Preserve strict TypeScript typing.
- Do not commit API keys, tokens, credentials, or production secrets.
- Use environment variables through the central config module.
- External providers must sit behind interfaces/adapters.
- Network-dependent code must have mocks/fixtures.
- A provider failure must not fabricate data.
- Signal-generating behavior must be deterministic before the VANTAGE AI stage.
- AI output must be schema-validated before use.
- Never rewrite historical signal outcomes.

## Architecture boundaries

### Deterministic engines
Own:
- market normalization
- technical indicators
- SMC detection
- candidate generation
- RR calculation
- signal deduplication
- signal lifecycle/outcome tracking

### VANTAGE AI
Owns:
- contextual interpretation
- confluence evaluation
- fundamental + technical synthesis
- final setup score/explanation

AI must not invent missing market or fundamental inputs.

## Definition of done for every issue

- Acceptance criteria satisfied
- Tests passing for changed scope
- No placeholder production logic hidden behind TODOs
- Error paths handled
- Structured logging included where operationally relevant
- README/docs changed if public behavior/config changed
- PR describes test evidence and remaining limitations

## Current runtime

- Fly.io
- Supabase
- Twelve Data
- Trading Economics
- TypeScript
- Next.js web
- Node/TypeScript long-running worker

## Out of scope

- MT5
- broker order execution
- position sizing for live accounts
- copy trading
- exchange execution
