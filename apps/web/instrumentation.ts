import { loadConfig } from '@walkertrade/config';
import { createLogger } from '@walkertrade/core';

export const runtime = 'nodejs';

/** Next.js invokes this once while initializing the server runtime. */
export async function register(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    service: 'walkertrade-web',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  });

  logger.info({ stage: 'startup' }, 'Web runtime configuration validated');
}
