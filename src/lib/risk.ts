import { Trade } from '@/types';

export interface RiskProgressionSettings {
  baseRiskPercent: number; // ej: 0.55
  lossMultiplier: number;  // ej: 1.20
  enableEquityScaling?: boolean;
  maxRiskPercent?: number; // ej: 2.80
}

export interface TargetProximitySettings {
  isEvaluation: boolean;
  targetProfitPercentage?: number;
  averageRR: number;
}

/**
 * Calculates the recommended next risk percentage based on the progression of losses and equity buffer.
 * 
 * @param trades Array of trades, should be ordered from oldest to newest
 * @param settings Settings for base risk and multiplier
 * @param currentBalance (Optional) The current account balance
 * @param startingBalance (Optional) The starting account balance
 * @param targetProximity (Optional) Settings to cap risk when near evaluation targets
 * @param deRiskFactor (Optional) Final multiplier applied to the result (e.g. 0.5 to halve risk after a losing streak). Default 1.
 * @returns Recommended risk percentage rounded to 2 decimal places
 */
export function calculateNextRisk(
  trades: Trade[],
  settings: RiskProgressionSettings,
  currentBalance?: number,
  startingBalance?: number,
  targetProximity?: TargetProximitySettings,
  deRiskFactor: number = 1
): { riskPercent: number; isCappedByTarget: boolean } {
  let consecutiveLosses = 0;

  for (const trade of trades) {
    if (trade.status !== 'Closed') continue;

    if (trade.pnl > 0) {
      consecutiveLosses = 0;
    } else if (trade.pnl < 0) {
      consecutiveLosses++;
    }
  }

  // Calculate base recovery risk: baseRisk * (lossMultiplier ^ consecutiveLosses)
  let nextRisk = settings.baseRiskPercent * Math.pow(settings.lossMultiplier, consecutiveLosses);

  // Apply Equity Scaling if enabled and we have balance info
  if (settings.enableEquityScaling && currentBalance !== undefined && startingBalance !== undefined && startingBalance > 0) {
    const pnlPercent = ((currentBalance - startingBalance) / startingBalance) * 100;
    
    // Only scale up if we are in profit and there are no consecutive losses (we are on a winning streak or flat)
    if (pnlPercent > 0 && consecutiveLosses === 0) {
      if (pnlPercent > 1.0) {
        const scalingBuffer = pnlPercent - 1.0; 
        const extraRisk = scalingBuffer * 0.5;
        nextRisk = settings.baseRiskPercent + extraRisk;
      }
    }
  }

  // Cap risk at maxRiskPercent if defined
  if (settings.maxRiskPercent && nextRisk > settings.maxRiskPercent) {
    nextRisk = settings.maxRiskPercent;
  }
  
  let isCappedByTarget = false;

  // --- Target Proximity Cap (Option B: Historical Average RR) ---
  if (targetProximity?.isEvaluation && targetProximity.targetProfitPercentage && currentBalance !== undefined && startingBalance !== undefined) {
    const targetProfitAmount = startingBalance * (targetProximity.targetProfitPercentage / 100);
    const currentPnlAmount = currentBalance - startingBalance;
    const remainingTargetAmount = targetProfitAmount - currentPnlAmount;

    // Only apply the cap if we are in profit and approaching the target
    if (remainingTargetAmount > 0 && remainingTargetAmount < targetProfitAmount) {
      // Use a fixed 1:2 RR to calculate how much we need to risk to pass the evaluation
      const effectiveRR = 2;
      
      // Calculate how much $ we need to risk to hit the target in one trade
      const maxNeededRiskAmount = remainingTargetAmount / effectiveRR;
      
      // Translate to percentage of current balance
      const maxNeededRiskPercent = (maxNeededRiskAmount / currentBalance) * 100;
      
      // If the dynamically calculated risk is higher than what we strictly need, we cap it
      if (nextRisk > maxNeededRiskPercent) {
        // We set a floor to ensure we don't risk something silly like 0.0001%. 
        // The floor is the base risk or the maxNeeded, whichever is smaller.
        nextRisk = Math.max(Math.min(maxNeededRiskPercent, settings.baseRiskPercent), maxNeededRiskPercent);
        isCappedByTarget = true;
      }
    }
  }

  // Apply session de-risk factor (anti-martingale brake) as the very last step.
  if (deRiskFactor !== 1 && deRiskFactor >= 0) {
    nextRisk = nextRisk * deRiskFactor;
  }

  return {
    riskPercent: Math.round(nextRisk * 100) / 100,
    isCappedByTarget
  };
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
