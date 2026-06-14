/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trade } from '@/types';
import { calculateNextRisk, RiskProgressionSettings } from './risk';

export interface SimulatorParams {
  winRate: number; // 0 to 100
  riskRewardRatio: number; // e.g. 2 means risking $1 to make $2
  numberOfTrades: number;
  settings: RiskProgressionSettings;
  startingBalance: number;
  iterations?: number;
  commissionPerTrade?: number;
  seed?: number; // si se define, la simulación es determinista y reproducible
}

export interface SimulationSummary {
  finalBalanceMedian: number;
  finalBalanceWorst: number;
  finalBalanceBest: number;
  totalWonMedian: number;
  totalLostMedian: number;
  maxDrawdownMedian: number;
  maxDrawdownWorst: number;
  maxConsecutiveWinsMedian: number;
  maxConsecutiveWinsWorst: number;
  maxConsecutiveWinsBest: number;
  maxConsecutiveLossesMedian: number;
  maxConsecutiveLossesWorst: number;
  maxConsecutiveLossesBest: number;
  profitPercentMedian: number;
  probabilityOfRuinPercent: number;
  probabilityOfProfitPercent: number;
  kellyPercentage: number;
}

export interface SimulationResult {
  chartData: any[];
  samplePaths: any[];
  summary: SimulationSummary;
}

function getPercentile(arr: number[], q: number) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

// PRNG determinista (mulberry32). Devuelve un generador de números en [0, 1).
// Permite reproducir exactamente la misma simulación con la misma semilla.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runMonteCarloSimulation({
  winRate,
  riskRewardRatio,
  numberOfTrades,
  settings,
  startingBalance,
  iterations = 500,
  commissionPerTrade = 0,
  seed,
}: SimulatorParams): SimulationResult {

  // RNG determinista si hay semilla; si no, aleatorio normal (Math.random)
  const rng: () => number = seed !== undefined ? mulberry32(seed) : Math.random;

  // Array to hold the full balance path for each iteration
  // iterationPaths[i][t] = balance for iteration i at trade t
  const iterationPaths: number[][] = [];
  const riskPaths: number[][] = [];
  
  // Store summary metrics per iteration
  const finalBalances: number[] = [];
  const maxDrawdowns: number[] = [];
  const totalWons: number[] = [];
  const totalLosts: number[] = [];
  const maxWins: number[] = [];
  const maxLosses: number[] = [];
  
  let ruinCount = 0;
  let profitCount = 0;

  for (let iter = 0; iter < iterations; iter++) {
    let currentBalance = startingBalance;
    let maxBalance = startingBalance;
    let maxDrawdownPercent = 0;
    
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let iterMaxWins = 0;
    let iterMaxLosses = 0;

    let iterWon = 0;
    let iterLost = 0;

    const history: Trade[] = [];
    const balancePath = [startingBalance];
    const riskPath = [settings.baseRiskPercent];

    for (let i = 1; i <= numberOfTrades; i++) {
      // Calculate Risk for this specific trade
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

      // Dollar amount at risk
      const dollarRisk = currentBalance * (riskResult.riskPercent / 100);

      // Roll the dice!
      const isWin = rng() * 100 <= winRate;

      let pnl = 0;
      if (isWin) {
        pnl = (dollarRisk * riskRewardRatio) - commissionPerTrade;
        iterWon++;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > iterMaxWins) iterMaxWins = currentWinStreak;
      } else {
        pnl = -dollarRisk - commissionPerTrade;
        iterLost++;
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > iterMaxLosses) iterMaxLosses = currentLossStreak;
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

      // Record for this trade
      balancePath.push(currentBalance);
      riskPath.push(riskResult.riskPercent);

      // Push fake trade to history
      const fakeTrade: Trade = {
        id: `sim-${iter}-${i}`,
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
      
      // Stop condition if account is virtually blown (e.g. 95% drawdown or balance <= 0)
      if (currentBalance <= startingBalance * 0.05 || currentBalance <= 0) {
        currentBalance = 0;
        // Fill the rest of the path with 0
        for (let fill = i + 1; fill <= numberOfTrades; fill++) {
          balancePath.push(0);
          riskPath.push(0);
        }
        break; 
      }
    }

    iterationPaths.push(balancePath);
    riskPaths.push(riskPath);
    
    finalBalances.push(currentBalance);
    maxDrawdowns.push(maxDrawdownPercent);
    totalWons.push(iterWon);
    totalLosts.push(iterLost);
    maxWins.push(iterMaxWins);
    maxLosses.push(iterMaxLosses);

    // If account dropped 90%+ or 0
    if (maxDrawdownPercent >= 90 || currentBalance <= startingBalance * 0.05) {
      ruinCount++;
    }
    if (currentBalance > startingBalance) {
      profitCount++;
    }
  }

  // Calculate Kelly Criterion
  // Kelly % = W - [(1 - W) / R]
  const w = winRate / 100;
  let kelly = w - ((1 - w) / riskRewardRatio);
  if (kelly < 0) kelly = 0; // If negative edge, Kelly is 0
  
  // Aggregate Chart Data (per trade step across all iterations)
  const chartData = [];
  
  for (let t = 0; t <= numberOfTrades; t++) {
    const balancesAtT = iterationPaths.map(p => p[t]);
    chartData.push({
      name: t === 0 ? 'Inicio' : `T${t}`,
      p10: getPercentile(balancesAtT, 0.1),
      p25: getPercentile(balancesAtT, 0.25),
      p50: getPercentile(balancesAtT, 0.5),
      p75: getPercentile(balancesAtT, 0.75),
      p90: getPercentile(balancesAtT, 0.9),
      // We can use the risk of the first path just to show something representative if needed,
      // or simply median risk
      risk: getPercentile(riskPaths.map(r => r[t]), 0.5)
    });
  }

  // Pick a few random paths as sample paths for drawing faint background lines
  const samplePaths = [];
  const maxSamples = Math.min(20, iterations);
  for(let i=0; i<maxSamples; i++) {
    const pIdx = Math.floor(rng() * iterations);
    const data = iterationPaths[pIdx].map((bal, t) => ({
      name: t === 0 ? 'Inicio' : `T${t}`,
      balance: bal
    }));
    samplePaths.push({
      id: `path-${i}`,
      data
    });
  }

  return {
    chartData,
    samplePaths,
    summary: {
      finalBalanceMedian: getPercentile(finalBalances, 0.5),
      finalBalanceWorst: Math.min(...finalBalances),
      finalBalanceBest: Math.max(...finalBalances),
      totalWonMedian: Math.round(getPercentile(totalWons, 0.5)),
      totalLostMedian: Math.round(getPercentile(totalLosts, 0.5)),
      maxDrawdownMedian: getPercentile(maxDrawdowns, 0.5),
      maxDrawdownWorst: Math.max(...maxDrawdowns),
      maxConsecutiveWinsMedian: Math.round(getPercentile(maxWins, 0.5)),
      maxConsecutiveWinsWorst: Math.round(getPercentile(maxWins, 0.1)),
      maxConsecutiveWinsBest: Math.round(getPercentile(maxWins, 0.9)),
      maxConsecutiveLossesMedian: Math.round(getPercentile(maxLosses, 0.5)),
      maxConsecutiveLossesBest: Math.round(getPercentile(maxLosses, 0.1)),
      maxConsecutiveLossesWorst: Math.round(getPercentile(maxLosses, 0.9)),
      profitPercentMedian: ((getPercentile(finalBalances, 0.5) - startingBalance) / startingBalance) * 100,
      probabilityOfRuinPercent: (ruinCount / iterations) * 100,
      probabilityOfProfitPercent: (profitCount / iterations) * 100,
      kellyPercentage: kelly * 100
    }
  };
}
