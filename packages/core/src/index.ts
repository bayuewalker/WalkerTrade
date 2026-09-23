import pino, { type Logger, type LoggerOptions } from 'pino';

export type LogLevel = Exclude<LoggerOptions['level'], undefined>;

export interface LoggerOptionsInput {
  readonly service: string;
  readonly environment: string;
  readonly level: LogLevel;
}

/**
 * Creates JSON logs with stable fields shared by every runtime. Secrets are redacted if a future
 * caller accidentally includes them in an object payload.
 */
export function createLogger(options: LoggerOptionsInput): Logger {
  return pino({
    level: options.level,
    base: {
      service: options.service,
      environment: options.environment,
    },
    redact: {
      paths: [
        'password',
        'token',
        'apiKey',
        'authorization',
        'headers.authorization',
        '*.password',
        '*.token',
        '*.apiKey',
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
