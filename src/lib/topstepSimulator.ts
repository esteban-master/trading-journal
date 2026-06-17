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
