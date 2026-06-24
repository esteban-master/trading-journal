import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RiskProgressionSettings, calculateNextRisk, calculateConsecutiveLosses, DEFAULT_ROBUST_MAX_RISK_PERCENT, DEFAULT_DRAWDOWN_DERISK_TIERS } from '@/lib/risk';
import { Trade } from '@/types';

interface RiskState {
  settings: RiskProgressionSettings;
  setSettings: (settings: Partial<RiskProgressionSettings>) => void;
  getRecommendedRisk: (trades: Trade[]) => number;
  getCurrentStreak: (trades: Trade[]) => number;
}

const defaultSettings: RiskProgressionSettings = {
  baseRiskPercent: 0.55,
  lossMultiplier: 1.20,
  enableEquityScaling: true,
  maxRiskPercent: 2.80,
  // riskProfile ausente ⇒ 'sprint' por defecto (sin contexto de cuenta no aplicamos el robusto).
  robustMaxRiskPercent: DEFAULT_ROBUST_MAX_RISK_PERCENT,
  drawdownDeRiskTiers: DEFAULT_DRAWDOWN_DERISK_TIERS,
};

export const useRiskStore = create<RiskState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      setSettings: (newSettings) => 
        set((state) => ({ 
          settings: { ...state.settings, ...newSettings } 
        })),
      getRecommendedRisk: (trades) => {
        const { settings } = get();
        // Ensure trades are sorted from oldest to newest for accurate calculation
        const sortedTrades = [...trades].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return calculateNextRisk(sortedTrades, settings).riskPercent;
      },
      getCurrentStreak: (trades) => {
        const sortedTrades = [...trades].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return calculateConsecutiveLosses(sortedTrades);
      }
    }),
    {
      name: 'risk-storage', // name of item in local storage
    }
  )
);
