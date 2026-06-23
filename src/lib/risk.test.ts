import { describe, it, expect } from 'vitest';
import { calculateNextRisk, calculateConsecutiveLosses, resolveRiskProfile } from './risk';
import { Trade } from '@/types';

// Mock function to easily create trades
const createTrade = (dateStr: string, pnl: number, status: 'Closed' | 'Open' = 'Closed'): Trade => ({
  id: Math.random().toString(36).substring(7),
  date: dateStr,
  asset: 'EURUSD',
  direction: 'Long',
  entryPrice: 1.0,
  exitPrice: 1.1,
  pnl,
  status,
  userId: '',
  accountId: '',
  strategy: '',
  riskRewardRatio: 0,
  images: []
});

describe('Risk Management Strategy Simulation (20 Trades)', () => {
  const settings = {
    baseRiskPercent: 0.55,
    lossMultiplier: 1.20,
    enableEquityScaling: true,
    maxRiskPercent: 2.80,
  };

  it('Scenario 1: Losing streak should correctly apply loss multiplier and cap at maxRisk', () => {
    // 8 consecutive losses
    const trades: Trade[] = [
      createTrade('2026-05-01', -100), // Streak: 1
      createTrade('2026-05-02', -100), // Streak: 2
      createTrade('2026-05-03', -100), // Streak: 3
      createTrade('2026-05-04', -100), // Streak: 4
      createTrade('2026-05-05', -100), // Streak: 5
      createTrade('2026-05-06', -100), // Streak: 6
      createTrade('2026-05-07', -100), // Streak: 7
      createTrade('2026-05-08', -100), // Streak: 8
    ];

    expect(calculateConsecutiveLosses(trades)).toBe(8);

    // Let's check the progression manually:
    // Loss 1: 0.55 * (1.20 ^ 1) = 0.66
    // Loss 2: 0.55 * (1.20 ^ 2) = 0.792
    // Loss 8: 0.55 * (1.20 ^ 8) = 2.36
    
    // Test with 0 losses
    const risk0 = calculateNextRisk([], settings).riskPercent;
    expect(risk0).toBe(0.55);

    // Test with 1 loss
    const risk1 = calculateNextRisk([trades[0]], settings).riskPercent;
    expect(risk1).toBe(0.66);

    // Test with 2 losses
    const risk2 = calculateNextRisk(trades.slice(0, 2), settings).riskPercent;
    expect(risk2).toBe(0.79);

    // Test with 8 losses
    const risk8 = calculateNextRisk(trades, settings).riskPercent;
    expect(risk8).toBe(2.36); // 2.36496 -> 2.36

    // Add more losses to hit the cap (2.80)
    trades.push(createTrade('2026-05-09', -100)); // 9
    trades.push(createTrade('2026-05-10', -100)); // 10
    trades.push(createTrade('2026-05-11', -100)); // 11
    
    const risk11 = calculateNextRisk(trades, settings).riskPercent;
    expect(risk11).toBe(2.80); // Capped
  });

  it('Scenario 2: Winning streak and Equity Scaling (Snowball Phase)', () => {
    // Trades that make us $1500 in profit on a 50k account (3% profit)
    const trades: Trade[] = [
      createTrade('2026-05-01', 500),
      createTrade('2026-05-02', 500),
      createTrade('2026-05-03', 500),
    ];

    const currentBalance = 51500;
    const startingBalance = 50000;

    const result = calculateNextRisk(trades, settings, currentBalance, startingBalance);
    
    // Profit % = 3.0%
    // Buffer = 3.0 - 1.0 = 2.0
    // Extra Risk = 2.0 * 0.5 = 1.0%
    // Next risk should be baseRisk (0.55) + Extra Risk (1.0) = 1.55%
    expect(result.riskPercent).toBe(1.55);
  });

  it('Scenario 3: Target Proximity Cap (Evaluation Phase)', () => {
    // Assume we are in an evaluation with 8% target ($4,000 on a $50k account)
    // And we are currently at $53,500 ($3,500 profit, missing $500)
    const targetProximity = {
      isEvaluation: true,
      targetProfitPercentage: 8,
      averageRR: 2,
    };

    const currentBalance = 53500;
    const startingBalance = 50000;
    
    // Flat trade history, no streaks
    const trades: Trade[] = [createTrade('2026-05-01', 3500)];

    const result = calculateNextRisk(trades, settings, currentBalance, startingBalance, targetProximity);

    // Remaining target = $500
    // At 1:2 RR, we need to risk $250 to make $500.
    // $250 risk on $53,500 balance = 0.467% risk.
    // This is lower than the base risk of 0.55%, so it should be capped at 0.47%.

    expect(result.isCappedByTarget).toBe(true);
    expect(result.riskPercent).toBe(0.47);
  });

  it('Scenario 4: Mixed full 20 trades simulation', () => {
    let currentBalance = 50000;
    const startingBalance = 50000;
    const trades: Trade[] = [];
    const risksRecorded: number[] = [];

    // Simulate 20 trades based on a predefined sequence of wins and losses
    const sequence = ['W', 'L', 'L', 'L', 'W', 'W', 'W', 'L', 'L', 'W', 'W', 'L', 'W', 'W', 'W', 'W', 'L', 'L', 'W', 'W'];
    
    // Simple win/loss amounts
    const WIN_AMOUNT = 600; // 1.2% roughly
    const LOSS_AMOUNT = -300; // 0.6% roughly

    for (let i = 0; i < sequence.length; i++) {
      const riskCalc = calculateNextRisk(trades, settings, currentBalance, startingBalance);
      risksRecorded.push(riskCalc.riskPercent);

      const pnl = sequence[i] === 'W' ? WIN_AMOUNT : LOSS_AMOUNT;
      currentBalance += pnl;

      trades.push(createTrade(`2026-05-${(i+1).toString().padStart(2, '0')}`, pnl));
    }

    // Assert specific points in the simulation
    expect(risksRecorded[0]).toBe(0.55); // Trade 1: Base
    expect(risksRecorded[1]).toBe(0.65); // Trade 2: After Win (Scales up because profit > 1%)
    expect(risksRecorded[2]).toBe(0.66); // Trade 3: After 1 Loss
    expect(risksRecorded[3]).toBe(0.79); // Trade 4: After 2 Losses
    expect(risksRecorded[4]).toBe(0.95); // Trade 5: After 3 Losses
    expect(risksRecorded[5]).toBe(0.55); // Trade 6: After Win (Reset)

    // At trade 20, balance is:
    // Wins: 12 * 600 = $7200
    // Losses: 8 * -300 = -$2400
    // Net: $4800 (9.6% profit)
    expect(currentBalance).toBe(54800);
    
    // So the final risk calculation for the 21st trade should be scaled up massively by equity!
    const finalRisk = calculateNextRisk(trades, settings, currentBalance, startingBalance);
    
    // Profit % = 9.6%
    // Buffer = 9.6 - 1.0 = 8.6
    // Extra Risk = 8.6 * 0.5 = 4.3%
    // Next Risk = 0.55 + 4.3 = 4.85%
    // BUT we have maxRiskPercent = 2.80%
    expect(finalRisk.riskPercent).toBe(2.80);
  });
});

describe('Risk Management — Robust Profile (capital real / fondeado)', () => {
  const robustSettings = {
    baseRiskPercent: 0.55,
    lossMultiplier: 1.20,
    enableEquityScaling: true,
    maxRiskPercent: 2.80,
    riskProfile: 'robust' as const,
    robustMaxRiskPercent: 1.5,
    // drawdownDeRiskTiers omitido ⇒ usa defaults: 5%→×0.75, 8%→×0.5, 12%→×0.25
  };

  it('Anti-martingala: tras N pérdidas el riesgo NO sube de base', () => {
    const trades: Trade[] = [
      createTrade('2026-05-01', -100),
      createTrade('2026-05-02', -100),
      createTrade('2026-05-03', -100),
      createTrade('2026-05-04', -100),
      createTrade('2026-05-05', -100),
    ];
    expect(calculateConsecutiveLosses(trades)).toBe(5);
    // En sprint esto sería 0.55 * 1.2^5 = 1.37; en robusto se mantiene en base.
    expect(calculateNextRisk(trades, robustSettings).riskPercent).toBe(0.55);
  });

  it('De-risk por drawdown: reduce por tramos (5/8/12%)', () => {
    // El 7º argumento es currentDrawdownPercent.
    expect(calculateNextRisk([], robustSettings, undefined, undefined, undefined, 1, 3).riskPercent).toBe(0.55); // < primer tramo
    expect(calculateNextRisk([], robustSettings, undefined, undefined, undefined, 1, 6).riskPercent).toBe(0.41); // ×0.75
    expect(calculateNextRisk([], robustSettings, undefined, undefined, undefined, 1, 9).riskPercent).toBe(0.28); // ×0.5
    expect(calculateNextRisk([], robustSettings, undefined, undefined, undefined, 1, 13).riskPercent).toBe(0.14); // ×0.25
  });

  it('Equity scaling topa en robustMaxRiskPercent (1.5%), no en 2.8%', () => {
    // +9.6% de profit: en sprint daría 4.85 → cap 2.8; en robusto cap 1.5.
    const trades: Trade[] = [createTrade('2026-05-01', 4800)];
    const result = calculateNextRisk(trades, robustSettings, 54800, 50000);
    expect(result.riskPercent).toBe(1.5);
  });

  it('resolveRiskProfile mapea estado de cuenta → perfil', () => {
    expect(resolveRiskProfile('Funded')).toBe('robust');
    expect(resolveRiskProfile('Real')).toBe('robust');
    expect(resolveRiskProfile('Payout')).toBe('robust');
    expect(resolveRiskProfile('Evaluation')).toBe('sprint');
    expect(resolveRiskProfile('Demo')).toBe('sprint');
    // Un override explícito siempre gana sobre el estado.
    expect(resolveRiskProfile('Funded', 'sprint')).toBe('sprint');
    expect(resolveRiskProfile('Evaluation', 'robust')).toBe('robust');
    expect(resolveRiskProfile('Funded', 'auto')).toBe('robust');
  });
});
