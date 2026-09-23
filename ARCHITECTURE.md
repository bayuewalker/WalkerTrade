# WalkerTrade Architecture

WalkerTrade is an AI-assisted autonomous trading system for MetaTrader 5.

## v0.1 scope

- Primary market: XAUUSD
- Analysis: Technical + Smart Money Concepts (SMC) + Fundamental context
- AI role: contextual analysis, setup scoring, trade proposal, position review
- Deterministic role: risk limits, position sizing, execution validation, duplicate prevention
- Runtime: MT5 Expert Advisor
- Optional observer layer later: signal web app / notifications

## Core flow

```text
MT5 market/account data
        |
        v
Technical Engine
        |
        v
SMC Engine
        |
        v
Fundamental Context
        |
        v
VANTAGE AI
TRADE / WAIT / REJECT
        |
        v
AEGIS Risk Guard
        |
        v
WalkerTrade EA
        |
        v
MT5 execution
```

## Responsibilities

### VANTAGE
- Analyze H4/H1/M15/M5 context
- Technical analysis
- SMC analysis
- Fundamental context
- Score candidate setups
- Produce structured trade proposals
- Review open-position thesis

VANTAGE must not calculate final lot size or bypass hard risk rules.

### AEGIS
- Validate account state
- Enforce drawdown limits
- Calculate final lot size
- Reject stale/duplicate/unsafe trades
- Enforce mandatory stop loss
- Execute, modify, partially close, and close positions

AEGIS must remain deterministic for hard risk controls.

## v0.1 strategies

1. WT-SMC-LSR — Liquidity Sweep Reversal
2. WT-SMC-TC — Trend Continuation
3. WT-SMC-BR — Breakout + Retest
4. WT-SMC-REV — HTF Reversal

## Default timeframes

- H4: market regime
- H1: directional bias
- M15: setup
- M5: execution confirmation

## Safety principles

- No martingale
- No revenge trading
- No uncontrolled grid
- No widening stop loss
- No duplicate trade IDs
- No AI-controlled final position sizing
- Fail closed when account, market, or AI state is ambiguous
