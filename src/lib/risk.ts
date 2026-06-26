import { Trade, AccountStatus, RiskProfile } from '@/types';

/** Tramo de protección: cuando el drawdown alcanza `drawdownPercent`, el riesgo se multiplica por `factor` (≤1). */
export interface DrawdownDeRiskTier {
  drawdownPercent: number;
  factor: number;
}

export interface RiskProgressionSettings {
  baseRiskPercent: number; // ej: 0.55
  lossMultiplier: number;  // ej: 1.20
  enableEquityScaling?: boolean;
  maxRiskPercent?: number; // ej: 2.80
  riskProfile?: RiskProfile;        // 'sprint' (default) | 'robust'
  robustMaxRiskPercent?: number;    // techo de riesgo en perfil robusto (default 1.5)
  drawdownDeRiskTiers?: DrawdownDeRiskTier[]; // tramos de de-risk por drawdown (perfil robusto)
  drawdownDeRiskEnabled?: boolean;  // false = riesgo base fijo, ignora los tramos de drawdown
}

/** Techo de riesgo por defecto en perfil robusto. */
export const DEFAULT_ROBUST_MAX_RISK_PERCENT = 1.5;

/** Tramos de de-risk por drawdown por defecto (perfil robusto). El lockout duro lo gestiona el Centinela. */
export const DEFAULT_DRAWDOWN_DERISK_TIERS: DrawdownDeRiskTier[] = [
  { drawdownPercent: 5, factor: 0.75 },
  { drawdownPercent: 8, factor: 0.5 },
  { drawdownPercent: 12, factor: 0.25 },
];

/**
 * Resuelve el perfil de riesgo efectivo de una cuenta.
 * `Funded | Real | Payout` → 'robust'; el resto ('Evaluation', 'Demo', 'Blown') → 'sprint'.
 * Un `override` explícito (distinto de 'auto') siempre gana.
 * Alinea con el precedente `isFundedOrReal` de riskGuardian.
 */
export function resolveRiskProfile(status: AccountStatus, override?: RiskProfile | 'auto'): RiskProfile {
  if (override && override !== 'auto') return override;
  return status === 'Funded' || status === 'Real' || status === 'Payout' ? 'robust' : 'sprint';
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
 * @param currentDrawdownPercent (Optional) Current drawdown (%). Used by the 'robust' profile to step risk down. Ignored in 'sprint'.
 * @returns Recommended risk percentage rounded to 2 decimal places
 */
export function calculateNextRisk(
  trades: Trade[],
  settings: RiskProgressionSettings,
  currentBalance?: number,
  startingBalance?: number,
  targetProximity?: TargetProximitySettings,
  deRiskFactor: number = 1,
  currentDrawdownPercent?: number
): { riskPercent: number; isCappedByTarget: boolean } {
  const profile: RiskProfile = settings.riskProfile ?? 'sprint';
  const isRobust = profile === 'robust';

  let consecutiveLosses = 0;

  for (const trade of trades) {
    if (trade.status !== 'Closed') continue;

    if (trade.pnl > 0) {
      consecutiveLosses = 0;
    } else if (trade.pnl < 0) {
      consecutiveLosses++;
    }
  }

  // Techo efectivo según perfil: sprint usa maxRiskPercent; robusto usa robustMaxRiskPercent.
  const effectiveMax = isRobust
    ? (settings.robustMaxRiskPercent ?? DEFAULT_ROBUST_MAX_RISK_PERCENT)
    : settings.maxRiskPercent;

  // Riesgo de partida:
  // - sprint: martingala de recuperación → base * (lossMultiplier ^ pérdidasConsecutivas).
  // - robusto: SIEMPRE riesgo base (anti-martingala: nunca sube tras perder). La fracción fija
  //   ya reduce los $ al caer el balance; el de-risk por drawdown se aplica más abajo.
  let nextRisk = isRobust
    ? settings.baseRiskPercent
    : settings.baseRiskPercent * Math.pow(settings.lossMultiplier, consecutiveLosses);

  // Equity Scaling ("house money"): en ambos perfiles, solo si vamos en positivo y sin racha.
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

  // Cap risk at the profile's ceiling if defined
  if (effectiveMax && nextRisk > effectiveMax) {
    nextRisk = effectiveMax;
  }

  // De-risking escalonado por drawdown (solo perfil robusto, y solo si está habilitado).
  // Con drawdownDeRiskEnabled === false el riesgo base es fijo independientemente del drawdown.
  if (isRobust && (settings.drawdownDeRiskEnabled ?? true) && currentDrawdownPercent !== undefined && currentDrawdownPercent > 0) {
    const tiers = settings.drawdownDeRiskTiers ?? DEFAULT_DRAWDOWN_DERISK_TIERS;
    let tierFactor = 1;
    for (const tier of tiers) {
      if (currentDrawdownPercent >= tier.drawdownPercent) tierFactor = Math.min(tierFactor, tier.factor);
    }
    nextRisk = nextRisk * tierFactor;
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
