// Shared domain types for the backend

export type ScriptType = 'p2wpkh' | 'p2sh-p2wpkh' | 'p2pkh';
export type PubKeyType = 'xpub' | 'ypub' | 'zpub' | 'descriptor';
export type PlanType = 'spend' | 'consolidation';
export type SelectionMode = 'fee-first' | 'privacy-first';

export interface Wallet {
  id: number;
  name: string;
  /** original xpub/ypub/zpub as entered by the user */
  original_pub: string;
  pub_type: PubKeyType;
  script_type: ScriptType;
  derivation_path: string;
  gap_limit: number;
  created_at: number;
  synced_at: number | null;
}

export interface Address {
  id: number;
  wallet_id: number;
  address: string;
  derivation_index: number;
  is_change: 0 | 1;
  used: 0 | 1;
}

export interface Transaction {
  id: number;
  wallet_id: number;
  txid: string;
  block_height: number | null;
  block_time: number | null;
  fee: number | null;
}

export interface UTXO {
  id: number;
  wallet_id: number;
  txid: string;
  vout: number;
  address: string;
  amount: number; // sats
  block_height: number | null;
  block_time: number | null;
  spent: 0 | 1;
  spent_txid: string | null;
}

export interface Label {
  id: number;
  wallet_id: number;
  ref: string; // txid | address | txid:vout
  label_type: 'tx' | 'addr' | 'output';
  name: string;
  created_at: number;
}

export interface FeeSnapshot {
  id: number;
  fetched_at: number;
  fastest: number;    // sat/vB
  half_hour: number;
  hour: number;
  minimum: number;
}

export interface Plan {
  id: number;
  wallet_id: number;
  plan_type: PlanType;
  mode: SelectionMode | null;
  target_amount: number | null;
  destination: string | null;
  fee_rate: number;
  estimated_fee: number;
  estimated_output: number;
  warnings: string; // JSON array
  created_at: number;
}

export interface PlanInput {
  id: number;
  plan_id: number;
  txid: string;
  vout: number;
  amount: number;
}

export interface Setting {
  key: string;
  value: string;
}

// Enriched UTXO with label
export interface UTXOWithLabel extends UTXO {
  label: string | null;
}

// Plan with its inputs
export interface PlanDetail extends Plan {
  inputs: PlanInput[];
  input_labels: Record<string, string>; // txid:vout → label name
}
