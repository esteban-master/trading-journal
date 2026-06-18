import { Trade, InvestmentCycle, Account } from '@/types';
import { differenceInCalendarDays } from 'date-fns';

export type CycleAccountStatus =
  | 'pending'
  | 'day1_won'
  | 'blown_day1'
  | 'passed'
  | 'blown_day2';

// ─── Progreso Topstep por cuenta ──────────────────────────────────────────────

export interface TopstepAccountProgress {
  cumulativePnl: number;
  tradingDays: number;
  maxDayPnl: number;
  consistencyRatio: number;
  isConsistencyOk: boolean;
  trailingFloor: number;
  currentBalance: number;
  trailingDDRoom: number;
  isBlownByDD: boolean;
  targetProfit: number;
  progressPct: number;
  minTradingDaysOk: boolean;
  isPassed: boolean;
}

export function computeTopstepProgress(
  trades: Trade[],
  startingBalance = 50_000,
  targetProfit = 3_000,
  maxDrawdown = 2_000,
): TopstepAccountProgress {
  const byDate = new Map<string, number>();
  for (const trade of trades) {
    const key = trade.date.slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + trade.pnl);
  }

  const dates = [...byDate.keys()].sort();
  let runningBalance = startingBalance;
  let maxEodBalance = startingBalance;
  let trailingFloor = startingBalance - maxDrawdown;
  let maxDayPnl = 0;
  let isBlownByDD = false;

  for (const date of dates) {
    const dayPnl = byDate.get(date) ?? 0;
    runningBalance += dayPnl;
    if (dayPnl > maxDayPnl) maxDayPnl = dayPnl;
    if (runningBalance > maxEodBalance) {
      maxEodBalance = runningBalance;
      trailingFloor = maxEodBalance - maxDrawdown;
    }
    if (runningBalance <= trailingFloor) isBlownByDD = true;
  }

  const cumulativePnl = runningBalance - startingBalance;
  const tradingDays = dates.length;
  const consistencyRatio = cumulativePnl > 0 ? maxDayPnl / cumulativePnl : 0;
  const isConsistencyOk = cumulativePnl <= 0 || consistencyRatio <= 0.5;
  const trailingDDRoom = Math.max(0, runningBalance - trailingFloor);
  const progressPct = Math.max(0, Math.min(1, cumulativePnl / targetProfit));
  const minTradingDaysOk = tradingDays >= 5;
  const isPassed = cumulativePnl >= targetProfit && isConsistencyOk && minTradingDaysOk && !isBlownByDD;

  return {
    cumulativePnl,
    tradingDays,
    maxDayPnl,
    consistencyRatio,
    isConsistencyOk,
    trailingFloor,
    currentBalance: runningBalance,
    trailingDDRoom,
    isBlownByDD,
    targetProfit,
    progressPct,
    minTradingDaysOk,
    isPassed,
  };
}

export interface AccountCycleRow {
  position: number;         // 1-10
  account: Account;
  cycleStatus: CycleAccountStatus;
  day1Pnl: number | null;   // PNL del primer trade en el ciclo
  day2Pnl: number | null;   // PNL del segundo trade en el ciclo (si existe)
  operationDayFirst: number;  // día de la primera operación (= position)
  operationDaySecond: number; // día de la segunda operación (= position + numAccounts)
  isToday: boolean;
  topstepProgress?: TopstepAccountProgress;
}

/**
 * Deriva el estado del ciclo para una cuenta dado el historial de trades.
 * Usa los primeros 2 trades ordenados cronológicamente (ascendente).
 */
export function computeCycleAccountStatus(
  trades: Trade[]
): { status: CycleAccountStatus; day1Pnl: number | null; day2Pnl: number | null } {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const t1 = sorted[0];
  const t2 = sorted[1];

  if (!t1) {
    return { status: 'pending', day1Pnl: null, day2Pnl: null };
  }

  const day1Pnl = t1.pnl;

  if (day1Pnl <= 0) {
    return { status: 'blown_day1', day1Pnl, day2Pnl: null };
  }

  // Day 1 won
  if (!t2) {
    return { status: 'day1_won', day1Pnl, day2Pnl: null };
  }

  const day2Pnl = t2.pnl;

  if (day2Pnl > 0) {
    return { status: 'passed', day1Pnl, day2Pnl };
  }

  return { status: 'blown_day2', day1Pnl, day2Pnl };
}

/**
 * Retorna la posición (1-based) del ciclo que corresponde a hoy,
 * o null si el ciclo aún no empezó o ya terminó el primer ciclo completo.
 */
export function getTodayPosition(
  cycle: InvestmentCycle
): number | null {
  const start = new Date(cycle.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const daysDiff = differenceInCalendarDays(today, start);
  if (daysDiff < 0) return null;

  const numAccounts = cycle.accountIds.length;
  if (numAccounts === 0) return null;

  // Posición 1-based dentro del ciclo (primer ciclo día 0-9, segundo ciclo día 10-19)
  const pos = (daysDiff % numAccounts) + 1;
  return pos;
}

/**
 * Construye las filas de la tabla del ciclo combinando cuentas + trades.
 */
export function buildCycleRows(
  cycle: InvestmentCycle,
  accounts: Account[],
  allTrades: Trade[]
): AccountCycleRow[] {
  const todayPos = getTodayPosition(cycle);
  const numAccounts = cycle.accountIds.length;

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return cycle.accountIds.map((accountId, idx) => {
    const position = idx + 1;
    const account = accountMap.get(accountId);

    if (!account) {
      // Account not found (deleted?), return a placeholder
      return {
        position,
        account: {
          id: accountId,
          userId: '',
          name: `Cuenta #${position} (eliminada)`,
          firm: '—',
          status: 'Blown' as const,
          cost: 0,
          startingBalance: 0,
          currentBalance: 0,
          equity: 0,
          totalWithdrawals: 0,
          createdAt: '',
        },
        cycleStatus: 'pending' as CycleAccountStatus,
        day1Pnl: null,
        day2Pnl: null,
        operationDayFirst: position,
        operationDaySecond: position + numAccounts,
        isToday: todayPos === position,
      };
    }

    const accountTrades = allTrades.filter((t) => t.accountId === accountId);
    const { status, day1Pnl, day2Pnl } = computeCycleAccountStatus(accountTrades);

    const isTopstep = account.firm?.toLowerCase().includes('topstep');
    const topstepProgress = isTopstep
      ? computeTopstepProgress(
          accountTrades,
          account.startingBalance || 50_000,
          account.startingBalance ? account.startingBalance * 0.06 : 3_000,
          account.startingBalance ? account.startingBalance * 0.04 : 2_000,
        )
      : undefined;

    return {
      position,
      account,
      cycleStatus: status,
      day1Pnl,
      day2Pnl,
      operationDayFirst: position,
      operationDaySecond: position + numAccounts,
      isToday: todayPos === position,
      topstepProgress,
    };
  });
}
