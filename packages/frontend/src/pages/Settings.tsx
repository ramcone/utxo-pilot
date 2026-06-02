import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWalletStore } from '../store/walletStore';
import { api } from '../api/client';
import { CURRENCIES } from '../currencies';

export default function Settings() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { activeWalletId, setActiveWalletId } = useWalletStore();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.settings.get });
  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: api.wallets.list });

  const [dustThreshold, setDustThreshold]   = useState('1000');
  const [smallThreshold, setSmallThreshold] = useState('10000');
  const [gapLimit, setGapLimit]             = useState('20');
  const [fiatCurrency, setFiatCurrency]     = useState('USD');

  useEffect(() => {
    if (settings) {
      setDustThreshold(settings.dust_threshold ?? '1000');
      setSmallThreshold(settings.small_utxo_threshold ?? '10000');
      setGapLimit(settings.default_gap_limit ?? '20');
      setFiatCurrency(settings.fiat_currency ?? 'USD');
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => api.settings.update({
      dust_threshold:       parseInt(dustThreshold, 10),
      small_utxo_threshold: parseInt(smallThreshold, 10),
      default_gap_limit:    parseInt(gapLimit, 10),
      fiat_currency:        fiatCurrency,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.wallets.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      if (activeWalletId === id) {
        setActiveWalletId(null);
        navigate('/');
      }
    },
  });

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h2>⚙ Settings</h2>
        <p>Configure thresholds and manage wallets.</p>
      </div>

      {/* Fiat currency */}
      <div className="card mb-6">
        <h3 style={{ fontSize: '0.9rem', marginBottom: 12 }}>💱 Fiat currency</h3>
        <div className="field">
          <label className="label">Display currency</label>
          <select
            className="select"
            value={fiatCurrency}
            onChange={(e) => setFiatCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
          <span className="text-sm text-muted">
            BTC and sat amounts will show an approximate fiat value alongside them.
            Price data is fetched from mempool.space and refreshed every 5 minutes.
          </span>
        </div>
        <button className="btn btn-primary btn-sm mt-4" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Saving…' : 'Save currency'}
        </button>
        {saveMut.isSuccess && <div className="alert alert-success mt-4">✓ Saved.</div>}
      </div>

      {/* UTXO thresholds */}
      <div className="card space-y-4 mb-6">
        <h3 style={{ fontSize: '0.9rem', marginBottom: 4 }}>UTXO thresholds</h3>
        <div className="field">
          <label className="label">Dust threshold (sats)</label>
          <input className="input mono" type="number" value={dustThreshold} onChange={(e) => setDustThreshold(e.target.value)} />
          <span className="text-sm text-muted">UTXOs at or below this amount are flagged as dust.</span>
        </div>
        <div className="field">
          <label className="label">Small UTXO threshold (sats)</label>
          <input className="input mono" type="number" value={smallThreshold} onChange={(e) => setSmallThreshold(e.target.value)} />
          <span className="text-sm text-muted">UTXOs at or below this amount are counted as "small" on the dashboard.</span>
        </div>
        <div className="field">
          <label className="label">Default gap limit (addresses)</label>
          <input className="input mono" type="number" min="1" max="100" value={gapLimit} onChange={(e) => setGapLimit(e.target.value)} />
          <span className="text-sm text-muted">Number of consecutive unused addresses to scan before stopping. Default: 20.</span>
        </div>
        <button className="btn btn-primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Saving…' : 'Save thresholds'}
        </button>
        {saveMut.isSuccess && <div className="alert alert-success">✓ Saved.</div>}
      </div>

      {/* Data source shortcut */}
      <div className="card mb-6">
        <h3 style={{ fontSize: '0.9rem', marginBottom: 8 }}>Data source</h3>
        <p className="text-muted text-sm mb-4">
          Current endpoint: <code className="mono">{settings?.esplora_url ?? '—'}</code>
        </p>
        <a href="/data-source" className="btn btn-secondary btn-sm">⚡ Configure Data Source →</a>
      </div>

      {/* Wallet management */}
      <div className="card">
        <h3 style={{ fontSize: '0.9rem', marginBottom: 14 }}>Manage wallets</h3>
        {wallets.length === 0 ? (
          <div className="text-muted text-sm">No wallets imported yet.</div>
        ) : (
          <div className="space-y-4">
            {wallets.map((w: any) => (
              <div key={w.id} className="flex justify-between items-center" style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{w.name}</div>
                  <div className="text-sm text-muted">{w.pub_type?.toUpperCase()} · {w.script_type}</div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm(`Delete wallet "${w.name}"? This removes all synced data.`)) {
                      deleteMut.mutate(w.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <a href="/import" className="btn btn-secondary btn-sm">＋ Import another wallet</a>
        </div>
      </div>

      {/* Privacy statement */}
      <div className="card mt-6" style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--green)' }}>Privacy commitments</h3>
        <ul style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 2, paddingLeft: 16 }}>
          <li>All data is stored locally in SQLite — nothing leaves your machine.</li>
          <li>No telemetry, analytics, or crash reporting.</li>
          <li>No accounts, no login, no cloud.</li>
          <li>xpubs are not logged in plaintext server logs.</li>
          <li>UTXO Pilot cannot sign transactions or access your funds.</li>
        </ul>
      </div>
    </div>
  );
}
