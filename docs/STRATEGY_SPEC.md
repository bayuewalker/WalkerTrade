# Strategy Specification v0.1

## Analysis stack

WalkerTrade combines:
- Technical Analysis
- Smart Money Concepts
- Fundamental Context
- AI contextual reasoning

AI is a filter and decision layer, not the sole source of truth.

## Market regime

Classify:
- TRENDING_UP
- TRENDING_DOWN
- RANGING
- HIGH_VOLATILITY
- LOW_VOLATILITY
- NEWS_RISK

Use H4/H1 structure, ATR, swings, EMA20/EMA50, and volatility expansion.

## SMC primitives

Detect:
- HH / HL / LH / LL
- BOS
- CHOCH / MSS
- Buy-side liquidity
- Sell-side liquidity
- Equal highs/lows
- Previous day high/low
- Session highs/lows
- Swing highs/lows
- Displacement
- Fair Value Gap
- Order Block
- Premium / Discount

## Strategy rules

### WT-SMC-LSR
Liquidity Sweep Reversal:
1. Price reaches meaningful HTF/session liquidity.
2. Liquidity is swept.
3. Displacement appears.
4. M5/M15 MSS or CHOCH confirms reversal.
5. Retracement reaches FVG / valid execution zone.
6. Structural stop exists.
7. Expected RR >= 1.5.

### WT-SMC-TC
Trend Continuation:
1. H4/H1 directional trend is established.
2. Pullback occurs into valid location.
3. Counter-trend liquidity is taken.
4. LTF structure realigns with HTF.
5. Entry is not extended.

### WT-SMC-BR
Breakout + Retest:
1. Meaningful structure is broken with displacement.
2. Breakout is not a weak wick-only break.
3. Retest holds.
4. Sufficient room remains to opposing liquidity.

### WT-SMC-REV
HTF Reversal:
1. Price reaches H4/H1 premium/discount extreme or major level.
2. Significant liquidity event occurs.
3. LTF reversal structure confirms.
4. Fundamental/news context does not invalidate the setup.

## AI score

- HTF structure: 15
- Liquidity event: 20
- SMC confirmation: 20
- Momentum/displacement: 10
- Entry quality: 10
- Fundamental alignment: 15
- Session/volatility: 5
- Risk/reward: 5

Thresholds:
- <75: reject
- 75-79: watch
- 80-84: signal only
- >=85: auto-trade eligible, still subject to AEGIS
