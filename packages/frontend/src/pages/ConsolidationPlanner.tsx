import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { usePlanStore } from '../store/planStore';
import { api } from '../api/client';
import FiatValue from '../components/FiatValue';

export default function ConsolidationPlanner() {
  const { activeWalletId } = useWalletStore();
  const { setCurrentPlan } = usePlanStore();
  const navigate = useNavigate();

  const [threshold, setThreshold] = useState('10000');
  const [urgency, setUrgency] = useState<'fastest' | 'half_hour' | 'hour'>('hour');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');

  const { data: fees } = useQuery({ queryKey: ['fees'], queryFn: api.fees.get });
  const { data: balance } = useQuery({
    queryKey: ['balance', activeWalletId],
    queryFn: () => api.utxos.balance(activeWalletId!),
    enabled: !!activeWalletId,
  });

  const feeRate = fees ? {
    fastest: fees.fastest,
    half_hour: fees.half_hour,
    hour: fees.hour,
  }[urgency] ?? 5 : 5;

  const mut = useMutation({
    mutationFn: () =>
      api.plans.consolidation(activeWalletId!, {
        threshold: parseInt(threshold, 10),
        fee_rate: feeRate,
        urgency,
        destination: destination.trim(),
      }),
    onSuccess: (data) => {
      setCurrentPlan({
        ...data,
        id: data.plan_id,
        wallet_id: activeWalletId!,
        plan_type: 'consolidation',
        mode: null,
        target_amount: null,
        destination: destination.trim(),
        fee_rate: feeRate,
        estimated_fee: data.estimatedFee,
        estimated_output: data.outputAmount,
        warnings: JSON.stringify(data.warnings),
        created_at: Date.now(),
        inputs: data.candidates?.map((u: any, i: number) => ({ id: i, plan_id: data.plan_id, txid: u.txid, vout: u.vout, amount: u.amount })) ?? [],
        input_labels: {},
      });
      navigate(`/plan/${data.plan_id}`);
    },
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const t = parseInt(threshold, 10);
    if (isNaN(t) || t <= 0) { setError('Enter a valid threshold in satoshis.'); return; }
    if (!destination.trim()) { setError('Enter a destination address for the consolidated output.'); return; }
    mut.mutate();
  };

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h2>⇆ Consolidation Planner</h2>
        <p>Identify small UTXOs and plan a consolidation to reduce future fees.</p>
      </div>

      <div className="alert alert-info mb-6">
        <span>ℹ</span>
        <span>Consolidating UTXOs when fees are low reduces the cost of future spends. This tool will group all UTXOs below your chosen threshold into a single output. <strong>It does not sign or broadcast.</strong></span>
      </div>

      {(balance?.small_utxo_count ?? 0) === 0 && (
        <div className="alert alert-success mb-4">
          ✓ No small UTXOs detected below the default threshold. Your UTXO set looks healthy.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <div className="card-title mb-4">Small UTXO threshold</div>
          <div className="field">
            <label className="label">UTXOs below this amount will be consolidated (satoshis)</label>
            <input
              className="input mono"
              type="number"
              min="1"
              placeholder="10000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <div className="text-sm text-muted">
              You have{' '}
              <strong style={{ color: 'var(--yellow)' }}>
                {balance?.small_utxo_count ?? 0} UTXOs
              </strong>{' '}
              at or below the current default threshold.
              {balance?.confirmed_balance != null && (
                <span> Total balance: {balance.confirmed_balance.toLocaleString()} sats<FiatValue sats={balance.confirmed_balance} /></span>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-4">Fee urgency</div>
          <div className="grid-3" style={{ gap: 10 }}>
            {([
              { key: 'fastest',   label: 'Next block', cls: 'fee-fast', note: 'Highest fee — fastest' },
              { key: 'half_hour', label: '~30 min',    cls: 'fee-med',  note: 'Balanced' },
              { key: 'hour',      label: '~1 hour',    cls: 'fee-slow', note: 'Best for consolidation' },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                className={`btn ${urgency === t.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flexDirection: 'column', gap: 4, padding: '12px' }}
                onClick={() => setUrgency(t.key)}
              >
                <span>{t.label}</span>
                {fees && <span className={`fee-badge ${t.cls}`}>{(fees as any)[t.key]} sat/vB</span>}
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{t.note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-4">Destination address</div>
          <div className="field">
            <label className="label">
              Your own address where the consolidated output will land
            </label>
            <input
              className="input mono"
              type="text"
              placeholder="bc1q…"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <div className="text-sm text-muted">
              Use an unused address from the same wallet. UTXO Pilot does not derive one for you.
            </div>
            <div className="text-sm" style={{ color: 'var(--yellow)' }}>
              For testing purposes the address must be 14 or more characters.
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={mut.isPending}
          style={{ justifyContent: 'center', padding: '12px' }}
        >
          {mut.isPending ? <><span className="spinner" /> Planning…</> : 'Generate Consolidation Plan →'}
        </button>
      </form>
    </div>
  );
}
