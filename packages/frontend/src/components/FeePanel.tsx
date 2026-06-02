import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FeeSnapshot } from '../types';

export default function FeePanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, isError } = useQuery<FeeSnapshot>({
    queryKey: ['fees'],
    queryFn: api.fees.get,
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="card"><span className="spinner" /></div>;
  if (isError || !data) return (
    <div className="card">
      <div className="card-title">Fee Rates</div>
      <div className="text-muted text-sm">Unable to fetch fees</div>
    </div>
  );

  const tiers = [
    { label: 'Next block',  value: data.fastest,   cls: 'fee-fast' },
    { label: '~30 min',     value: data.half_hour,  cls: 'fee-med'  },
    { label: '~1 hour',     value: data.hour,        cls: 'fee-slow' },
    { label: 'Minimum',     value: data.minimum,     cls: 'fee-slow' },
  ];

  if (compact) {
    return (
      <div className="flex gap-2 items-center flex-wrap">
        {tiers.slice(0, 3).map((t) => (
          <span key={t.label} className={`fee-badge ${t.cls}`} title={t.label}>
            {t.value} sat/vB
          </span>
        ))}
        {data.stale && <span className="tag tag-gray">stale</span>}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div className="card-title" style={{ marginBottom: 0 }}>Current Fee Rates</div>
        {data.stale && <span className="tag tag-gray">cached</span>}
        <span className="text-sm text-muted">{new Date(data.fetched_at).toLocaleTimeString()}</span>
      </div>
      <div className="grid-4" style={{ gap: 12 }}>
        {tiers.map((t) => (
          <div key={t.label}>
            <div className="card-title">{t.label}</div>
            <div className={`fee-badge ${t.cls}`} style={{ fontSize: '1rem', padding: '4px 10px' }}>
              {t.value} <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>sat/vB</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
