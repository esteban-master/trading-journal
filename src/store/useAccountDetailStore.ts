import Decimal from 'decimal.js';
import { create } from 'zustand';
import { Account, Trade, Withdrawal } from '@/types';
export interface EquityPoint {
  date: string;
  balance: number;
}

export interface AssetMetric {
  name: string;
  count: number;
  winRate: number;
  profit: number;
}

interface AccountDetailState {
  // Raw data
  account: Account | null;
  trades: Trade[];
  withdrawals: Withdrawal[];
  viewPhase: number;

  // Computed metrics
  phaseTrades: Trade[];
  totalTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  winRate: number;
  pnlNeto: number;
  currentBalance: number;
  equity: number;
  profitFactor: string;
  avgWin: number;
  avgLoss: number;
  avgRR: string;
  maxWinStreak: number;
  maxLossStreak: number;
  equityPoints: EquityPoint[];
  minVal: number;
  maxVal: number;
  roi: string;
  totalNetWithdrawals: number;
  assetsArray: AssetMetric[];

  // Actions
  setAccountData: (account: Account | null, trades: Trade[], withdrawals: Withdrawal[], viewPhase: number) => void;
  setViewPhase: (phase: number) => void;
}


const computeMetrics = (account: Account | null, trades: Trade[], withdrawals: Withdrawal[], viewPhase: number) => {
  if (!account) {
    return {
      phaseTrades: [],
      totalTradesCount: 0,
      winningTradesCount: 0,
      losingTradesCount: 0,
      winRate: 0,
      pnlNeto: 0,
      currentBalance: 0,
      equity: 0,
      profitFactor: '0.00',
      avgWin: 0,
      avgLoss: 0,
      avgRR: '0.0',
      maxWinStreak: 0,
      maxLossStreak: 0,
      equityPoints: [],
      minVal: 0,
      maxVal: 0,
      roi: '0.0',
      totalNetWithdrawals: 0,
      assetsArray: [],
    };
  }

  const phaseTrades = account.status === 'Real' 
    ? trades 
    : trades.filter(t => (t.phase || 1) === viewPhase);

  const closedTrades = phaseTrades.filter(t => t.status === 'Closed' || t.exitPrice !== undefined);
  const totalTradesCount = closedTrades.length;

  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);
  const winRate = totalTradesCount > 0 ? Math.round((winningTrades.length / totalTradesCount) * 100) : 0;

  const pnlNetoDecimal = closedTrades.reduce((acc, t) => acc.plus(new Decimal(t.pnl || 0)), new Decimal(0));
  const pnlNeto = pnlNetoDecimal.toNumber();

  const isRealOrFundedPhase = account.status === 'Real' || viewPhase === 3;
  const applicableWithdrawals = isRealOrFundedPhase ? withdrawals : [];

  const withdrawalsTotalDecimal = applicableWithdrawals.reduce((acc, w) => acc.plus(new Decimal(w.amount || 0)), new Decimal(0));

  const totalNetWithdrawals = applicableWithdrawals.reduce((acc, w) => {
    const split = account.status === 'Real' ? 100 : (account.profitSplit ?? 100);
    return acc.plus(new Decimal(w.netAmount || (w.amount * split / 100) || 0));
  }, new Decimal(0)).toNumber();

  const costOrOne = account.cost > 0 ? account.cost : 1;
  const roi = ((totalNetWithdrawals / costOrOne) * 100).toFixed(1);

  const currentBalanceDecimal = new Decimal(account.startingBalance).plus(pnlNetoDecimal).minus(withdrawalsTotalDecimal);
  const currentBalance = currentBalanceDecimal.toNumber();

  const equity = account.equity !== undefined && account.equity !== null && account.equity !== account.currentBalance
    ? new Decimal(account.equity).toNumber()
    : currentBalance;

  const grossProfitDecimal = winningTrades.reduce((acc, t) => acc.plus(new Decimal(t.pnl || 0)), new Decimal(0));
  const grossLossDecimal = losingTrades.reduce((acc, t) => acc.plus(new Decimal(Math.abs(t.pnl || 0))), new Decimal(0));

  const profitFactor = grossLossDecimal.gt(0)
    ? grossProfitDecimal.div(grossLossDecimal).toFixed(2)
    : grossProfitDecimal.gt(0) ? 'Max' : '0.00';

  const avgWin = winningTrades.length > 0 ? grossProfitDecimal.div(winningTrades.length).toNumber() : 0;
  const avgLoss = losingTrades.length > 0 ? grossLossDecimal.div(losingTrades.length).toNumber() : 0;

  const tradesWithRR = closedTrades.filter(t => t.riskRewardRatio > 0);
  const avgRR = tradesWithRR.length > 0
    ? (tradesWithRR.reduce((acc, t) => acc + t.riskRewardRatio, 0) / tradesWithRR.length).toFixed(1)
    : '0.0';

  // Rachas consecutivas
  const cronTrades = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  cronTrades.forEach(t => {
    if (t.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (t.pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  });

  // Puntos para la Curva de Equity Dinámica
  const equityPoints: EquityPoint[] = [{ date: 'Inicio', balance: account.startingBalance }];
  let runningBalanceDecimal = new Decimal(account.startingBalance);

  const cronEvents = [
    ...closedTrades.map(t => ({ type: 'trade', date: new Date(t.date).getTime(), pnl: t.pnl || 0 })),
    ...applicableWithdrawals.map(w => ({ type: 'withdrawal', date: new Date(w.date).getTime(), pnl: -w.amount }))
  ].sort((a, b) => a.date - b.date);

  cronEvents.forEach(evt => {
    runningBalanceDecimal = runningBalanceDecimal.plus(new Decimal(evt.pnl));
    const dateObj = new Date(evt.date);
    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    equityPoints.push({
      date: formattedDate,
      balance: runningBalanceDecimal.toNumber()
    });
  });

  if (equityPoints.length === 1) {
    equityPoints.push({
      date: 'Actual',
      balance: currentBalance
    });
  }

  const balances = equityPoints.map(p => p.balance);
  const maxVal = Math.max(...balances, account.startingBalance) * 1.002;
  const minVal = Math.min(...balances, account.startingBalance) * 0.998;

  // Distribución por Activos
  const assetsDataMap: Record<string, { count: number, wins: number, profit: Decimal }> = {};
  closedTrades.forEach(t => {
    const assetName = t.asset.toUpperCase();
    if (!assetsDataMap[assetName]) {
      assetsDataMap[assetName] = { count: 0, wins: 0, profit: new Decimal(0) };
    }
    assetsDataMap[assetName].count++;
    if (t.pnl > 0) assetsDataMap[assetName].wins++;
    assetsDataMap[assetName].profit = assetsDataMap[assetName].profit.plus(new Decimal(t.pnl || 0));
  });

  const assetsArray = Object.entries(assetsDataMap).map(([name, data]) => ({
    name,
    count: data.count,
    winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
    profit: data.profit.toNumber()
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  return {
    phaseTrades,
    totalTradesCount,
    winningTradesCount: winningTrades.length,
    losingTradesCount: losingTrades.length,
    winRate,
    pnlNeto,
    currentBalance,
    equity,
    profitFactor,
    avgWin,
    avgLoss,
    avgRR,
    maxWinStreak,
    maxLossStreak,
    equityPoints,
    minVal,
    maxVal,
    roi,
    totalNetWithdrawals,
    assetsArray,
  };
};

export const useAccountDetailStore = create<AccountDetailState>((set, get) => ({
  account: null,
  trades: [],
  withdrawals: [],
  viewPhase: 1,

  // Computed initial states
  phaseTrades: [],
  totalTradesCount: 0,
  winningTradesCount: 0,
  losingTradesCount: 0,
  winRate: 0,
  pnlNeto: 0,
  currentBalance: 0,
  equity: 0,
  profitFactor: '0.00',
  avgWin: 0,
  avgLoss: 0,
  avgRR: '0.0',
  maxWinStreak: 0,
  maxLossStreak: 0,
  equityPoints: [],
  minVal: 0,
  maxVal: 0,
  roi: '0.0',
  totalNetWithdrawals: 0,
  assetsArray: [],

  setAccountData: (account, trades, withdrawals, viewPhase) => {
    const computed = computeMetrics(account, trades, withdrawals, viewPhase);
    set({
      account,
      trades,
      withdrawals,
      viewPhase,
      ...computed,
    });
  },

  setViewPhase: (viewPhase) => {
    const { account, trades, withdrawals } = get();
    const computed = computeMetrics(account, trades, withdrawals, viewPhase);
    set({
      viewPhase,
      ...computed,
    });
  },
}));
