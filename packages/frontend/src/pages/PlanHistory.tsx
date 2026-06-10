import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '../store/walletStore';
import { api } from '../api/client';

function fmt(sats: number) {
  if (sats >= 1_000_000) return `${(sats / 1e8).toFixed(8)} BTC`;
  return `${sats.toLocaleString()} sats`;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function PlanHistory() {
  const { activeWalletId } = useWalletStore();

  const { data: plans = [], isLoading } = useQuery<any[]>({
    queryKey: ['plans', activeWalletId],
    queryFn: () => api.plans.list(activeWalletId!),
    enabled: !!activeWalletId,
  });

  if (!activeWalletId) {
    return (
      <div className="page">
        <div className="alert alert-warn">No wallet selected. Import a wallet first.</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h2>📋 Plan History</h2>
        <p>All spend and consolidation plans generated for this wallet, newest first.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Link to="/spend"         className="btn btn-primary btn-sm">+ New Spend Plan</Link>
        <Link to="/consolidation" className="btn btn-secondary btn-sm">+ New Consolidation</Link>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No plans yet</div>
          <div className="text-sm text-muted">Generate a spend or consolidation plan to see it here.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Mode / Urgency</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Est. Fee</th>
                <th>Fee rate</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p: any) => (
                <tr key={p.id}>
                  <td className="text-muted mono" style={{ fontSize: '0.8rem' }}>#{p.id}</td>
                  <td>
                    {p.plan_type === 'spend'
                      ? <span className="tag tag-orange">↗ Spend</span>
                      : <span className="tag tag-gray">⇆ Consolidation</span>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>
                    {p.mode ?? (p.plan_type === 'consolidation' ? 'consolidation' : '—')}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
                    {p.plan_type === 'spend'
                      ? fmt(p.target_amount ?? 0)
                      : fmt(p.estimated_output)}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', color: 'var(--yellow)' }}>
                    {fmt(p.estimated_fee)}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>
                    {p.fee_rate} sat/vB
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {relativeDate(p.created_at)}
                  </td>
                  <td>
                    <Link to={`/plan/${p.id}`} className="btn btn-ghost btn-sm">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
