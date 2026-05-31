import { Trade } from '@/types';
import { calculateNextRisk, RiskProgressionSettings } from './risk';

export interface SimulatorParams {
  winRate: number; // 0 to 100
  riskRewardRatio: number; // e.g. 2 means risking $1 to make $2
  numberOfTrades: number;
  settings: RiskProgressionSettings;
  startingBalance: number;
}

export interface SimulationSummary {
  finalBalance: number;
  totalWon: number;
  totalLost: number;
  maxDrawdownPercent: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  profitPercent: number;
}

export interface SimulationResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataPoints: any[];
  summary: SimulationSummary;
}

export function runMonteCarloSimulation({
  winRate,
  riskRewardRatio,
  numberOfTrades,
  settings,
  startingBalance,
}: SimulatorParams): SimulationResult {
  console.log({ winRate, riskRewardRatio, numberOfTrades, settings, startingBalance })
  let currentBalance = startingBalance;
  let maxBalance = startingBalance;
  let maxDrawdownPercent = 0;
  
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  let totalWon = 0;
  let totalLost = 0;

  const history: Trade[] = [];

  console.log({history})
  const dataPoints = [];

  // Base point
  dataPoints.push({
    name: 'Inicio',
    balance: startingBalance,
    risk: settings.baseRiskPercent,
    pnl: 0,
  });

  for (let i = 1; i <= numberOfTrades; i++) {
    // 1. Calculate Risk for this specific trade using the real algorithm
    // Target proximity is disabled for pure probability simulation unless specified
    const targetProximity = {
      isEvaluation: false, 
      targetProfitPercentage: undefined,
      averageRR: riskRewardRatio,
    };

    const riskResult = calculateNextRisk(
      history,
      settings,
      currentBalance,
      startingBalance,
      targetProximity
    );

    // 2. Dollar amount at risk
    // It's calculated based on current balance
    const dollarRisk = currentBalance * (riskResult.riskPercent / 100);

    // 3. Roll the dice!
    const isWin = Math.random() * 100 <= winRate;

    let pnl = 0;
    if (isWin) {
      pnl = dollarRisk * riskRewardRatio;
      totalWon++;
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxConsecutiveWins) maxConsecutiveWins = currentWinStreak;
    } else {
      pnl = -dollarRisk;
      totalLost++;
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentLossStreak;
    }

    currentBalance += pnl;

    // Drawdown Tracking
    if (currentBalance > maxBalance) {
      maxBalance = currentBalance;
    }
    const currentDrawdown = ((maxBalance - currentBalance) / maxBalance) * 100;
    if (currentDrawdown > maxDrawdownPercent) {
      maxDrawdownPercent = currentDrawdown;
    }

    // Push fake trade to history so next calculateNextRisk knows about it
    const fakeTrade: Trade = {
      id: `sim-${i}`,
      date: new Date().toISOString(),
      asset: 'SIMULATED',
      direction: 'Long',
      entryPrice: 1,
      exitPrice: isWin ? 2 : 0,
      pnl,
      status: 'Closed',
      userId: '',
      accountId: '',
      strategy: '',
      riskRewardRatio: 0,
      images: []
    };
    history.push(fakeTrade);

    dataPoints.push({
      name: `T${i}`,
      balance: currentBalance,
      risk: riskResult.riskPercent,
      pnl: pnl,
      isWin,
    });
  }

  const profitPercent = ((currentBalance - startingBalance) / startingBalance) * 100;

  return {
    dataPoints,
    summary: {
      finalBalance: currentBalance,
      totalWon,
      totalLost,
      maxDrawdownPercent,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      profitPercent,
    }
  };
}
