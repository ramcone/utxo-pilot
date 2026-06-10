import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePlanStore } from '../store/planStore';
import { PlanDetail, PlanInput } from '../types';
import FiatValue from '../components/FiatValue';

function fmt(sats: number) {
  return `${sats.toLocaleString()} sats (${(sats / 1e8).toFixed(8)} BTC)`;
}

const CHECKLIST = [
  'Open your hardware wallet or signing software (e.g. Sparrow, Specter, or your device).',
  'Create a new transaction manually using the UTXO inputs listed above.',
  'Verify the destination address character-by-character on your hardware wallet screen.',
  'Verify the fee amount matches your expectation.',
  'If required, enter your seed phrase or private key only on your trusted signing device — never on a networked computer.',
  'Sign and broadcast only after you have verified every detail.',
  'UTXO Pilot is a planning tool only — it cannot sign or broadcast.',
];

export default function PlanReview() {
  const { planId } = useParams<{ planId: string }>();
  const { currentPlan } = usePlanStore();

  const { data: fetched, isLoading } = useQuery<PlanDetail>({
    queryKey: ['plan', planId],
    queryFn: () => api.plans.get(parseInt(planId!, 10)),
    enabled: !!planId,
    // Use the in-memory plan from the store immediately, fallback to API
    initialData: currentPlan?.id === parseInt(planId ?? '0', 10) ? currentPlan : undefined,
  });

  if (isLoading) return <div className="page"><span className="spinner" /></div>;
  if (!fetched) return <div className="page"><div className="alert alert-error">Plan not found.</div></div>;

  const plan = fetched;
  const inputs: PlanInput[] = plan.inputs ?? [];
  const warnings: string[] = typeof plan.warnings === 'string' ? JSON.parse(plan.warnings) : plan.warnings ?? [];
  const totalIn = inputs.reduce((s, i) => s + i.amount, 0);
  const jsonUrl = api.export.url(plan.id, 'json');
  const csvUrl  = api.export.url(plan.id, 'csv');

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="flex justify-between items-center mb-6" style={{ display: 'flex' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2>{plan.plan_type === 'spend' ? '↗ Spend Plan' : '⇆ Consolidation Plan'} #{plan.id}</h2>
          <p>Review every detail before recreating this in your wallet.</p>
        </div>
        <div className="flex gap-2">
          <a href={jsonUrl} download className="btn btn-secondary btn-sm" onClick={() => localStorage.setItem('utxo-pilot-exported', '1')}>⬇ JSON</a>
          <a href={csvUrl}  download className="btn btn-secondary btn-sm" onClick={() => localStorage.setItem('utxo-pilot-exported', '1')}>⬇ CSV</a>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-4 mb-6">
          {warnings.map((w, i) => (
            <div key={i} className="alert alert-warn">
              <span>⚠</span> {w}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid-3 mb-6">
        <div className="card">
          <div className="card-title">Inputs</div>
          <div className="card-value">{inputs.length}</div>
          <div className="card-sub">{fmt(totalIn)}</div>
        </div>
        {plan.plan_type === 'spend' && (
          <div className="card">
            <div className="card-title">Send amount</div>
            <div className="card-value" style={{ fontSize: '1rem' }}>{plan.target_amount?.toLocaleString() ?? '—'} sats</div>
            {plan.target_amount != null && <FiatValue sats={plan.target_amount} display="block" />}
          </div>
        )}
        {plan.plan_type === 'consolidation' && (
          <div className="card">
            <div className="card-title">Output amount</div>
            <div className="card-value" style={{ fontSize: '1rem' }}>{plan.estimated_output.toLocaleString()} sats</div>
            <FiatValue sats={plan.estimated_output} display="block" />
          </div>
        )}
        <div className="card">
          <div className="card-title">Estimated fee</div>
          <div className="card-value" style={{ fontSize: '1rem', color: 'var(--yellow)' }}>
            {plan.estimated_fee.toLocaleString()} sats
          </div>
          <FiatValue sats={plan.estimated_fee} display="block" />
          <div className="card-sub">@ {plan.fee_rate} sat/vB</div>
        </div>
        <div className="card">
          <div className="card-title">Mode</div>
          <div className="card-value" style={{ fontSize: '0.95rem' }}>
            {plan.mode ?? plan.plan_type}
          </div>
        </div>
      </div>

      {/* Destination */}
      {plan.destination && (
        <div className="card mb-6">
          <div className="card-title mb-2">Destination address</div>
          <code className="mono" style={{ fontSize: '0.875rem', wordBreak: 'break-all', color: 'var(--accent)' }}>
            {plan.destination}
          </code>
          <div className="alert alert-warn mt-4">
            <span>⚠</span>
            Verify this address on your hardware wallet screen before signing. Never rely on clipboard alone.
          </div>
        </div>
      )}

      {/* Input table */}
      <div className="card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
          Selected inputs
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>TXID</th>
                <th>Vout</th>
                <th style={{ textAlign: 'right' }}>Amount (sats)</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((inp, i) => {
                const ref = `${inp.txid}:${inp.vout}`;
                const label = plan.input_labels?.[ref] ?? inp.label ?? '';
                return (
                  <tr key={ref}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>
                      {inp.txid.slice(0, 10)}…{inp.txid.slice(-8)}
                    </td>
                    <td>{inp.vout}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {inp.amount.toLocaleString()}
                    </td>
                    <td>{label ? <span className="tag tag-orange">{label}</span> : <span className="text-muted">—</span>}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Total in:</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {totalIn.toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14 }}>✅ Before you sign — checklist</div>
        <ul className="checklist">
          {CHECKLIST.map((item, i) => (
            <li key={i}>
              <span className="check-icon">□</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 mt-6">
        <Link to="/spend" className="btn btn-secondary">← New Spend Plan</Link>
        <Link to="/consolidation" className="btn btn-secondary">← New Consolidation</Link>
        <Link to="/dashboard" className="btn btn-ghost" style={{ marginLeft: 'auto' }}>Dashboard</Link>
      </div>
    </div>
  );
}
