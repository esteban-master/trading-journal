import { describe, it, expect } from 'vitest';
import { Trade } from '@/types';
import {
  computeAvgHoldingMinutes,
  formatDuration,
  computeSessionDistribution,
  guessSession,
  computeExpectancy,
} from './tradeStats';

let id = 0;
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: `t${id++}`,
    userId: 'u1',
    accountId: 'a1',
    asset: 'NQ',
    direction: 'Long',
    entryPrice: 1,
    exitPrice: 2,
    pnl: 0,
    strategy: '',
    riskRewardRatio: 2,
    images: [],
    date: '2026-06-14T10:00:00',
    status: 'Closed',
    ...overrides,
  };
}

describe('computeAvgHoldingMinutes', () => {
  it('returns null when no trade has exitDate', () => {
    expect(computeAvgHoldingMinutes([makeTrade()])).toBeNull();
  });

  it('averages duration over trades with entry+exit', () => {
    const trades = [
      makeTrade({ date: '2026-06-14T10:00:00', exitDate: '2026-06-14T10:30:00' }), // 30 min
      makeTrade({ date: '2026-06-14T11:00:00', exitDate: '2026-06-14T12:30:00' }), // 90 min
      makeTrade({ date: '2026-06-14T09:00:00' }), // sin cierre → ignorado
    ];
    expect(computeAvgHoldingMinutes(trades)).toBe(60);
  });

  it('ignores negative durations', () => {
    const trades = [makeTrade({ date: '2026-06-14T12:00:00', exitDate: '2026-06-14T11:00:00' })];
    expect(computeAvgHoldingMinutes(trades)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(null)).toBe('—');
  });
});

describe('computeSessionDistribution', () => {
  it('returns empty when no sessions tagged', () => {
    expect(computeSessionDistribution([makeTrade()])).toEqual([]);
  });

  it('computes percentages over tagged trades', () => {
    const trades = [
      makeTrade({ session: 'NewYork' }),
      makeTrade({ session: 'NewYork' }),
      makeTrade({ session: 'London' }),
      makeTrade({}), // sin sesión → no cuenta en el total
    ];
    const dist = computeSessionDistribution(trades);
    expect(dist[0]).toEqual({ session: 'NewYork', count: 2, percent: (2 / 3) * 100 });
    expect(dist.find(d => d.session === 'London')?.percent).toBeCloseTo((1 / 3) * 100, 5);
  });
});

describe('guessSession', () => {
  it('maps local hour to a session', () => {
    expect(guessSession('2026-06-14T10:00:00')).toBe('London');
    expect(guessSession('2026-06-14T15:00:00')).toBe('NewYork');
    expect(guessSession('2026-06-14T03:00:00')).toBe('Asia');
    expect(guessSession('2026-06-14T23:00:00')).toBe('Asia');
  });
});

describe('computeExpectancy', () => {
  it('returns 0 with no closed trades', () => {
    expect(computeExpectancy([])).toBe(0);
  });

  it('computes expected $ per trade', () => {
    // 2 wins de +200, 2 losses de -100 → winRate 0.5, avgWin 200, avgLoss 100
    const trades = [
      makeTrade({ pnl: 200 }),
      makeTrade({ pnl: 200 }),
      makeTrade({ pnl: -100 }),
      makeTrade({ pnl: -100 }),
    ];
    // 0.5*200 - 0.5*100 = 50
    expect(computeExpectancy(trades)).toBe(50);
  });
});
