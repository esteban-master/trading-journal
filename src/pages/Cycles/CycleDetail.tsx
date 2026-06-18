import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Target,
  RefreshCw,
  ExternalLink,
  CalendarDays,
  Star,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import { useInvestmentCycleDetail, useUpdateInvestmentCycle } from '@/hooks/useInvestmentCycles';
import { useAccounts } from '@/hooks/useAccounts';
import { useTrades } from '@/hooks/useTrades';
import {
  buildCycleRows,
  getTodayPosition,
  type CycleAccountStatus,
  type AccountCycleRow,
  type TopstepAccountProgress,
} from '@/lib/cycleUtils';
import { TOPSTEP_STRATEGIES } from '@/lib/topstepSimulator';
import type { TopstepStrategyMode } from '@/types';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  CycleAccountStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode; dot: string }
> = {
  pending: {
    label: 'Pendiente',
    color: 'text-muted-foreground',
    bg: 'bg-muted/20',
    icon: <Clock className="size-3.5 text-muted-foreground" />,
    dot: 'bg-muted-foreground',
  },
  day1_won: {
    label: 'Día 1 ✓',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    icon: <Target className="size-3.5 text-amber-400" />,
    dot: 'bg-amber-400',
  },
  blown_day1: {
    label: 'Quemada D1',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    icon: <XCircle className="size-3.5 text-red-400" />,
    dot: 'bg-red-400',
  },
  passed: {
    label: 'Fondeada',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    icon: <CheckCircle2 className="size-3.5 text-emerald-400" />,
    dot: 'bg-emerald-400',
  },
  blown_day2: {
    label: 'Quemada D2',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    icon: <XCircle className="size-3.5 text-orange-400" />,
    dot: 'bg-orange-400',
  },
};

const fmtMoney = (n: number | null) => {
  if (n === null) return '—';
  return n >= 0 ? `+$${Math.abs(n).toLocaleString()}` : `-$${Math.abs(n).toLocaleString()}`;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cycle, isLoading: loadingCycle } = useInvestmentCycleDetail(id);
  const { data: accounts = [] } = useAccounts();
  const { data: allTrades = [] } = useTrades();
  const updateCycle = useUpdateInvestmentCycle();

  const rows = useMemo(() => {
    if (!cycle) return [];
    return buildCycleRows(cycle, accounts, allTrades);
  }, [cycle, accounts, allTrades]);

  const todayPos = cycle ? getTodayPosition(cycle) : null;
  const todayRow = rows.find((r) => r.position === todayPos) ?? null;

  const stats = useMemo(() => {
    const passed = rows.filter((r) => r.cycleStatus === 'passed').length;
    const blown = rows.filter(
      (r) => r.cycleStatus === 'blown_day1' || r.cycleStatus === 'blown_day2'
    ).length;
    const pending = rows.filter(
      (r) => r.cycleStatus === 'pending' || r.cycleStatus === 'day1_won'
    ).length;
    return { passed, blown, pending };
  }, [rows]);

  async function handleComplete() {
    if (!cycle) return;
    await updateCycle.mutateAsync({ id: cycle.id, fields: { status: 'completed' } });
    toast.success('Ciclo marcado como completado');
  }

  async function handleCancel() {
    if (!cycle) return;
    await updateCycle.mutateAsync({ id: cycle.id, fields: { status: 'cancelled' } });
    toast.success('Ciclo cancelado');
  }

  if (loadingCycle) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Ciclo no encontrado</p>
        <Button variant="link" onClick={() => navigate('/ciclos')}>
          Volver a ciclos
        </Button>
      </div>
    );
  }

  let formattedStart = cycle.startDate;
  try {
    formattedStart = format(new Date(cycle.startDate + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es });
  } catch { /* keep raw */ }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ciclos')}
            className="mt-0.5 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{cycle.name}</h1>
              <Badge
                variant="outline"
                className={
                  cycle.status === 'active'
                    ? 'border-indigo-500/50 text-indigo-400'
                    : cycle.status === 'completed'
                    ? 'border-emerald-500/50 text-emerald-400'
                    : 'border-red-500/50 text-red-400'
                }
              >
                {cycle.status === 'active'
                  ? 'Activo'
                  : cycle.status === 'completed'
                  ? 'Completado'
                  : 'Cancelado'}
              </Badge>
              {cycle.strategyMode && (() => {
                const strat = TOPSTEP_STRATEGIES.find((s) => s.id === cycle.strategyMode);
                return strat ? (
                  <Badge
                    variant="outline"
                    style={{ borderColor: `${strat.color}60`, color: strat.color }}
                  >
                    {strat.label} · R${strat.risk >= 1000 ? `${strat.risk / 1000}K` : strat.risk}
                  </Badge>
                ) : null;
              })()}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Inicio: {formattedStart}
            </p>
          </div>
        </div>

        {cycle.status === 'active' && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateCycle.isPending}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={updateCycle.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Marcar completado
            </Button>
          </div>
        )}
      </div>

      {/* ¿Qué operar hoy? */}
      {todayRow && cycle.status === 'active' && (
        <Card className="border-indigo-500/40 bg-indigo-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-indigo-500/20">
                  <Star className="size-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">
                    ¿Qué operar hoy?
                  </p>
                  <p className="text-lg font-bold">{todayRow.account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Posición #{todayRow.position} · {todayRow.account.firm} ·{' '}
                    {STATUS_CFG[todayRow.cycleStatus].label}
                  </p>
                </div>
              </div>
              <Link to={`/accounts/${todayRow.account.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="size-3.5" />
                  Ver cuenta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="size-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Fondeadas</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.passed}</div>
            <div className="text-xs text-muted-foreground">de {rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="size-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Quemadas</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.blown}</div>
            <div className="text-xs text-muted-foreground">de {rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pendientes</span>
            </div>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">de {rows.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de rotación */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="size-4 text-indigo-400" />
            Tabla de Rotación
          </CardTitle>
          <CardDescription className="text-xs">
            Cada cuenta opera en su día asignado. El Día 2 es 10 días después del Día 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 w-12">#</th>
                  <th className="text-left px-3 py-3">Cuenta</th>
                  <th className="text-left px-3 py-3 hidden sm:table-cell">Firma</th>
                  <th className="text-center px-3 py-3">Días</th>
                  <th className="text-center px-3 py-3">Estado</th>
                  <th className="text-right px-3 py-3 hidden md:table-cell">D1 PNL</th>
                  <th className="text-right px-3 py-3 hidden md:table-cell">D2 PNL</th>
                  <th className="text-center px-3 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <RotationRow key={row.position} row={row} strategyMode={cycle.strategyMode} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mini-calendario visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Vista Rápida del Ciclo</CardTitle>
          <CardDescription className="text-xs">
            Estado de cada cuenta en el ciclo de {rows.length} días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {rows.map((row) => {
              const cfg = STATUS_CFG[row.cycleStatus];
              return (
                <Link key={row.position} to={`/accounts/${row.account.id}`}>
                  <div
                    className={`rounded-lg border p-2 text-center transition-all hover:scale-105 cursor-pointer ${
                      row.isToday
                        ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50'
                        : 'border-border hover:border-muted-foreground/50'
                    } ${cfg.bg}`}
                  >
                    <div className="text-[10px] text-muted-foreground mb-1">D{row.position}</div>
                    <div className={`flex justify-center mb-1`}>{cfg.icon}</div>
                    <div className={`text-[9px] font-medium leading-tight ${cfg.color}`}>
                      {cfg.label}
                    </div>
                    {row.isToday && (
                      <div className="text-[9px] text-indigo-400 font-bold mt-0.5">HOY</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Fila de la tabla ─────────────────────────────────────────────────────────
function RotationRow({ row, strategyMode }: { row: AccountCycleRow; strategyMode?: TopstepStrategyMode }) {
  const cfg = STATUS_CFG[row.cycleStatus];
  const tp = row.topstepProgress;

  return (
    <>
      <tr
        className={`transition-colors ${
          tp ? '' : 'border-b border-border/50'
        } ${row.isToday ? 'bg-indigo-500/10' : 'hover:bg-muted/30'}`}
      >
        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{row.position}</td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{row.account.name}</span>
            {tp?.isBlownByDD && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                <ShieldAlert className="size-2.5" /> Blown DD
              </span>
            )}
            {tp?.isPassed && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="size-2.5" /> Fondeada
              </span>
            )}
          </div>
          {row.isToday && (
            <span className="text-[10px] text-indigo-400 font-medium">▶ Hoy</span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">
          {row.account.firm}
        </td>
        <td className="px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>D{row.operationDayFirst}</span>
            <span>/</span>
            <span>D{row.operationDaySecond}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-center">
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
          >
            {cfg.icon}
            <span className="hidden sm:inline">{cfg.label}</span>
          </div>
        </td>
        <td
          className={`px-3 py-3 text-right text-sm font-mono hidden md:table-cell ${
            row.day1Pnl === null
              ? 'text-muted-foreground'
              : row.day1Pnl > 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }`}
        >
          {fmtMoney(row.day1Pnl)}
        </td>
        <td
          className={`px-3 py-3 text-right text-sm font-mono hidden md:table-cell ${
            row.day2Pnl === null
              ? 'text-muted-foreground'
              : row.day2Pnl > 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }`}
        >
          {fmtMoney(row.day2Pnl)}
        </td>
        <td className="px-3 py-3 text-center">
          <Link to={`/accounts/${row.account.id}`}>
            <Button variant="ghost" size="icon" className="size-7">
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        </td>
      </tr>

      {/* Sub-fila métricas Topstep */}
      {tp && <TopstepProgressRow progress={tp} colSpan={8} isToday={row.isToday} strategyMode={strategyMode} />}
    </>
  );
}

// ─── Sub-fila progreso Topstep ────────────────────────────────────────────────
function estimateRemainingDays(
  tp: TopstepAccountProgress,
  risk: number,
  reward: number,
): number | null {
  if (tp.isBlownByDD || tp.isPassed || tp.tradingDays === 0) return null;
  const remaining = tp.targetProfit - tp.cumulativePnl;
  if (remaining <= 0) return 0;
  const ev = tp.impliedWinRate * reward - (1 - tp.impliedWinRate) * risk;
  if (ev <= 0) return null;
  return Math.ceil(remaining / ev);
}

function TopstepProgressRow({
  progress: tp,
  colSpan,
  isToday,
  strategyMode,
}: {
  progress: TopstepAccountProgress;
  colSpan: number;
  isToday: boolean;
  strategyMode?: TopstepStrategyMode;
}) {
  const strat = strategyMode ? TOPSTEP_STRATEGIES.find((s) => s.id === strategyMode) : undefined;

  const ddRoomColor =
    tp.trailingDDRoom > 1000
      ? 'text-emerald-400'
      : tp.trailingDDRoom > 500
      ? 'text-amber-400'
      : 'text-red-400';

  const consColor = tp.isConsistencyOk ? 'text-emerald-400' : 'text-red-400';
  const barColor = tp.isPassed ? '#10b981' : (strat?.color ?? '#6366f1');

  const daysLeft = strat ? estimateRemainingDays(tp, strat.risk, strat.reward) : null;

  // Mostrar máximo 10 días de historial; los más recientes al final
  const visibleDays = tp.dailyResults.slice(-10);

  return (
    <tr
      className={`border-b border-border/50 ${isToday ? 'bg-indigo-500/5' : 'bg-muted/10'}`}
    >
      <td colSpan={colSpan} className="px-4 pb-3 pt-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Chip de estrategia */}
          {strat && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ color: strat.color, backgroundColor: `${strat.color}18` }}
            >
              {strat.label} · R${strat.risk >= 1000 ? `${strat.risk / 1000}K` : strat.risk} · T$1.5K
            </span>
          )}

          {/* Barra de progreso PNL */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[80px]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${tp.progressPct * 100}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-xs font-mono whitespace-nowrap">
              <span className={tp.cumulativePnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {tp.cumulativePnl >= 0 ? '+' : ''}${Math.abs(tp.cumulativePnl).toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / ${tp.targetProfit.toLocaleString()}</span>
            </span>
          </div>

          {/* Historial de días: dots por-día coloreados (win/loss) */}
          <div className="flex items-center gap-1.5">
            {tp.dailyResults.length > 10 && (
              <span className="text-[10px] text-muted-foreground">…</span>
            )}
            <div className="flex gap-0.5">
              {visibleDays.map((d, i) => (
                <div
                  key={i}
                  className="size-2 rounded-full"
                  title={`${d.date}: ${d.pnl >= 0 ? '+' : ''}$${Math.abs(d.pnl).toLocaleString()}`}
                  style={{
                    backgroundColor:
                      d.pnl > 0
                        ? (strat?.color ?? '#818cf8')
                        : d.pnl < 0
                        ? '#ef4444'
                        : '#6b7280',
                  }}
                />
              ))}
              {/* Dots vacíos hasta 5 mínimo */}
              {Array.from({ length: Math.max(0, 5 - tp.tradingDays) }, (_, i) => (
                <div key={`empty-${i}`} className="size-2 rounded-full bg-muted" />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {tp.tradingDays}/5 días
              {tp.tradingDays > 0 && (
                <span className="ml-1">
                  ({tp.winDays}W·{tp.lossDays}L)
                </span>
              )}
            </span>
          </div>

          {/* DD Room */}
          <div className="flex items-center gap-1 text-[11px]">
            {tp.trailingDDRoom <= 500 && <AlertTriangle className="size-3 text-red-400" />}
            <span className="text-muted-foreground">DD Room:</span>
            <span className={`font-semibold ${ddRoomColor}`}>
              ${tp.trailingDDRoom.toLocaleString()}
            </span>
          </div>

          {/* Consistencia */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-muted-foreground">Consistencia:</span>
            <span className={`font-semibold ${consColor}`}>
              {tp.cumulativePnl > 0
                ? `${(tp.consistencyRatio * 100).toFixed(0)}% ${tp.isConsistencyOk ? '✓' : '✗'}`
                : '—'}
            </span>
          </div>

          {/* Proyección de días restantes (solo con estrategia seleccionada) */}
          {strat && !tp.isPassed && !tp.isBlownByDD && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-muted-foreground">Proyección:</span>
              <span className="font-semibold" style={{ color: strat.color }}>
                {daysLeft === null
                  ? 'EV negativo'
                  : daysLeft === 0
                  ? '¡Ya cumplió!'
                  : `~${daysLeft} días más`}
              </span>
              {tp.tradingDays > 0 && (
                <span className="text-muted-foreground">
                  ({(tp.impliedWinRate * 100).toFixed(0)}% W real)
                </span>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
