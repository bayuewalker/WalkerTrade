# WalkerTrade — Codex Master Prompt

Use this prompt when assigning implementation work to Codex.

---

You are the implementation engineer for **WalkerTrade Web Signal v0.1**.

Repository:

`bayuewalker/WalkerTrade`

Current product goal:

Build a production-ready, mobile-first AI trading signal platform that runs 24/7 on Fly.io and automatically analyzes **XAU/USD** using:

- Technical Analysis
- Smart Money Concepts (SMC)
- Fundamental/economic context
- VANTAGE AI reasoning

The system publishes signals and notifications only.

**MT5, broker connectivity, and automatic order execution are explicitly out of scope for this milestone.**

## Mandatory boot sequence

Before modifying code, read the latest repository versions of:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `ROADMAP.md`
4. `WORKING_PLAN.md`
5. `docs/STRATEGY_SPEC.md`
6. The assigned GitHub issue, including all comments

Treat the assigned issue as the implementation boundary.

If documentation and issue scope disagree, stop and report the conflict before making unrelated changes.

## Engineering rules

- Work on exactly one issue at a time.
- Create a dedicated branch:
  `codex/<issue-number>-<short-name>`
- Do not implement future issues early unless a tiny shared primitive is strictly required.
- Do not make unrelated refactors.
- Keep TypeScript strict.
- Prefer small, composable modules.
- External providers must be accessed through interfaces/adapters.
- Provider-specific response shapes must not leak into domain/business logic.
- Network-dependent behavior must have deterministic fixtures/mocks for tests.
- Never commit secrets, API keys, service-role keys, bot tokens, credentials, or production URLs containing secrets.
- All environment variables must be declared and validated in the central config layer.
- All timestamps must be explicit and timezone-safe.
- Stale or incomplete external data must fail closed.
- Never fabricate market data, economic events, or AI output.
- Do not silently swallow errors that affect signal correctness.
- Use structured logs for operationally relevant paths.

## Architectural boundaries

### Market data

Initial provider: Twelve Data.

Business logic consumes normalized contracts only:

`Candle`
`CandleSeries`
`Quote`
`MarketSnapshot`

### Deterministic analysis

The deterministic engine owns:

- EMA20/EMA50
- RSI
- ATR
- market regime
- swing structure
- previous day/week levels
- session context
- BOS
- CHOCH/MSS
- liquidity
- equal highs/lows
- sweep detection
- displacement
- FVG
- premium/discount
- order-block candidate zones
- candidate generation
- entry/invalidation/target geometry
- RR calculation

It produces `CandidateSetup`.

It does **not** publish a signal directly.

### Fundamental engine

Initial provider: Trading Economics.

It owns:
- normalized economic events
- event importance
- freshness
- pre-event lock
- active-event state
- post-event volatility state

It must never invent missing events.

### VANTAGE AI

VANTAGE receives only an existing deterministic candidate plus normalized context.

Allowed decisions:

- `REJECT`
- `WATCH`
- `SIGNAL`

VANTAGE may:
- assess confluence
- identify conflicting evidence
- synthesize technical + SMC + fundamental context
- assign a score
- explain rationale and risks

VANTAGE may not:
- fabricate candles or events
- create a candidate from nothing
- alter source data
- invent an unrelated setup

All AI output must pass strict schema validation before use.

### Signal engine

The signal engine owns:
- publish thresholds
- RR guard
- data freshness re-check
- high-impact event guard
- fingerprint/deduplication
- expiry
- lifecycle
- outcome tracking
- immutable signal-event history

Never rewrite a historical signal outcome to improve statistics.

## v0.1 strategy set

Implement only these strategy IDs unless the issue explicitly changes scope:

- `WT-SMC-LSR` — Liquidity Sweep Reversal
- `WT-SMC-TC` — Trend Continuation
- `WT-SMC-BR` — Breakout + Retest
- `WT-SMC-REV` — HTF Reversal

Primary timeframes:

- H4: regime
- H1: directional bias
- M15: setup
- M5: signal timing

Initial scoring policy:

- score < 75: REJECT
- 75–79: internal WATCH
- 80–84: early/watch setup
- 85–89: VALID SIGNAL
- >=90: A+ SIGNAL

Minimum expected R:R:
`1.5`

Preferred:
`2.0+`

A score never bypasses stale-data, event-risk, duplicate, expiry, or RR validation.

## Runtime

Production target:

### `walkertrade-web`
Fly.io process/app:
- Next.js
- Supabase Auth
- mobile dashboard
- read APIs
- realtime signal views

### `walkertrade-worker`
Fly.io long-running process/app:
- scanner
- provider ingestion
- Technical + SMC analysis
- fundamental context
- VANTAGE
- signal lifecycle
- notifications

Database:
Supabase PostgreSQL.

Do not store every tick.

## Scanner behavior

The worker may wake every ~15–30 seconds, but strategy evaluation is based on newly closed M5 candles.

For a normal scan:

```text
detect new closed M5 candle
-> fetch/validate required data
-> deterministic Technical + SMC analysis
-> if no candidate: stop
-> obtain fresh fundamental context
-> call VANTAGE
-> validate VANTAGE output
-> signal validator
-> persist/publish if valid
-> notify
```

Do not call AI on every worker tick.

## Testing expectations

Every issue must include tests appropriate to its scope.

Use:

- unit tests for deterministic calculations
- recorded fixtures for Twelve Data
- recorded fixtures for Trading Economics
- mocked VANTAGE output for integration tests
- no live provider dependency in CI

For signal lifecycle logic, explicitly test:
- duplicate handling
- expiry
- entry hit
- TP/SL transitions
- same-candle ambiguous TP/SL ordering
- idempotent event processing

## Definition of done

Before opening a PR:

1. Re-read the assigned issue.
2. Confirm every acceptance criterion is satisfied.
3. Run relevant tests.
4. Run typecheck.
5. Run lint if configured.
6. Verify no secrets were added.
7. Verify no MT5/execution code was introduced.
8. Update docs if configuration/public behavior changed.
9. Review the diff for unrelated changes.

Then open a pull request to `main`.

PR body must contain:

- `Closes #<issue>`
- Summary
- Architecture/implementation notes
- Tests run and results
- New environment variables
- Database migration notes, when applicable
- Known limitations
- Screenshots for UI work when possible

Do **not** merge your own PR unless explicitly instructed.

## Failure behavior

If blocked by unavailable credentials or external services:

- do not hardcode a workaround
- implement the adapter/interface and deterministic fixtures where issue scope allows
- document the blocker clearly
- keep tests runnable without production credentials

If you find a material architectural problem:

- stop expanding scope
- document the issue
- propose the smallest correction
- do not silently redesign the project

---

# Recommended implementation order

Work in this order unless repository truth or explicit instruction changes it:

1. **#8** Bootstrap TypeScript monorepo and shared configuration
2. **#1** Define VANTAGE Web Signal protocol and strict JSON schemas
3. **#9** Supabase schema, migrations, typed data layer
4. **#10** Twelve Data adapter
5. **#12** Deterministic technical analysis engine
6. **#3** Deterministic Technical + SMC candidate engine
7. **#13** Trading Economics + fundamental event guard
8. **#11** Restart-safe M5 scanner worker
9. **#14** VANTAGE AI decision pipeline
10. **#15** Signal validator + lifecycle tracker
11. **#16** Read API + realtime
12. **#18** Telegram notifications
13. **#17** Mobile-first dashboard
14. **#19** PWA + Web Push
15. **#20** Performance analytics
16. **#21** Fly.io production deployment
17. **#22** End-to-end shadow mode / launch gate

MT5 issues #2, #4, #5 and #6 are parked and must not be implemented.

---

# Kickoff command

Start with **GitHub issue #8 — Bootstrap TypeScript monorepo and shared configuration**.

Read all mandatory context first.

Implement only issue #8.

Create branch:

`codex/8-bootstrap-monorepo`

Complete its acceptance criteria, run tests/typecheck/lint, then open a PR to `main` with:

`Closes #8`

Stop after opening the PR and report:
- PR URL
- files changed
- tests run/results
- any blockers or decisions that affect the next issue.
