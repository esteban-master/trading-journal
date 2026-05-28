import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Percent,
  Activity,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';

export default function AccountDetailMetrics() {
  const {
    account,
    pnlNeto,
    currentBalance,
    equity,
    winRate,
    winningTradesCount,
    losingTradesCount,
    totalTradesCount,
    profitFactor,
    avgRR,
    equityPoints,
    minVal,
    maxVal,
  } = useAccountDetailStore();

  if (!account) return null;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Balance & Equity */}
      <Card className="relative overflow-hidden group hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <DollarSign className="size-16 text-indigo-500" />
        </div>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Balance Actual</span>
            <Badge variant={pnlNeto >= 0 ? "success" : "destructive"} className="text-[10px] px-1.5 py-0.5 select-none font-bold">
              {pnlNeto >= 0 ? <TrendingUp className="mr-0.5 size-3" /> : <TrendingDown className="mr-0.5 size-3" />}
              {pnlNeto >= 0 ? '+' : ''}{((pnlNeto / (account.startingBalance || 1)) * 100).toFixed(1)}%
            </Badge>
          </CardDescription>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            ${currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-end justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Equity: ${equity.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>

            {/* Sparkline de Equity */}
            <div className="h-10 w-24 select-none">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
                <path
                  d={
                    equityPoints.length > 2
                      ? `M ${equityPoints.map((pt, idx) => `${(idx / (equityPoints.length - 1)) * 120},${40 - ((pt.balance - minVal) / (maxVal - minVal || 1)) * 30 - 5}`).join(' L ')}`
                      : "M 0 35 Q 30 25, 60 20 T 120 15"
                  }
                  fill="none"
                  stroke="url(#balanceGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor={pnlNeto >= 0 ? "#34d399" : "#f87171"} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-emerald-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </Card>

      {/* Card 2: Win Rate */}
      <Card className="relative overflow-hidden group hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Percent className="size-16 text-emerald-500" />
        </div>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Win Rate</span>
            <Badge variant={winRate >= 50 ? "success" : "warning"} className="text-[10px] px-1.5 py-0.5 font-bold">
              {winningTradesCount} W - {losingTradesCount} L
            </Badge>
          </CardDescription>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            {winRate}%
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total: {totalTradesCount} operaciones
            </span>

            {/* Radial Progress */}
            <div className="relative size-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill="transparent"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="3.5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill="transparent"
                  className={cn(
                    "transition-all duration-500",
                    winRate >= 50 ? "stroke-emerald-500" : "stroke-amber-500"
                  )}
                  strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 15}
                  strokeDashoffset={2 * Math.PI * 15 * (1 - winRate / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                {winRate}%
              </span>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </Card>

      {/* Card 3: Profit Factor */}
      <Card className="relative overflow-hidden group hover:border-blue-500/50 dark:hover:border-blue-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Activity className="size-16 text-blue-500" />
        </div>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Profit Factor</span>
            <Badge
              variant={profitFactor === 'Max' || parseFloat(profitFactor) >= 2.0 ? "success" : parseFloat(profitFactor) >= 1.0 ? "info" : "destructive"}
              className="text-[10px] px-1.5 py-0.5 font-bold"
            >
              {profitFactor === 'Max' || parseFloat(profitFactor) >= 2.0 ? 'Excelente' : parseFloat(profitFactor) >= 1.0 ? 'Saludable' : 'Critico'}
            </Badge>
          </CardDescription>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            {profitFactor}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Objetivo sugerido: &gt; 1.5</span>
              <span className="font-semibold text-blue-500 font-mono">Factor: {profitFactor}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  profitFactor === 'Max' || parseFloat(profitFactor) >= 2.0 ? "bg-emerald-500" : parseFloat(profitFactor) >= 1.0 ? "bg-blue-500" : "bg-rose-500"
                )}
                style={{ width: `${Math.min((parseFloat(profitFactor) || 0) * 40, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </Card>

      {/* Card 4: Riesgo / Beneficio Promedio */}
      <Card className="relative overflow-hidden group hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Scale className="size-16 text-amber-500" />
        </div>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Riesgo / Beneficio Prom.</span>
            <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 font-bold">
              Salud
            </Badge>
          </CardDescription>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            1 : {avgRR}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>R:R Promedio</span>
              <span className="text-amber-500 font-semibold">{parseFloat(avgRR) >= 1.5 ? 'Excelente' : 'Ajustable'}</span>
            </div>
            <div className="flex h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-rose-500/80" style={{ width: `${100 / (1 + parseFloat(avgRR) || 1)}%` }}></div>
              <div className="h-full bg-emerald-500" style={{ width: `${(parseFloat(avgRR) / (1 + parseFloat(avgRR) || 1)) * 100}%` }}></div>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </Card>
    </div>
  );
}
