import { Trade } from '@/types';

export interface RiskProgressionSettings {
  baseRiskPercent: number; // ej: 0.55
  lossMultiplier: number;  // ej: 1.20
  enableEquityScaling?: boolean;
  maxRiskPercent?: number; // ej: 2.80
}

/**
 * Calculates the recommended next risk percentage based on the progression of losses and equity buffer.
 * 
 * @param trades Array of trades, should be ordered from oldest to newest
 * @param settings Settings for base risk and multiplier
 * @param currentBalance (Optional) The current account balance
 * @param startingBalance (Optional) The starting account balance
 * @returns Recommended risk percentage rounded to 2 decimal places
 */
export function calculateNextRisk(
  trades: Trade[],
  settings: RiskProgressionSettings,
  currentBalance?: number,
  startingBalance?: number
): number {
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
      // Phase 1: Survival (0% to 1%) - Keep base risk, no scaling
      // Phase 2: Acceleration (1% to 3%) - Scale risk proportionally
      // Phase 3: Snowball (> 3%) - Scale further but cap at maxRiskPercent
      
      // We will use a mathematical formula as requested:
      // We add a fraction of the PnL to the base risk. 
      // For example: Risk = BaseRisk + (PnL% * 0.3)
      // If PnL% = 2.0%, Risk = 0.55 + 0.6 = 1.15%
      // If PnL% = 3.0%, Risk = 0.55 + 0.9 = 1.45%
      
      // Let's only start scaling if pnlPercent > 1.0 (to ensure a minimum 1% buffer first)
      if (pnlPercent > 1.0) {
        // The effective buffer for scaling is the PnL above 1%
        const scalingBuffer = pnlPercent - 1.0; 
        
        // Scale by 0.5 for every 1% above the 1% buffer
        // Example: If +2%, scalingBuffer = 1.0. Extra risk = 1.0 * 0.5 = +0.5%
        // Example: If +3%, scalingBuffer = 2.0. Extra risk = 2.0 * 0.5 = +1.0%
        const extraRisk = scalingBuffer * 0.5;
        
        nextRisk = settings.baseRiskPercent + extraRisk;
      }
    }
  }

  // Cap risk at maxRiskPercent if defined
  if (settings.maxRiskPercent && nextRisk > settings.maxRiskPercent) {
    nextRisk = settings.maxRiskPercent;
  }
  
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
