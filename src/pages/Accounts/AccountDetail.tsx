import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAccountDetail } from '@/hooks/useAccounts';
import { useTrades } from '@/hooks/useTrades';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import {
  ArrowLeft,
  Activity,
  Loader2,
  AlertCircle,
  TrendingDown,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Percent,
  Scale,
  Sparkles,
  Coins,
  Briefcase,
  Landmark,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EvaluationPanel from '@/components/accounts/EvaluationPanel';
import { TradesList } from './TradesList';
import { AccountPhaseSelector } from './AccountPhaseSelector';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';
import { AccountWithDrawals } from './AccountWithDrawals';
import { AccountEquityChart } from './AccountEquityChart';
import { AccountOperationsByAsset } from './AccountOperationsByAsset';


export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentBalance, 
    equity, 
    pnlNeto, 
    setAccountData,
    equityPoints,
    profitFactor,
    avgRR,
    winRate,
    winningTradesCount,
    losingTradesCount,
    totalTradesCount,
    minVal,
    maxVal,
    phaseTrades,
    totalNetWithdrawals,
    maxLossStreak,
    maxWinStreak,
    avgLoss,
    avgWin,
    roi
  } = useAccountDetailStore();

  
  
  const { data: account, isLoading: accountLoading, error: accountError } = useAccountDetail(id);
  const { data: trades = [], isLoading: tradesLoading } = useTrades(id);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals(id);
  
  useEffect(() => {
    if(account && account.phase) {
      setAccountData(account, trades, withdrawals, account.phase);
    }
  }, [account?.id, trades.length, withdrawals.length])
  

  const loading = accountLoading || tradesLoading || withdrawalsLoading;

  const error = accountError ? 'No se pudo cargar la cuenta. Verifica tu conexión.' : (account === null && !accountLoading ? 'La cuenta no existe.' : null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="size-8 animate-spin text-indigo-500" />
        <p className="text-slate-500 text-sm">Cargando cuenta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="size-8 text-rose-500" />
        <p className="text-rose-500 font-semibold">{error}</p>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-2 text-indigo-500 hover:underline text-sm"
        >
          Volver a Mis Cuentas
        </button>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold text-slate-700">Cuenta no encontrada</h2>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-4 text-indigo-500 hover:underline"
        >
          Volver a Mis Cuentas
        </button>
      </div>
    );
  }

  const isFunded = account.status === 'Funded';
  const isBlown = account.status === 'Blown';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/accounts"
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              {account.name}
              <Badge variant={isFunded ? 'success' : isBlown ? 'destructive' : account.status === 'Real' ? 'default' : 'info'}>
                {account.status === 'Real' ? 'Real' : account.status}
              </Badge>
            </h1>
            <p className="text-sm text-slate-500">
              {account.firm} • Creada el {new Date(account.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Phase Selector Tabs */}
        {account.status !== 'Real' && <AccountPhaseSelector account={account} />}
      </div>

      {/* Panel de Evaluación (Condicional) */}
      {account.status !== 'Real' && <EvaluationPanel account={account} />}

      {/* Grid de Métricas Clave al estilo Dashboard */}
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

      {/* Tabs Principales de Visualización de Cuenta */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <TabsList className="p-0 bg-transparent gap-2 h-auto">
            <TabsTrigger
              value="overview"
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-bold"
            >
              <Activity className="size-4 mr-1.5" />
              Vista General
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-bold"
            >
              <Scale className="size-4 mr-1.5" />
              Estadísticas Operativas
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-bold"
            >
              <Briefcase className="size-4 mr-1.5" />
              Operaciones ({phaseTrades.length})
            </TabsTrigger>
            {(account.status === 'Real' || account.status === 'Funded') && (
              <TabsTrigger
                value="withdrawals"
                className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-emerald-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition-all font-bold"
              >
                <Landmark className="size-4 mr-1.5" />
                Retiros ({withdrawals.length})
              </TabsTrigger>
            )}
          </TabsList>

          <span className="hidden sm:inline-flex items-center text-xs text-indigo-400 font-semibold select-none">
            <Sparkles className="size-3 mr-1 animate-pulse" />
            Actualización Activa
          </span>
        </div>

        {/* TAB 1: VISTA GENERAL (Gráfico Equity + Distribución por Activos) */}
        <TabsContent value="overview" className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-6">

          {/* Gráfico de Equity Dinámico */}
          <AccountEquityChart account={account} equityPoints={equityPoints} pnlNeto={pnlNeto} />

          {/* Operativa por Activo */}
          <AccountOperationsByAsset />
        </TabsContent>

        {/* TAB 2: METRICAS OPERATIVAS AVANZADAS */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {/* Métricas de Eficiencia */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-500" />
                  Métricas de Eficiencia
                </CardTitle>
                <CardDescription>Comparativa entre ganancias y pérdidas promedio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-455">Trade Ganador Prom.</span>
                    <p className="text-lg font-bold text-emerald-500 font-mono">
                      +${avgWin.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-455">Trade Perdedor Prom.</span>
                    <p className="text-lg font-bold text-rose-500 font-mono">
                      -${avgLoss.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-455">
                    <span>Proporción de Eficacia (Wins / Losses)</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {winRate}% efectividad
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${winRate}%` }} />
                    <div className="h-full bg-rose-550/80 transition-all" style={{ width: `${100 - winRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control de Riesgos */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-amber-500" />
                  Control de Riesgos
                </CardTitle>
                <CardDescription>Rachas consecutivas y drawdown dinámico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <span className="text-xs text-slate-400 block mb-1">Racha Ganadora Máx</span>
                    <strong className="text-lg font-extrabold text-slate-850 dark:text-white">
                      {maxWinStreak} trades
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <span className="text-xs text-slate-400 block mb-1">Racha Perdedora Máx</span>
                    <strong className="text-lg font-extrabold text-slate-850 dark:text-white">
                      {maxLossStreak} trades
                    </strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450">Pérdida Neto Neto</span>
                    <span className={cn("font-bold font-mono", pnlNeto < 0 ? "text-rose-500" : "text-emerald-500")}>
                      {pnlNeto < 0 ? `-$${Math.abs(pnlNeto).toLocaleString()}` : `+$${pnlNeto.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pnlNeto < 0 ? "bg-rose-500/80" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(Math.abs(pnlNeto) / (account.startingBalance * 0.1 || 1) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-right font-medium">Drawdown actual relativo a Balance Inicial</span>
                </div>
              </CardContent>
            </Card>

            {/* Resumen Financiero Completo */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Coins className="size-4 text-blue-500" />
                  Métricas de Capital
                </CardTitle>
                <CardDescription>Resumen de costos de cuenta, retiros y pnl final.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Balance Inicial</span>
                    <strong className="text-sm font-extrabold text-slate-750 dark:text-slate-200">
                      ${account.startingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Costo Compra</span>
                    <strong className="text-sm font-extrabold text-slate-750 dark:text-slate-200">
                      ${account.cost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Retiros (Brutos)</span>
                    <strong className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
                      ${account.totalWithdrawals.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Retiros (Netos)</span>
                    <strong className="text-sm font-extrabold text-emerald-500">
                      ${totalNetWithdrawals.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ROI (Neto)</span>
                    <strong className={cn("text-sm font-extrabold", totalNetWithdrawals >= account.cost ? "text-emerald-500" : "text-amber-500")}>
                      {roi}%
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">PnL Neto</span>
                    <strong className={cn("text-sm font-extrabold", pnlNeto >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {pnlNeto >= 0 ? '+' : ''}${pnlNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: HISTORIAL DE OPERACIONES (Tabla de TanStack) */}
        <TabsContent value="activity" className="mt-6">
          <TradesList />
        </TabsContent>

        {/* TAB 4: RETIROS */}
        {(account.status === 'Real' || account.status === 'Funded') && (
          <TabsContent value="withdrawals" className="mt-6">
              <AccountWithDrawals />
          </TabsContent>
        )}
      </Tabs>
                  
    </div>
  );
}

