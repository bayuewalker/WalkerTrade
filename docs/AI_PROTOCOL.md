# VANTAGE Web Signal Protocol

## Pipeline and ownership

```text
MarketSnapshot -> TechnicalContext + SmcContext -> CandidateSetup
                                                  + FundamentalContext
                                                        -> VantageRequest
                                                        -> VantageDecision
                                                        -> Signal + SignalEvent
```

`@walkertrade/core` is the canonical runtime-schema module. The market-data, analysis,
fundamentals, vantage, and signals packages re-export their respective contracts.

| Contract                                     | Owner                          |
| -------------------------------------------- | ------------------------------ |
| Candle, CandleSeries, Quote, MarketSnapshot  | market-data adapter/normalizer |
| TechnicalContext, SmcContext, CandidateSetup | deterministic engines          |
| FundamentalContext                           | fundamental provider/cache     |
| VantageRequest, VantageDecision              | VANTAGE boundary               |
| Signal, SignalEvent                          | signal engine                  |

## Conventions and validation

- All schemas are strict Zod objects: unknown fields fail validation.
- `schemaVersion` is the exact protocol version, currently `1.0.0`.
- Every timestamp is ISO-8601 UTC with milliseconds (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Prices, scores, R:R, volumes, and freshness ages are finite numbers. NaN and Infinity fail.
- Freshness is explicit: `FRESH`, `STALE`, or `UNKNOWN`, with source/observation timestamps and
  age bounds. A VANTAGE request rejects stale or unknown inputs.
- A candidate entry zone has `minimum <= maximum`; BUY geometry requires stop below entry and
  targets above it (the inverse applies to SELL).

## VANTAGE authority

The deterministic engine owns candles, quote values, technical/SMC evidence, candidate identity,
entry zone, invalidation, targets, and R:R. VANTAGE may only choose `REJECT`, `WATCH`, or
`SIGNAL`, assign a bounded 0–100 score, give three directional biases, summarize confluence, and
list risks. It cannot add market/candle fields or replace candidate geometry: the response schema
has no such fields and rejects unknown properties.

Call `validateVantageDecision(knownCandidate, rawResponse)` before use. It rejects malformed
objects, mismatched candidate IDs, version mismatches, and decisions older than five minutes (or
the caller-supplied maximum). The caller must obtain `knownCandidate` from deterministic state;
therefore an AI response cannot create a decision for an unknown candidate.

## Example payloads

The following candidate is valid deterministic input (evidence objects include kind, timeframe,
summary, and UTC observation time):

```json
{
  "candidateId": "candidate-xau-001",
  "schemaVersion": "1.0.0",
  "symbol": "XAU/USD",
  "strategyId": "WT-SMC-LSR",
  "direction": "BUY",
  "detectedAt": "2026-09-23T12:00:00.000Z",
  "sourceCandleClose": "2026-09-23T12:00:00.000Z",
  "marketSnapshotId": "snapshot-xau-001",
  "entryZone": { "minimum": 2650, "maximum": 2652 },
  "invalidation": { "price": 2645, "rationale": "Below swing low" },
  "targets": [{ "targetId": "tp1", "price": 2660, "rationale": "Buy-side liquidity" }],
  "expectedRR": 2,
  "technicalEvidence": [
    {
      "kind": "EMA_ALIGNMENT",
      "timeframe": "H1",
      "summary": "Bullish",
      "observedAt": "2026-09-23T12:00:00.000Z"
    }
  ],
  "smcEvidence": [
    {
      "kind": "LIQUIDITY_SWEEP",
      "timeframe": "M5",
      "summary": "Sweep confirmed",
      "observedAt": "2026-09-23T12:00:00.000Z"
    }
  ],
  "sessionContext": { "name": "LONDON", "observedAt": "2026-09-23T12:00:00.000Z" }
}
```

Decision examples (each also requires the same `candidateId`, `schemaVersion`, three biases,
`summary`, `risks`, and `timestamp`):

```json
{
  "candidateId": "candidate-xau-001",
  "schemaVersion": "1.0.0",
  "decision": "REJECT",
  "score": 60,
  "technicalBias": "NEUTRAL",
  "smcBias": "BEARISH",
  "fundamentalBias": "NEUTRAL",
  "summary": "Insufficient confluence",
  "risks": ["Weak displacement"],
  "timestamp": "2026-09-23T12:00:00.000Z"
}
```

```json
{
  "candidateId": "candidate-xau-001",
  "schemaVersion": "1.0.0",
  "decision": "WATCH",
  "score": 78,
  "technicalBias": "BULLISH",
  "smcBias": "BULLISH",
  "fundamentalBias": "NEUTRAL",
  "summary": "Wait for confirmation",
  "risks": ["Event proximity"],
  "timestamp": "2026-09-23T12:00:00.000Z"
}
```

```json
{
  "candidateId": "candidate-xau-001",
  "schemaVersion": "1.0.0",
  "decision": "SIGNAL",
  "score": 86,
  "technicalBias": "BULLISH",
  "smcBias": "BULLISH",
  "fundamentalBias": "NEUTRAL",
  "summary": "Confluence confirmed",
  "risks": ["Normal volatility risk"],
  "timestamp": "2026-09-23T12:00:00.000Z"
}
```

Malformed output is never coerced, partially repaired, or published. Treat any validation failure
as a rejected AI response, log the error safely, and preserve the deterministic candidate for audit.
