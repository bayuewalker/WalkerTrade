import { describe, expect, it } from 'vitest';

import { EnvironmentValidationError, loadConfig } from './index.js';

describe('loadConfig', () => {
  it('uses safe development defaults', () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      WEB_PORT: 3000,
      WORKER_PORT: 4000,
      WORKER_HEARTBEAT_INTERVAL_MS: 30_000,
      SHUTDOWN_TIMEOUT_MS: 10_000,
    });
  });

  it('fails clearly for invalid required configuration', () => {
    expect(() => loadConfig({ WEB_PORT: 'not-a-port' })).toThrow(EnvironmentValidationError);
    expect(() => loadConfig({ WEB_PORT: 'not-a-port' })).toThrow('WEB_PORT');
  });
});
