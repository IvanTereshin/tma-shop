import { serve } from '@hono/node-server';
import { loadEnv } from './config/env.js';
import { createDb, createPool } from './db/client.js';
import { createApp } from './app.js';

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);
const db = createDb(pool);
const app = createApp({ env, db });

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`tma-shop API listening on http://localhost:${info.port}`);
});

function shutdown(signal: string): void {
  console.log(`\n${signal} received, shutting down…`);
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
