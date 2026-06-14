import { describe, it, expect } from 'vitest';
import { Account, Trade } from '@/types';
import {
  getDayKey,
  computeAccountRiskStatus,
  classifyStreak,
  recommendActionForStreak,
  heuristicStreakReference,
  getCurrentLossStreak,
  buildStreakReference,
  StreakReference,
} from './riskGuardian';
import { RiskProgressionSettings } from './risk';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc1',
    userId: 'u1',
    name: 'Test',
    firm: 'Topstep',
    status: 'Evaluation',
    cost: 0,
    startingBalance: 50000,
    currentBalance: 50000,
    equity: 50000,
    totalWithdrawals: 0,
    createdAt: '2026-06-01T00:00:00',
    ...overrides,
  };
}

let tradeId = 0;
function makeTrade(pnl: number, date: string, overrides: Partial<Trade> = {}): Trade {
  return {
    id: `t${tradeId++}`,
    userId: 'u1',
    accountId: 'acc1',
    asset: 'NQ',
    direction: 'Long',
    entryPrice: 1,
    exitPrice: 2,
    pnl,
    strategy: '',
    riskRewardRatio: 2,
    images: [],
    date,
    status: 'Closed',
    ...overrides,
  };
}

describe('getDayKey', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(getDayKey(new Date('2026-06-14T10:30:00'))).toBe('2026-06-14');
  });
});

describe('computeAccountRiskStatus', () => {
  const now = new Date('2026-06-14T12:00:00');

  it('counts consecutive losses and turns lossStreak red at threshold', () => {
    const account = makeAccount({ maxConsecutiveLossesLockout: 3 });
    const trades = [
      makeTrade(100, '2026-06-10T09:00:00'),
      makeTrade(-100, '2026-06-14T09:00:00'),
      makeTrade(-100, '2026-06-14T10:00:00'),
      makeTrade(-100, '2026-06-14T11:00:00'),
    ];
    const status = computeAccountRiskStatus(account, trades, now);
    expect(status.consecutiveLosses).toBe(3);
    expect(status.tradesToday).toBe(3);
    expect(status.dailyPnl).toBe(-300);
    const streakRule = status.rules.find(r => r.key === 'lossStreak');
    expect(streakRule?.light).toBe('red');
    expect(status.lockoutSuggested).toBe(true);
  });

  it('flags daily loss limit in red when breached', () => {
    const account = makeAccount({ dailyLossLimitPercent: 0.5 }); // 0.5% de 50000 = 250
    const trades = [makeTrade(-300, '2026-06-14T09:00:00')];
    const status = computeAccountRiskStatus(account, trades, now);
    const rule = status.rules.find(r => r.key === 'dailyLoss');
    expect(rule?.light).toBe('red');
    expect(status.overall).toBe('red');
  });

  it('computes trailing drawdown from peak', () => {
    const account = makeAccount({ maxDrawdownPercentage: 10 });
    const trades = [
      makeTrade(1000, '2026-06-10T09:00:00'), // pico 51000
      makeTrade(-500, '2026-06-14T09:00:00'), // 50500
    ];
    const status = computeAccountRiskStatus(account, trades, now);
    // (51000 - 50500) / 51000 * 100 ≈ 0.98%
    expect(status.currentDrawdownPercent).toBeCloseTo(0.98, 1);
  });
});

describe('classifyStreak', () => {
  const ref: StreakReference = { expectedMedian: 4, expectedWorst: 7, worstDrawdown: 20, source: 'montecarlo' };

  it('returns noise within median', () => {
    expect(classifyStreak(3, 5, ref).verdict).toBe('noise');
  });
  it('returns elevated above median, within worst', () => {
    expect(classifyStreak(5, 5, ref).verdict).toBe('elevated');
  });
  it('returns anomaly beyond worst streak', () => {
    expect(classifyStreak(8, 5, ref).verdict).toBe('anomaly');
  });
  it('returns anomaly when drawdown exceeds worst simulated', () => {
    expect(classifyStreak(3, 25, ref).verdict).toBe('anomaly');
  });
});

describe('recommendActionForStreak', () => {
  it('keeps plan on noise', () => {
    expect(recommendActionForStreak('noise', makeAccount())).toBe('keep_plan');
  });
  it('de-risks on elevated', () => {
    expect(recommendActionForStreak('elevated', makeAccount())).toBe('derisk');
  });
  it('locks out on anomaly for funded accounts', () => {
    expect(recommendActionForStreak('anomaly', makeAccount({ status: 'Funded' }))).toBe('lockout');
  });
  it('de-risks on anomaly for evaluation accounts', () => {
    expect(recommendActionForStreak('anomaly', makeAccount({ status: 'Evaluation' }))).toBe('derisk');
  });
});

describe('getCurrentLossStreak', () => {
  const now = new Date('2026-06-14T12:00:00');
  const trades = [
    makeTrade(-100, '2026-06-12T09:00:00'),
    makeTrade(-100, '2026-06-13T09:00:00'),
    makeTrade(-100, '2026-06-14T09:00:00'),
    makeTrade(-100, '2026-06-14T10:00:00'),
  ];

  it('counts across days by default (allTrades)', () => {
    expect(getCurrentLossStreak(makeAccount(), trades, now)).toBe(4);
  });

  it('counts only today when scope is sameDay', () => {
    expect(getCurrentLossStreak(makeAccount({ streakScope: 'sameDay' }), trades, now)).toBe(2);
  });

  it('resets on a winning trade', () => {
    const withWin = [
      makeTrade(-100, '2026-06-12T09:00:00'),
      makeTrade(200, '2026-06-13T09:00:00'),
      makeTrade(-100, '2026-06-14T09:00:00'),
    ];
    expect(getCurrentLossStreak(makeAccount(), withWin, now)).toBe(1);
  });
});

describe('buildStreakReference', () => {
  const settings: RiskProgressionSettings = {
    baseRiskPercent: 0.5,
    lossMultiplier: 1,
    maxRiskPercent: 2,
    enableEquityScaling: false,
  };

  it('uses the heuristic with few closed trades', () => {
    expect(buildStreakReference(5, 50, 2, settings, 50000).source).toBe('heuristic');
  });

  it('uses Monte Carlo with enough trades and valid stats', () => {
    expect(buildStreakReference(60, 50, 2, settings, 50000).source).toBe('montecarlo');
  });

  it('is deterministic: same inputs produce the same reference', () => {
    const a = buildStreakReference(60, 50, 2, settings, 50000);
    const b = buildStreakReference(60, 50, 2, settings, 50000);
    expect(a).toEqual(b);
  });
});

describe('heuristicStreakReference', () => {
  it('estimates a sane longest streak for 50% winrate', () => {
    const ref = heuristicStreakReference(50, 100);
    expect(ref.source).toBe('heuristic');
    expect(ref.expectedMedian).toBeGreaterThanOrEqual(5);
    expect(ref.expectedMedian).toBeLessThanOrEqual(8);
    expect(ref.expectedWorst).toBe(ref.expectedMedian + 3);
  });
});
