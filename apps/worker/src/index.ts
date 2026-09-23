import { createServer } from 'node:http';

import 'dotenv/config';

import { loadConfig } from '@walkertrade/config';
import { createLogger } from '@walkertrade/core';

const config = loadConfig();
const logger = createLogger({
  service: 'walkertrade-worker',
  environment: config.NODE_ENV,
  level: config.LOG_LEVEL,
});

const startedAt = new Date();
const server = createServer((request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'not_found' }));
    return;
  }

  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(
    JSON.stringify({
      service: 'walkertrade-worker',
      status: 'ok',
      environment: config.NODE_ENV,
      startedAt: startedAt.toISOString(),
    }),
  );
});

const heartbeat = setInterval(() => {
  logger.info({ stage: 'heartbeat', startedAt: startedAt.toISOString() }, 'Worker is alive');
}, config.WORKER_HEARTBEAT_INTERVAL_MS);

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal, stage: 'shutdown' }, 'Worker shutdown requested');
  clearInterval(heartbeat);
  server.close((error) => {
    if (error) {
      logger.error({ err: error, signal }, 'Worker shutdown failed');
      process.exitCode = 1;
    }
    process.exit();
  });

  setTimeout(() => {
    logger.error({ signal }, 'Worker shutdown timed out');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

server.listen(config.WORKER_PORT, () => {
  logger.info(
    { port: config.WORKER_PORT, stage: 'startup' },
    'Worker runtime configuration validated and health server listening',
  );
});
