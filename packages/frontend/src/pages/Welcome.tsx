import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useWalletStore } from '../store/walletStore';

const FEATURES = [
  { icon: '🔍', title: 'UTXO Explorer',    desc: 'See all your UTXOs, filter by amount, age, or label.' },
  { icon: '💸', title: 'Spend Planner',    desc: 'Choose UTXOs to minimise fees or protect privacy.' },
  { icon: '⇆',  title: 'Consolidation',   desc: 'Identify dust and plan a consolidation while fees are low.' },
  { icon: '📤', title: 'Export Plans',     desc: 'Export to JSON or CSV — recreate in your wallet before signing.' },
];

const DEMO_UTXOS = [
  { label: 'Strike - DCA',       desc: '12 small weekly buys',          sats: '~163,350 sats',   color: 'var(--accent)' },
  { label: 'Coinbase - DCA',     desc: '6 medium monthly withdrawals',   sats: '~1,247,800 sats', color: 'var(--accent)' },
  { label: 'Mining',             desc: '10 tiny pool payouts',           sats: '~21,160 sats',    color: 'var(--yellow)' },
  { label: 'Business income',    desc: '4 larger irregular payments',    sats: '~5,045,000 sats', color: 'var(--green)' },
  { label: 'Cold storage',       desc: '2 long-term savings UTXOs',      sats: '~22,750,000 sats',color: 'var(--green)' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setActiveWalletId = useWalletStore((s) => s.setActiveWalletId);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleTryDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.demo.seed();
      await qc.invalidateQueries({ queryKey: ['wallets'] });
      setActiveWalletId(res.wallet_id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Failed to load demo wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="welcome-hero">
        <h1>₿ UTXO Pilot</h1>
        <p className="subtitle">
          A local-first Bitcoin UTXO hygiene and fee planning tool.
          <br />
          Watch-only. No keys. No cloud. No telemetry.
        </p>

        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/import" className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '11px 24px' }}>
            Import a Wallet →
          </Link>
          <Link to="/data-source" className="btn btn-secondary" style={{ fontSize: '0.95rem' }}>
            Configure Data Source
          </Link>
        </div>
      </div>

      {/* ── Demo Mode CTA ─────────────────────────────────────────────────── */}
      <div className="card mt-6" style={{
        borderColor: 'rgba(247,147,26,0.4)',
        background: 'rgba(247,147,26,0.06)',
        textAlign: 'center',
        padding: '28px 24px',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎮</div>
        <h3 style={{ marginBottom: 6, fontSize: '1.05rem' }}>Not ready to use your real wallet?</h3>
        <p style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: 16, maxWidth: 480, margin: '0 auto 16px' }}>
          Try demo mode — a pre-loaded wallet with realistic fake UTXOs covering five common Bitcoin accumulation patterns. No xpub needed.
        </p>

        {/* UTXO pattern preview */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'center', marginBottom: 20,
        }}>
          {DEMO_UTXOS.map((u) => (
            <div key={u.label} style={{
              background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px',
              fontSize: '0.78rem', textAlign: 'left', minWidth: 160,
            }}>
              <div style={{ fontWeight: 700, color: u.color, marginBottom: 2 }}>{u.label}</div>
              <div style={{ color: 'var(--text2)' }}>{u.desc}</div>
              <div style={{ color: 'var(--text3)', fontSize: '0.72rem', marginTop: 2 }}>{u.sats}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          style={{ fontSize: '0.95rem', padding: '11px 28px' }}
          onClick={handleTryDemo}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Loading demo…</> : '🎮 Try Demo Mode →'}
        </button>

        {error && <div className="alert alert-error mt-4" style={{ textAlign: 'left' }}>⚠ {error}</div>}

        <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 12 }}>
          All data is fake. Delete the demo wallet any time in Settings.
        </p>
      </div>

      {/* Safety notice */}
      <div className="alert alert-warn mt-4">
        <span style={{ fontSize: '1.1rem' }}>🛡</span>
        <div>
          <strong>Never enter a seed phrase or private key here.</strong> UTXO Pilot is a read-only planning
          tool. It imports an extended public key (xpub / ypub / zpub) only. It cannot sign or broadcast
          transactions. All data stays on your machine.
        </div>
      </div>

      <div className="feature-grid mt-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6" style={{ background: 'rgba(247,147,26,0.06)', borderColor: 'rgba(247,147,26,0.2)' }}>
        <h3 style={{ marginBottom: 12, fontSize: '0.95rem' }}>How it works</h3>
        <ol style={{ paddingLeft: 18, lineHeight: 2, fontSize: '0.875rem', color: 'var(--text2)' }}>
          <li>Import your wallet using an <strong style={{ color: 'var(--text)' }}>xpub, ypub, or zpub</strong>.</li>
          <li>Pick a <strong style={{ color: 'var(--text)' }}>data source</strong> — public Esplora or your own node.</li>
          <li><strong style={{ color: 'var(--text)' }}>Sync</strong> to load your addresses, UTXOs, and transaction history.</li>
          <li>Use the <strong style={{ color: 'var(--text)' }}>Spend Planner</strong> or <strong style={{ color: 'var(--text)' }}>Consolidation Planner</strong> to build a plan.</li>
          <li><strong style={{ color: 'var(--text)' }}>Export the plan</strong> and recreate it in your actual wallet for signing.</li>
        </ol>
      </div>
    </div>
  );
}
