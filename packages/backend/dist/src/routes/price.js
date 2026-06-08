"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceRoutes = priceRoutes;
const node_fetch_1 = __importDefault(require("node-fetch"));
// Cache per currency — refresh every 5 minutes
const priceCache = new Map();
async function priceRoutes(app) {
    app.get('/api/price', async (req, reply) => {
        const currency = (req.query.currency ?? 'USD').toUpperCase();
        const cached = priceCache.get(currency);
        if (cached && Date.now() < cached.expiresAt) {
            return reply.send({ currency, price: cached.price });
        }
        try {
            const res = await (0, node_fetch_1.default)('https://mempool.space/api/v1/prices', {
                headers: { 'User-Agent': 'utxo-pilot/0.1.0' },
            });
            if (!res.ok)
                throw new Error(`mempool.space ${res.status}`);
            const data = await res.json();
            const price = data[currency];
            if (price === undefined) {
                return reply.status(400).send({ error: `Currency ${currency} not available` });
            }
            priceCache.set(currency, { price, expiresAt: Date.now() + 5 * 60000 });
            return reply.send({ currency, price });
        }
        catch (err) {
            if (cached)
                return reply.send({ currency, price: cached.price, stale: true });
            return reply.status(502).send({ error: `Could not fetch BTC price: ${err.message}` });
        }
    });
}
//# sourceMappingURL=price.js.map