/**
 * Consolidation planner.
 * Identifies UTXOs below a threshold and estimates the fee for consolidating them.
 */

import { UTXOWithLabel } from '../types.js';
import { estimateFee } from './coinSelection.js';

export interface ConsolidationResult {
  candidates: UTXOWithLabel[];
  estimatedFee: number;
  outputAmount: number;
  warnings: string[];
  /** Fee comparison across tiers to help user decide timing */
  feeComparison: {
    fastest:   { feeRate: number; fee: number; output: number };
    half_hour: { feeRate: number; fee: number; output: number };
    hour:      { feeRate: number; fee: number; output: number };
  };
}

export interface FeeRates {
  fastest: number;
  half_hour: number;
  hour: number;
  minimum: number;
}

/**
 * Plan a consolidation of UTXOs below `thresholdSats`.
 * Uses a single P2WPKH output (the user's destination address).
 */
export function planConsolidation(
  utxos: UTXOWithLabel[],
  thresholdSats: number,
  feeRates: FeeRates,
  urgency: 'fastest' | 'half_hour' | 'hour'
): ConsolidationResult | null {
  const candidates = utxos
    .filter((u) => u.spent === 0 && u.amount <= thresholdSats)
    .sort((a, b) => a.amount - b.amount); // smallest first

  if (candidates.length < 2) return null;

  const feeRate = feeRates[urgency];
  const numInputs = candidates.length;
  const numOutputs = 1; // single consolidation output

  const fee = estimateFee(numInputs, numOutputs, feeRate);
  const totalIn = candidates.reduce((s, u) => s + u.amount, 0);
  const outputAmount = totalIn - fee;

  if (outputAmount <= 0) {
    return null; // fee exceeds total — consolidation not economical
  }

  const warnings = buildConsolidationWarnings(candidates, fee, totalIn, feeRate);

  const feeComparison = {
    fastest:   feeTier(numInputs, feeRates.fastest),
    half_hour: feeTier(numInputs, feeRates.half_hour),
    hour:      feeTier(numInputs, feeRates.hour),
  };

  // Adjust feeComparison outputs for each tier
  const makeTier = (rate: number) => {
    const f = estimateFee(numInputs, numOutputs, rate);
    return { feeRate: rate, fee: f, output: Math.max(0, totalIn - f) };
  };

  return {
    candidates,
    estimatedFee: fee,
    outputAmount,
    warnings,
    feeComparison: {
      fastest:   makeTier(feeRates.fastest),
      half_hour: makeTier(feeRates.half_hour),
      hour:      makeTier(feeRates.hour),
    },
  };
}

function feeTier(numInputs: number, feeRate: number) {
  const fee = estimateFee(numInputs, 1, feeRate);
  return { feeRate, fee, output: 0 };
}

function buildConsolidationWarnings(
  candidates: UTXOWithLabel[],
  fee: number,
  totalIn: number,
  feeRate: number
): string[] {
  const warnings: string[] = [];

  const labels = new Set(candidates.map((u) => u.label).filter(Boolean));
  if (labels.size > 1) {
    warnings.push(
      `Consolidating coins with ${labels.size} different labels will link those funds on-chain.`
    );
  }

  const feePct = (fee / totalIn) * 100;
  if (feePct > 30) {
    warnings.push(
      `At ${feeRate} sat/vB the fee is ${feePct.toFixed(1)}% of the total being consolidated. ` +
        'Consider waiting for lower fees.'
    );
  }

  if (candidates.length > 50) {
    warnings.push(
      `You are consolidating ${candidates.length} inputs. ` +
        'Very large consolidations may be slow to relay; consider splitting into batches.'
    );
  }

  return warnings;
}
