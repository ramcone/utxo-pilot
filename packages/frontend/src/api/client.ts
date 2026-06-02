/**
 * Typed API client for the UTXO Pilot backend.
 * All requests go through /api (proxied by Vite to localhost:3001).
 */

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

const get  = <T>(path: string)                   => request<T>('GET',    path);
const post = <T>(path: string, body?: unknown)   => request<T>('POST',   path, body);
const put  = <T>(path: string, body?: unknown)   => request<T>('PUT',    path, body);
const del  = <T>(path: string)                   => request<T>('DELETE', path);

// --- Wallets ---
export const api = {
  wallets: {
    list:   ()                  => get<any[]>('/wallets'),
    get:    (id: number)        => get<any>(`/wallets/${id}`),
    create: (body: { name: string; pub: string }) => post<any>('/wallets', body),
    delete: (id: number)        => del<any>(`/wallets/${id}`),
  },
  sync: {
    trigger: (id: number)       => post<any>(`/wallets/${id}/sync`),
    status:  (id: number)       => get<any>(`/wallets/${id}/sync/status`),
  },
  utxos: {
    list: (id: number, params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return get<any>(`/wallets/${id}/utxos${qs}`);
    },
    balance: (id: number)       => get<any>(`/wallets/${id}/balance`),
  },
  fees: {
    get: ()                     => get<any>('/fees'),
  },
  labels: {
    list:   (walletId: number)  => get<any[]>(`/wallets/${walletId}/labels`),
    upsert: (walletId: number, body: { ref: string; label_type: string; name: string }) =>
      post<any>(`/wallets/${walletId}/labels`, body),
    delete: (walletId: number, labelId: number) => del<any>(`/wallets/${walletId}/labels/${labelId}`),
    import: (walletId: number, jsonl: string)   => post<any>(`/wallets/${walletId}/labels/import`, { jsonl }),
  },
  plans: {
    list:   (walletId: number)  => get<any[]>(`/wallets/${walletId}/plans`),
    get:    (planId: number)    => get<any>(`/plans/${planId}`),
    spend:  (walletId: number, body: { target_amount: number; fee_rate: number; mode: string }) =>
      post<any>(`/wallets/${walletId}/plans/spend`, body),
    consolidation: (walletId: number, body: { threshold: number; fee_rate: number; urgency: string; destination: string }) =>
      post<any>(`/wallets/${walletId}/plans/consolidation`, body),
  },
  export: {
    url: (planId: number, format: 'json' | 'csv') => `${BASE}/plans/${planId}/export?format=${format}`,
  },
  settings: {
    get:    ()                  => get<any>('/settings'),
    update: (body: Record<string, unknown>) => put<any>('/settings', body),
    testEsplora: (url: string)  => post<any>('/settings/test-esplora', { url }),
  },
  health: () => get<{ ok: boolean; version: string }>('/health'),
};
