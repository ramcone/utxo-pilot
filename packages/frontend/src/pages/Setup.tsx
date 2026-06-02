import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { api } from '../api/client';

interface Step {
  number: number;
  title: string;
  description: string;
  detail: string;
  action?: { label: string; to: string };
  tip?: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Import a watch-only wallet',
    description: 'Paste your extended public key — xpub, ypub, or zpub — from your hardware wallet or signing software.',
    detail:
      'In Sparrow Wallet go to File → Export Wallet and copy the zpub. In Ledger Live, go to Accounts → your account → Advanced and copy the xpub. In Coldcard, export the public key from Advanced → Export Wallet.',
    action: { label: 'Import wallet →', to: '/import' },
    tip: 'Use a zpub if your wallet supports it — it maps to native segwit (bc1q…) addresses and has the lowest fees.',
  },
  {
    number: 2,
    title: 'Configure your data source',
    description: 'Choose where UTXO Pilot fetches blockchain data. You can use a public server or your own node.',
    detail:
      'Blockstream and mempool.space are free public options that work immediately. If you run your own Bitcoin node with Esplora (or mempool.space self-hosted), enter its URL here for maximum privacy — your addresses never leave your machine.',
    action: { label: 'Configure data source →', to: '/data-source' },
    tip: 'A self-hosted Esplora node gives you complete privacy. Your addresses are not sent to any third party.',
  },
  {
    number: 3,
    title: 'Sync your wallet',
    description: 'UTXO Pilot derives your addresses and fetches your UTXOs and transaction history from the data source.',
    detail:
      'Click "Sync Now" on the Dashboard. The app scans your external and change addresses using the gap limit (default: 20 consecutive unused addresses). Syncing a wallet with many transactions can take a minute or two.',
    action: { label: 'Go to dashboard →', to: '/dashboard' },
    tip: 'Sync again any time your wallet receives new funds or after you broadcast a transaction.',
  },
  {
    number: 4,
    title: 'Explore and label your UTXOs',
    description: 'Browse your unspent outputs, filter by amount or age, and add labels to track where coins came from.',
    detail:
      'Labels help the privacy-first coin selection mode avoid mixing coins from different sources. You can label individual outputs (e.g. "Exchange withdrawal", "Mining reward", "CoinJoin output") or import a BIP329 JSONL label file exported from Sparrow or Specter.',
    action: { label: 'Open UTXO Explorer →', to: '/utxos' },
    tip: 'Labelling is optional but strongly recommended if privacy matters to you.',
  },
  {
    number: 5,
    title: 'Plan a spend or consolidation',
    description: 'Use the Spend Planner to choose which UTXOs to send, or the Consolidation Planner to clean up dust.',
    detail:
      'The Spend Planner lets you pick between fee-first mode (fewest inputs, lowest fee) and privacy-first mode (avoids mixing coins with different labels). The Consolidation Planner identifies small UTXOs and shows you what it costs to merge them at current fee rates.',
    action: { label: 'Open Spend Planner →', to: '/spend' },
    tip: 'Consolidate during periods of low fees — the fee comparison table shows the cost across all three urgency tiers.',
  },
  {
    number: 6,
    title: 'Export and sign in your wallet',
    description: 'Export the plan as JSON or CSV, then recreate it in your actual signing wallet and verify everything before signing.',
    detail:
      'UTXO Pilot never signs or broadcasts. After exporting, open your hardware wallet or air-gapped signing software, recreate the transaction using the listed UTXOs and destination, verify the address and fee on your device screen, then sign and broadcast from there.',
    tip: 'Always verify the destination address on your hardware wallet screen — never rely on copy-paste alone.',
  },
];

export default function Setup() {
  const { activeWalletId } = useWalletStore();
  const navigate = useNavigate();

  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: api.wallets.list });
  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status', activeWalletId],
    queryFn: () => api.sync.status(activeWalletId!),
    enabled: !!activeWalletId,
  });

  // Derive which steps are complete
  const hasWallet    = wallets.length > 0;
  const hasSynced    = !!syncStatus?.synced_at;
  const completed = [
    hasWallet,
    hasWallet, // data source is configured if wallet exists (default is set)
    hasSynced,
    false,     // labelling — can't auto-detect
    false,     // planning
    false,     // export
  ];

  const nextStep = completed.findIndex((c) => !c);

  return (
    <div className="page" style={{ maxWidth: 740 }}>
      <div className="page-header">
        <h2>⚡ Getting Started</h2>
        <p>Follow these six steps to go from zero to your first UTXO plan.</p>
      </div>

      {/* Progress bar */}
      <div className="card mb-6" style={{ padding: '16px 20px' }}>
        <div className="flex justify-between items-center mb-2" style={{ display: 'flex' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Setup progress — {completed.filter(Boolean).length} of {STEPS.length} steps complete
          </span>
          {completed.filter(Boolean).length === STEPS.length && (
            <span className="tag tag-green">All done ✓</span>
          )}
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div
            style={{
              width: `${(completed.filter(Boolean).length / STEPS.length) * 100}%`,
              background: 'var(--accent)',
              height: '100%',
              borderRadius: 8,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {STEPS.map((step, i) => {
          const done      = completed[i];
          const isCurrent = i === nextStep;

          return (
            <div
              key={step.number}
              className="card"
              style={{
                borderColor: isCurrent ? 'var(--accent)' : done ? 'rgba(34,197,94,0.4)' : 'var(--border)',
                opacity: !done && !isCurrent && i > (nextStep === -1 ? 99 : nextStep) ? 0.55 : 1,
                transition: 'border-color 0.2s',
              }}
            >
              <div className="flex items-center gap-2 mb-3" style={{ display: 'flex', gap: 12 }}>
                {/* Step number / check */}
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'rgba(34,197,94,0.15)' : isCurrent ? 'rgba(247,147,26,0.15)' : 'var(--bg3)',
                    border: `2px solid ${done ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                    fontSize: '0.85rem', fontWeight: 700,
                    color: done ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--text3)',
                  }}
                >
                  {done ? '✓' : step.number}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{step.title}</h3>
                    {isCurrent && <span className="tag tag-orange" style={{ fontSize: '0.7rem' }}>Next step</span>}
                    {done      && <span className="tag tag-green"  style={{ fontSize: '0.7rem' }}>Complete</span>}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginTop: 2 }}>{step.description}</p>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: step.tip || step.action ? 12 : 0 }}>
                {step.detail}
              </p>

              {step.tip && (
                <div style={{
                  background: 'rgba(247,147,26,0.07)', border: '1px solid rgba(247,147,26,0.2)',
                  borderRadius: 6, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text2)',
                  marginBottom: step.action ? 12 : 0,
                }}>
                  💡 <strong style={{ color: 'var(--accent)' }}>Tip:</strong> {step.tip}
                </div>
              )}

              {step.action && (
                <Link
                  to={step.action.to}
                  className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ marginTop: 4 }}
                >
                  {step.action.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="alert alert-info mt-6">
        <span>ℹ</span>
        <span>
          UTXO Pilot stores all data locally — no account needed, nothing leaves your machine.
          You can revisit this page any time from the sidebar.
        </span>
      </div>
    </div>
  );
}
