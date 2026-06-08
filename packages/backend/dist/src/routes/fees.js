"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feeRoutes = feeRoutes;
const database_js_1 = require("../db/database.js");
const esplora_js_1 = require("../services/esplora.js");
// Cache fee estimates for 60 seconds to avoid hammering the endpoint
let feeCache = null;
async function feeRoutes(app) {
    app.get('/api/fees', async (_req, reply) => {
        const db = (0, database_js_1.getDb)();
        // Return cached if fresh
        if (feeCache && Date.now() < feeCache.expiresAt) {
            return reply.send(feeCache.snapshot);
        }
        const url = db.prepare("SELECT value FROM settings WHERE key = 'esplora_url'").get()?.value
            ?? 'https://blockstream.info/api';
        const client = new esplora_js_1.EsploraClient(url);
        try {
            const rates = await client.getFeeEstimates();
            const snapshot = {
                id: 0,
                fetched_at: Date.now(),
                fastest: rates.fastest,
                half_hour: rates.half_hour,
                hour: rates.hour,
                minimum: rates.minimum,
            };
            // Persist to DB for history
            const res = db.prepare(`
        INSERT INTO fee_snapshots (fetched_at, fastest, half_hour, hour, minimum)
        VALUES (?, ?, ?, ?, ?)
      `).run(snapshot.fetched_at, snapshot.fastest, snapshot.half_hour, snapshot.hour, snapshot.minimum);
            snapshot.id = res.lastInsertRowid;
            feeCache = { snapshot, expiresAt: Date.now() + 60000 };
            return reply.send(snapshot);
        }
        catch (err) {
            // Try to return last DB snapshot if live fetch fails
            const last = db.prepare('SELECT * FROM fee_snapshots ORDER BY fetched_at DESC LIMIT 1').get();
            if (last) {
                return reply.send({ ...last, stale: true });
            }
            return reply.status(502).send({ error: `Could not fetch fee rates: ${err.message}` });
        }
    });
}
//# sourceMappingURL=fees.js.map