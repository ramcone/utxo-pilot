"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utxoRoutes = utxoRoutes;
const database_js_1 = require("../db/database.js");
async function utxoRoutes(app) {
    app.get('/api/wallets/:id/utxos', async (req, reply) => {
        const db = (0, database_js_1.getDb)();
        const walletId = parseInt(req.params.id, 10);
        const { spent, min_amount, max_amount, label, sort = 'amount', order = 'desc', limit = '200', offset = '0', } = req.query;
        const conditions = ['u.wallet_id = ?'];
        const params = [walletId];
        if (spent === 'false' || spent === '0') {
            conditions.push('u.spent = 0');
        }
        if (spent === 'true' || spent === '1') {
            conditions.push('u.spent = 1');
        }
        if (min_amount) {
            conditions.push('u.amount >= ?');
            params.push(parseInt(min_amount, 10));
        }
        if (max_amount) {
            conditions.push('u.amount <= ?');
            params.push(parseInt(max_amount, 10));
        }
        if (label) {
            conditions.push("l.name LIKE ?");
            params.push(`%${label}%`);
        }
        const allowedSorts = {
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
        const rows = db.prepare(sql).all(...params);
        const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM utxos u
      LEFT JOIN labels l
        ON l.wallet_id = u.wallet_id
        AND l.ref = (u.txid || ':' || u.vout)
        AND l.label_type = 'output'
      WHERE ${conditions.join(' AND ')}
    `).get(...params.slice(0, -2)).cnt;
        return reply.send({ utxos: rows, total });
    });
    // Balance summary
    app.get('/api/wallets/:id/balance', async (req, reply) => {
        const db = (0, database_js_1.getDb)();
        const walletId = parseInt(req.params.id, 10);
        const row = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN spent = 0 THEN amount ELSE 0 END), 0) as confirmed_balance,
        COUNT(CASE WHEN spent = 0 THEN 1 END) as utxo_count
      FROM utxos WHERE wallet_id = ?
    `).get(walletId);
        const threshold = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'small_utxo_threshold'").get()?.value ?? '10000', 10);
        const small = db.prepare('SELECT COUNT(*) as cnt FROM utxos WHERE wallet_id = ? AND spent = 0 AND amount <= ?').get(walletId, threshold).cnt;
        return reply.send({ ...row, small_utxo_count: small });
    });
}
//# sourceMappingURL=utxos.js.map