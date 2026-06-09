import { FastifyInstance } from 'fastify';
import { getDb } from '../db/database.js';
import { seedDemoWallet, DEMO_WALLET_NAME } from '../../fixtures/dev-seed.js';

export async function demoRoutes(app: FastifyInstance) {
  // POST /api/demo/seed
  // Creates the demo wallet if it doesn't exist and returns the wallet id.
  // Safe to call multiple times — idempotent.
  app.post('/api/demo/seed', async (_req, reply) => {
    const db = getDb();
    const walletId = seedDemoWallet(db);
    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId) as any;
    return reply.status(200).send({ wallet_id: walletId, wallet_name: DEMO_WALLET_NAME, wallet });
  });
}
