# WalkerTrade Architecture

WalkerTrade v0.1 is a 24/7 AI-assisted market analysis and signal platform.

**Current product scope is signal generation only. MT5 execution is parked for a later phase.**

## Runtime

- **Fly.io** — web/API + persistent market worker
- **Supabase** — PostgreSQL, Auth, Realtime, signal history and audit state
- **Twelve Data** — OHLC/current market data
- **Trading Economics** — economic calendar and macro/fundamental context
- **VANTAGE AI** — contextual reasoning and final setup evaluation
- **Telegram + Web Push** — signal notifications

## v0.1 markets

Primary:
- XAU/USD

Secondary after XAU pipeline is stable:
- EUR/USD
- GBP/USD
- USD/JPY
- BTC/USD
- ETH/USD

## Analysis timeframes

- H4: market regime
- H1: directional bias
- M15: setup
- M5: execution-quality signal timing
- D1: optional macro structure/context

## Core flow

```text
Twelve Data                  Trading Economics
OHLC / current price         Calendar / macro context
        |                           |
        v                           v
Market Normalizer        Fundamental Context Cache
        |                           |
        +-------------+-------------+
                      |
                      v
          Deterministic Analysis
          Technical + SMC Engine
                      |
                candidate?
                 /       \
               no         yes
               |           |
             stop          v
                      VANTAGE AI
                   TRADE/WATCH/REJECT
                         |
                  Signal Validator
                         |
             dedupe / expiry / RR
                         |
                         v
                      Supabase
                signal + audit trail
                    /          \
                   v            v
             WalkerTrade Web   Notification
                              Telegram/Push
```

## Analysis layers

### Technical
- market regime
- EMA20 / EMA50
- RSI momentum filter
- ATR / volatility
- swing structure
- support/resistance
- previous day/week high-low
- session context

### Smart Money Concepts
- BOS
- CHOCH / MSS
- buy-side / sell-side liquidity
- equal highs / lows
- liquidity sweep
- displacement
- Fair Value Gap
- premium / discount
- order-block candidate zones
- session highs / lows

### Fundamental
- high-impact economic calendar
- CPI / PCE / NFP / unemployment
- FOMC / central-bank events
- GDP / PMI / retail sales
- USD and rates context when available
- event-risk lockout

## Strategy set

1. **WT-SMC-LSR** — Liquidity Sweep Reversal
2. **WT-SMC-TC** — Trend Continuation
3. **WT-SMC-BR** — Breakout + Retest
4. **WT-SMC-REV** — HTF Reversal

## Signal thresholds

- Score < 75: REJECT
- 75–79: internal WATCH
- 80–84: watch/early setup; optional notification
- 85–89: VALID SIGNAL
- 90+: A+ SIGNAL

Minimum expected R:R: **1.5**
Preferred expected R:R: **2.0+**

## Persistence policy

Supabase is used from v0.1 because the product requires durable signal history and lifecycle tracking.

Persist:
- published signals
- signal events
- candidate snapshots used by AI
- AI decisions
- economic-event cache
- notification subscriptions
- worker/system health

Do **not** persist every market tick.

## Deployment model

Use two long-running Fly.io processes/apps:

```text
walkertrade-web
- Next.js web UI
- read API
- auth
- realtime signal views

walkertrade-worker
- scheduler
- market ingestion
- Technical/SMC analysis
- fundamental context
- VANTAGE AI
- lifecycle tracking
- notifications
```

The worker is the source of signal-generation truth.

## Reliability rules

- No signal from stale/incomplete market data.
- No fabricated fundamental/news data.
- AI is called only after deterministic candidate filtering.
- All AI output uses strict validated JSON.
- Duplicate signals are rejected.
- Every published signal has a deterministic ID/fingerprint and expiry.
- Historical signal outcomes must never be edited to improve performance statistics.
- MT5 execution code is out of scope for v0.1.
