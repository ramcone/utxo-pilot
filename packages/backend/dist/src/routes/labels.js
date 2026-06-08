"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelRoutes = labelRoutes;
const zod_1 = require("zod");
const database_js_1 = require("../db/database.js");
const UpsertLabelSchema = zod_1.z.object({
    ref: zod_1.z.string().min(1),
    label_type: zod_1.z.enum(['tx', 'addr', 'output']),
    name: zod_1.z.string().min(1).max(128),
});
async function labelRoutes(app) {
    // List labels for a wallet
    app.get('/api/wallets/:id/labels', async (req, reply) => {
        const db = (0, database_js_1.getDb)();
        const rows = db.prepare('SELECT * FROM labels WHERE wallet_id = ? ORDER BY created_at DESC').all(req.params.id);
        return reply.send(rows);
    });
    // Upsert a label
    app.post('/api/wallets/:id/labels', async (req, reply) => {
        const body = UpsertLabelSchema.safeParse(req.body);
        if (!body.success) {
            return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
        }
        const db = (0, database_js_1.getDb)();
        const walletId = parseInt(req.params.id, 10);
        db.prepare(`
      INSERT INTO labels (wallet_id, ref, label_type, name, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(wallet_id, ref, label_type) DO UPDATE SET name = excluded.name
    `).run(walletId, body.data.ref, body.data.label_type, body.data.name, Date.now());
        const label = db.prepare('SELECT * FROM labels WHERE wallet_id = ? AND ref = ? AND label_type = ?').get(walletId, body.data.ref, body.data.label_type);
        return reply.status(201).send(label);
    });
    // Delete a label
    app.delete('/api/wallets/:id/labels/:labelId', async (req, reply) => {
        const db = (0, database_js_1.getDb)();
        db.prepare('DELETE FROM labels WHERE id = ? AND wallet_id = ?').run(req.params.labelId, req.params.id);
        return reply.send({ ok: true });
    });
    // Import BIP329 JSONL labels
    app.post('/api/wallets/:id/labels/import', async (req, reply) => {
        const body = req.body;
        if (!body?.jsonl)
            return reply.status(400).send({ error: 'Missing jsonl field' });
        const db = (0, database_js_1.getDb)();
        const walletId = parseInt(req.params.id, 10);
        const lines = body.jsonl.split('\n').filter((l) => l.trim());
        let imported = 0;
        const errors = [];
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
            }
            catch {
                errors.push(`Invalid JSON: ${line.slice(0, 80)}`);
            }
        }
        return reply.send({ imported, errors });
    });
}
//# sourceMappingURL=labels.js.map