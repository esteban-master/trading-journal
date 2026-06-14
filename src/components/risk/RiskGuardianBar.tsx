import { useEffect, useMemo, useState } from 'react';
import { Shield, ShieldAlert, Lock, Timer, ChevronRight, Unlock } from 'lucide-react';
import { Account, Trade } from '@/types';
import { computeAccountRiskStatus, classifyStreak, buildStreakReference, RiskLight, RuleStatus } from '@/lib/riskGuardian';
import { StreakVerdict } from '@/types';
import { useRiskGuardianStore } from '@/store/useRiskGuardianStore';
import { RiskGuardianExplanationModal } from './RiskGuardianExplanationModal';

interface RiskGuardianBarProps {
  account: Account;
  trades: Trade[];
  winRate: number;
  avgRR: number;
  maxDrawdownLimitPercent?: number;
  onOpenTiltGuard?: () => void;
}

const VERDICT_CHIP: Record<StreakVerdict, { cls: string; label: string }> = {
  noise: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Ruido' },
  elevated: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Elevada' },
  anomaly: { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', label: 'Anómala' },
};

const LIGHT_DOT: Record<RiskLight, string> = {
  green: 'bg-emerald-500 shadow-emerald-500/50',
  yellow: 'bg-amber-500 shadow-amber-500/50',
  red: 'bg-rose-500 shadow-rose-500/50',
};

const LIGHT_TEXT: Record<RiskLight, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  red: 'text-rose-600 dark:text-rose-400',
};

const OVERALL_LABEL: Record<RiskLight, string> = {
  green: 'Operativa saludable',
  yellow: 'Precaución',
  red: 'Zona de peligro',
};

function formatRuleValue(rule: RuleStatus): string {
  switch (rule.key) {
    case 'dailyLoss':
      return `${rule.value.toFixed(2)}% / ${rule.limit}%`;
    case 'drawdown':
      return `${rule.value.toFixed(1)}% / ${rule.limit}%`;
    case 'profitLock':
      return `${rule.value.toFixed(2)}% / ${rule.limit}%`;
    default: // maxTrades, lossStreak
      return `${rule.value} / ${rule.limit}`;
  }
}

export function RiskGuardianBar({ account, trades, winRate, avgRR, maxDrawdownLimitPercent, onOpenTiltGuard }: RiskGuardianBarProps) {
  const { getSession, setLockout, setDeRisk } = useRiskGuardianStore();
  const session = getSession(account.id);

  const status = useMemo(
    () => computeAccountRiskStatus(account, trades, new Date(), maxDrawdownLimitPercent),
    [account, trades, maxDrawdownLimitPercent]
  );

  // Árbitro estadístico en vivo (memoizado: la simulación solo re-corre si cambian winrate/RR/ajustes)
  const activeSettings = useMemo(() => ({
    baseRiskPercent: account.baseRiskPercent ?? 0.55,
    lossMultiplier: account.lossMultiplier ?? 1.2,
    enableEquityScaling: account.enableEquityScaling ?? true,
    maxRiskPercent: account.maxRiskPercent ?? 2.8,
  }), [account.baseRiskPercent, account.lossMultiplier, account.enableEquityScaling, account.maxRiskPercent]);

  const closedCount = useMemo(
    () => trades.filter(t => t.status === 'Closed' || t.exitPrice !== undefined).length,
    [trades]
  );

  const streakRef = useMemo(
    () => buildStreakReference(closedCount, winRate, avgRR, activeSettings, account.startingBalance),
    [closedCount, winRate, avgRR, activeSettings, account.startingBalance]
  );

  const classification = useMemo(
    () => classifyStreak(status.consecutiveLosses, status.currentDrawdownPercent, streakRef),
    [status.consecutiveLosses, status.currentDrawdownPercent, streakRef]
  );

  // Tick para el countdown del cooldown
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session.cooldownUntil) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [session.cooldownUntil]);

  const cooldownRemainingMs = session.cooldownUntil ? session.cooldownUntil - Date.now() : 0;
  const cooldownActive = cooldownRemainingMs > 0;
  const deRiskActive = session.deRiskFactor < 1;
  const lockoutActive = session.manualLockout || status.lockoutSuggested;

  const cooldownLabel = useMemo(() => {
    if (!cooldownActive) return '';
    const totalSec = Math.ceil(cooldownRemainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [cooldownActive, cooldownRemainingMs]);

  const overall: RiskLight = lockoutActive ? 'red' : status.overall;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative p-2.5 rounded-xl ${overall === 'red' ? 'bg-rose-100 dark:bg-rose-500/20' : overall === 'yellow' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/20'}`}>
            {overall === 'red'
              ? <ShieldAlert className={`size-5 ${LIGHT_TEXT.red} ${lockoutActive ? 'animate-pulse' : ''}`} />
              : <Shield className={`size-5 ${LIGHT_TEXT[overall]}`} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">Centinela de Riesgo</h3>
              <RiskGuardianExplanationModal account={account} />
              <span className={`w-2 h-2 rounded-full shadow-sm ${LIGHT_DOT[overall]}`} />
              <span className={`text-xs font-semibold ${LIGHT_TEXT[overall]}`}>{OVERALL_LABEL[overall]}</span>
              {status.consecutiveLosses > 0 && (
                <span
                  title={classification.message}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-help ${VERDICT_CHIP[classification.verdict].cls}`}
                >
                  Racha {status.consecutiveLosses}: {VERDICT_CHIP[classification.verdict].label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              P&L hoy:{' '}
              <strong className={status.dailyPnl < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                {status.dailyPnl < 0 ? '-' : '+'}${Math.abs(status.dailyPnl).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </strong>{' '}
              ({status.dailyPnlPercent.toFixed(2)}%) · {status.tradesToday} trades · Racha: {status.consecutiveLosses}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTiltGuard}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          Abrir Centinela
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* Semáforo de reglas */}
      {status.rules.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {status.rules.map(rule => (
            <div
              key={rule.key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
            >
              <span className={`w-2 h-2 rounded-full ${LIGHT_DOT[rule.light]}`} />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{rule.label}</span>
              <span className={`text-[11px] font-bold ${LIGHT_TEXT[rule.light]}`}>{formatRuleValue(rule)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Avisos de estado de sesión */}
      {(lockoutActive || cooldownActive || deRiskActive || status.profitLockReached) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          {lockoutActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              <Lock className="size-3" /> Día bloqueado · no operar
            </span>
          )}
          {cooldownActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Timer className="size-3" /> Cooldown {cooldownLabel}
            </span>
          )}
          {deRiskActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              Riesgo reducido ×{session.deRiskFactor}
            </span>
          )}
          {status.profitLockReached && !lockoutActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              Objetivo diario alcanzado · protege la ganancia
            </span>
          )}

          {/* Controles manuales */}
          <div className="ml-auto flex items-center gap-2">
            {session.manualLockout ? (
              <button
                onClick={() => setLockout(account.id, false)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <Unlock className="size-3" /> Desbloquear
              </button>
            ) : (
              <button
                onClick={() => setLockout(account.id, true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
              >
                <Lock className="size-3" /> Bloquear día
              </button>
            )}
            {deRiskActive && (
              <button
                onClick={() => setDeRisk(account.id, 1)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Quitar de-risk
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
