# AEGIS Risk Engine v0.1

Hard risk rules must be deterministic and local to the EA.

## Initial internal limits

- Normal risk per trade: 0.25% equity
- High-conviction maximum: 0.40%
- Absolute per-trade maximum: 0.50%
- Maximum aggregate active risk: 0.75%
- Internal daily soft stop: -1.00%
- Internal daily hard stop: -1.50%
- Maximum one active directional XAUUSD idea

External prop-firm rules must be configurable and treated as hard boundaries.

## Required pre-trade checks

1. Correct account
2. Trading permission enabled
3. Symbol tradable
4. Live price available
5. Spread within configured maximum
6. Proposal not expired
7. Unique trade ID
8. No duplicate exposure
9. Stop loss exists
10. Risk/reward >= configured minimum
11. Daily loss limit safe
12. Maximum drawdown safe
13. Aggregate exposure safe
14. Lot size recalculated locally

## Position sizing

AI never controls final volume.

Volume must be calculated from:
- current equity
- approved risk %
- entry
- stop-loss distance
- tick size
- tick value
- broker volume step/min/max

## Fail-closed conditions

Reject new execution when:
- account state is unavailable
- market data is stale
- AI response is malformed
- symbol specification cannot be read
- position/order state is ambiguous
- risk cannot be calculated safely

## Prohibited behavior

- Martingale
- Revenge trading
- Uncontrolled averaging down
- Uncontrolled grid
- Widening stop loss to avoid a loss
- Removing stop protection
