import { FastifyInstance } from 'fastify';
import { getDb } from '../db/database.js';
import { Plan, PlanInput } from '../types.js';

export async function exportRoutes(app: FastifyInstance) {
  app.get<{ Params: { planId: string }; Querystring: { format?: string } }>(
    '/api/plans/:planId/export',
    async (req, reply) => {
      const db = getDb();
      const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.planId) as Plan | undefined;
      if (!plan) return reply.status(404).send({ error: 'Plan not found' });

      const inputs = db.prepare('SELECT * FROM plan_inputs WHERE plan_id = ?').all(plan.id) as PlanInput[];

      const inputsWithLabels = inputs.map((inp) => {
        const ref = `${inp.txid}:${inp.vout}`;
        const lbl = db.prepare(
          "SELECT name FROM labels WHERE wallet_id = ? AND ref = ? AND label_type = 'output'"
        ).get(plan.wallet_id, ref) as { name: string } | undefined;
        return { ...inp, label: lbl?.name ?? '' };
      });

      const format = req.query.format ?? 'json';

      if (format === 'csv') {
        const rows = [
          ['txid', 'vout', 'amount_sats', 'label'],
          ...inputsWithLabels.map((i) => [i.txid, i.vout, i.amount, i.label]),
        ];
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="utxo-plan-${plan.id}.csv"`);
        return reply.send(csv);
      }

      // JSON export
      const payload = {
        utxo_pilot_export: true,
        version: '0.1.0',
        plan_id: plan.id,
        plan_type: plan.plan_type,
        mode: plan.mode,
        target_amount_sats: plan.target_amount,
        destination: plan.destination,
        fee_rate_sat_vb: plan.fee_rate,
        estimated_fee_sats: plan.estimated_fee,
        estimated_output_sats: plan.estimated_output,
        warnings: JSON.parse(plan.warnings),
        created_at: new Date(plan.created_at).toISOString(),
        inputs: inputsWithLabels,
        checklist: [
          'Open your hardware wallet or signing software.',
          'Recreate this transaction manually using the inputs listed above.',
          'Verify the destination address matches exactly.',
          'Verify the fee matches your expectation.',
          'Sign and broadcast only after verifying all details.',
          'UTXO Pilot does not sign or broadcast — it is a planning tool only.',
        ],
      };

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="utxo-plan-${plan.id}.json"`);
      return reply.send(JSON.stringify(payload, null, 2));
    }
  );
}
