# WalkerTrade Web Signal v0.1 — Working Plan

## Objective

Build a production-ready, mobile-first signal platform that runs 24/7 on Fly.io and automatically:

1. Retrieves current market data.
2. Detects deterministic Technical + SMC candidates.
3. Adds current fundamental/economic-event context.
4. Sends only qualified candidates to VANTAGE AI.
5. Publishes validated signals.
6. Tracks every signal through its full lifecycle.
7. Delivers signal notifications to mobile.
8. Produces honest performance statistics from immutable signal history.

**Primary market for v0.1: XAU/USD.**

MT5 and live trade execution are intentionally parked.

---

# 1. Product behavior

## Signal cadence

The worker wakes frequently, but analysis is candle-driven.

- Worker loop: every 15–30 seconds.
- Main strategy evaluation: only once per newly closed M5 candle.
- M15/H1/H4 data is refreshed as required.
- Fundamental calendar cache: refresh approximately every 5 minutes.
- High-impact event state: re-check before publishing a signal.

Do not call VANTAGE AI merely because the timer fired.

## Candidate-first pipeline

```text
new M5 close
    |
fetch/validate OHLC
    |
Technical Engine
    |
SMC Engine
    |
candidate exists?
  /       \
 no       yes
 |         |
stop   Fundamental Context
           |
      VANTAGE AI
           |
  REJECT/WATCH/SIGNAL
           |
     Signal Validator
           |
        Publish
```

This keeps API cost and AI noise under control.

---

# 2. Technology decisions

## Monorepo

Use a pnpm TypeScript monorepo.

Recommended layout:

```text
WalkerTrade/
├── apps/
│   ├── web/
│   └── worker/
│
├── packages/
│   ├── core/
│   ├── config/
│   ├── db/
│   ├── market-data/
│   ├── fundamentals/
│   ├── analysis/
│   ├── vantage/
│   ├── signals/
│   └── notifications/
│
├── supabase/
│   └── migrations/
│
├── docs/
├── tests/
├── AGENTS.md
├── ARCHITECTURE.md
├── ROADMAP.md
└── WORKING_PLAN.md
```

## Web

- Next.js
- Mobile-first UI
- Server-side read endpoints where appropriate
- Supabase Auth
- Supabase Realtime for live signal updates

## Worker

- Node.js + TypeScript
- Long-running Fly.io process
- Restart-safe scheduler
- Stateless computation where possible
- Durable state in Supabase

## Database

Use Supabase from v0.1.

Required because WalkerTrade needs:
- immutable published-signal history
- lifecycle events
- AI decision audit trail
- notification subscriptions
- worker locks/checkpoints
- performance calculations

Do not store every tick.

---

# 3. Core domain model

## MarketSymbol

Fields:
- id
- canonicalSymbol
- providerSymbol
- assetClass
- enabled
- primaryTimeframe
- quoteCurrency
- metadata

v0.1 enabled symbol:
- XAU/USD

## MarketSnapshot

Contains:
- symbol
- generatedAt
- provider timestamps
- current price
- M5/M15/H1/H4 candles
- freshness status
- technical features
- SMC features
- session context

Persist only snapshots used for:
- published candidates
- AI evaluations
- debugging selected failures

## CandidateSetup

Fields:
- candidateId
- symbol
- strategyId
- direction
- detectedAt
- sourceCandleClose
- entryZone
- invalidation
- targets
- expectedRR
- technicalEvidence
- smcEvidence
- sessionContext

CandidateSetup is deterministic.

## VantageDecision

Allowed decisions:
- REJECT
- WATCH
- SIGNAL

Required:
- candidateId
- decision
- score
- technicalBias
- smcBias
- fundamentalBias
- summary
- risks
- timestamp
- schemaVersion

AI cannot create a signal for a candidate that does not exist.

## Signal

Required:
- signalId
- fingerprint
- candidateId
- symbol
- strategyId
- direction
- score
- entryMin
- entryMax
- stopLoss
- takeProfit1
- takeProfit2 optional
- expectedRR
- publishedAt
- expiresAt
- status
- reasoning summary

## SignalEvent

Append-only events:
- PUBLISHED
- ENTRY_HIT
- CANCELLED
- EXPIRED
- TP1_HIT
- TP2_HIT
- SL_HIT
- CLOSED
- INVALIDATED

Never delete/rewrite outcome events to improve statistics.

---

# 4. Database tables

Initial migration:

## market_symbols
Configuration for supported provider symbols.

## signals
Current canonical signal record.

## signal_events
Append-only lifecycle/audit history.

## candidate_setups
Deterministic candidates that reached AI evaluation.

## ai_decisions
Raw validated AI decision + model/provider metadata.

## market_snapshots
Only important snapshots; no tick warehouse.

## economic_events
Cached relevant calendar events.

## notification_subscriptions
Telegram/web-push destination and preferences.

## worker_runs
Run ID, timestamps, state, result and errors.

## worker_locks
Optional lock/checkpoint to prevent duplicate processing after restart.

Indexes must cover:
- symbol + published_at
- signal status
- signal fingerprint
- event signal_id + created_at
- candidate source candle
- economic event time + importance

---

# 5. Market-data pipeline

## Provider adapter

Start with Twelve Data behind this interface:

```ts
interface MarketDataProvider {
  getCandles(input): Promise<CandleSeries>
  getQuote(symbol): Promise<Quote>
}
```

No business logic may depend directly on Twelve Data response shapes.

## Required candle history

For each evaluation obtain enough bars for deterministic features.

Recommended minimum:
- M5: 300 bars
- M15: 300 bars
- H1: 250 bars
- H4: 200 bars

Exact requirements should be encoded by the analysis engine rather than scattered across callers.

## Data validation

Reject a scan when:
- candle timestamps are malformed
- latest required candle is stale
- duplicate candle timestamps exist
- required timeframe has insufficient history
- obvious gap/provider failure prevents trustworthy analysis

Rate-limit errors:
- retry with bounded exponential backoff
- never convert failure into zero/empty market values

---

# 6. Technical engine

All technical calculations are deterministic pure functions where possible.

Implement:
- EMA20
- EMA50
- RSI
- ATR
- swing highs/lows
- trend/regime
- previous day high/low
- previous week high/low
- volatility expansion/contraction
- session classification

Output a TechnicalContext, not a BUY/SELL decision.

Unit-test all indicator calculations with fixtures.

---

# 7. SMC engine

Implement explicit definitions; avoid visual/subjective-only concepts.

## Structure
- HH/HL/LH/LL
- BOS
- CHOCH/MSS

## Liquidity
- swing liquidity
- equal highs/lows with tolerance
- previous-day liquidity
- session high/low
- sweep detection

## Delivery
- displacement
- Fair Value Gap
- premium/discount
- order-block candidate zone

Every detected primitive must contain:
- timeframe
- start/end timestamps
- price level/zone
- confidence/evidence fields

The engine must be explainable from stored data.

---

# 8. Strategy candidates

Implement exactly four strategy IDs in v0.1:

## WT-SMC-LSR
Liquidity Sweep Reversal.

## WT-SMC-TC
Trend Continuation.

## WT-SMC-BR
Breakout + Retest.

## WT-SMC-REV
HTF Reversal.

Each strategy module returns either:
- no candidate
- one or more CandidateSetup objects

Candidate generation must include:
- direction
- entry zone
- structural invalidation
- target liquidity
- expected RR
- evidence

AI must not invent missing entry/SL/TP geometry.

---

# 9. Fundamental engine

Start with Trading Economics behind a provider interface.

```ts
interface FundamentalProvider {
  getEconomicCalendar(window): Promise<EconomicEvent[]>
}
```

v0.1 focus for XAU/USD:
- FOMC / Fed events
- CPI
- PCE
- NFP
- unemployment
- GDP
- PMI
- retail sales

Classify events:
- LOW
- MEDIUM
- HIGH

Create event windows:
- PRE_EVENT_LOCK
- ACTIVE_EVENT
- POST_EVENT_VOLATILITY
- NORMAL

Initial rule:
high-impact USD event inside configured pre-event window prevents a new published signal unless a later issue explicitly creates a news-trading strategy.

Fundamental context must contain source timestamp and freshness.

---

# 10. VANTAGE AI

VANTAGE is called only after deterministic candidate creation.

## Input

- normalized candidate
- technical context
- SMC context
- latest relevant fundamental events
- session/volatility context
- no account/execution data

## Output

Strict JSON validated with a shared schema.

Allowed:
- REJECT
- WATCH
- SIGNAL

VANTAGE may:
- evaluate confluence
- identify conflicts
- score the setup
- summarize rationale
- flag risks

VANTAGE may not:
- fabricate market data
- alter source candles
- invent an unrelated setup
- create a candidate from nothing

## Thresholds

- <75: REJECT
- 75–79: WATCH internal
- 80–84: watch/early setup
- 85–89: valid signal
- >=90: A+ signal

The Signal Validator owns the final publish threshold.

---

# 11. Signal validator

Before publishing:

- schema valid
- candidate still fresh
- price has not invalidated entry logic
- RR >= 1.5
- no high-impact lockout
- fingerprint is not already active/recent
- expiry is valid
- score satisfies publish threshold
- all source data timestamps pass freshness rules

Signal fingerprint should include enough setup identity to prevent repeated messages from the same thesis while still allowing a genuinely new setup later.

---

# 12. Signal lifecycle tracker

The worker monitors all active signals against current market data.

Example:

```text
PUBLISHED
  |
  +-> ENTRY_HIT -> TP1_HIT -> TP2_HIT -> CLOSED
  |
  +-> ENTRY_HIT -> SL_HIT -> CLOSED
  |
  +-> CANCELLED
  |
  +-> EXPIRED
```

Define deterministic rules for:
- what counts as entry hit
- wick vs close handling
- same-candle SL/TP ambiguity
- gap behavior
- signal expiry
- partial target outcome

Ambiguous historical candle ordering must be handled conservatively and flagged rather than guessed.

---

# 13. Notifications

## Telegram first

Publish:
- NEW SIGNAL
- SIGNAL CANCELLED
- ENTRY HIT
- TP1
- TP2
- SL
- EXPIRED

Telegram gives a fast mobile channel while PWA push is being implemented.

## Web Push

Add after dashboard baseline:
- service worker
- push subscription persistence
- notification permission UI
- deep link to signal detail

Notification delivery must be idempotent.

---

# 14. Web application

## Dashboard
Show:
- worker health
- provider health
- current XAU/USD price
- H4/H1 bias summary
- latest signal
- active signal count
- latest important event

## Signals
Cards optimized for mobile:
- BUY/SELL
- score
- strategy
- entry
- SL
- TP1/TP2
- RR
- status
- age/expiry

## Signal detail
Show:
- Technical analysis
- SMC evidence
- Fundamental context
- VANTAGE reasoning
- lifecycle timeline
- market snapshot metadata

## Calendar
Relevant high-impact events.

## History
Filter by:
- strategy
- direction
- score
- result
- date

## Performance
At minimum:
- signal count
- win/loss/expired/cancelled
- realized R
- average R
- win rate
- strategy breakdown
- score-bucket breakdown

Avoid vanity metrics that ignore cancelled/expired signals.

---

# 15. Fly.io topology

Use separate Fly runtime responsibilities.

## walkertrade-web
- serves Next.js
- authentication
- dashboard/API reads
- health endpoint

## walkertrade-worker
- always-on scanner
- lifecycle tracking
- fundamental refresh
- notifications

Worker requirements:
- one active scanner leader
- recover cleanly after restart
- prevent re-processing same M5 close
- health/heartbeat written to Supabase

Secrets live in Fly/Supabase environment configuration, never Git.

---

# 16. Testing strategy

## Unit
- indicators
- swings
- BOS/CHOCH
- sweep detection
- FVG
- RR math
- fingerprints
- signal transitions

## Provider contract
Use recorded fixtures for Twelve Data and Trading Economics.

## AI
Mock deterministic VANTAGE responses.
Test malformed/timeout/refusal paths.

## Integration
Replay historical candle fixtures through:

```text
market snapshot
-> candidate
-> mocked VANTAGE
-> signal
-> lifecycle
```

## E2E
- auth
- dashboard
- live signal appears
- detail route
- history
- notification subscription

No production provider is required for CI.

---

# 17. Observability

Structured JSON logs.

Every scan should have:
- runId
- source candle timestamp
- symbol
- stage
- duration
- candidate count
- AI called yes/no
- publish count
- error code if any

Health:
- web alive
- worker heartbeat
- market provider freshness
- fundamental provider freshness
- Supabase connectivity
- last successful M5 evaluation

---

# 18. Codex execution model

Codex should implement this project issue-by-issue.

## Rules

1. Do not give Codex one giant “build the app” task.
2. Each issue must produce one reviewable PR.
3. Shared contracts land before dependent features.
4. Provider adapters land before analysis orchestration.
5. Deterministic analysis lands before VANTAGE.
6. Signal persistence lands before dashboard features.
7. Fly deployment lands only after local integration works.

## Recommended waves

### Wave A — Foundation
Can be mostly sequential:
- repo/tooling
- domain schemas
- Supabase schema

### Wave B — Data
Can run in parallel after schemas:
- Twelve Data adapter
- Trading Economics adapter

### Wave C — Analysis
After market contracts:
- Technical engine
- SMC primitives
- Strategy candidates

### Wave D — Intelligence + signals
- VANTAGE
- signal validator
- lifecycle tracker

### Wave E — Product
Can partially run in parallel:
- dashboard
- signal pages
- notifications
- performance analytics

### Wave F — Production
- Fly deployment
- observability
- shadow-mode launch

---

# 19. Launch gates

Do not call v0.1 production-ready until:

- worker survives restart without duplicate scans/signals
- stale provider data cannot produce a signal
- duplicate thesis cannot spam notifications
- signal outcomes are tracked automatically
- all published signals are auditable back to source data
- AI malformed output is rejected
- high-impact event lock works
- mobile dashboard works
- Telegram notification works
- Fly health checks pass
- at least one continuous shadow-mode period completes without critical errors

---

# 20. Deferred scope

Explicitly not part of Web Signal v0.1:
- MT5
- auto execution
- funded-account risk engine
- broker connectivity
- copy trading
- user billing/subscriptions
- social/community features
- dozens of strategy variants

These can be introduced only after the signal engine has measurable real-world performance.
