import { differenceInMinutes } from 'date-fns';
import { Trade, TradeSession } from '@/types';

export const SESSION_LABELS: Record<TradeSession, string> = {
  Asia: 'Asia',
  London: 'Londres',
  NewYork: 'Nueva York',
  Other: 'Otra',
};

function isClosed(t: Trade): boolean {
  return t.status === 'Closed' || t.exitPrice !== undefined;
}

/**
 * Promedio de minutos de retención sobre los trades que tienen fecha de entrada y de cierre.
 * Devuelve null si ningún trade tiene los datos (para mostrar un estado vacío honesto).
 */
export function computeAvgHoldingMinutes(trades: Trade[]): number | null {
  const durations: number[] = [];
  for (const t of trades) {
    if (!t.exitDate) continue;
    const d = differenceInMinutes(new Date(t.exitDate), new Date(t.date));
    if (Number.isFinite(d) && d >= 0) durations.push(d);
  }
  if (durations.length === 0) return null;
  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}

/** Formatea minutos a "Xh Ym". Devuelve "—" si no hay dato. */
export function formatDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export interface SessionStat {
  session: TradeSession;
  count: number;
  percent: number;
}

/** Distribución porcentual por sesión, solo sobre trades que tienen `session`. */
export function computeSessionDistribution(trades: Trade[]): SessionStat[] {
  const withSession = trades.filter(t => t.session);
  const total = withSession.length;
  if (total === 0) return [];

  const counts: Record<string, number> = {};
  for (const t of withSession) {
    counts[t.session!] = (counts[t.session!] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([session, count]) => ({
      session: session as TradeSession,
      count,
      percent: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Sugerencia de sesión a partir de la hora local de entrada (editable por el usuario). */
export function guessSession(dateISO: string): TradeSession {
  const h = new Date(dateISO).getHours();
  if (h >= 8 && h < 13) return 'London';
  if (h >= 13 && h < 21) return 'NewYork';
  return 'Asia';
}

/**
 * Expectancy: ganancia/pérdida esperada en $ por trade.
 * E = winRate*avgWin − (1−winRate)*avgLoss
 */
export function computeExpectancy(trades: Trade[]): number {
  const closed = trades.filter(isClosed);
  const n = closed.length;
  if (n === 0) return 0;

  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const winRate = wins.length / n;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + Math.abs(t.pnl), 0) / losses.length : 0;

  return winRate * avgWin - (1 - winRate) * avgLoss;
}
