import { z } from 'zod';

export const PROTOCOL_SCHEMA_VERSION = '1.0.0' as const;

const finiteNumber = z.number().finite();
const positiveNumber = finiteNumber.positive();
const nonNegativeInteger = z.number().int().finite().nonnegative();
const identifier = z.string().trim().min(1).max(128);

/** ISO-8601 timestamps are always UTC with millisecond precision, for example 2026-09-23T12:00:00.000Z. */
export const UtcTimestampSchema = z
  .string()
  .datetime({ offset: true, precision: 3 })
  .refine((value) => value.endsWith('Z'), 'Timestamp must use UTC (Z) notation.');

export const DirectionSchema = z.enum(['BUY', 'SELL']);
export const TimeframeSchema = z.enum(['M5', 'M15', 'H1', 'H4', 'D1']);
export const StrategyIdSchema = z.enum(['WT-SMC-LSR', 'WT-SMC-TC', 'WT-SMC-BR', 'WT-SMC-REV']);
export const BiasSchema = z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']);

export const FreshnessSchema = z
  .object({
    status: z.enum(['FRESH', 'STALE', 'UNKNOWN']),
    sourceTimestamp: UtcTimestampSchema,
    observedAt: UtcTimestampSchema,
    ageMs: nonNegativeInteger,
    maxAgeMs: positiveNumber,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'FRESH' && value.ageMs > value.maxAgeMs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fresh data cannot exceed maxAgeMs.',
        path: ['ageMs'],
      });
    }
    if (value.status === 'STALE' && value.ageMs <= value.maxAgeMs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Stale data must exceed maxAgeMs.',
        path: ['ageMs'],
      });
    }
  });

export const CandleSchema = z
  .object({
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    timeframe: TimeframeSchema,
    openTime: UtcTimestampSchema,
    closeTime: UtcTimestampSchema,
    open: positiveNumber,
    high: positiveNumber,
    low: positiveNumber,
    close: positiveNumber,
    volume: finiteNumber.nonnegative(),
    isClosed: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.low > Math.min(value.open, value.close) ||
      value.high < Math.max(value.open, value.close)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OHLC prices are structurally invalid.',
      });
    }
    if (Date.parse(value.openTime) >= Date.parse(value.closeTime)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'openTime must precede closeTime.',
        path: ['closeTime'],
      });
    }
  });

export const CandleSeriesSchema = z
  .object({
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    timeframe: TimeframeSchema,
    provider: z.string().trim().min(1),
    fetchedAt: UtcTimestampSchema,
    freshness: FreshnessSchema,
    candles: z.array(CandleSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const closeTimes = new Set<string>();
    value.candles.forEach((candle, index) => {
      if (candle.symbol !== value.symbol || candle.timeframe !== value.timeframe) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Candles must match their series symbol and timeframe.',
          path: ['candles', index],
        });
      }
      if (closeTimes.has(candle.closeTime)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate candle close times are not allowed.',
          path: ['candles', index, 'closeTime'],
        });
      }
      closeTimes.add(candle.closeTime);
    });
  });

export const QuoteSchema = z
  .object({
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    provider: z.string().trim().min(1),
    price: positiveNumber,
    asOf: UtcTimestampSchema,
    freshness: FreshnessSchema,
  })
  .strict();

export const MarketSnapshotSchema = z
  .object({
    snapshotId: identifier,
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    generatedAt: UtcTimestampSchema,
    quote: QuoteSchema,
    candles: z
      .object({
        M5: CandleSeriesSchema,
        M15: CandleSeriesSchema,
        H1: CandleSeriesSchema,
        H4: CandleSeriesSchema,
      })
      .strict(),
    freshness: FreshnessSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.quote.symbol !== value.symbol ||
      Object.values(value.candles).some((series) => series.symbol !== value.symbol)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Snapshot data must use the snapshot symbol.',
      });
    }
  });

export const SessionContextSchema = z
  .object({
    name: z.enum(['ASIA', 'LONDON', 'NEW_YORK', 'OVERLAP', 'OFF_SESSION']),
    observedAt: UtcTimestampSchema,
  })
  .strict();
export const EvidenceSchema = z
  .object({
    kind: z.string().trim().min(1),
    timeframe: TimeframeSchema,
    summary: z.string().trim().min(1),
    observedAt: UtcTimestampSchema,
  })
  .strict();

export const TechnicalContextSchema = z
  .object({
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    snapshotId: identifier,
    computedAt: UtcTimestampSchema,
    freshness: FreshnessSchema,
    marketRegime: z.enum([
      'TRENDING_UP',
      'TRENDING_DOWN',
      'RANGING',
      'HIGH_VOLATILITY',
      'LOW_VOLATILITY',
      'NEWS_RISK',
    ]),
    h4Bias: BiasSchema,
    h1Bias: BiasSchema,
    indicators: z
      .object({
        ema20: positiveNumber,
        ema50: positiveNumber,
        rsi: finiteNumber.min(0).max(100),
        atr: positiveNumber,
      })
      .strict(),
    sessionContext: SessionContextSchema,
    evidence: z.array(EvidenceSchema).min(1),
  })
  .strict();

export const SmcContextSchema = z
  .object({
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    snapshotId: identifier,
    computedAt: UtcTimestampSchema,
    freshness: FreshnessSchema,
    structure: z.array(
      z
        .object({
          kind: z.enum(['BOS', 'CHOCH', 'MSS']),
          direction: DirectionSchema,
          timeframe: TimeframeSchema,
          level: positiveNumber,
          observedAt: UtcTimestampSchema,
        })
        .strict(),
    ),
    liquidity: z.array(
      z
        .object({
          kind: z.enum(['BUY_SIDE', 'SELL_SIDE', 'EQUAL_HIGHS', 'EQUAL_LOWS', 'SWEEP']),
          timeframe: TimeframeSchema,
          price: positiveNumber,
          observedAt: UtcTimestampSchema,
        })
        .strict(),
    ),
    evidence: z.array(EvidenceSchema).min(1),
  })
  .strict();

export const FundamentalContextSchema = z
  .object({
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    generatedAt: UtcTimestampSchema,
    freshness: FreshnessSchema,
    eventRisk: z.enum(['NORMAL', 'PRE_EVENT_LOCK', 'ACTIVE_EVENT', 'POST_EVENT_VOLATILITY']),
    events: z.array(
      z
        .object({
          eventId: identifier,
          title: z.string().trim().min(1),
          country: z.string().length(2),
          currency: z.string().length(3),
          importance: z.enum(['LOW', 'MEDIUM', 'HIGH']),
          scheduledAt: UtcTimestampSchema,
          sourceTimestamp: UtcTimestampSchema,
        })
        .strict(),
    ),
    summary: z.string().trim().min(1),
  })
  .strict();

export const PriceZoneSchema = z
  .object({ minimum: positiveNumber, maximum: positiveNumber })
  .strict()
  .refine((zone) => zone.minimum <= zone.maximum, {
    message: 'Entry-zone minimum must not exceed maximum.',
    path: ['minimum'],
  });
export const CandidateSetupSchema = z
  .object({
    candidateId: identifier,
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    strategyId: StrategyIdSchema,
    direction: DirectionSchema,
    detectedAt: UtcTimestampSchema,
    sourceCandleClose: UtcTimestampSchema,
    marketSnapshotId: identifier,
    entryZone: PriceZoneSchema,
    invalidation: z.object({ price: positiveNumber, rationale: z.string().trim().min(1) }).strict(),
    targets: z
      .array(
        z
          .object({
            targetId: identifier,
            price: positiveNumber,
            rationale: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1),
    expectedRR: positiveNumber,
    technicalEvidence: z.array(EvidenceSchema).min(1),
    smcEvidence: z.array(EvidenceSchema).min(1),
    sessionContext: SessionContextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const invalidBuy =
      value.direction === 'BUY' &&
      (value.invalidation.price >= value.entryZone.minimum ||
        value.targets.some((target) => target.price <= value.entryZone.maximum));
    const invalidSell =
      value.direction === 'SELL' &&
      (value.invalidation.price <= value.entryZone.maximum ||
        value.targets.some((target) => target.price >= value.entryZone.minimum));
    if (invalidBuy || invalidSell)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Candidate entry, invalidation, and target geometry is structurally invalid.',
      });
  });

export const VantageRequestSchema = z
  .object({
    requestId: identifier,
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    requestedAt: UtcTimestampSchema,
    candidate: CandidateSetupSchema,
    marketSnapshot: MarketSnapshotSchema,
    technicalContext: TechnicalContextSchema,
    smcContext: SmcContextSchema,
    fundamentalContext: FundamentalContextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.candidate.marketSnapshotId !== value.marketSnapshot.snapshotId ||
      value.candidate.symbol !== value.marketSnapshot.symbol ||
      value.fundamentalContext.symbol !== value.candidate.symbol
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VANTAGE request contexts must reference the candidate snapshot and symbol.',
      });
    if (
      value.technicalContext.snapshotId !== value.marketSnapshot.snapshotId ||
      value.smcContext.snapshotId !== value.marketSnapshot.snapshotId
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Analysis contexts must reference the request snapshot.',
      });
    if (
      [
        value.marketSnapshot.freshness,
        value.technicalContext.freshness,
        value.smcContext.freshness,
        value.fundamentalContext.freshness,
      ].some((freshness) => freshness.status !== 'FRESH')
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Stale or unknown inputs must not be sent to VANTAGE.',
      });
  });

export const VantageDecisionSchema = z
  .object({
    candidateId: identifier,
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    decision: z.enum(['REJECT', 'WATCH', 'SIGNAL']),
    score: finiteNumber.min(0).max(100),
    technicalBias: BiasSchema,
    smcBias: BiasSchema,
    fundamentalBias: BiasSchema,
    summary: z.string().trim().min(1),
    risks: z.array(z.string().trim().min(1)),
    timestamp: UtcTimestampSchema,
  })
  .strict();

export const SignalSchema = z
  .object({
    signalId: identifier,
    fingerprint: identifier,
    candidateId: identifier,
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    symbol: z.string().regex(/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/),
    strategyId: StrategyIdSchema,
    direction: DirectionSchema,
    score: finiteNumber.min(0).max(100),
    entryMin: positiveNumber,
    entryMax: positiveNumber,
    stopLoss: positiveNumber,
    takeProfit1: positiveNumber,
    takeProfit2: positiveNumber.optional(),
    expectedRR: positiveNumber,
    publishedAt: UtcTimestampSchema,
    expiresAt: UtcTimestampSchema,
    status: z.enum(['PUBLISHED', 'ENTRY_HIT', 'CANCELLED', 'EXPIRED', 'CLOSED']),
    reasoningSummary: z.string().trim().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.entryMin > value.entryMax) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Signal entryMin must not exceed entryMax.',
        path: ['entryMin'],
      });
    }
    if (Date.parse(value.expiresAt) <= Date.parse(value.publishedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Signal expiry must follow publication.',
        path: ['expiresAt'],
      });
    }
  });

export const SignalEventSchema = z
  .object({
    eventId: identifier,
    signalId: identifier,
    schemaVersion: z.literal(PROTOCOL_SCHEMA_VERSION),
    type: z.enum([
      'PUBLISHED',
      'ENTRY_HIT',
      'CANCELLED',
      'EXPIRED',
      'TP1_HIT',
      'TP2_HIT',
      'SL_HIT',
      'CLOSED',
      'INVALIDATED',
    ]),
    occurredAt: UtcTimestampSchema,
    details: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export type Candle = z.infer<typeof CandleSchema>;
export type CandleSeries = z.infer<typeof CandleSeriesSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;
export type TechnicalContext = z.infer<typeof TechnicalContextSchema>;
export type SmcContext = z.infer<typeof SmcContextSchema>;
export type FundamentalContext = z.infer<typeof FundamentalContextSchema>;
export type CandidateSetup = z.infer<typeof CandidateSetupSchema>;
export type VantageRequest = z.infer<typeof VantageRequestSchema>;
export type VantageDecision = z.infer<typeof VantageDecisionSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type SignalEvent = z.infer<typeof SignalEventSchema>;

export type VantageDecisionValidation =
  | { readonly success: true; readonly data: VantageDecision }
  | {
      readonly success: false;
      readonly code: 'MALFORMED_VANTAGE_RESPONSE' | 'UNKNOWN_CANDIDATE' | 'STALE_VANTAGE_RESPONSE';
      readonly message: string;
    };
export function validateVantageDecision(
  candidate: CandidateSetup,
  raw: unknown,
  now: Date = new Date(),
  maxAgeMs = 300_000,
): VantageDecisionValidation {
  const knownCandidate = CandidateSetupSchema.safeParse(candidate);
  if (!knownCandidate.success)
    return {
      success: false,
      code: 'UNKNOWN_CANDIDATE',
      message: 'The deterministic candidate is invalid or unavailable.',
    };
  const decision = VantageDecisionSchema.safeParse(raw);
  if (!decision.success)
    return {
      success: false,
      code: 'MALFORMED_VANTAGE_RESPONSE',
      message: 'VANTAGE response failed strict schema validation.',
    };
  if (
    decision.data.candidateId !== knownCandidate.data.candidateId ||
    decision.data.schemaVersion !== knownCandidate.data.schemaVersion
  )
    return {
      success: false,
      code: 'UNKNOWN_CANDIDATE',
      message: 'VANTAGE response does not reference the known candidate.',
    };
  const ageMs = now.getTime() - Date.parse(decision.data.timestamp);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > maxAgeMs)
    return {
      success: false,
      code: 'STALE_VANTAGE_RESPONSE',
      message: 'VANTAGE response timestamp is stale or in the future.',
    };
  return { success: true, data: decision.data };
}
