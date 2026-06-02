import { FastifyInstance } from 'fastify';
import { getDb } from '../db/database.js';
import { UTXOWithLabel } from '../types.js';

export async function utxoRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string }; Querystring: {
    spent?: string;
    min_amount?: string;
    max_amount?: string;
    label?: string;
    sort?: string;
    order?: string;
    limit?: string;
    offset?: string;
  } }>('/api/wallets/:id/utxos', async (req, reply) => {
    const db = getDb();
    const walletId = parseInt(req.params.id, 10);
    const {
      spent,
      min_amount,
      max_amount,
      label,
      sort = 'amount',
      order = 'desc',
      limit = '200',
      offset = '0',
    } = req.query;

    const conditions: string[] = ['u.wallet_id = ?'];
    const params: (string | number)[] = [walletId];

    if (spent === 'false' || spent === '0') { conditions.push('u.spent = 0'); }
    if (spent === 'true'  || spent === '1') { conditions.push('u.spent = 1'); }
    if (min_amount) { conditions.push('u.amount >= ?'); params.push(parseInt(min_amount, 10)); }
    if (max_amount) { conditions.push('u.amount <= ?'); params.push(parseInt(max_amount, 10)); }
    if (label) { conditions.push("l.name LIKE ?"); params.push(`%${label}%`); }

    const allowedSorts: Record<string, string> = {
      amount: 'u.amount',
      age: 'u.block_height',
      label: 'l.name',
      txid: 'u.txid',
    };
    const sortCol = allowedSorts[sort] ?? 'u.amount';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const sql = `
      SELECT
        u.*,
        l.name as label
      FROM utxos u
      LEFT JOIN labels l
        ON l.wallet_id = u.wallet_id
        AND l.ref = (u.txid || ':' || u.vout)
        AND l.label_type = 'output'
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const rows = db.prepare(sql).all(...params) as UTXOWithLabel[];

    const total = (db.prepare(`
      SELECT COUNT(*) as cnt FROM utxos u
      LEFT JOIN labels l
        ON l.wallet_id = u.wallet_id
        AND l.ref = (u.txid || ':' || u.vout)
        AND l.label_type = 'output'
      WHERE ${conditions.join(' AND ')}
    `).get(...params.slice(0, -2)) as { cnt: number }).cnt;

    return reply.send({ utxos: rows, total });
  });

  // Balance summary
  app.get<{ Params: { id: string } }>('/api/wallets/:id/balance', async (req, reply) => {
    const db = getDb();
    const walletId = parseInt(req.params.id, 10);

    const row = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN spent = 0 THEN amount ELSE 0 END), 0) as confirmed_balance,
        COUNT(CASE WHEN spent = 0 THEN 1 END) as utxo_count
      FROM utxos WHERE wallet_id = ?
    `).get(walletId) as { confirmed_balance: number; utxo_count: number };

    const threshold = parseInt(
      (db.prepare("SELECT value FROM settings WHERE key = 'small_utxo_threshold'").get() as { value: string } | undefined)?.value ?? '10000',
      10
    );
    const small = (db.prepare(
      'SELECT COUNT(*) as cnt FROM utxos WHERE wallet_id = ? AND spent = 0 AND amount <= ?'
    ).get(walletId, threshold) as { cnt: number }).cnt;

    return reply.send({ ...row, small_utxo_count: small });
  });
}
