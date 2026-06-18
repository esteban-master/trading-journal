export type AccountStatus =
  | 'pending'
  | 'blown_day1'
  | 'day1_won'
  | 'blown_day2'
  | 'passed';

export interface TopstepSimConfig {
  winRate: number;        // 0-1
  numAccounts: number;    // default 10
  iterations: number;     // 1000 / 5000 / 10000
  challengeCost: number;  // costo del challenge por cuenta (ej. $49)
  activationFee: number;  // costo de activación al pasar (ej. $149)
  fundedValue: number;    // valor estimado de operar la cuenta fondeada
}

export interface AccountSimResult {
  accountNum: number;
  dayTrade1: number;
  dayTrade2: number;
  status: AccountStatus;
}

export interface TopstepSimResult {
  // Analítica exacta
  pPass: number;
  analyticalExpected: number;
  breakEvenWinRate: number;

  // Distribución Monte Carlo
  distribution: number[];
  distributionPct: number[];
  avgPassed: number;

  // Percentiles de cuentas pasadas
  p10: number;
  p50: number;
  p90: number;

  // Financiero esperado
  totalChallengeCost: number;     // numAccounts × challengeCost (siempre se paga)
  expectedActivationCost: number; // avgPassed × activationFee (solo al pasar)
  expectedTotalCost: number;      // totalChallengeCost + expectedActivationCost
  expectedRevenue: number;        // avgPassed × fundedValue
  expectedNetPnl: number;         // expectedRevenue - expectedTotalCost

  // Ejemplo de una sola corrida (para animar tarjetas)
  sampleRun: AccountSimResult[];
}

function getPercentile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function runTopstepSimulation(config: TopstepSimConfig): TopstepSimResult {
  const { winRate, numAccounts, iterations, challengeCost, activationFee, fundedValue } = config;

  const distribution = new Array(numAccounts + 1).fill(0);
  const passedPerIteration: number[] = [];

  let sampleRun: AccountSimResult[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    let passed = 0;
    const iterAccounts: AccountSimResult[] = [];

    for (let acc = 1; acc <= numAccounts; acc++) {
      const trade1Win = Math.random() < winRate;
      let status: AccountStatus;

      if (!trade1Win) {
        status = 'blown_day1';
      } else {
        const trade2Win = Math.random() < winRate;
        status = trade2Win ? 'passed' : 'blown_day2';
      }

      if (status === 'passed') passed++;

      iterAccounts.push({
        accountNum: acc,
        dayTrade1: acc,
        dayTrade2: acc + numAccounts,
        status,
      });
    }

    distribution[passed]++;
    passedPerIteration.push(passed);

    if (iter === 0) {
      sampleRun = iterAccounts;
    }
  }

  const sorted = [...passedPerIteration].sort((a, b) => a - b);
  const avgPassed = passedPerIteration.reduce((a, b) => a + b, 0) / iterations;
  const distributionPct = distribution.map((c) => (c / iterations) * 100);

  const pPass = winRate * winRate;
  const analyticalExpected = numAccounts * pPass;

  // Break-even: challengeCost + activationFee (si pasa) = fundedValue × pPass
  // numAccounts × challengeCost + numAccounts × pPass × activationFee = numAccounts × pPass × fundedValue
  // challengeCost / numAccounts + pPass × activationFee = pPass × fundedValue
  // Resolviendo para W (win rate) con pPass = W²:
  // W² = challengeCost / (fundedValue - activationFee)
  const netValuePerPass = fundedValue - activationFee;
  const breakEvenWinRate =
    netValuePerPass > 0 ? Math.sqrt(challengeCost / netValuePerPass) : 1;

  const totalChallengeCost = numAccounts * challengeCost;
  const expectedActivationCost = avgPassed * activationFee;
  const expectedTotalCost = totalChallengeCost + expectedActivationCost;
  const expectedRevenue = avgPassed * fundedValue;
  const expectedNetPnl = expectedRevenue - expectedTotalCost;

  return {
    pPass,
    analyticalExpected,
    breakEvenWinRate,
    distribution,
    distributionPct,
    avgPassed,
    p10: getPercentile(sorted, 0.1),
    p50: getPercentile(sorted, 0.5),
    p90: getPercentile(sorted, 0.9),
    totalChallengeCost,
    expectedActivationCost,
    expectedTotalCost,
    expectedRevenue,
    expectedNetPnl,
    sampleRun,
  };
}

// ─── Comparador de estrategias ────────────────────────────────────────────────

export const TOPSTEP_STRATEGIES = [
  { id: 'conservative' as const, label: 'Conservador', risk: 500,  reward: 1500, color: '#10b981' },
  { id: 'balanced'     as const, label: 'Balanceado',  risk: 1000, reward: 1500, color: '#3b82f6' },
  { id: 'aggressive'  as const, label: 'Agresivo',    risk: 1500, reward: 1500, color: '#f59e0b' },
  { id: 'ultra'        as const, label: 'Ultra',       risk: 2000, reward: 1500, color: '#ef4444' },
];

export type TopstepStrategyId = typeof TOPSTEP_STRATEGIES[number]['id'];

export interface StrategyComparisonResult {
  id: TopstepStrategyId;
  label: string;
  risk: number;
  reward: number;
  color: string;
  winRateBreakEven: number;
  maxLossesBeforeBlow: number;
  avgPassed: number;
  p50: number;
  expectedNetPnl: number;
  avgVisitsToPass: number;
}

function simulateAccountOutcome(
  winRate: number,
  risk: number,
  reward: number,
  startingBalance: number,
  targetProfit: number,
  maxDrawdown: number,
  minTradingDays: number,
  maxVisits: number,
): { passed: boolean; visitsUsed: number } {
  let balance = startingBalance;
  let maxEodBalance = startingBalance;
  let trailingFloor = startingBalance - maxDrawdown;
  let netPnl = 0;
  let maxDayPnl = 0;
  let tradingDays = 0;
  let targetReached = false;

  for (let visit = 0; visit < maxVisits; visit++) {
    tradingDays++;

    if (targetReached) {
      if (tradingDays >= minTradingDays) return { passed: true, visitsUsed: tradingDays };
      continue;
    }

    const win = Math.random() < winRate;
    if (win) {
      netPnl += reward;
      balance += reward;
      if (reward > maxDayPnl) maxDayPnl = reward;
      if (balance > maxEodBalance) {
        maxEodBalance = balance;
        trailingFloor = maxEodBalance - maxDrawdown;
      }
    } else {
      netPnl -= risk;
      balance -= risk;
      if (balance <= trailingFloor) return { passed: false, visitsUsed: tradingDays };
    }

    const consistencyOk = netPnl <= 0 || maxDayPnl / netPnl <= 0.5;
    if (netPnl >= targetProfit && consistencyOk) {
      targetReached = true;
      if (tradingDays >= minTradingDays) return { passed: true, visitsUsed: tradingDays };
    }
  }

  return { passed: false, visitsUsed: tradingDays };
}

export function compareStrategies(
  winRate: number,
  numAccounts: number,
  iterations: number,
  challengeCost: number,
  activationFee: number,
  fundedValue: number,
): StrategyComparisonResult[] {
  const startingBalance = 50_000;
  const targetProfit = 3_000;
  const maxDrawdown = 2_000;
  const minTradingDays = 5;
  const maxVisits = 20;

  return TOPSTEP_STRATEGIES.map((strategy) => {
    const passedPerIteration: number[] = [];
    let totalVisitsToPass = 0;
    let totalPassedAccounts = 0;

    for (let iter = 0; iter < iterations; iter++) {
      let passedThisIter = 0;
      for (let acc = 0; acc < numAccounts; acc++) {
        const { passed, visitsUsed } = simulateAccountOutcome(
          winRate, strategy.risk, strategy.reward,
          startingBalance, targetProfit, maxDrawdown, minTradingDays, maxVisits,
        );
        if (passed) {
          passedThisIter++;
          totalVisitsToPass += visitsUsed;
          totalPassedAccounts++;
        }
      }
      passedPerIteration.push(passedThisIter);
    }

    const sortedPassed = [...passedPerIteration].sort((a, b) => a - b);
    const avgPassed = passedPerIteration.reduce((a, b) => a + b, 0) / iterations;
    const p50 = getPercentile(sortedPassed, 0.5);

    const totalChallengeCost = numAccounts * challengeCost;
    const expectedActivationCost = avgPassed * activationFee;
    const expectedRevenue = avgPassed * fundedValue;
    const expectedNetPnl = expectedRevenue - totalChallengeCost - expectedActivationCost;

    return {
      id: strategy.id,
      label: strategy.label,
      risk: strategy.risk,
      reward: strategy.reward,
      color: strategy.color,
      winRateBreakEven: strategy.risk / (strategy.risk + strategy.reward),
      maxLossesBeforeBlow: Math.floor(maxDrawdown / strategy.risk),
      avgPassed,
      p50,
      expectedNetPnl,
      avgVisitsToPass: totalPassedAccounts > 0 ? totalVisitsToPass / totalPassedAccounts : 0,
    };
  });
}

// Distribución binomial analítica P(X=k) = C(n,k) * p^k * (1-p)^(n-k)
export function binomialDistribution(n: number, p: number): number[] {
  function comb(a: number, b: number): number {
    if (b === 0 || b === a) return 1;
    let result = 1;
    for (let i = 0; i < b; i++) {
      result = (result * (a - i)) / (i + 1);
    }
    return result;
  }

  return Array.from({ length: n + 1 }, (_, k) => {
    return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  });
}
