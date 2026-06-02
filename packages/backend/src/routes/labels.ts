import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { Label } from '../types.js';

const UpsertLabelSchema = z.object({
  ref:        z.string().min(1),
  label_type: z.enum(['tx', 'addr', 'output']),
  name:       z.string().min(1).max(128),
});

export async function labelRoutes(app: FastifyInstance) {
  // List labels for a wallet
  app.get<{ Params: { id: string } }>('/api/wallets/:id/labels', async (req, reply) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM labels WHERE wallet_id = ? ORDER BY created_at DESC').all(req.params.id) as Label[];
    return reply.send(rows);
  });

  // Upsert a label
  app.post<{ Params: { id: string } }>('/api/wallets/:id/labels', async (req, reply) => {
    const body = UpsertLabelSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
    }

    const db = getDb();
    const walletId = parseInt(req.params.id, 10);

    db.prepare(`
      INSERT INTO labels (wallet_id, ref, label_type, name, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(wallet_id, ref, label_type) DO UPDATE SET name = excluded.name
    `).run(walletId, body.data.ref, body.data.label_type, body.data.name, Date.now());

    const label = db.prepare('SELECT * FROM labels WHERE wallet_id = ? AND ref = ? AND label_type = ?').get(
      walletId, body.data.ref, body.data.label_type
    ) as Label;

    return reply.status(201).send(label);
  });

  // Delete a label
  app.delete<{ Params: { id: string; labelId: string } }>('/api/wallets/:id/labels/:labelId', async (req, reply) => {
    const db = getDb();
    db.prepare('DELETE FROM labels WHERE id = ? AND wallet_id = ?').run(req.params.labelId, req.params.id);
    return reply.send({ ok: true });
  });

  // Import BIP329 JSONL labels
  app.post<{ Params: { id: string } }>('/api/wallets/:id/labels/import', async (req, reply) => {
    const body = req.body as { jsonl: string };
    if (!body?.jsonl) return reply.status(400).send({ error: 'Missing jsonl field' });

    const db = getDb();
    const walletId = parseInt(req.params.id, 10);
    const lines = body.jsonl.split('\n').filter((l) => l.trim());
    let imported = 0;
    const errors: string[] = [];

    const upsert = db.prepare(`
      INSERT INTO labels (wallet_id, ref, label_type, name, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(wallet_id, ref, label_type) DO UPDATE SET name = excluded.name
    `);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // BIP329 schema: { type: 'tx'|'addr'|'pubkey'|'input'|'output', ref, label }
        const labelType = entry.type === 'output' ? 'output'
          : entry.type === 'addr' ? 'addr'
          : entry.type === 'tx' ? 'tx'
          : null;
        if (!labelType || !entry.ref || !entry.label) {
          errors.push(`Skipped: ${line.slice(0, 80)}`);
          continue;
        }
        upsert.run(walletId, entry.ref, labelType, entry.label, Date.now());
        imported++;
      } catch {
        errors.push(`Invalid JSON: ${line.slice(0, 80)}`);
      }
    }

    return reply.send({ imported, errors });
  });
}
