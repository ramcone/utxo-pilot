"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const wallets_js_1 = require("./routes/wallets.js");
const sync_js_1 = require("./routes/sync.js");
const utxos_js_1 = require("./routes/utxos.js");
const fees_js_1 = require("./routes/fees.js");
const labels_js_1 = require("./routes/labels.js");
const plans_js_1 = require("./routes/plans.js");
const export_js_1 = require("./routes/export.js");
const settings_js_1 = require("./routes/settings.js");
const feeHistory_js_1 = require("./routes/feeHistory.js");
const price_js_1 = require("./routes/price.js");
const convert_js_1 = require("./routes/convert.js");
const database_js_1 = require("./db/database.js");
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info');
async function start() {
    const app = (0, fastify_1.default)({
        logger: {
            level: LOG_LEVEL,
            redact: ['req.headers.authorization'],
            serializers: {
                req(req) {
                    return { method: req.method, url: req.url };
                },
            },
        },
    });
    await app.register(cors_1.default, {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    });
    // Parse JSON bodies
    app.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req, body, done) {
        try {
            done(null, JSON.parse(body));
        }
        catch (err) {
            err.statusCode = 400;
            done(err, undefined);
        }
    });
    // Register routes
    await app.register(wallets_js_1.walletRoutes);
    await app.register(sync_js_1.syncRoutes);
    await app.register(utxos_js_1.utxoRoutes);
    await app.register(fees_js_1.feeRoutes);
    await app.register(labels_js_1.labelRoutes);
    await app.register(plans_js_1.planRoutes);
    await app.register(export_js_1.exportRoutes);
    await app.register(settings_js_1.settingsRoutes);
    await app.register(feeHistory_js_1.feeHistoryRoutes);
    await app.register(price_js_1.priceRoutes);
    await app.register(convert_js_1.convertRoutes);
    // Health check
    app.get('/api/health', async () => ({ ok: true, version: '0.1.0' }));
    // Initialise DB on startup (runs migrations)
    (0, database_js_1.getDb)();
    try {
        await app.listen({ port: PORT, host: '127.0.0.1' });
        console.log(`UTXO Pilot backend listening on http://127.0.0.1:${PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map