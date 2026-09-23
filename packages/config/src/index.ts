import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const port = z.coerce.number().int().min(1).max(65_535);
const positiveMilliseconds = z.coerce.number().int().min(1);

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  WEB_PORT: port.default(3000),
  WORKER_PORT: port.default(4000),
  WORKER_HEARTBEAT_INTERVAL_MS: positiveMilliseconds.default(30_000),
  SHUTDOWN_TIMEOUT_MS: positiveMilliseconds.default(10_000),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export class EnvironmentValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

function formatEnvironmentIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
}

/** Validates every environment value used by the applications in one place. */
export function loadConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new EnvironmentValidationError(
      `Invalid WalkerTrade environment configuration: ${formatEnvironmentIssues(result.error)}`,
    );
  }

  return result.data;
}
