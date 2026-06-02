import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { api } from '../api/client';
import FeePanel from '../components/FeePanel';
import FeeRateChart from '../components/FeeRateChart';
import FiatValue from '../components/FiatValue';

function satsDisplay(sats: number) {
  if (sats >= 100_000_000) return `${(sats / 1e8).toFixed(8)} BTC`;
  if (sats >= 1_000_000)   return `${(sats / 1e8).toFixed(6)} BTC`;
  return `${sats.toLocaleString()} sats`;
}

// Slider snap points in sats
const SLIDER_MARKS = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];

export default function Dashboard() {
  const { activeWalletId } = useWalletStore();
  const qc = useQueryClient();
  const [syncMsg, setSyncMsg] = useState('');
  const [showThresholdEditor, setShowThresholdEditor] = useState(false);
  const [sliderValue, setSliderValue] = useState(10000);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  });

  // Initialise slider from persisted settings
  useEffect(() => {
    if (settings?.small_utxo_threshold) {
      setSliderValue(parseInt(settings.small_utxo_threshold, 10));
    }
  }, [settings]);

  const { data: wallet } = useQuery({
    queryKey: ['wallet', activeWalletId],
    queryFn: () => api.wallets.get(activeWalletId!),
    enabled: !!activeWalletId,
  });

  const { data: balance } = useQuery({
    queryKey: ['balance', activeWalletId],
    queryFn: () => api.utxos.balance(activeWalletId!),
    enabled: !!activeWalletId,
    refetchInterval: 15_000,
  });

  const { data: syncStatus, refetch: refetchSync } = useQuery({
    queryKey: ['sync-status', activeWalletId],
    queryFn: () => api.sync.status(activeWalletId!),
    enabled: !!activeWalletId,
    refetchInterval: (q) => q.state.data?.running ? 2_000 : false,
  });

  const syncMut = useMutation({
    mutationFn: () => api.sync.trigger(activeWalletId!),
    onSuccess: () => {
      setSyncMsg('Sync started…');
      const interval = setInterval(async () => {
        const status = await api.sync.status(activeWalletId!);
        refetchSync();
        if (!status.running) {
          clearInterval(interval);
          setSyncMsg('');
          qc.invalidateQueries({ queryKey: ['balance', activeWalletId] });
          qc.invalidateQueries({ queryKey: ['utxos', activeWalletId] });
          qc.invalidateQueries({ queryKey: ['wallet', activeWalletId] });
        }
      }, 2000);
    },
  });

  const thresholdMut = useMutation({
    mutationFn: (value: number) =>
      api.settings.update({ small_utxo_threshold: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['balance', activeWalletId] });
    },
  });

  if (!activeWalletId) return null;

  const isRunning = syncStatus?.running;
  const lastSync = syncStatus?.synced_at
    ? new Date(syncStatus.synced_at).toLocaleString()
    : 'Never';

  // Map slider index (0–7) to sats value
  const sliderIndex = SLIDER_MARKS.indexOf(sliderValue) !== -1
    ? SLIDER_MARKS.indexOf(sliderValue)
    : SLIDER_MARKS.findIndex(m => m >= sliderValue) || 4;

  const handleSliderChange = (idx: number) => {
    const value = SLIDER_MARKS[idx];
    setSliderValue(value);
    thresholdMut.mutate(value);
  };

  return (
    <div className="page">
      <div className="page-header flex justify-between items-center" style={{ display: 'flex' }}>
        <div>
          <h2>{wallet?.name ?? 'Dashboard'}</h2>
          <p>
            {wallet?.pub_type?.toUpperCase()} · {wallet?.script_type} · Last sync: {lastSync}
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => syncMut.mutate()}
          disabled={isRunning || syncMut.isPending}
        >
          {isRunning ? <><span className="spinner" /> Syncing…</> : '↻ Sync Now'}
        </button>
      </div>

      {isRunning && (
        <div className="alert alert-info mb-4">
          <span className="spinner" />
          <span>{syncStatus?.progress ?? 'Syncing addresses…'}</span>
        </div>
      )}

      {syncStatus?.error && (
        <div className="alert alert-error mb-4">⚠ Sync error: {syncStatus.error}</div>
      )}

      {/* Balance cards */}
      <div className="grid-4 mb-6">
        <div className="card">
          <div className="card-title">Total Balance</div>
          <div className="card-value" style={{ fontSize: '1.3rem' }}>
            {satsDisplay(balance?.confirmed_balance ?? 0)}
          </div>
          <FiatValue sats={balance?.confirmed_balance ?? 0} display="block" />
        </div>
        <div className="card">
          <div className="card-title">UTXOs</div>
          <div className="card-value">{balance?.utxo_count ?? 0}</div>
          <div className="card-sub">unspent outputs</div>
        </div>

        {/* Small UTXOs card — clickable to open threshold editor */}
        <div
          className="card"
          onClick={() => setShowThresholdEditor((v) => !v)}
          style={{ cursor: 'pointer', outline: showThresholdEditor ? '2px solid var(--accent)' : 'none', transition: 'outline 0.15s' }}
          title="Click to adjust threshold"
        >
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Small UTXOs
            <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>
              {showThresholdEditor ? '▲ close' : '▼ adjust'}
            </span>
          </div>
          <div className="card-value" style={{ color: balance?.small_utxo_count ? 'var(--yellow)' : 'inherit' }}>
            {balance?.small_utxo_count ?? 0}
          </div>
          <div className="card-sub">≤ {sliderValue.toLocaleString()} sats</div>
        </div>

        <div className="card">
          <div className="card-title">Script type</div>
          <div className="card-value" style={{ fontSize: '1rem', marginTop: 8 }}>
            {wallet?.script_type ?? '—'}
          </div>
          <div className="card-sub">{wallet?.derivation_path}</div>
        </div>
      </div>

      {/* Inline threshold editor — shown when Small UTXOs card is clicked */}
      {showThresholdEditor && (
        <div className="card mb-6" style={{ borderColor: 'var(--accent)', background: 'rgba(247,147,26,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Small UTXO threshold</div>
              <div className="text-sm text-muted">UTXOs at or below this amount are counted as "small"</div>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              {sliderValue.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text2)' }}>sats</span>
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={SLIDER_MARKS.length - 1}
            step={1}
            value={sliderIndex}
            onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', height: 6 }}
          />

          {/* Tick labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {SLIDER_MARKS.map((m, i) => (
              <button
                key={m}
                onClick={() => handleSliderChange(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                  fontSize: '0.7rem',
                  color: sliderIndex === i ? 'var(--accent)' : 'var(--text3)',
                  fontWeight: sliderIndex === i ? 700 : 400,
                }}
              >
                {m >= 1000 ? `${m / 1000}k` : m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fee panel */}
      <div className="mb-4">
        <FeePanel />
      </div>

      {/* Fee rate history chart */}
      <div className="mb-6">
        <FeeRateChart />
      </div>

      {/* Action cards */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: '1rem' }}>↗ Plan a Spend</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
            Enter an amount and let UTXO Pilot suggest the best UTXOs to minimise fees or protect privacy.
          </p>
          <Link to="/spend" className="btn btn-primary">
            Open Spend Planner
          </Link>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: '1rem' }}>⇆ Plan a Consolidation</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
            Identify small UTXOs that are candidates for consolidation. See what it costs at current fees.
          </p>
          <Link to="/consolidation" className="btn btn-primary">
            Open Consolidation Planner
          </Link>
        </div>
      </div>

      {/* Consolidation nudge */}
      {(balance?.small_utxo_count ?? 0) > 3 && (
        <div className="alert alert-warn mt-6">
          <span>💡</span>
          <div>
            You have <strong>{balance!.small_utxo_count} small UTXOs</strong> below {sliderValue.toLocaleString()} sats. Consolidating them when fees
            are low can save money in future transactions.{' '}
            <Link to="/consolidation">Plan a consolidation →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
