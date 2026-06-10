/**
 * Esplora HTTP client.
 * All addresses passed to this file are treated as opaque strings for privacy —
 * they are not logged by this module.
 */

import fetch from 'node-fetch';

export interface EsploraUTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  value: number; // sats
}

export interface EsploraTransaction {
  txid: string;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vin: Array<{ txid: string; vout: number; prevout?: { scriptpubkey_address?: string; value: number } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

export interface FeeEstimates {
  fastest: number;
  half_hour: number;
  hour: number;
  minimum: number;
}

export class EsploraClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs = 15_000) {
    // Normalise trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal as any });
      if (!res.ok) throw new Error(`Esplora ${res.status} for ${path}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Get all UTXOs for an address (confirmed + unconfirmed). */
  async getAddressUTXOs(address: string): Promise<EsploraUTXO[]> {
    return this.get<EsploraUTXO[]>(`/address/${address}/utxo`);
  }

  /**
   * Get address summary stats. Used to decide whether an address has any
   * history at all (gap-limit scanning must count *used* addresses, not
   * just addresses that currently hold UTXOs).
   */
  async getAddressInfo(address: string): Promise<{
    chain_stats: { tx_count: number; funded_txo_count: number };
    mempool_stats: { tx_count: number };
  }> {
    return this.get(`/address/${address}`);
  }

  /**
   * Get confirmed transactions for an address.
   * Esplora returns max 25; paginate using last_seen_txid.
   */
  async getAddressTransactions(
    address: string,
    lastSeenTxid?: string
  ): Promise<EsploraTransaction[]> {
    const path = lastSeenTxid
      ? `/address/${address}/txs/chain/${lastSeenTxid}`
      : `/address/${address}/txs`;
    return this.get<EsploraTransaction[]>(path);
  }

  /** Get all transactions for an address, handling Esplora's 25-tx pagination. */
  async getAllTransactions(address: string): Promise<EsploraTransaction[]> {
    const all: EsploraTransaction[] = [];
    let lastTxid: string | undefined;
    for (;;) {
      const page = await this.getAddressTransactions(address, lastTxid);
      if (page.length === 0) break;
      all.push(...page);
      if (page.length < 25) break;
      lastTxid = page[page.length - 1].txid;
    }
    return all;
  }

  /** Fetch recommended fee rates (sat/vB). */
  async getFeeEstimates(): Promise<FeeEstimates> {
    // Esplora returns { "1": rate, "3": rate, "6": rate, ... }
    const raw = await this.get<Record<string, number>>('/fee-estimates');

    // Map Esplora's confirmation-target keys to our labels
    const at = (targets: number[]): number => {
      for (const t of targets) {
        if (raw[String(t)] !== undefined) return Math.ceil(raw[String(t)]);
      }
      return 1;
    };

    return {
      fastest:   at([1, 2]),
      half_hour: at([3, 4, 5, 6]),
      hour:      at([6, 7, 8, 10, 12]),
      minimum:   at([144, 504, 1008, 2016]),
    };
  }

  /** Probe the endpoint to confirm it is reachable and returning valid data. */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getFeeEstimates();
      return true;
    } catch {
      return false;
    }
  }
}
