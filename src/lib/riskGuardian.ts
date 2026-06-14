import { Account, Trade, StreakVerdict, RiskDecision } from '@/types';
import { calculateConsecutiveLosses, RiskProgressionSettings } from './risk';
import { SimulationSummary, runMonteCarloSimulation } from './simulator';

export type RiskLight = 'green' | 'yellow' | 'red';

export interface RuleStatus {
  key: string;
  label: string;
  value: number;   // valor actual (ej. pérdida diaria %, trades de hoy)
  limit: number;   // límite configurado
  ratio: number;   // value / limit (0..1+)
  light: RiskLight;
}

export interface RiskGuardianStatus {
  dayKey: string;
  dailyPnl: number;
  dailyPnlPercent: number;
  tradesToday: number;
  consecutiveLosses: number;
  currentBalance: number;
  currentDrawdownPercent: number;
  profitLockReached: boolean;
  rules: RuleStatus[];
  overall: RiskLight;
  lockoutSuggested: boolean; // alguna regla "dura" en rojo
}

const DEFAULT_LOCKOUT_THRESHOLD = 3;

/** Bucket de día local en formato YYYY-MM-DD (no UTC, para respetar la jornada del trader). */
export function getDayKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isClosed(t: Trade): boolean {
  return t.status === 'Closed' || t.exitPrice !== undefined;
}

/**
 * Racha de pérdidas consecutivas actual, respetando el modo de conteo de la cuenta:
 * - 'allTrades' (default): acumulada entre días; solo se reinicia con un trade ganador.
 * - 'sameDay': solo cuenta las pérdidas seguidas dentro del día actual.
 */
export function getCurrentLossStreak(account: Account, trades: Trade[], now: Date = new Date()): number {
  const chrono = trades
    .filter(isClosed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const relevant = account.streakScope === 'sameDay'
    ? chrono.filter(t => getDayKey(t.date) === getDayKey(now))
    : chrono;
  return calculateConsecutiveLosses(relevant);
}

function worstLight(lights: RiskLight[]): RiskLight {
  if (lights.includes('red')) return 'red';
  if (lights.includes('yellow')) return 'yellow';
  return 'green';
}

function lightFromRatio(ratio: number, yellowAt = 0.5, redAt = 1): RiskLight {
  if (ratio >= redAt) return 'red';
  if (ratio >= yellowAt) return 'yellow';
  return 'green';
}

/**
 * Calcula el estado de riesgo intradía/cuenta para el semáforo del Centinela.
 * El drawdown se calcula sobre el balance corrido de los trades cerrados (pico→valle).
 */
export function computeAccountRiskStatus(
  account: Account,
  trades: Trade[],
  now: Date = new Date(),
  maxDrawdownLimitPercent?: number
): RiskGuardianStatus {
  const startingBalance = account.startingBalance || 0;
  const closed = trades.filter(isClosed);
  const chrono = [...closed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Balance corrido y drawdown (trailing vs static)
  let running = startingBalance;
  let peak = startingBalance;
  let maxBelowStart = 0;
  for (const t of chrono) {
    running += t.pnl || 0;
    if (running > peak) peak = running;
    if (startingBalance - running > maxBelowStart) maxBelowStart = startingBalance - running;
  }
  const currentBalance = running;
  const trailing = account.trailingDrawdown !== false; // default trailing
  const currentDrawdownPercent = trailing
    ? (peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0)
    : (startingBalance > 0 ? Math.max(0, ((startingBalance - currentBalance) / startingBalance) * 100) : 0);

  // Estadísticas del día
  const todayKey = getDayKey(now);
  const todayTrades = chrono.filter(t => getDayKey(t.date) === todayKey);
  const tradesToday = todayTrades.length;
  const dailyPnl = todayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const dailyPnlPercent = startingBalance > 0 ? (dailyPnl / startingBalance) * 100 : 0;

  const consecutiveLosses = getCurrentLossStreak(account, trades, now);

  const rules: RuleStatus[] = [];

  // Regla: límite de pérdida diaria
  if (account.dailyLossLimitPercent && account.dailyLossLimitPercent > 0) {
    const lossPercent = dailyPnl < 0 ? Math.abs(dailyPnlPercent) : 0;
    const ratio = lossPercent / account.dailyLossLimitPercent;
    rules.push({
      key: 'dailyLoss',
      label: 'Pérdida diaria',
      value: lossPercent,
      limit: account.dailyLossLimitPercent,
      ratio,
      light: lightFromRatio(ratio, 0.5, 1),
    });
  }

  // Regla: máximo de trades por día
  if (account.maxTradesPerDay && account.maxTradesPerDay > 0) {
    const ratio = tradesToday / account.maxTradesPerDay;
    rules.push({
      key: 'maxTrades',
      label: 'Trades hoy',
      value: tradesToday,
      limit: account.maxTradesPerDay,
      ratio,
      light: lightFromRatio(ratio, 0.8, 1),
    });
  }

  // Regla: rachas perdedoras consecutivas (lockout)
  const lossThreshold = account.maxConsecutiveLossesLockout ?? DEFAULT_LOCKOUT_THRESHOLD;
  {
    const ratio = lossThreshold > 0 ? consecutiveLosses / lossThreshold : 0;
    let light: RiskLight = 'green';
    if (consecutiveLosses >= lossThreshold) light = 'red';
    else if (consecutiveLosses >= lossThreshold - 1) light = 'yellow';
    rules.push({
      key: 'lossStreak',
      label: 'Racha perdedora',
      value: consecutiveLosses,
      limit: lossThreshold,
      ratio,
      light,
    });
  }

  // Regla: drawdown vs máximo permitido
  const ddLimit = maxDrawdownLimitPercent ?? account.maxDrawdownPercentage;
  if (ddLimit && ddLimit > 0) {
    const ratio = currentDrawdownPercent / ddLimit;
    rules.push({
      key: 'drawdown',
      label: 'Drawdown',
      value: currentDrawdownPercent,
      limit: ddLimit,
      ratio,
      light: lightFromRatio(ratio, 0.5, 0.85),
    });
  }

  // Regla: lock-in del día verde (objetivo diario alcanzado → conviene parar)
  let profitLockReached = false;
  if (account.dailyProfitLockPercent && account.dailyProfitLockPercent > 0) {
    profitLockReached = dailyPnlPercent >= account.dailyProfitLockPercent;
    rules.push({
      key: 'profitLock',
      label: 'Objetivo diario',
      value: Math.max(0, dailyPnlPercent),
      limit: account.dailyProfitLockPercent,
      ratio: account.dailyProfitLockPercent > 0 ? dailyPnlPercent / account.dailyProfitLockPercent : 0,
      light: profitLockReached ? 'yellow' : 'green', // amarillo = aviso para proteger ganancias
    });
  }

  // Reglas "duras" cuyo rojo sugiere cerrar la jornada
  const hardRed = rules.some(r => r.light === 'red' && ['dailyLoss', 'lossStreak', 'drawdown'].includes(r.key));

  return {
    dayKey: todayKey,
    dailyPnl,
    dailyPnlPercent,
    tradesToday,
    consecutiveLosses,
    currentBalance,
    currentDrawdownPercent,
    profitLockReached,
    rules,
    overall: worstLight(rules.map(r => r.light)),
    lockoutSuggested: hardRed,
  };
}

// --- Árbitro estadístico ----------------------------------------------------

export interface StreakReference {
  expectedMedian: number;
  expectedWorst: number;
  worstDrawdown: number;
  source: 'montecarlo' | 'heuristic';
}

/** Construye la referencia de rachas desde un resumen de Monte Carlo ya calculado. */
export function streakReferenceFromSummary(summary: SimulationSummary): StreakReference {
  return {
    expectedMedian: summary.maxConsecutiveLossesMedian,
    expectedWorst: summary.maxConsecutiveLossesWorst,
    worstDrawdown: summary.maxDrawdownWorst,
    source: 'montecarlo',
  };
}

/**
 * Referencia heurística cuando faltan datos para una simulación fiable.
 * Racha perdedora más larga esperada en N trades ≈ log_(1/p)(N), con p = prob. de pérdida.
 */
export function heuristicStreakReference(winRatePercent: number, numberOfTrades: number): StreakReference {
  const p = Math.min(0.999, Math.max(0.001, 1 - winRatePercent / 100));
  const n = Math.max(1, numberOfTrades);
  const expectedMedian = Math.max(1, Math.round(Math.log(n) / Math.log(1 / p)));
  return {
    expectedMedian,
    expectedWorst: expectedMedian + 3,
    worstDrawdown: 100, // sin sim no evaluamos drawdown → no fuerza anomalía
    source: 'heuristic',
  };
}

/**
 * Construye la referencia de rachas para el árbitro: corre Monte Carlo si hay datos
 * suficientes (≥20 trades cerrados y winrate/RR válidos), o usa la heurística si no.
 * Pensado para memoizarse con dependencias primitivas (no re-corre la simulación en cada render).
 */
export function buildStreakReference(
  closedTradesCount: number,
  winRate: number,
  avgRR: number,
  settings: RiskProgressionSettings,
  startingBalance: number
): StreakReference {
  const n = Math.max(50, closedTradesCount);
  if (closedTradesCount < 20 || winRate <= 0 || winRate >= 100 || avgRR <= 0) {
    return heuristicStreakReference(winRate > 0 ? winRate : 50, n);
  }
  const sim = runMonteCarloSimulation({
    winRate,
    riskRewardRatio: avgRR,
    numberOfTrades: n,
    iterations: 1000,
    settings,
    startingBalance,
  });
  return streakReferenceFromSummary(sim.summary);
}

export interface StreakClassification {
  verdict: StreakVerdict;
  expectedMedian: number;
  expectedWorst: number;
  worstDrawdown: number;
  source: StreakReference['source'];
  message: string;
}

/**
 * Decide si una racha es ruido estadístico, elevada o anómala comparándola
 * contra la distribución esperada (Monte Carlo o heurística).
 */
export function classifyStreak(
  currentStreak: number,
  currentDrawdownPercent: number,
  ref: StreakReference
): StreakClassification {
  let verdict: StreakVerdict;

  if (currentDrawdownPercent > ref.worstDrawdown || currentStreak > ref.expectedWorst) {
    verdict = 'anomaly';
  } else if (currentStreak > ref.expectedMedian) {
    verdict = 'elevated';
  } else {
    verdict = 'noise';
  }

  let message: string;
  if (verdict === 'noise') {
    message = `Una racha de ${currentStreak} pérdidas es ruido estadístico normal: la media esperada con tu perfil es ${ref.expectedMedian} y el peor 10% llega a ${ref.expectedWorst}. Tu tamaño en $ ya baja solo al encoger el balance, así que mantén el plan.`;
  } else if (verdict === 'elevated') {
    message = `Una racha de ${currentStreak} pérdidas está por encima de la media esperada (${ref.expectedMedian}) pero dentro del peor 10% (${ref.expectedWorst}). Es incómoda pero estadísticamente posible: tómate un descanso y considera reducir el tamaño.`;
  } else {
    message = `Una racha de ${currentStreak} pérdidas supera lo esperado (peor 10% = ${ref.expectedWorst})${currentDrawdownPercent > ref.worstDrawdown ? ` y tu drawdown (${currentDrawdownPercent.toFixed(1)}%) excede el peor simulado` : ''}. Posible deterioro del edge: reduce tamaño o cierra el día y audita tu estrategia.`;
  }

  return {
    verdict,
    expectedMedian: ref.expectedMedian,
    expectedWorst: ref.expectedWorst,
    worstDrawdown: ref.worstDrawdown,
    source: ref.source,
    message,
  };
}

// --- Métricas de disciplina --------------------------------------------------

export interface EmotionBreakdown {
  emotion: string;
  count: number;
  pnl: number;
}

export interface DisciplineMetrics {
  avgDisciplineScore: number; // 0 si no hay datos
  scoredCount: number;
  followedPlanRate: number;   // % sobre los trades que tienen el campo
  followedPlanCount: number;
  planTaggedCount: number;
  planPnl: number;            // P&L de trades que siguieron el plan
  offPlanPnl: number;         // P&L de trades que NO siguieron el plan
  revengeCount: number;
  revengePnl: number;         // P&L de trades de revancha
  emotionBreakdown: EmotionBreakdown[];
}

/** Métricas de proceso: adherencia al plan, P&L emocional vs planificado. */
export function computeDisciplineMetrics(trades: Trade[]): DisciplineMetrics {
  const closed = trades.filter(isClosed);

  const scored = closed.filter(t => typeof t.disciplineScore === 'number');
  const avgDisciplineScore = scored.length > 0
    ? scored.reduce((acc, t) => acc + (t.disciplineScore || 0), 0) / scored.length
    : 0;

  const planTagged = closed.filter(t => typeof t.followedPlan === 'boolean');
  const followed = planTagged.filter(t => t.followedPlan === true);
  const offPlan = planTagged.filter(t => t.followedPlan === false);
  const followedPlanRate = planTagged.length > 0 ? (followed.length / planTagged.length) * 100 : 0;
  const planPnl = followed.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const offPlanPnl = offPlan.reduce((acc, t) => acc + (t.pnl || 0), 0);

  const revenge = closed.filter(t => t.isRevenge === true);
  const revengePnl = revenge.reduce((acc, t) => acc + (t.pnl || 0), 0);

  const emotionMap: Record<string, { count: number; pnl: number }> = {};
  for (const t of closed) {
    if (!t.emotionalState) continue;
    if (!emotionMap[t.emotionalState]) emotionMap[t.emotionalState] = { count: 0, pnl: 0 };
    emotionMap[t.emotionalState].count++;
    emotionMap[t.emotionalState].pnl += t.pnl || 0;
  }
  const emotionBreakdown = Object.entries(emotionMap)
    .map(([emotion, d]) => ({ emotion, count: d.count, pnl: d.pnl }))
    .sort((a, b) => b.count - a.count);

  return {
    avgDisciplineScore,
    scoredCount: scored.length,
    followedPlanRate,
    followedPlanCount: followed.length,
    planTaggedCount: planTagged.length,
    planPnl,
    offPlanPnl,
    revengeCount: revenge.length,
    revengePnl,
    emotionBreakdown,
  };
}

/** Acción recomendada según el veredicto. Nunca martingala en Funded/Real. */
export function recommendActionForStreak(verdict: StreakVerdict, account: Account): RiskDecision {
  const isFundedOrReal = account.status === 'Funded' || account.status === 'Real';
  if (verdict === 'noise') return 'keep_plan';
  if (verdict === 'elevated') return 'derisk';
  // anomaly
  return isFundedOrReal ? 'lockout' : 'derisk';
}
