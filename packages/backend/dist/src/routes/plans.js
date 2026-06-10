"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRoutes = planRoutes;
const zod_1 = require("zod");
const database_js_1 = require("../db/database.js");
const coinSelection_js_1 = require("../services/coinSelection.js");
const consolidation_js_1 = require("../services/consolidation.js");
const SpendPlanSchema = zod_1.z.object({
    target_amount: zod_1.z.number().int().positive(),
    fee_rate: zod_1.z.number().positive(),
    mode: zod_1.z.enum(['fee-first', 'privacy-first']),
});
const ConsolidationPlanSchema = zod_1.z.object({
    threshold: zod_1.z.number().int().positive().default(10000),
    fee_rate: zod_1.z.number().positive(),
    urgency: zod_1.z.enum(['fastest', 'half_hour', 'hour']).default('hour'),
    destination: zod_1.z.string().min(14).max(100),
});
function getUTXOsWithLabels(db, walletId) {
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
  `).all(walletId);
}
function getLatestFeeRates(db) {
    const snap = db.prepare('SELECT * FROM fee_snapshots ORDER BY fetched_at DESC LIMIT 1').get();
    return snap ?? { fastest: 20, half_hour: 10, hour: 5, minimum: 1 };
}
async function planRoutes(app) {
    // Create spend plan
    app.post('/api/wallets/:id/plans/spend', async (req, reply) => {
        const body = SpendPlanSchema.safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
        const db = (0, database_js_1.getDb)();
        const walletId = parseInt(req.params.id, 10);
        const utxos = getUTXOsWithLabels(db, walletId);
        const result = (0, coinSelection_js_1.selectCoins)(utxos, body.data.target_amount, body.data.fee_rate, body.data.mode);
        if (!result) {
            return reply.status(422).send({ error: 'Insufficient spendable funds for this amount and fee rate.' });
        }
        const planId = db.prepare(`
      INSERT INTO plans (wallet_id, plan_type, mode, target_amount, fee_rate, estimated_fee, estimated_output, warnings, created_at)
      VALUES (?, 'spend', ?, ?, ?, ?, ?, ?, ?)
    `).run(walletId, body.data.mode, body.data.target_amount, body.data.fee_rate, result.estimatedFee, body.data.target_amount, JSON.stringify(result.warnings), Date.now()).lastInsertRowid;
        const insertInput = db.prepare('INSERT INTO plan_inputs (plan_id, txid, vout, amount) VALUES (?, ?, ?, ?)');
        for (const u of result.selected) {
            insertInput.run(planId, u.txid, u.vout, u.amount);
        }
        return reply.status(201).send({ plan_id: planId, ...result });
    });
    // Create consolidation plan
    app.post('/api/wallets/:id/plans/consolidation', async (req, reply) => {
        const body = ConsolidationPlanSchema.safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: 'Validation failed', issues: body.error.issues });
        const db = (0, database_js_1.getDb)();
        const walletId = parseInt(req.params.id, 10);
        const utxos = getUTXOsWithLabels(db, walletId);
        const feeRates = getLatestFeeRates(db);
        const result = (0, consolidation_js_1.planConsolidation)(utxos, body.data.threshold, feeRates, body.data.urgency);
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
    `).run(walletId, body.data.destination, usedFeeRate, result.estimatedFee, result.outputAmount, JSON.stringify(result.warnings), Date.now()).lastInsertRowid;
        const insertInput = db.prepare('INSERT INTO plan_inputs (plan_id, txid, vout, amount) VALUES (?, ?, ?, ?)');
        for (const u of result.candidates) {
            insertInput.run(planId, u.txid, u.vout, u.amount);
        }
        return reply.status(201).send({ plan_id: planId, ...result });
    });
    // List plans for a wallet
    app.get('/api/wallets/:id/plans', async (req, reply) => {
        const db = (0, database_js_1.getDb)();
        const plans = db.prepare('SELECT * FROM plans WHERE wallet_id = ? ORDER BY created_at DESC').all(req.params.id);
        return reply.send(plans);
    });
    // Get plan detail
    app.get('/api/plans/:planId', async (req, reply) => {
        const db = (0, database_js_1.getDb)();
        const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.planId);
        if (!plan)
            return reply.status(404).send({ error: 'Plan not found' });
        // Single query: join labels onto inputs instead of one lookup per input
        const inputs = db.prepare(`
      SELECT pi.*, l.name AS label
      FROM plan_inputs pi
      LEFT JOIN labels l
        ON l.wallet_id = ?
        AND l.ref = (pi.txid || ':' || pi.vout)
        AND l.label_type = 'output'
      WHERE pi.plan_id = ?
    `).all(plan.wallet_id, plan.id);
        const inputLabels = {};
        for (const inp of inputs) {
            if (inp.label)
                inputLabels[`${inp.txid}:${inp.vout}`] = inp.label;
        }
        return reply.send({ ...plan, inputs, input_labels: inputLabels });
    });
}
//# sourceMappingURL=plans.js.map