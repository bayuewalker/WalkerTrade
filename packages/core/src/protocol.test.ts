import { describe, expect, it } from 'vitest';

import {
  CandidateSetupSchema,
  PROTOCOL_SCHEMA_VERSION,
  VantageDecisionSchema,
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

describe('VANTAGE protocol schemas', () => {
  it('accepts a structurally valid deterministic candidate', () => {
    expect(CandidateSetupSchema.parse(candidate)).toMatchObject(candidate);
  });

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
});
