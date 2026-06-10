import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { selectCoins } from '../services/coinSelection.js';
import { planConsolidation } from '../services/consolidation.js';
import { UTXOWithLabel, Plan, PlanInput, FeeSnapshot } from '../types.js';

const SpendPlanSchema = z.object({
  target_amount: z.number().int().positive(),
  fee_rate:      z.number().positive(),
  mode:          z.enum(['fee-first', 'privacy-first']),
});

const ConsolidationPlanSchema = z.object({
  threshold:   z.number().int().positive().default(10000),
  fee_rate:    z.number().positive(),
  urgency:     z.enum(['fastest', 'half_hour', 'hour']).default('hour'),
  destination: z.string().min(14).max(100),
});

function getUTXOsWithLabels(db: ReturnType<typeof getDb>, walletId: number): UTXOWithLabel[] {
  return db.prepare(`
    SELECT
      u.*,
      l.name as label
    FROM utxos u
    LEFT JOIN labels l
      ON l.wallet_id = u.wallet_id
      AND l.ref = (u.txid || ':' || u.vout)
      AND l.label_type = 'output'
    WHERE u.wallet_id = ? AND u.spent = 0
  `).all(walletId) as UTXOWithLabel[];
}

function getLatestFeeRates(db: ReturnType<typeof getDb>) {
  const snap = db.prepare('SELECT * FROM fee_snapshots ORDER BY fetched_at DESC LIMIT 1').get() as FeeSnapshot | undefined;
  return snap ?? { fastest: 20, half_hour: 10, hour: 5, minimum: 1 };
}

export async function planRoutes(app: FastifyInstance) {
  // Create spend plan
  app.post<{ Params: { id: string } }>('/api/wallets/:id/plans/spend', async (req, reply) => {
    const body = SpendPlanSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });

    const db = getDb();
    const walletId = parseInt(req.params.id, 10);
    const utxos = getUTXOsWithLabels(db, walletId);

    const result = selectCoins(utxos, body.data.target_amount, body.data.fee_rate, body.data.mode);
    if (!result) {
      return reply.status(422).send({ error: 'Insufficient spendable funds for this amount and fee rate.' });
    }

    const planId = db.prepare(`
      INSERT INTO plans (wallet_id, plan_type, mode, target_amount, fee_rate, estimated_fee, estimated_output, warnings, created_at)
      VALUES (?, 'spend', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      walletId,
      body.data.mode,
      body.data.target_amount,
      body.data.fee_rate,
      result.estimatedFee,
      body.data.target_amount,
      JSON.stringify(result.warnings),
      Date.now()
    ).lastInsertRowid;

    const insertInput = db.prepare(
      'INSERT INTO plan_inputs (plan_id, txid, vout, amount) VALUES (?, ?, ?, ?)'
    );
    for (const u of result.selected) {
      insertInput.run(planId, u.txid, u.vout, u.amount);
    }

    return reply.status(201).send({ plan_id: planId, ...result });
  });

  // Create consolidation plan
  app.post<{ Params: { id: string } }>('/api/wallets/:id/plans/consolidation', async (req, reply) => {
    const body = ConsolidationPlanSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });

    const db = getDb();
    const walletId = parseInt(req.params.id, 10);
    const utxos = getUTXOsWithLabels(db, walletId);
    const feeRates = getLatestFeeRates(db);

    const result = planConsolidation(utxos, body.data.threshold, feeRates, body.data.urgency);
    if (!result) {
      return reply.status(422).send({
        error: 'Not enough small UTXOs to consolidate, or the fee would exceed the total value.',
      });
    }

    // Store the rate the fee was actually computed with (snapshot rate for the
    // chosen urgency), not the client-sent rate — they can drift apart.
    const usedFeeRate = feeRates[body.data.urgency];

    const planId = db.prepare(`
      INSERT INTO plans (wallet_id, plan_type, destination, fee_rate, estimated_fee, estimated_output, warnings, created_at)
      VALUES (?, 'consolidation', ?, ?, ?, ?, ?, ?)
    `).run(
      walletId,
      body.data.destination,
      usedFeeRate,
      result.estimatedFee,
      result.outputAmount,
      JSON.stringify(result.warnings),
      Date.now()
    ).lastInsertRowid;

    const insertInput = db.prepare(
      'INSERT INTO plan_inputs (plan_id, txid, vout, amount) VALUES (?, ?, ?, ?)'
    );
    for (const u of result.candidates) {
      insertInput.run(planId, u.txid, u.vout, u.amount);
    }

    return reply.status(201).send({ plan_id: planId, ...result });
  });

  // List plans for a wallet
  app.get<{ Params: { id: string } }>('/api/wallets/:id/plans', async (req, reply) => {
    const db = getDb();
    const plans = db.prepare('SELECT * FROM plans WHERE wallet_id = ? ORDER BY created_at DESC').all(req.params.id) as Plan[];
    return reply.send(plans);
  });

  // Get plan detail
  app.get<{ Params: { planId: string } }>('/api/plans/:planId', async (req, reply) => {
    const db = getDb();
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.planId) as Plan | undefined;
    if (!plan) return reply.status(404).send({ error: 'Plan not found' });

    // Single query: join labels onto inputs instead of one lookup per input
    const inputs = db.prepare(`
      SELECT pi.*, l.name AS label
      FROM plan_inputs pi
      LEFT JOIN labels l
        ON l.wallet_id = ?
        AND l.ref = (pi.txid || ':' || pi.vout)
        AND l.label_type = 'output'
      WHERE pi.plan_id = ?
    `).all(plan.wallet_id, plan.id) as (PlanInput & { label: string | null })[];

    const inputLabels: Record<string, string> = {};
    for (const inp of inputs) {
      if (inp.label) inputLabels[`${inp.txid}:${inp.vout}`] = inp.label;
    }

    return reply.send({ ...plan, inputs, input_labels: inputLabels });
  });
}
