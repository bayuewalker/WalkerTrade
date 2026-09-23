import { createLogger } from '@walkertrade/core';
import { loadConfig } from '@walkertrade/config';

const config = loadConfig();
const logger = createLogger({
  service: 'walkertrade-web',
  environment: config.NODE_ENV,
  level: config.LOG_LEVEL,
});

logger.info({ stage: 'startup' }, 'Web runtime configuration validated');

export default function HomePage() {
  return (
    <main>
      <h1>WalkerTrade Web Signal</h1>
      <p>XAU/USD signal platform foundation.</p>
    </main>
  );
}
