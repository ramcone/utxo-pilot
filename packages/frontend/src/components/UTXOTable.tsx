import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { UTXO } from '../types';

function fmt(sats: number) {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(4)} BTC`;
  return `${sats.toLocaleString()} sats`;
}

function age(blockTime: number | null): string {
  if (!blockTime) return 'Unconfirmed';
  const days = Math.floor((Date.now() / 1000 - blockTime) / 86400);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days}d ago`;
}

function truncate(s: string, n = 12) {
  return s.length <= n ? s : s.slice(0, 6) + '…' + s.slice(-6);
}

interface Props {
  walletId: number;
}

export default function UTXOTable({ walletId }: Props) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({
    spent: 'false',
    min_amount: '',
    max_amount: '',
    sort: 'amount',
    order: 'desc',
  });
  const [editLabel, setEditLabel] = useState<{ ref: string; name: string } | null>(null);

  const params: Record<string, string> = { spent: filters.spent };
  if (filters.min_amount) params.min_amount = filters.min_amount;
  if (filters.max_amount) params.max_amount = filters.max_amount;
  params.sort  = filters.sort;
  params.order = filters.order;

  const { data, isLoading } = useQuery({
    queryKey: ['utxos', walletId, params],
    queryFn: () => api.utxos.list(walletId, params),
    enabled: !!walletId,
  });

  const labelMut = useMutation({
    mutationFn: (body: { ref: string; label_type: string; name: string }) =>
      api.labels.upsert(walletId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utxos', walletId] });
      setEditLabel(null);
    },
  });

  const utxos: UTXO[] = data?.utxos ?? [];
  const total: number  = data?.total ?? 0;

  const setFilter = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '0 0 auto' }}>
          <label className="label">Show</label>
          <select className="select" style={{ width: 130 }} value={filters.spent} onChange={(e) => setFilter('spent', e.target.value)}>
            <option value="false">Unspent</option>
            <option value="true">Spent</option>
            <option value="">All</option>
          </select>
        </div>
        <div className="field" style={{ flex: '0 0 auto' }}>
          <label className="label">Min sats</label>
          <input className="input" style={{ width: 110 }} type="number" placeholder="0" value={filters.min_amount} onChange={(e) => setFilter('min_amount', e.target.value)} />
        </div>
        <div className="field" style={{ flex: '0 0 auto' }}>
          <label className="label">Max sats</label>
          <input className="input" style={{ width: 110 }} type="number" placeholder="∞" value={filters.max_amount} onChange={(e) => setFilter('max_amount', e.target.value)} />
        </div>
        <div className="field" style={{ flex: '0 0 auto' }}>
          <label className="label">Sort</label>
          <select className="select" style={{ width: 130 }} value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
            <option value="amount">Amount</option>
            <option value="age">Age</option>
            <option value="label">Label</option>
          </select>
        </div>
        <div className="field" style={{ flex: '0 0 auto' }}>
          <label className="label">Order</label>
          <select className="select" style={{ width: 100 }} value={filters.order} onChange={(e) => setFilter('order', e.target.value)}>
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>
        <div className="text-muted text-sm" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
          {total} UTXOs
        </div>
      </div>

      {/* Inline label editor */}
      {editLabel && (
        <div className="card mb-4" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="text-sm text-muted mono">{editLabel.ref}</span>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Label name…"
            value={editLabel.name}
            onChange={(e) => setEditLabel({ ...editLabel, name: e.target.value })}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') labelMut.mutate({ ref: editLabel.ref, label_type: 'output', name: editLabel.name });
              if (e.key === 'Escape') setEditLabel(null);
            }}
          />
          <button className="btn btn-primary btn-sm" onClick={() => labelMut.mutate({ ref: editLabel.ref, label_type: 'output', name: editLabel.name })}>Save</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditLabel(null)}>Cancel</button>
        </div>
      )}

      <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>TXID : VOUT</th>
              <th>Address</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Age</th>
              <th>Label</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></td></tr>
            ) : utxos.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No UTXOs found. Sync your wallet to load data.</td></tr>
            ) : utxos.map((u) => {
              const ref = `${u.txid}:${u.vout}`;
              return (
                <tr key={ref}>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>{truncate(u.txid, 14)}:{u.vout}</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>{truncate(u.address)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {fmt(u.amount)}
                  </td>
                  <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{age(u.block_time)}</td>
                  <td>
                    {u.label
                      ? <span className="tag tag-orange">{u.label}</span>
                      : <span className="text-muted text-sm">—</span>}
                  </td>
                  <td>
                    {u.spent
                      ? <span className="tag tag-gray">Spent</span>
                      : <span className="tag tag-green">Unspent</span>}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditLabel({ ref, name: u.label ?? '' })}
                    >
                      {u.label ? 'Edit label' : 'Add label'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
