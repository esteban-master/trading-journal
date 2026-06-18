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
  targetProfitPercentagePhase3?: number;
  maxDrawdownPercentagePhase3?: number;
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
  date: string; // ISO date string (entrada / ejecución)
  exitDate?: string; // ISO datetime de cierre (para tiempo de retención)
  session?: TradeSession; // sesión de mercado en la entrada
  status: TradeStatus;
  phase?: number;

  // Centinela de Riesgo: control emocional / disciplina
  emotionalState?: EmotionalState; // estado mental al operar
  disciplineScore?: number;        // 1-5 adherencia al plan (proceso, no resultado)
  followedPlan?: boolean;          // ¿siguió el plan?
  isRevenge?: boolean;             // auto-marcado si se registra en cooldown/lockout
}

export type EmotionalState = 'Calm' | 'Confident' | 'FOMO' | 'Revenge' | 'Anxious' | 'Bored';

export type TradeSession = 'Asia' | 'London' | 'NewYork' | 'Other';

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

// --- Apuntes (Knowledge Base) ---

// Fuente/Video: contenedor de apuntes (un en vivo de YouTube, curso, libro, etc.)
export type NoteSourceType = 'youtube_live' | 'video' | 'article' | 'book' | 'course' | 'other';

export interface NoteSource {
  id: string;
  userId: string;
  title: string;                 // "Cómo lidiar con la pérdida"
  type: NoteSourceType;
  url?: string;                  // link YouTube → de aquí se deriva miniatura/embed
  authors?: string[];            // ["José", "Ivelina Castillo"]
  date?: string;                 // ISO date string del contenido
  summary?: string;              // resumen corto (HTML o texto)
  transcript?: string;           // transcripción completa (HTML); colapsable en UI
  seedKey?: string;              // marca de contenido sembrado (idempotencia)
  createdAt: string;             // ISO date string
  updatedAt?: string;            // ISO date string
}

// Apunte individual
export interface Note {
  id: string;
  userId: string;
  sourceId?: string;             // pertenece a una fuente (opcional)
  title: string;
  content: string;               // HTML (RichTextEditor / Markdown convertido)
  category: string;              // slug de NoteCategory (p.ej. "psicologia")
  tags?: string[];
  keyTakeaways?: string[];       // bullets accionables (opcional)
  linkedTradeIds?: string[];     // vínculo a trades (array-contains)
  linkedAccountId?: string;      // vínculo a una cuenta
  images?: string[];             // URLs de imágenes adjuntas
  createdAt: string;             // ISO date string
  updatedAt?: string;            // ISO date string
}

// Categoría gestionable (para ir agregando temas con el tiempo)
export interface NoteCategory {
  id: string;
  userId: string;
  slug: string;                  // "psicologia"
  label: string;                 // "Psicología"
  color?: string;                // clase Tailwind para el chip
}

// Recordatorio / regla accionable derivada de los apuntes
export type ReminderTrigger = 'tilt' | 'afterLoss' | 'beforeTrade' | 'greenDay' | 'general';

export interface Reminder {
  id: string;
  userId: string;
  title: string;                 // "Haz una pausa, no operes por venganza"
  detail?: string;               // explicación corta
  triggers: ReminderTrigger[];   // dónde debe aparecer
  category?: string;
  tags?: string[];
  sourceId?: string;             // origen (opcional)
  noteId?: string;               // origen (opcional)
  active: boolean;
  createdAt: string;             // ISO date string
  updatedAt?: string;            // ISO date string
}

// --- Ciclos de Inversión ---
export type InvestmentCycleStatus = 'active' | 'completed' | 'cancelled';

export type TopstepStrategyMode = 'conservative' | 'balanced' | 'aggressive' | 'ultra';

export interface InvestmentCycle {
  id: string;
  userId: string;
  name: string;                  // "Ciclo #1 – Junio 2026"
  status: InvestmentCycleStatus;
  startDate: string;             // ISO date — Día 1 del ciclo
  accountIds: string[];          // IDs ordenados: índice 0 = posición 1, etc.
  createdAt: string;             // ISO date string
  strategyMode?: TopstepStrategyMode;
}
