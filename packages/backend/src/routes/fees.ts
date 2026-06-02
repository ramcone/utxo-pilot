import { FastifyInstance } from 'fastify';
import { getDb } from '../db/database.js';
import { EsploraClient } from '../services/esplora.js';
import { FeeSnapshot } from '../types.js';

// Cache fee estimates for 60 seconds to avoid hammering the endpoint
let feeCache: { snapshot: FeeSnapshot; expiresAt: number } | null = null;

export async function feeRoutes(app: FastifyInstance) {
  app.get('/api/fees', async (_req, reply) => {
    const db = getDb();

    // Return cached if fresh
    if (feeCache && Date.now() < feeCache.expiresAt) {
      return reply.send(feeCache.snapshot);
    }

    const url = (db.prepare("SELECT value FROM settings WHERE key = 'esplora_url'").get() as { value: string } | undefined)?.value
      ?? 'https://blockstream.info/api';

    const client = new EsploraClient(url);
    try {
      const rates = await client.getFeeEstimates();
      const snapshot: FeeSnapshot = {
        id: 0,
        fetched_at: Date.now(),
        fastest:   rates.fastest,
        half_hour: rates.half_hour,
        hour:      rates.hour,
        minimum:   rates.minimum,
      };

      // Persist to DB for history
      const res = db.prepare(`
        INSERT INTO fee_snapshots (fetched_at, fastest, half_hour, hour, minimum)
        VALUES (?, ?, ?, ?, ?)
      `).run(snapshot.fetched_at, snapshot.fastest, snapshot.half_hour, snapshot.hour, snapshot.minimum);
      snapshot.id = res.lastInsertRowid as number;

      feeCache = { snapshot, expiresAt: Date.now() + 60_000 };
      return reply.send(snapshot);
    } catch (err: any) {
      // Try to return last DB snapshot if live fetch fails
      const last = db.prepare(
        'SELECT * FROM fee_snapshots ORDER BY fetched_at DESC LIMIT 1'
      ).get() as FeeSnapshot | undefined;

      if (last) {
        return reply.send({ ...last, stale: true });
      }
      return reply.status(502).send({ error: `Could not fetch fee rates: ${err.message}` });
    }
  });
}
