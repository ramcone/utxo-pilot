"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoRoutes = demoRoutes;
const database_js_1 = require("../db/database.js");
const dev_seed_js_1 = require("../../fixtures/dev-seed.js");
async function demoRoutes(app) {
    // POST /api/demo/seed
    // Creates the demo wallet if it doesn't exist and returns the wallet id.
    // Safe to call multiple times — idempotent.
    app.post('/api/demo/seed', async (_req, reply) => {
        const db = (0, database_js_1.getDb)();
        const walletId = (0, dev_seed_js_1.seedDemoWallet)(db);
        const wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(walletId);
        return reply.status(200).send({ wallet_id: walletId, wallet_name: dev_seed_js_1.DEMO_WALLET_NAME, wallet });
    });
}
//# sourceMappingURL=demo.js.map