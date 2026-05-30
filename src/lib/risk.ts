import { Trade } from '@/types';

export interface RiskProgressionSettings {
  baseRiskPercent: number; // ej: 0.55
  lossMultiplier: number;  // ej: 1.20
}

/**
 * Calculates the recommended next risk percentage based on the progression of losses.
 * 
 * Rules:
 * - Start with baseRiskPercent.
 * - If a trade is a loss, next risk is multiplied by lossMultiplier.
 * - If a trade is a win, streak is reset to 0, and risk resets to baseRiskPercent.
 * - Only counts 'Closed' trades.
 * 
 * @param trades Array of trades, should be ordered from oldest to newest
 * @param settings Settings for base risk and multiplier
 * @returns Recommended risk percentage rounded to 2 decimal places
 */
export function calculateNextRisk(
  trades: Trade[],
  settings: RiskProgressionSettings
): number {
  let consecutiveLosses = 0;

  for (const trade of trades) {
    if (trade.status !== 'Closed') continue;

    if (trade.pnl > 0) {
      // Win resets the streak
      consecutiveLosses = 0;
    } else if (trade.pnl < 0) {
      // Loss increments the streak
      consecutiveLosses++;
    }
    // If break even (pnl === 0), we leave the streak as is.
  }

  // Calculate risk: baseRisk * (lossMultiplier ^ consecutiveLosses)
  const nextRisk = settings.baseRiskPercent * Math.pow(settings.lossMultiplier, consecutiveLosses);
  
  // Return rounded to 2 decimal places
  return Math.round(nextRisk * 100) / 100;
}

/**
 * Calculates current consecutive losses from history
 */
export function calculateConsecutiveLosses(trades: Trade[]): number {
  let consecutiveLosses = 0;

  for (const trade of trades) {
    if (trade.status !== 'Closed') continue;

    if (trade.pnl > 0) {
      consecutiveLosses = 0;
    } else if (trade.pnl < 0) {
      consecutiveLosses++;
    }
  }

  return consecutiveLosses;
}
