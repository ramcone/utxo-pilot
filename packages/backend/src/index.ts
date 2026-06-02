import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { walletRoutes } from './routes/wallets.js';
import { syncRoutes } from './routes/sync.js';
import { utxoRoutes } from './routes/utxos.js';
import { feeRoutes } from './routes/fees.js';
import { labelRoutes } from './routes/labels.js';
import { planRoutes } from './routes/plans.js';
import { exportRoutes } from './routes/export.js';
import { settingsRoutes } from './routes/settings.js';
import { feeHistoryRoutes } from './routes/feeHistory.js';
import { priceRoutes } from './routes/price.js';
import { getDb } from './db/database.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as 'info' | 'debug' | 'warn' | 'error';

async function start() {
  const app = Fastify({
    logger: {
      level: LOG_LEVEL,
      redact: ['req.headers.authorization'],
      serializers: {
        req(req: any) {
          return { method: req.method, url: req.url };
        },
      },
    },
  });

  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  });

  // Parse JSON bodies
  app.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req: any, body: any, done: any) {
    try {
      done(null, JSON.parse(body as string));
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Register routes
  await app.register(walletRoutes);
  await app.register(syncRoutes);
  await app.register(utxoRoutes);
  await app.register(feeRoutes);
  await app.register(labelRoutes);
  await app.register(planRoutes);
  await app.register(exportRoutes);
  await app.register(settingsRoutes);
  await app.register(feeHistoryRoutes);
  await app.register(priceRoutes);

  // Health check
  app.get('/api/health', async () => ({ ok: true, version: '0.1.0' }));

  // Initialise DB on startup (runs migrations)
  getDb();

  try {
    await app.listen({ port: PORT, host: '127.0.0.1' });
    console.log(`UTXO Pilot backend listening on http://127.0.0.1:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
