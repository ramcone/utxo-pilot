/**
 * Deterministic coin selection for the spend planner.
 *
 * Two modes:
 *  fee-first    — fewest/largest UTXOs to minimise tx size (largest-first BnB-like)
 *  privacy-first — prefer UTXOs sharing the same label; avoid mixing labels
 */

import { UTXOWithLabel } from '../types.js';

export interface CoinSelectionResult {
  selected: UTXOWithLabel[];
  estimatedFee: number;
  change: number;
  warnings: string[];
}

// P2WPKH vsize constants
const OVERHEAD_VBYTES  = 10.5;
const INPUT_VBYTES     = 68;    // per P2WPKH input
const OUTPUT_VBYTES    = 31;    // per P2WPKH output

/** Estimate vsize for a P2WPKH transaction. */
export function estimateVsize(numInputs: number, numOutputs: number): number {
  return Math.ceil(OVERHEAD_VBYTES + INPUT_VBYTES * numInputs + OUTPUT_VBYTES * numOutputs);
}

/** Estimate fee in sats. */
export function estimateFee(numInputs: number, numOutputs: number, feeRateSatVb: number): number {
  return Math.ceil(estimateVsize(numInputs, numOutputs) * feeRateSatVb);
}

/**
 * Select UTXOs to cover `targetSats` + fee.
 * Returns null if the wallet does not have enough funds.
 */
export function selectCoins(
  utxos: UTXOWithLabel[],
  targetSats: number,
  feeRateSatVb: number,
  mode: 'fee-first' | 'privacy-first'
): CoinSelectionResult | null {
  const spendable = utxos.filter((u) => u.spent === 0);
  if (spendable.length === 0) return null;

  const ordered = mode === 'fee-first'
    ? sortFeefirst(spendable)
    : sortPrivacyFirst(spendable, targetSats);

  // Greedy selection: add UTXOs until we cover target + fee
  const selected: UTXOWithLabel[] = [];
  let inputTotal = 0;

  for (const utxo of ordered) {
    selected.push(utxo);
    inputTotal += utxo.amount;

    // 2 outputs: destination + change; if change is tiny we might drop it
    const fee = estimateFee(selected.length, 2, feeRateSatVb);
    if (inputTotal >= targetSats + fee) {
      const change = inputTotal - targetSats - fee;
      const warnings = buildWarnings(selected, mode, targetSats);

      // If change is dust (< ~546 sat P2WPKH), fold it into fee
      if (change > 0 && change < 546) {
        const feeNoChange = estimateFee(selected.length, 1, feeRateSatVb);
        return {
          selected,
          estimatedFee: feeNoChange,
          change: 0,
          warnings: [...warnings, 'Change output below dust limit — folded into fee.'],
        };
      }

      return { selected, estimatedFee: fee, change, warnings };
    }
  }

  return null; // insufficient funds
}

/** Sort largest-first to minimise input count and therefore fee. */
function sortFeefirst(utxos: UTXOWithLabel[]): UTXOWithLabel[] {
  return [...utxos].sort((a, b) => b.amount - a.amount);
}

/**
 * Sort to prefer label cohesion:
 *  1. Find the label group that can cover the target alone; use that group first.
 *  2. Within each group, sort largest-first.
 *  3. Fallback: unlabelled coins before mixing groups.
 */
function sortPrivacyFirst(utxos: UTXOWithLabel[], targetSats: number): UTXOWithLabel[] {
  const groups = new Map<string | null, UTXOWithLabel[]>();
  for (const u of utxos) {
    const key = u.label ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }

  // Find a single label group that alone covers the target
  for (const [, members] of groups) {
    const total = members.reduce((s, u) => s + u.amount, 0);
    if (total >= targetSats) {
      const rest = [...utxos].filter((u) => !members.includes(u));
      return [
        ...members.sort((a, b) => b.amount - a.amount),
        ...rest.sort((a, b) => b.amount - a.amount),
      ];
    }
  }

  // No single group covers it — prefer unlabelled first, then mixed
  const unlabelled = (groups.get(null) ?? []).sort((a, b) => b.amount - a.amount);
  const labelled = [...utxos]
    .filter((u) => u.label !== null)
    .sort((a, b) => b.amount - a.amount);
  return [...unlabelled, ...labelled];
}

function buildWarnings(
  selected: UTXOWithLabel[],
  mode: 'fee-first' | 'privacy-first',
  targetSats: number
): string[] {
  const warnings: string[] = [];

  const largest = Math.max(...selected.map((u) => u.amount));
  if (largest >= targetSats * 10) {
    warnings.push(
      `The largest selected UTXO (${largest.toLocaleString()} sats) is more than 10× the send amount. ` +
        'This creates a large change output and publicly links that coin to this payment. ' +
        'If privacy matters, consider spending from smaller UTXOs instead.'
    );
  }

  const labels = new Set(selected.map((u) => u.label).filter(Boolean));
  if (labels.size > 1) {
    warnings.push(
      `This plan mixes UTXOs with ${labels.size} different labels (${[...labels].join(', ')}). ` +
        'Combining coins from different labels may link those funds on-chain.'
    );
  }

  if (mode === 'privacy-first' && labels.size > 1) {
    warnings.push(
      'Privacy-first mode could not avoid label mixing — wallet does not have enough ' +
        'same-label funds to cover this amount.'
    );
  }

  return warnings;
}
