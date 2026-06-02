import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

type Range = '1h' | '1d' | '1w' | '1m' | '1y';

const RANGES: { value: Range; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '1y', label: '1Y' },
];

function formatTimestamp(ts: number, range: Range): string {
  const d = new Date(ts);
  if (range === '1h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (range === '1w') return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTooltipTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text2)', marginBottom: 6 }}>{formatTooltipTime(label)}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value} sat/vB</strong>
        </div>
      ))}
    </div>
  );
};

export default function FeeRateChart() {
  const [range, setRange] = useState<Range>('1d');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fee-history', range],
    queryFn: async () => {
      const res = await fetch(`/api/fees/history?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch fee history');
      return res.json() as Promise<{ range: string; data: any[] }>;
    },
    refetchInterval: range === '1h' ? 60_000 : 5 * 60_000,
    staleTime: 60_000,
  });

  const points = data?.data ?? [];

  // Thin out data points for cleaner rendering on longer ranges
  const maxPoints = 120;
  const displayPoints = points.length > maxPoints
    ? points.filter((_: any, i: number) => i % Math.ceil(points.length / maxPoints) === 0)
    : points;

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4" style={{ display: 'flex' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Fee Rate History</div>
          <div className="text-sm text-muted">sat/vB · source: mempool.space</div>
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 8, padding: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: range === r.value ? 'var(--accent)' : 'transparent',
                color:      range === r.value ? '#fff' : 'var(--text2)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="spinner" />
        </div>
      )}

      {isError && (
        <div className="alert alert-error" style={{ marginTop: 8 }}>
          Could not load fee history. Check your connection.
        </div>
      )}

      {!isLoading && !isError && displayPoints.length < 2 && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '0.85rem' }}>
          {range === '1h'
            ? 'Not enough local data yet — fee snapshots are collected every 60 seconds while the app is open.'
            : 'No data available for this range.'}
        </div>
      )}

      {!isLoading && !isError && displayPoints.length >= 2 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={displayPoints} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => formatTimestamp(ts, range)}
              tick={{ fill: 'var(--text3)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={60}
            />
            <YAxis
              tick={{ fill: 'var(--text3)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }}
              formatter={(value) => <span style={{ color: 'var(--text2)' }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="fastest"
              name="Next block"
              stroke="#ef4444"
              dot={false}
              strokeWidth={1.5}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="half_hour"
              name="~30 min"
              stroke="#eab308"
              dot={false}
              strokeWidth={1.5}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="hour"
              name="~1 hour"
              stroke="#22c55e"
              dot={false}
              strokeWidth={1.5}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
