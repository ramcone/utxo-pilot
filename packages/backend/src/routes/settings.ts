import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { EsploraClient } from '../services/esplora.js';

const UpdateSettingsSchema = z.object({
  esplora_url:          z.string().url().optional(),
  esplora_is_public:    z.boolean().optional(),
  dust_threshold:       z.number().int().min(0).optional(),
  small_utxo_threshold: z.number().int().min(0).optional(),
  default_gap_limit:    z.number().int().min(1).max(100).optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', async (_req, reply) => {
    const db = getDb();
    const rows = db.prepare(
      "SELECT key, value FROM settings WHERE key NOT LIKE 'wallet_xpub_%'"
    ).all() as { key: string; value: string }[];
    const obj: Record<string, string> = {};
    for (const r of rows) obj[r.key] = r.value;
    return reply.send(obj);
  });

  app.put('/api/settings', async (req, reply) => {
    const body = UpdateSettingsSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });

    const db = getDb();
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    const data = body.data;
    if (data.esplora_url !== undefined)          upsert.run('esplora_url', data.esplora_url);
    if (data.esplora_is_public !== undefined)    upsert.run('esplora_is_public', String(data.esplora_is_public));
    if (data.dust_threshold !== undefined)       upsert.run('dust_threshold', String(data.dust_threshold));
    if (data.small_utxo_threshold !== undefined) upsert.run('small_utxo_threshold', String(data.small_utxo_threshold));
    if (data.default_gap_limit !== undefined)    upsert.run('default_gap_limit', String(data.default_gap_limit));

    return reply.send({ ok: true });
  });

  // Test Esplora connectivity
  app.post('/api/settings/test-esplora', async (req, reply) => {
    const { url } = req.body as { url?: string };
    if (!url) return reply.status(400).send({ error: 'url required' });

    const client = new EsploraClient(url, 8_000);
    const ok = await client.healthCheck();
    return reply.send({ ok, url });
  });
}
