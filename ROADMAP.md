# WalkerTrade Roadmap

## Current milestone — Web Signal v0.1

Goal: a 24/7 Fly.io service that automatically analyzes XAU/USD using Technical + SMC + Fundamental context + VANTAGE AI, publishes high-quality signals, and notifies the user.

### Phase 0 — Foundation
- [ ] Initialize TypeScript monorepo and local developer workflow
- [ ] Add environment/config validation
- [ ] Add structured logging
- [ ] Define shared domain models and strict schemas
- [ ] Provision Supabase schema and migrations

### Phase 1 — Market Data
- [ ] Twelve Data REST adapter
- [ ] Normalize OHLC for M5/M15/H1/H4
- [ ] Freshness / gap / rate-limit handling
- [ ] Symbol registry
- [ ] New-M5-candle detector

### Phase 2 — Analysis Engine
- [ ] Technical indicators and market regime
- [ ] SMC primitives
- [ ] WT-SMC-LSR
- [ ] WT-SMC-TC
- [ ] WT-SMC-BR
- [ ] WT-SMC-REV
- [ ] Candidate pre-filter and scoring inputs

### Phase 3 — Fundamental Context
- [ ] Trading Economics adapter
- [ ] Economic-calendar cache
- [ ] High-impact event classification
- [ ] Pre/post-event signal guard
- [ ] Fundamental-context payload for AI

### Phase 4 — VANTAGE AI
- [ ] Provider abstraction
- [ ] Strict request/response schema
- [ ] Prompt and scoring contract
- [ ] Timeout/retry/error handling
- [ ] AI audit logging
- [ ] Mock provider for tests

### Phase 5 — Signal Engine
- [ ] Signal validation
- [ ] Signal fingerprint/deduplication
- [ ] Setup expiry
- [ ] Lifecycle state machine
- [ ] Entry/TP/SL outcome tracker
- [ ] Immutable event history

### Phase 6 — Web App
- [ ] Authentication
- [ ] Mobile-first dashboard
- [ ] Live signals
- [ ] Signal detail + AI reasoning
- [ ] Markets overview
- [ ] Economic calendar
- [ ] Signal history
- [ ] Performance dashboard
- [ ] System/worker health

### Phase 7 — Notifications
- [ ] Telegram notifications
- [ ] PWA/Web Push
- [ ] Notification preferences
- [ ] Signal/update/cancel/outcome templates
- [ ] Deduplicate notification delivery

### Phase 8 — Fly.io Production
- [ ] Web deployment
- [ ] Worker deployment
- [ ] Secrets/config
- [ ] Health checks
- [ ] Restart-safe scheduler
- [ ] Observability
- [ ] Production smoke test

### Phase 9 — Validation
- [ ] Shadow mode
- [ ] Minimum signal sample
- [ ] Strategy-by-strategy analytics
- [ ] Score-bucket analytics
- [ ] Session analytics
- [ ] Data-provider reconciliation

## Later milestones

### Web Signal v0.2
- Major Forex pairs
- BTC / ETH
- Better macro/rates context
- Advanced performance analytics
- User-configurable watchlists

### MT5 / Auto Trade
Parked until the signal engine demonstrates stable behavior and measurable edge.
