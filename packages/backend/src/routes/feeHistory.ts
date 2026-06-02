import { FastifyInstance } from 'fastify';
import fetch from 'node-fetch';
import { getDb } from '../db/database.js';
import { FeeSnapshot } from '../types.js';

type Range = '1h' | '1d' | '1w' | '1m' | '1y';

interface FeeHistoryPoint {
  timestamp: number;
  fastest: number;
  half_hour: number;
  hour: number;
}

// Cache per range so we don't hammer mempool.space
const historyCache = new Map<Range, { data: FeeHistoryPoint[]; expiresAt: number }>();

const CACHE_TTL: Record<Range, number> = {
  '1h': 60_000,          // 1 min
  '1d': 5 * 60_000,      // 5 min
  '1w': 15 * 60_000,     // 15 min
  '1m': 60 * 60_000,     // 1 hour
  '1y': 6 * 60 * 60_000, // 6 hours
};

// mempool.space interval param per range
const MEMPOOL_INTERVAL: Record<Exclude<Range, '1h'>, string> = {
  '1d': '24h',
  '1w': '1w',
  '1m': '1m',
  '1y': '1y',
};

export async function feeHistoryRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { range?: string } }>('/api/fees/history', async (req, reply) => {
    const range = (req.query.range ?? '1d') as Range;

    if (!['1h', '1d', '1w', '1m', '1y'].includes(range)) {
      return reply.status(400).send({ error: 'Invalid range. Use 1h, 1d, 1w, 1m, or 1y.' });
    }

    const cached = historyCache.get(range);
    if (cached && Date.now() < cached.expiresAt) {
      return reply.send({ range, data: cached.data });
    }

    let data: FeeHistoryPoint[];

    if (range === '1h') {
      data = getLocalHistory(getDb());
    } else {
      try {
        data = await getMempoolHistory(range);
      } catch {
        // Fallback to local snapshots if mempool.space is unreachable
        data = getLocalHistory(getDb());
      }
    }

    historyCache.set(range, { data, expiresAt: Date.now() + CACHE_TTL[range] });
    return reply.send({ range, data });
  });
}

/** Pull the last hour of fee snapshots from local SQLite */
function getLocalHistory(db: ReturnType<typeof getDb>): FeeHistoryPoint[] {
  const since = Date.now() - 60 * 60 * 1000;
  const rows = db.prepare(
    'SELECT fetched_at, fastest, half_hour, hour FROM fee_snapshots WHERE fetched_at >= ? ORDER BY fetched_at ASC'
  ).all(since) as Pick<FeeSnapshot, 'fetched_at' | 'fastest' | 'half_hour' | 'hour'>[];

  // If we have fewer than 2 local points, return whatever we have
  return rows.map((r) => ({
    timestamp: r.fetched_at,
    fastest:   r.fastest,
    half_hour: r.half_hour,
    hour:      r.hour,
  }));
}

/** Fetch block-level fee rate history from mempool.space public API */
async function getMempoolHistory(range: Exclude<Range, '1h'>): Promise<FeeHistoryPoint[]> {
  const interval = MEMPOOL_INTERVAL[range];
  const res = await fetch(
    `https://mempool.space/api/v1/mining/blocks/fee-rates/${interval}`,
    { headers: { 'User-Agent': 'utxo-pilot/0.1.0' } }
  );

  if (!res.ok) throw new Error(`mempool.space ${res.status}`);

  // Response: [{ avgHeight, timestamp, avgFee_0, avgFee_10, avgFee_25, avgFee_50, avgFee_75, avgFee_90, avgFee_100 }]
  const raw = await res.json() as Array<{
    timestamp: number;
    avgFee_50: number;  // median — use as "hour"
    avgFee_75: number;  // 75th percentile — use as "half_hour"
    avgFee_90: number;  // 90th percentile — use as "fastest"
  }>;

  return raw.map((r) => ({
    timestamp: r.timestamp * 1000, // mempool.space returns Unix seconds
    fastest:   r.avgFee_90 ?? 0,
    half_hour: r.avgFee_75 ?? 0,
    hour:      r.avgFee_50 ?? 0,
  }));
}
