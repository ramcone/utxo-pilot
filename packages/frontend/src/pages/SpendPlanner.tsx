import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { usePlanStore } from '../store/planStore';
import { useBTCPrice } from '../hooks/useBTCPrice';
import { api } from '../api/client';
import FeePanel from '../components/FeePanel';
import FiatValue from '../components/FiatValue';

type Unit = 'sats' | 'btc' | 'fiat';

/** Convert a user-entered amount string + unit → satoshis (or null if invalid) */
function toSats(raw: string, unit: Unit, btcPrice: number | null): number | null {
  const n = parseFloat(raw);
  if (isNaN(n) || n <= 0) return null;
  if (unit === 'sats') return Math.round(n);
  if (unit === 'btc')  return Math.round(n * 1e8);
  if (unit === 'fiat' && btcPrice) return Math.round((n / btcPrice) * 1e8);
  return null;
}

function unitLabel(unit: Unit, currency: string): string {
  if (unit === 'sats') return 'sats';
  if (unit === 'btc')  return 'BTC';
  return currency;
}

function unitPlaceholder(unit: Unit, currency: string): string {
  if (unit === 'sats') return 'e.g. 250000';
  if (unit === 'btc')  return 'e.g. 0.0025';
  return `e.g. 150.00 ${currency}`;
}

export default function SpendPlanner() {
  const { activeWalletId } = useWalletStore();
  const { setCurrentPlan } = usePlanStore();
  const navigate = useNavigate();
  const { price: btcPrice, currency } = useBTCPrice();

  const [amount, setAmount]   = useState('');
  const [unit, setUnit]       = useState<Unit>('sats');
  const [mode, setMode]       = useState<'fee-first' | 'privacy-first'>('fee-first');
  const [urgency, setUrgency] = useState<'fastest' | 'half_hour' | 'hour'>('half_hour');
  const [error, setError]     = useState('');

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

  // Convert the entered amount to sats for preview and submission
  const satsAmount = useMemo(() => toSats(amount, unit, btcPrice), [amount, unit, btcPrice]);
  const satsBalance = balance?.confirmed_balance ?? 0;

  // Secondary display: show what the entered amount equals in the other units
  const secondaryDisplay = useMemo(() => {
    if (!satsAmount) return null;
    const parts: string[] = [];
    if (unit !== 'sats') parts.push(`${satsAmount.toLocaleString()} sats`);
    if (unit !== 'btc')  parts.push(`${(satsAmount / 1e8).toFixed(8)} BTC`);
    if (unit !== 'fiat' && btcPrice) {
      const fiatVal = (satsAmount / 1e8) * btcPrice;
      parts.push(`≈ ${fiatVal.toLocaleString('en-US', { style: 'currency', currency })} ${currency}`);
    }
    return parts.join('  ·  ');
  }, [satsAmount, unit, btcPrice, currency]);

  const mut = useMutation({
    mutationFn: () =>
      api.plans.spend(activeWalletId!, {
        target_amount: satsAmount!,
        fee_rate: feeRate,
        mode,
      }),
    onSuccess: (data) => {
      setCurrentPlan({
        ...data,
        id: data.plan_id,
        wallet_id: activeWalletId!,
        plan_type: 'spend',
        mode,
        target_amount: satsAmount!,
        destination: null,
        fee_rate: feeRate,
        estimated_fee: data.estimatedFee,
        estimated_output: satsAmount!,
        warnings: JSON.stringify(data.warnings),
        created_at: Date.now(),
        inputs: data.selected?.map((u: any, i: number) => ({
          id: i, plan_id: data.plan_id, txid: u.txid, vout: u.vout, amount: u.amount,
        })) ?? [],
        input_labels: {},
      });
      navigate(`/plan/${data.plan_id}`);
    },
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!satsAmount) {
      setError(`Enter a valid amount in ${unitLabel(unit, currency)}.`);
      return;
    }
    if (unit === 'fiat' && !btcPrice) {
      setError('BTC price not available yet — try again in a moment or switch to sats/BTC.');
      return;
    }
    if (satsAmount > satsBalance) {
      setError('Amount exceeds available balance.');
      return;
    }
    mut.mutate();
  };

  // When the unit changes, reset the amount so the placeholder updates
  const handleUnitChange = (newUnit: Unit) => {
    setUnit(newUnit);
    setAmount('');
    setError('');
  };

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

          {/* Amount input + unit selector */}
          <div className="field">
            <label className="label">Amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input mono"
                type="number"
                min="0"
                step={unit === 'sats' ? '1' : 'any'}
                placeholder={unitPlaceholder(unit, currency)}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                autoFocus
                style={{ flex: 1 }}
              />
              <select
                className="select"
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as Unit)}
                style={{ width: 90, fontWeight: 600 }}
              >
                <option value="sats">sats</option>
                <option value="btc">BTC</option>
                <option value="fiat">{currency}</option>
              </select>
            </div>

            {/* Secondary unit display */}
            {secondaryDisplay && (
              <div className="text-sm" style={{ color: 'var(--accent)', marginTop: 6 }}>
                = {secondaryDisplay}
              </div>
            )}

            {/* Available balance */}
            <div className="flex justify-between text-sm text-muted" style={{ marginTop: 6 }}>
              <span>
                Available: {satsBalance.toLocaleString()} sats
                <FiatValue sats={satsBalance} />
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                onClick={() => {
                  if (unit === 'sats') setAmount(String(satsBalance));
                  else if (unit === 'btc') setAmount((satsBalance / 1e8).toFixed(8));
                  else if (unit === 'fiat' && btcPrice) {
                    setAmount(((satsBalance / 1e8) * btcPrice).toFixed(2));
                  }
                }}
              >
                Max
              </button>
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
          disabled={mut.isPending || !satsAmount}
          style={{ justifyContent: 'center', padding: '12px' }}
        >
          {mut.isPending
            ? <><span className="spinner" /> Selecting coins…</>
            : satsAmount
              ? `Generate Spend Plan — ${satsAmount.toLocaleString()} sats →`
              : 'Generate Spend Plan →'}
        </button>
      </form>

      <div className="mt-6">
        <FeePanel compact />
      </div>
    </div>
  );
}
