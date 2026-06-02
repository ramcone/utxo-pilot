export type ScriptType = 'p2wpkh' | 'p2sh-p2wpkh' | 'p2pkh';
export type PubKeyType = 'xpub' | 'ypub' | 'zpub' | 'descriptor';
export type PlanType = 'spend' | 'consolidation';
export type SelectionMode = 'fee-first' | 'privacy-first';

export interface Wallet {
  id: number;
  name: string;
  original_pub: string;
  pub_type: PubKeyType;
  script_type: ScriptType;
  derivation_path: string;
  gap_limit: number;
  created_at: number;
  synced_at: number | null;
  balance?: number;
  utxo_count?: number;
  small_utxo_count?: number;
}

export interface UTXO {
  id: number;
  wallet_id: number;
  txid: string;
  vout: number;
  address: string;
  amount: number;
  block_height: number | null;
  block_time: number | null;
  spent: 0 | 1;
  spent_txid: string | null;
  label: string | null;
}

export interface Label {
  id: number;
  wallet_id: number;
  ref: string;
  label_type: 'tx' | 'addr' | 'output';
  name: string;
  created_at: number;
}

export interface FeeSnapshot {
  id: number;
  fetched_at: number;
  fastest: number;
  half_hour: number;
  hour: number;
  minimum: number;
  stale?: boolean;
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
  warnings: string;
  created_at: number;
}

export interface PlanInput {
  id: number;
  plan_id: number;
  txid: string;
  vout: number;
  amount: number;
  label?: string;
}

export interface PlanDetail extends Plan {
  inputs: PlanInput[];
  input_labels: Record<string, string>;
  selected?: UTXO[];
  change?: number;
}

export interface Settings {
  esplora_url: string;
  esplora_is_public: string;
  dust_threshold: string;
  small_utxo_threshold: string;
  default_gap_limit: string;
}

export interface SyncStatus {
  running: boolean;
  progress: string;
  error: string | null;
  synced_at: number | null;
}

export interface Balance {
  confirmed_balance: number;
  utxo_count: number;
  small_utxo_count: number;
}
