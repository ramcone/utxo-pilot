import { FastifyInstance } from 'fastify';
import fetch from 'node-fetch';

// Cache per currency — refresh every 5 minutes
const priceCache = new Map<string, { price: number; expiresAt: number }>();

export async function priceRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { currency?: string } }>('/api/price', async (req, reply) => {
    const currency = (req.query.currency ?? 'USD').toUpperCase();

    const cached = priceCache.get(currency);
    if (cached && Date.now() < cached.expiresAt) {
      return reply.send({ currency, price: cached.price });
    }

    try {
      const res = await fetch('https://mempool.space/api/v1/prices', {
        headers: { 'User-Agent': 'utxo-pilot/0.1.0' },
      });
      if (!res.ok) throw new Error(`mempool.space ${res.status}`);
      const data = await res.json() as Record<string, number>;

      const price = data[currency];
      if (price === undefined) {
        return reply.status(400).send({ error: `Currency ${currency} not available` });
      }

      priceCache.set(currency, { price, expiresAt: Date.now() + 5 * 60_000 });
      return reply.send({ currency, price });
    } catch (err: any) {
      if (cached) return reply.send({ currency, price: cached.price, stale: true });
      return reply.status(502).send({ error: `Could not fetch BTC price: ${err.message}` });
    }
  });
}
