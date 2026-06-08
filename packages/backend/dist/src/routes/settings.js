"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = settingsRoutes;
const zod_1 = require("zod");
const database_js_1 = require("../db/database.js");
const esplora_js_1 = require("../services/esplora.js");
const UpdateSettingsSchema = zod_1.z.object({
    esplora_url: zod_1.z.string().url().optional(),
    esplora_is_public: zod_1.z.boolean().optional(),
    dust_threshold: zod_1.z.number().int().min(0).optional(),
    small_utxo_threshold: zod_1.z.number().int().min(0).optional(),
    default_gap_limit: zod_1.z.number().int().min(1).max(100).optional(),
    fiat_currency: zod_1.z.string().length(3).optional(),
});
async function settingsRoutes(app) {
    app.get('/api/settings', async (_req, reply) => {
        const db = (0, database_js_1.getDb)();
        const rows = db.prepare("SELECT key, value FROM settings WHERE key NOT LIKE 'wallet_xpub_%'").all();
        const obj = {};
        for (const r of rows)
            obj[r.key] = r.value;
        return reply.send(obj);
    });
    app.put('/api/settings', async (req, reply) => {
        const body = UpdateSettingsSchema.safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
        const db = (0, database_js_1.getDb)();
        const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const data = body.data;
        if (data.esplora_url !== undefined)
            upsert.run('esplora_url', data.esplora_url);
        if (data.esplora_is_public !== undefined)
            upsert.run('esplora_is_public', String(data.esplora_is_public));
        if (data.dust_threshold !== undefined)
            upsert.run('dust_threshold', String(data.dust_threshold));
        if (data.small_utxo_threshold !== undefined)
            upsert.run('small_utxo_threshold', String(data.small_utxo_threshold));
        if (data.default_gap_limit !== undefined)
            upsert.run('default_gap_limit', String(data.default_gap_limit));
        if (data.fiat_currency !== undefined)
            upsert.run('fiat_currency', data.fiat_currency);
        return reply.send({ ok: true });
    });
    // Test Esplora connectivity
    app.post('/api/settings/test-esplora', async (req, reply) => {
        const { url } = req.body;
        if (!url)
            return reply.status(400).send({ error: 'url required' });
        const client = new esplora_js_1.EsploraClient(url, 8000);
        const ok = await client.healthCheck();
        return reply.send({ ok, url });
    });
}
//# sourceMappingURL=settings.js.map