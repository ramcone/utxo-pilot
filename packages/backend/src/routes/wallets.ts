import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { parsePub } from '../services/derivation.js';
import { Wallet } from '../types.js';

const CreateWalletSchema = z.object({
  name:              z.string().min(1).max(64),
  pub:               z.string().min(10),
  force_script_type: z.enum(['p2tr']).optional(),
});

export async function walletRoutes(app: FastifyInstance) {
  // List all wallets
  app.get('/api/wallets', async (_req, reply) => {
    const db = getDb();
    const wallets = db.prepare('SELECT * FROM wallets ORDER BY created_at DESC').all() as Wallet[];
    // Do not expose the normalised xpub in list response
    return reply.send(wallets.map(({ ...w }) => ({ ...w, original_pub: '[redacted]' })));
  });

  // Get single wallet (with stats)
  app.get<{ Params: { id: string } }>('/api/wallets/:id', async (req, reply) => {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(req.params.id) as Wallet | undefined;
    if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });

    const balance = (db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM utxos WHERE wallet_id = ? AND spent = 0'
    ).get(wallet.id) as { total: number }).total;

    const utxoCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM utxos WHERE wallet_id = ? AND spent = 0'
    ).get(wallet.id) as { cnt: number }).cnt;

    const threshold = parseInt(
      (db.prepare("SELECT value FROM settings WHERE key = 'small_utxo_threshold'").get() as { value: string } | undefined)?.value ?? '10000',
      10
    );

    const smallUtxoCount = (db.prepare(
      'SELECT COUNT(*) as cnt FROM utxos WHERE wallet_id = ? AND spent = 0 AND amount <= ?'
    ).get(wallet.id, threshold) as { cnt: number }).cnt;

    return reply.send({
      ...wallet,
      original_pub: '[redacted]',
      balance,
      utxo_count: utxoCount,
      small_utxo_count: smallUtxoCount,
    });
  });

  // Create wallet
  app.post('/api/wallets', async (req, reply) => {
    const body = CreateWalletSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
    }

    let parsed;
    try {
      parsed = parsePub(body.data.pub.trim(), body.data.force_script_type);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }

    const db = getDb();
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO wallets (name, original_pub, pub_type, script_type, derivation_path, gap_limit, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.data.name,
      body.data.pub.trim(), // store original for display; never log it
      parsed.pubType,
      parsed.scriptType,
      parsed.derivationPath,
      20,
      now
    );

    // Store the normalised xpub in settings keyed by wallet id (for derivation use only)
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
      `wallet_xpub_${result.lastInsertRowid}`,
      parsed.xpubNormalized
    );

    const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(result.lastInsertRowid) as Wallet;
    return reply.status(201).send({ ...wallet, original_pub: '[redacted]' });
  });

  // Delete wallet
  app.delete<{ Params: { id: string } }>('/api/wallets/:id', async (req, reply) => {
    const db = getDb();
    const wallet = db.prepare('SELECT id FROM wallets WHERE id = ?').get(req.params.id);
    if (!wallet) return reply.status(404).send({ error: 'Wallet not found' });
    db.prepare('DELETE FROM wallets WHERE id = ?').run(req.params.id);
    // Also remove cached xpub
    db.prepare("DELETE FROM settings WHERE key = ?").run(`wallet_xpub_${req.params.id}`);
    return reply.send({ ok: true });
  });
}
