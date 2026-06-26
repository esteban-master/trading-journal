import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, Lock, MinusCircle } from 'lucide-react';
import { useRiskStore } from '@/store/useRiskStore';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';
import { useRiskGuardianStore } from '@/store/useRiskGuardianStore';
import { calculateNextRisk, calculateConsecutiveLosses, resolveRiskProfile } from '@/lib/risk';
import { computeAccountRiskStatus, getDayKey } from '@/lib/riskGuardian';
import { Trade } from '@/types';
import { RiskExplanationModal } from './RiskExplanationModal';
import { RiskPlaygroundModal } from './RiskPlaygroundModal';
import { ProbabilisticSimulator } from './ProbabilisticSimulator';

interface RiskAdvisorCardProps {
  trades: Trade[];
}

export function RiskAdvisorCard({ trades }: RiskAdvisorCardProps) {
  const { settings: globalSettings } = useRiskStore();
  const { account, avgRR } = useAccountDetailStore();

  // Estado de sesión del Centinela (de-risk / lockout) válido para hoy
  const session = useRiskGuardianStore((s) => (account ? s.sessions[account.id] : undefined));
  const isToday = session?.dayKey === getDayKey(new Date());
  const deRiskFactor = isToday ? session!.deRiskFactor : 1;
  const manualLockout = (session?.lockoutUntil ?? 0) > Date.now();

  const guardStatus = useMemo(
    () => (account ? computeAccountRiskStatus(account, trades) : null),
    [account, trades]
  );
  const isLocked = manualLockout;
  const isDeRisked = deRiskFactor < 1;

  const activeSettings = useMemo(() => {
    return {
      baseRiskPercent: account?.baseRiskPercent ?? globalSettings.baseRiskPercent,
      lossMultiplier: account?.lossMultiplier ?? globalSettings.lossMultiplier,
      enableEquityScaling: account?.enableEquityScaling ?? globalSettings.enableEquityScaling,
      maxRiskPercent: account?.maxRiskPercent ?? globalSettings.maxRiskPercent,
      riskProfile: account ? resolveRiskProfile(account.status, account.riskProfile) : 'sprint',
      robustMaxRiskPercent: account?.robustMaxRiskPercent ?? globalSettings.robustMaxRiskPercent,
      drawdownDeRiskTiers: globalSettings.drawdownDeRiskTiers,
      drawdownDeRiskEnabled: account?.drawdownDeRiskEnabled ?? true,
    };
  }, [
    account?.baseRiskPercent,
    account?.lossMultiplier,
    account?.enableEquityScaling,
    account?.maxRiskPercent,
    account?.status,
    account?.riskProfile,
    account?.robustMaxRiskPercent,
    account?.drawdownDeRiskEnabled,
    globalSettings
  ]);

  const isRobust = activeSettings.riskProfile === 'robust';

  const recommendedNextRiskResult = useMemo(() => {
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return calculateNextRisk(
      sortedTrades,
      activeSettings,
      account?.currentBalance,
      account?.startingBalance,
      {
        isEvaluation: account?.status === 'Evaluation',
        targetProfitPercentage: account?.targetProfitPercentage,
        averageRR: parseFloat(avgRR) || 0,
      },
      deRiskFactor,
      guardStatus?.currentDrawdownPercent
    );
  }, [trades, activeSettings, account?.currentBalance, account?.startingBalance, account?.status, account?.targetProfitPercentage, avgRR, deRiskFactor, guardStatus?.currentDrawdownPercent]);

  const recommendedNextRisk = recommendedNextRiskResult.riskPercent;
  const isCappedByTarget = recommendedNextRiskResult.isCappedByTarget;

  const currentStreak = useMemo(() => {
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return calculateConsecutiveLosses(sortedTrades);
  }, [trades]);

  const isIncreasedRisk = currentStreak > 0;
  const currentDrawdownPercent = guardStatus?.currentDrawdownPercent ?? 0;
  // En perfil robusto el riesgo se REDUCE por tramos de drawdown (default: primer tramo en 5%).
  const isProtectionMode = isRobust && currentDrawdownPercent >= 5;
  // El riesgo solo "sube" en sprint con racha; en robusto nunca escala (anti-martingala).
  const isSprintRecovery = !isRobust && isIncreasedRisk;

  const pnlPercent = account && account.startingBalance ? ((account.currentBalance - account.startingBalance) / account.startingBalance) * 100 : 0;

  // Phase logic
  let riskPhaseLabel = 'Fase 1: Supervivencia';
  let phaseColorClass = 'text-emerald-700 dark:text-emerald-400';
  let phaseDotColor = 'bg-emerald-500 shadow-emerald-500/50';
  let glowColor = 'bg-emerald-500';

  if (isCappedByTarget) {
    riskPhaseLabel = 'Fase 4: Cierre de Prueba';
    phaseColorClass = 'text-purple-700 dark:text-purple-400';
    phaseDotColor = 'bg-purple-500 shadow-purple-500/50';
    glowColor = 'bg-purple-500';
  } else if (isProtectionMode) {
    riskPhaseLabel = 'Modo Protección (Drawdown)';
    phaseColorClass = 'text-rose-700 dark:text-rose-400';
    phaseDotColor = 'bg-rose-500 shadow-rose-500/50';
    glowColor = 'bg-rose-500';
  } else if (isSprintRecovery) {
    riskPhaseLabel = 'Riesgo Aumentado (Recuperación)';
    phaseColorClass = 'text-orange-700 dark:text-orange-400';
    phaseDotColor = 'bg-orange-500 shadow-orange-500/50';
    glowColor = 'bg-orange-500';
  } else if (activeSettings.enableEquityScaling && pnlPercent > 1.0) {
    if (pnlPercent >= 3.0) {
      riskPhaseLabel = 'Fase 3: Snowball (Apalancamiento)';
      phaseColorClass = 'text-indigo-700 dark:text-indigo-400';
      phaseDotColor = 'bg-indigo-500 shadow-indigo-500/50';
      glowColor = 'bg-indigo-500';
    } else {
      riskPhaseLabel = 'Fase 2: Aceleración (Colchón)';
      phaseColorClass = 'text-blue-700 dark:text-blue-400';
      phaseDotColor = 'bg-blue-500 shadow-blue-500/50';
      glowColor = 'bg-blue-500';
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg shadow-gray-200/40 dark:shadow-black/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group">
      {/* Decorative gradient overlay */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity rounded-full pointer-events-none ${glowColor}`} />

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Asesor de Riesgo</h3>
            {account && <RiskExplanationModal account={account} />}
            {account && (
              <span
                title={isRobust ? 'Perfil robusto: anti-martingala + protección por drawdown' : 'Perfil sprint: recuperación agresiva (evaluaciones)'}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isRobust ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
              >
                {isRobust ? 'Robusto' : 'Sprint'}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Calculado sobre tu racha actual</p>
          {(isLocked || isDeRisked) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  <Lock className="size-3" /> Bloqueado por el Centinela
                </span>
              )}
              {isDeRisked && !isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  <MinusCircle className="size-3" /> De-risk ×{deRiskFactor}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl shadow-inner ${isIncreasedRisk ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
          {isIncreasedRisk ? <AlertTriangle size={24} className="animate-pulse" /> : <CheckCircle size={24} />}
        </div>
      </div>

      <div className="flex flex-col gap-5 relative z-10">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Riesgo Recomendado</span>
            {isLocked ? (
              <span className="text-xs font-bold text-rose-500 mt-1">Jornada cerrada · sin nuevas operaciones</span>
            ) : (
              account && typeof account.currentBalance === 'number' && (
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                  Arriesgar: <span className="text-slate-800 dark:text-slate-200">${((account.currentBalance * recommendedNextRisk) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                </span>
              )
            )}
          </div>
          {isLocked ? (
            <span className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">No operar</span>
          ) : (
            <span className={`text-3xl font-black tracking-tight ${isDeRisked ? 'text-orange-600 dark:text-orange-400' : isProtectionMode ? 'text-rose-600 dark:text-rose-400' : isSprintRecovery ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {recommendedNextRisk.toFixed(2)}%
            </span>
          )}
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
            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${phaseDotColor}`} />
            <span className={`text-sm font-bold ${phaseColorClass}`}>
              {riskPhaseLabel}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>Base: <strong className="text-gray-700 dark:text-gray-300">{activeSettings.baseRiskPercent}%</strong></span>
            <span>•</span>
            <span>Máx: <strong className="text-gray-700 dark:text-gray-300">{isRobust ? activeSettings.robustMaxRiskPercent : activeSettings.maxRiskPercent}%</strong></span>
            <span>•</span>
            {isRobust ? (
              <span>Tras pérdida: <strong className="text-gray-700 dark:text-gray-300">base (anti-martingala)</strong></span>
            ) : (
              <span>Mult: <strong className="text-gray-700 dark:text-gray-300">{activeSettings.lossMultiplier}x</strong></span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <RiskPlaygroundModal
            trades={trades}
            account={account}
            activeSettings={activeSettings}
            avgRR={avgRR}
          />
          <ProbabilisticSimulator />
        </div>
      </div>
    </div>
  );
}
