import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { useRiskStore } from '@/store/useRiskStore';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';
import { calculateNextRisk, calculateConsecutiveLosses } from '@/lib/risk';
import { Trade } from '@/types';

interface RiskAdvisorCardProps {
  trades: Trade[];
}

export function RiskAdvisorCard({ trades }: RiskAdvisorCardProps) {
  const { settings: globalSettings } = useRiskStore();
  const { account } = useAccountDetailStore();
  
  const activeSettings = useMemo(() => {
    return {
      baseRiskPercent: account?.baseRiskPercent ?? globalSettings.baseRiskPercent,
      lossMultiplier: account?.lossMultiplier ?? globalSettings.lossMultiplier,
    };
  }, [account?.baseRiskPercent, account?.lossMultiplier, globalSettings]);

  const recommendedNextRisk = useMemo(() => {
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return calculateNextRisk(sortedTrades, activeSettings);
  }, [trades, activeSettings]);
  
  const currentStreak = useMemo(() => {
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return calculateConsecutiveLosses(sortedTrades);
  }, [trades]);
  
  const isIncreasedRisk = currentStreak > 0;

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-200/40 dark:shadow-black/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group">
      {/* Decorative gradient overlay */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity rounded-full pointer-events-none ${isIncreasedRisk ? 'bg-orange-500' : 'bg-emerald-500'}`} />

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Asesor de Riesgo</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Calculado sobre tu racha actual</p>
        </div>
        <div className={`p-3 rounded-xl shadow-inner ${isIncreasedRisk ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
          {isIncreasedRisk ? <AlertTriangle size={24} className="animate-pulse" /> : <CheckCircle size={24} />}
        </div>
      </div>

      <div className="flex flex-col gap-5 relative z-10">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Riesgo Recomendado</span>
            {account && typeof account.currentBalance === 'number' && (
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                Arriesgar: <span className="text-slate-800 dark:text-slate-200">${((account.currentBalance * recommendedNextRisk) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
              </span>
            )}
          </div>
          <span className={`text-3xl font-black tracking-tight ${isIncreasedRisk ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {recommendedNextRisk.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center justify-between px-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Racha de Pérdidas</span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
            <span className="text-sm font-bold text-red-700 dark:text-red-400">{currentStreak}</span>
            {currentStreak > 0 && <TrendingDown size={14} className="text-red-600 dark:text-red-400" />}
          </div>
        </div>

        <div className="mt-3 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isIncreasedRisk ? 'bg-orange-500 shadow-orange-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
            <span className={`text-sm font-bold ${isIncreasedRisk ? 'text-orange-700 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {isIncreasedRisk ? 'Riesgo Aumentado por Recuperación' : 'Riesgo Base'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>Base: <strong className="text-gray-700 dark:text-gray-300">{activeSettings.baseRiskPercent}%</strong></span>
            <span>•</span>
            <span>Multiplicador: <strong className="text-gray-700 dark:text-gray-300">{activeSettings.lossMultiplier}x</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
