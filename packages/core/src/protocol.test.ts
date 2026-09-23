import { describe, expect, it } from 'vitest';

import {
  CandidateSetupSchema,
  MarketSnapshotSchema,
  PROTOCOL_SCHEMA_VERSION,
  VantageDecisionSchema,
  VantageRequestSchema,
  validateVantageDecision,
} from './protocol.js';
import type { CandidateSetup } from './protocol.js';

const timestamp = '2026-09-23T12:00:00.000Z';
const candidate: CandidateSetup = {
  candidateId: 'candidate-xau-001',
  schemaVersion: PROTOCOL_SCHEMA_VERSION,
  symbol: 'XAU/USD',
  strategyId: 'WT-SMC-LSR',
  direction: 'BUY',
  detectedAt: timestamp,
  sourceCandleClose: timestamp,
  marketSnapshotId: 'snapshot-xau-001',
  entryZone: { minimum: 2650, maximum: 2652 },
  invalidation: { price: 2645, rationale: 'Below the swept swing low.' },
  targets: [{ targetId: 'tp1', price: 2660, rationale: 'Buy-side liquidity.' }],
  expectedRR: 2,
  technicalEvidence: [
    {
      kind: 'EMA_ALIGNMENT',
      timeframe: 'H1',
      summary: 'EMA20 above EMA50.',
      observedAt: timestamp,
    },
  ],
  smcEvidence: [
    {
      kind: 'LIQUIDITY_SWEEP',
      timeframe: 'M5',
      summary: 'Sell-side liquidity swept.',
      observedAt: timestamp,
    },
  ],
  sessionContext: { name: 'LONDON', observedAt: timestamp },
};

const decision = {
  candidateId: candidate.candidateId,
  schemaVersion: PROTOCOL_SCHEMA_VERSION,
  decision: 'SIGNAL',
  score: 86,
  technicalBias: 'BULLISH',
  smcBias: 'BULLISH',
  fundamentalBias: 'NEUTRAL',
  summary: 'Confluence confirms the deterministic setup.',
  risks: ['Upcoming USD event window'],
  timestamp,
};

const fresh = {
  status: 'FRESH' as const,
  sourceTimestamp: timestamp,
  observedAt: timestamp,
  ageMs: 1_000,
  maxAgeMs: 60_000,
};

function createSeries(timeframe: 'M5' | 'M15' | 'H1' | 'H4') {
  return {
    symbol: 'XAU/USD',
    timeframe,
    provider: 'fixture',
    fetchedAt: timestamp,
    freshness: fresh,
    candles: [
      {
        symbol: 'XAU/USD',
        timeframe,
        openTime: '2026-09-23T11:55:00.000Z',
        closeTime: timestamp,
        open: 2650,
        high: 2652,
        low: 2649,
        close: 2651,
        volume: 100,
        isClosed: true,
      },
    ],
  };
}

const marketSnapshot = {
  snapshotId: candidate.marketSnapshotId,
  schemaVersion: PROTOCOL_SCHEMA_VERSION,
  symbol: candidate.symbol,
  generatedAt: timestamp,
  quote: {
    symbol: candidate.symbol,
    provider: 'fixture',
    price: 2651,
    asOf: timestamp,
    freshness: fresh,
  },
  candles: {
    M5: createSeries('M5'),
    M15: createSeries('M15'),
    H1: createSeries('H1'),
    H4: createSeries('H4'),
  },
  freshness: fresh,
};

const vantageRequest = {
  requestId: 'request-xau-001',
  schemaVersion: PROTOCOL_SCHEMA_VERSION,
  requestedAt: timestamp,
  candidate,
  marketSnapshot,
  technicalContext: {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    snapshotId: marketSnapshot.snapshotId,
    computedAt: timestamp,
    freshness: fresh,
    marketRegime: 'TRENDING_UP',
    h4Bias: 'BULLISH',
    h1Bias: 'BULLISH',
    indicators: { ema20: 2650, ema50: 2648, rsi: 55, atr: 10 },
    sessionContext: candidate.sessionContext,
    evidence: candidate.technicalEvidence,
  },
  smcContext: {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    snapshotId: marketSnapshot.snapshotId,
    computedAt: timestamp,
    freshness: fresh,
    structure: [],
    liquidity: [],
    evidence: candidate.smcEvidence,
  },
  fundamentalContext: {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    symbol: candidate.symbol,
    generatedAt: timestamp,
    freshness: fresh,
    eventRisk: 'NORMAL',
    events: [],
    summary: 'No high-impact event lockout.',
  },
};

function nonFresh(status: 'STALE' | 'UNKNOWN') {
  return status === 'STALE' ? { ...fresh, status, ageMs: 60_001 } : { ...fresh, status };
}

describe('VANTAGE protocol schemas', () => {
  it('accepts a structurally valid deterministic candidate', () => {
    expect(CandidateSetupSchema.parse(candidate)).toMatchObject(candidate);
  });

  it.each([
    ['M5', 'M15'],
    ['M15', 'H1'],
    ['H1', 'H4'],
    ['H4', 'M5'],
  ] as const)('rejects a %s snapshot key containing a %s series', (key, wrongTimeframe) => {
    expect(
      MarketSnapshotSchema.safeParse({
        ...marketSnapshot,
        candles: { ...marketSnapshot.candles, [key]: createSeries(wrongTimeframe) },
      }).success,
    ).toBe(false);
  });

  it.each(['quote', 'M5', 'M15', 'H1', 'H4'] as const)(
    'fails closed when nested %s data is stale or unknown',
    (target) => {
      for (const status of ['STALE', 'UNKNOWN'] as const) {
        const snapshot =
          target === 'quote'
            ? { ...marketSnapshot, quote: { ...marketSnapshot.quote, freshness: nonFresh(status) } }
            : {
                ...marketSnapshot,
                candles: {
                  ...marketSnapshot.candles,
                  [target]: { ...marketSnapshot.candles[target], freshness: nonFresh(status) },
                },
              };
        expect(
          VantageRequestSchema.safeParse({ ...vantageRequest, marketSnapshot: snapshot }).success,
        ).toBe(false);
      }
    },
  );

  it.each([
    ['strategy ID', { ...candidate, strategyId: 'UNSUPPORTED' }],
    ['direction', { ...candidate, direction: 'LONG' }],
    ['non-finite R:R', { ...candidate, expectedRR: Number.POSITIVE_INFINITY }],
    ['inverted entry zone', { ...candidate, entryZone: { minimum: 2652, maximum: 2650 } }],
    [
      'invalid BUY geometry',
      { ...candidate, invalidation: { ...candidate.invalidation, price: 2650 } },
    ],
  ])('rejects an invalid %s', (_name, invalidCandidate) => {
    expect(CandidateSetupSchema.safeParse(invalidCandidate).success).toBe(false);
  });

  it('rejects malformed AI output, missing fields, and fabricated geometry', () => {
    expect(VantageDecisionSchema.safeParse({ ...decision, score: Number.NaN }).success).toBe(false);
    expect(VantageDecisionSchema.safeParse({ ...decision, score: -1 }).success).toBe(false);
    expect(VantageDecisionSchema.safeParse({ ...decision, score: 101 }).success).toBe(false);
    expect(
      VantageDecisionSchema.safeParse({ ...decision, timestamp: 'not-a-timestamp' }).success,
    ).toBe(false);
    expect(VantageDecisionSchema.safeParse({ ...decision, risks: undefined }).success).toBe(false);
    expect(
      VantageDecisionSchema.safeParse({ ...decision, entryZone: candidate.entryZone }).success,
    ).toBe(false);
  });

  it('fails closed when the decision does not reference the known candidate or is stale', () => {
    expect(
      validateVantageDecision(
        candidate,
        { ...decision, candidateId: 'unknown' },
        new Date(timestamp),
      ),
    ).toMatchObject({ success: false, code: 'UNKNOWN_CANDIDATE' });
    expect(
      validateVantageDecision(candidate, decision, new Date('2026-09-23T12:06:00.000Z')),
    ).toMatchObject({ success: false, code: 'STALE_VANTAGE_RESPONSE' });
  });

  it('accepts a fresh, schema-valid decision for the known candidate', () => {
    expect(
      validateVantageDecision(candidate, decision, new Date('2026-09-23T12:01:00.000Z')),
    ).toMatchObject({ success: true, data: decision });
  });

  it.each(['REJECT', 'WATCH', 'SIGNAL'] as const)('accepts a valid %s decision', (decisionType) => {
    expect(VantageDecisionSchema.safeParse({ ...decision, decision: decisionType }).success).toBe(
      true,
    );
  });
});
