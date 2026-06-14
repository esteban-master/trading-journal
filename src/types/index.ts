export type AccountStatus = 'Evaluation' | 'Funded' | 'Blown' | 'Payout' | 'Real';

export interface Account {
  id: string;
  userId: string;
  name: string; // e.g., "Topstep 50k #1"
  firm: string; // e.g., "Topstep", "FTMO"
  status: AccountStatus;
  cost: number;
  startingBalance: number;
  currentBalance: number;
  equity: number;
  totalWithdrawals: number;
  profitSplit?: number; // e.g. 80 for 80%
  createdAt: string; // ISO date string
  
  // Evaluation Rules
  targetProfitPercentage?: number;
  maxDrawdownPercentage?: number;
  targetProfitPercentagePhase2?: number;
  maxDrawdownPercentagePhase2?: number;
  phase?: number;
  totalPhases?: number;
  
  // Risk Strategy
  baseRiskPercent?: number;
  lossMultiplier?: number;
  enableEquityScaling?: boolean;
  maxRiskPercent?: number;

  // Centinela de Riesgo (intradía / cuenta)
  dailyLossLimitPercent?: number;        // % del startingBalance que cierra el día
  maxTradesPerDay?: number;              // anti-overtrading
  maxConsecutiveLossesLockout?: number;  // N SL que disparan el Tilt Guard (default 3)
  dailyProfitLockPercent?: number;       // objetivo diario → "lock-in del día verde"
  trailingDrawdown?: boolean;            // true=trailing, false=static (fondeo)
  streakScope?: StreakScope;             // cómo contar la racha: 'allTrades' (acumulada) | 'sameDay'
}

export type StreakScope = 'allTrades' | 'sameDay';

export type TradeDirection = 'Long' | 'Short';
export type TradeStatus = 'Open' | 'Closed';

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  asset: string; // e.g., "NQ", "ES", "EURUSD"
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  strategy: string;
  riskRewardRatio: number;
  riskPercent?: number; // Risk recommended/taken on this trade
  description?: string; // Rich text description
  images: string[]; // Array of image URLs
  date: string; // ISO date string
  status: TradeStatus;
  phase?: number;

  // Centinela de Riesgo: control emocional / disciplina
  emotionalState?: EmotionalState; // estado mental al operar
  disciplineScore?: number;        // 1-5 adherencia al plan (proceso, no resultado)
  followedPlan?: boolean;          // ¿siguió el plan?
  isRevenge?: boolean;             // auto-marcado si se registra en cooldown/lockout
}

export type EmotionalState = 'Calm' | 'Confident' | 'FOMO' | 'Revenge' | 'Anxious' | 'Bored';

export interface Withdrawal {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  netAmount?: number; // the amount actually received after profit split
  profitSplit?: number; // the profit split percentage at the time of withdrawal
  date: string; // ISO date string
  notes?: string;
}

// --- Centinela de Riesgo ---
export type RiskEventType = 'tilt_triggered' | 'cooldown' | 'derisk' | 'lockout' | 'override';
export type StreakVerdict = 'noise' | 'elevated' | 'anomaly';
export type RiskDecision = 'keep_plan' | 'derisk' | 'lockout';

export interface RiskEvent {
  id: string;
  userId: string;
  accountId: string;
  type: RiskEventType;
  dayKey: string;              // bucket de día local (YYYY-MM-DD)
  consecutiveLosses: number;
  verdict?: StreakVerdict;
  emotionNote?: string;
  decision?: RiskDecision;
  date: string;                // ISO date string
}
