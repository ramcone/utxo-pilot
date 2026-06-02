import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { usePlanStore } from '../store/planStore';
import { api } from '../api/client';
import FeePanel from '../components/FeePanel';

export default function SpendPlanner() {
  const { activeWalletId } = useWalletStore();
  const { setCurrentPlan } = usePlanStore();
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'fee-first' | 'privacy-first'>('fee-first');
  const [urgency, setUrgency] = useState<'fastest' | 'half_hour' | 'hour'>('half_hour');
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
  }[urgency] ?? 10 : 10;

  const mut = useMutation({
    mutationFn: () =>
      api.plans.spend(activeWalletId!, {
        target_amount: parseInt(amount, 10),
        fee_rate: feeRate,
        mode,
      }),
    onSuccess: (data) => {
      setCurrentPlan({ ...data, id: data.plan_id, wallet_id: activeWalletId!, plan_type: 'spend', mode, target_amount: parseInt(amount, 10), destination: null, fee_rate: feeRate, estimated_fee: data.estimatedFee, estimated_output: parseInt(amount, 10), warnings: JSON.stringify(data.warnings), created_at: Date.now(), inputs: data.selected?.map((u: any, i: number) => ({ id: i, plan_id: data.plan_id, txid: u.txid, vout: u.vout, amount: u.amount })) ?? [], input_labels: {} });
      navigate(`/plan/${data.plan_id}`);
    },
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const sats = parseInt(amount, 10);
    if (isNaN(sats) || sats <= 0) { setError('Enter a valid amount in satoshis.'); return; }
    if (sats > (balance?.confirmed_balance ?? 0)) { setError('Amount exceeds available balance.'); return; }
    mut.mutate();
  };

  const satsBalance = balance?.confirmed_balance ?? 0;

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h2>↗ Spend Planner</h2>
        <p>Enter the amount you want to send. UTXO Pilot will select UTXOs for you.</p>
      </div>

      <div className="alert alert-info mb-6">
        <span>ℹ</span>
        <span>This tool <strong>does not sign or broadcast</strong> transactions. You will export the plan and recreate it in your actual wallet.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <div className="card-title mb-4">Amount to send</div>
          <div className="field">
            <label className="label">Amount (satoshis)</label>
            <input
              className="input mono"
              type="number"
              min="1"
              max={satsBalance}
              placeholder="e.g. 250000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <div className="flex justify-between text-sm text-muted">
              <span>Available: {satsBalance.toLocaleString()} sats</span>
              {amount && !isNaN(parseInt(amount)) && (
                <span>{(parseInt(amount) / 1e8).toFixed(8)} BTC</span>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-4">Fee urgency</div>
          <div className="grid-3" style={{ gap: 10 }}>
            {([
              { key: 'fastest',   label: 'Next block', cls: 'fee-fast' },
              { key: 'half_hour', label: '~30 min',    cls: 'fee-med'  },
              { key: 'hour',      label: '~1 hour',    cls: 'fee-slow' },
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
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title mb-4">Selection mode</div>
          <div className="grid-2" style={{ gap: 10 }}>
            <button
              type="button"
              className={`btn ${mode === 'fee-first' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '14px', gap: 4 }}
              onClick={() => setMode('fee-first')}
            >
              <span style={{ fontWeight: 700 }}>Minimise Fee</span>
              <span style={{ fontSize: '0.78rem', opacity: 0.8, fontWeight: 400, textAlign: 'left' }}>
                Fewest inputs. Prefer larger UTXOs. Lowest tx size.
              </span>
            </button>
            <button
              type="button"
              className={`btn ${mode === 'privacy-first' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '14px', gap: 4 }}
              onClick={() => setMode('privacy-first')}
            >
              <span style={{ fontWeight: 700 }}>Minimise Privacy Leakage</span>
              <span style={{ fontSize: '0.78rem', opacity: 0.8, fontWeight: 400, textAlign: 'left' }}>
                Prefer same-label UTXOs. Avoid mixing coin histories.
              </span>
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={mut.isPending}
          style={{ justifyContent: 'center', padding: '12px' }}
        >
          {mut.isPending ? <><span className="spinner" /> Selecting coins…</> : 'Generate Spend Plan →'}
        </button>
      </form>

      <div className="mt-6">
        <FeePanel compact />
      </div>
    </div>
  );
}
