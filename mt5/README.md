# MT5 Runtime

This directory will contain the WalkerTrade Expert Advisor and include modules.

Planned layout:

```text
mt5/
├── WalkerTradeAI.mq5
└── Include/
    ├── WT_MarketData.mqh
    ├── WT_Technical.mqh
    ├── WT_SMC.mqh
    ├── WT_AIClient.mqh
    ├── WT_Json.mqh
    ├── WT_RiskGuard.mqh
    ├── WT_PositionSizer.mqh
    ├── WT_Executor.mqh
    ├── WT_PositionManager.mqh
    └── WT_Logger.mqh
```

The EA will use WebRequest for AI integration in live mode.

Testing modes will be separated:
- LIVE
- MOCK
- REPLAY
