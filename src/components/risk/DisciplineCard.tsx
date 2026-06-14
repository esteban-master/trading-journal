import { useMemo } from 'react';
import { Brain, Target, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade } from '@/types';
import { computeDisciplineMetrics } from '@/lib/riskGuardian';
import { cn } from '@/lib/utils';

const EMOTION_LABELS: Record<string, string> = {
  Calm: 'Tranquilo',
  Confident: 'Confiado',
  Anxious: 'Ansioso',
  FOMO: 'FOMO',
  Revenge: 'Revancha',
  Bored: 'Aburrido',
};

function money(v: number): string {
  return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DisciplineCard({ trades }: { trades: Trade[] }) {
  const m = useMemo(() => computeDisciplineMetrics(trades), [trades]);

  const hasData = m.scoredCount > 0 || m.planTaggedCount > 0 || m.emotionBreakdown.length > 0;

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Brain className="size-4 text-rose-500" />
          Disciplina y Psicología
        </CardTitle>
        <CardDescription>Proceso por encima del resultado: adherencia al plan y P&L emocional.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {!hasData ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            Aún no hay datos de disciplina. Registra trades con estado emocional y adherencia al plan.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
                  <Target className="size-3.5" /> Disciplina media
                </span>
                <strong className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {m.scoredCount > 0 ? `${m.avgDisciplineScore.toFixed(1)} / 5` : '—'}
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">Seguí el plan</span>
                <strong className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {m.planTaggedCount > 0 ? `${Math.round(m.followedPlanRate)}%` : '—'}
                </strong>
              </div>
            </div>

            {/* Plan vs fuera de plan */}
            {m.planTaggedCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">P&L siguiendo el plan</span>
                  <span className={cn('font-bold font-mono', m.planPnl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{money(m.planPnl)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">P&L fuera del plan</span>
                  <span className={cn('font-bold font-mono', m.offPlanPnl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{money(m.offPlanPnl)}</span>
                </div>
              </div>
            )}

            {/* Trades de revancha */}
            {m.revengeCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Flame className="size-3.5" /> {m.revengeCount} trade{m.revengeCount > 1 ? 's' : ''} de revancha
                </span>
                <span className={cn('text-sm font-bold font-mono', m.revengePnl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{money(m.revengePnl)}</span>
              </div>
            )}

            {/* Desglose por emoción */}
            {m.emotionBreakdown.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">P&L por emoción</span>
                {m.emotionBreakdown.map(e => (
                  <div key={e.emotion} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      {EMOTION_LABELS[e.emotion] ?? e.emotion} <span className="text-slate-400">({e.count})</span>
                    </span>
                    <span className={cn('font-bold font-mono', e.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>{money(e.pnl)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
