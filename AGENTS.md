# WalkerTrade Agent Contract

## VANTAGE

Role: market intelligence and strategy.

Inputs:
- MT5 price/market data
- multi-timeframe structure
- technical features
- SMC features
- account-neutral market context
- fundamental/news context when available

Outputs:
- WAIT
- REJECT
- TRADE_PROPOSAL
- THESIS_UPDATE

VANTAGE must never:
- choose final lot size
- bypass AEGIS
- directly place MT5 orders

## AEGIS

Role: deterministic risk guard and execution authority.

Inputs:
- VANTAGE proposal
- live MT5 account state
- symbol specifications
- current positions/orders
- configured funded-account limits

Outputs:
- APPROVED
- REJECTED
- EXECUTION_REPORT
- POSITION_ACTION

AEGIS must never:
- invent an independent market thesis
- increase risk after a loss
- bypass configured hard limits

## Chain of authority

```text
VANTAGE -> AEGIS -> MT5
```

A trade is invalid if it skips any stage.
