import { Trade, InvestmentCycle, Account } from '@/types';
import { differenceInCalendarDays } from 'date-fns';

export type CycleAccountStatus =
  | 'pending'
  | 'day1_won'
  | 'blown_day1'
  | 'passed'
  | 'blown_day2';

export interface AccountCycleRow {
  position: number;         // 1-10
  account: Account;
  cycleStatus: CycleAccountStatus;
  day1Pnl: number | null;   // PNL del primer trade en el ciclo
  day2Pnl: number | null;   // PNL del segundo trade en el ciclo (si existe)
  operationDayFirst: number;  // día de la primera operación (= position)
  operationDaySecond: number; // día de la segunda operación (= position + numAccounts)
  isToday: boolean;
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

    return {
      position,
      account,
      cycleStatus: status,
      day1Pnl,
      day2Pnl,
      operationDayFirst: position,
      operationDaySecond: position + numAccounts,
      isToday: todayPos === position,
    };
  });
}
