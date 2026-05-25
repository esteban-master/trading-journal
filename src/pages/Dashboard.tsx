import { useState, useEffect } from "react"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  Briefcase,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ShieldAlert,
  Scale,
  Plus,
  Coins,
  Sparkles,
  Loader2
} from "lucide-react"
import { Link } from 'react-router'
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from '@/config/firebase'
import { Account, Trade } from '@/types'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  // Suscripción en tiempo real a las cuentas y trades de Firestore
  useEffect(() => {
    // 1. Suscripción a todas las cuentas
    const qAccounts = query(collection(db, 'accounts'), orderBy('createdAt', 'desc'));
    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      const fetchedAccs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          firm: data.firm,
          status: data.status,
          cost: data.cost ?? 0,
          startingBalance: data.startingBalance ?? 0,
          currentBalance: data.currentBalance ?? 0,
          equity: data.equity ?? data.currentBalance ?? 0,
          totalWithdrawals: data.totalWithdrawals ?? 0,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : data.createdAt ?? new Date().toISOString()
        } as Account;
      });
      setAccounts(fetchedAccs);
    }, (err) => console.error("Error al suscribirse a cuentas:", err));

    // 2. Suscripción a todos los trades
    const qTrades = query(collection(db, 'trades'));
    const unsubTrades = onSnapshot(qTrades, (snap) => {
      const fetchedTrades = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          accountId: data.accountId,
          asset: data.asset,
          direction: data.direction,
          entryPrice: data.entryPrice,
          exitPrice: data.exitPrice,
          pnl: data.pnl,
          strategy: data.strategy ?? '',
          riskRewardRatio: data.riskRewardRatio ?? 0,
          images: data.images ?? [],
          date: data.date instanceof Timestamp 
            ? data.date.toDate().toISOString() 
            : data.date,
          status: data.status
        } as Trade;
      });
      setTrades(fetchedTrades);
      setLoading(false);
    }, (err) => {
      console.error("Error al suscribirse a trades:", err);
      setLoading(false);
    });

    return () => {
      unsubAccounts();
      unsubTrades();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-32 border-slate-100 dark:border-slate-800">
              <CardContent className="h-full flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-slate-350 dark:text-slate-600" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-[350px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-indigo-500" />
        </div>
      </div>
    )
  }

  // --- Caso especial: Sin cuentas creadas ---
  if (accounts.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl size-28 -translate-x-4 -translate-y-4"></div>
          <div className="relative size-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mx-auto">
            <Briefcase className="size-10" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Comienza tu Diario de Trading</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Aún no has registrado ninguna cuenta de trading. Crea tu primera cuenta (evaluación o real) para comenzar a auditar tu rendimiento.
        </p>
        <Link 
          to="/accounts" 
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="size-4" />
          Crear mi Primera Cuenta
        </Link>
      </div>
    )
  }

  // --- CÁLCULOS DE MÉTRICAS GLOBALES ---
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0)
  const totalStartingBalance = accounts.reduce((sum, acc) => sum + acc.startingBalance, 0)

  // Filtrar trades cerrados
  const closedTrades = trades.filter(t => t.status === 'Closed' || t.exitPrice !== undefined)
  const totalTradesCount = closedTrades.length

  const winningTrades = closedTrades.filter(t => t.pnl > 0)
  const losingTrades = closedTrades.filter(t => t.pnl < 0)
  const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0

  // Profit Factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const grossLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0)
  const profitFactor = grossLoss > 0 
    ? (grossProfit / grossLoss).toFixed(2) 
    : (grossProfit > 0 ? 'Max' : '0.00')

  // Riesgo / Beneficio Promedio
  const tradesWithRR = closedTrades.filter(t => t.riskRewardRatio > 0)
  const avgRR = tradesWithRR.length > 0 
    ? (tradesWithRR.reduce((sum, t) => sum + t.riskRewardRatio, 0) / tradesWithRR.length).toFixed(1)
    : '0.0'

  // Cambio neto este mes
  const now = new Date()
  const monthlyPnL = closedTrades.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, t) => sum + (t.pnl || 0), 0)

  // Cambio este mes porcentual del balance total
  const startBalThisMonth = totalBalance - monthlyPnL
  const monthlyPercentChange = startBalThisMonth > 0 ? (monthlyPnL / startBalThisMonth) * 100 : 0

  // Sparkline estático o visual
  const sparklineBalance = "M 0 35 Q 15 25, 30 28 T 60 12 T 90 22 T 120 5"

  // --- CURVA DE EQUITY DINÁMICA ---
  const cronTrades = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const equityPoints = [{ date: 'Inicio', balance: totalStartingBalance }]
  let runningBalance = totalStartingBalance

  cronTrades.forEach(t => {
    runningBalance += t.pnl
    const dateObj = new Date(t.date)
    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    equityPoints.push({
      date: formattedDate,
      balance: runningBalance
    })
  })

  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

  // --- DISTRIBUCIÓN POR ACTIVO ---
  const assetGroups: { [key: string]: { name: string; count: number; wins: number; profit: number; color: string } } = {}
  const colors = ["bg-amber-500", "bg-blue-500", "bg-yellow-600", "bg-purple-500", "bg-indigo-500", "bg-rose-500"]

  closedTrades.forEach(t => {
    const asset = t.asset || 'Desconocido'
    if (!assetGroups[asset]) {
      assetGroups[asset] = {
        name: asset,
        count: 0,
        wins: 0,
        profit: 0,
        color: colors[Object.keys(assetGroups).length % colors.length]
      }
    }
    assetGroups[asset].count += 1
    if (t.pnl > 0) assetGroups[asset].wins += 1
    assetGroups[asset].profit += t.pnl
  })

  const assetSummary = Object.values(assetGroups)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 4)

  const finalAssetSummary = assetSummary.length > 0 ? assetSummary : [
    { name: "NASDAQ", count: 0, wins: 0, profit: 0, color: "bg-purple-500" },
    { name: "Gold", count: 0, wins: 0, profit: 0, color: "bg-yellow-600" }
  ]

  // --- EFICIENCIA, RACHAS Y DRAWDOWN ---
  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0
  const efficiencyRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : (avgWin > 0 ? 'Max' : '0.0')

  let maxWinStreak = 0
  let maxLossStreak = 0
  let currentWinStreak = 0
  let currentLossStreak = 0

  cronTrades.forEach(t => {
    if (t.pnl > 0) {
      currentWinStreak++
      currentLossStreak = 0
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak
    } else if (t.pnl < 0) {
      currentLossStreak++
      currentWinStreak = 0
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak
    }
  })

  // Drawdown Máximo global
  let peak = totalStartingBalance
  let maxDrawdownPercentage = 0
  let runningBalForDD = totalStartingBalance

  cronTrades.forEach(t => {
    runningBalForDD += t.pnl
    if (runningBalForDD > peak) {
      peak = runningBalForDD
    } else if (peak > 0) {
      const drawdown = ((peak - runningBalForDD) / peak) * 100
      if (drawdown > maxDrawdownPercentage) {
        maxDrawdownPercentage = drawdown
      }
    }
  })

  // Historial de Operaciones Recientes (Top 5)
  const recentTrades = [...trades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // Formato del mes actual
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const formattedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)

  // Configuración del gráfico de Shadcn
  const chartConfig = {
    balance: {
      label: "Balance",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  const pfPercent = Math.min((parseFloat(profitFactor) / 4.0) * 100, 100)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl bg-clip-text">
              Dashboard Profesional
            </h1>
            <Badge variant="success" className="h-5 gap-1 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Conectado
            </Badge>
          </div>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm sm:text-base">
            Visión general inteligente y análisis operativo de tu cuenta en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Calendar className="mr-1.5 size-3.5" />
            {formattedMonth}
          </Badge>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
          <span className="text-xs text-slate-455 dark:text-slate-500 font-semibold">Cuentas Activas: {accounts.filter(a => a.status !== 'Blown').length}</span>
        </div>
      </div>

      {/* Grid de Métricas Clave */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Metrica 1: Balance */}
        <Card 
          className="relative overflow-hidden group hover:border-indigo-500/50 dark:hover:border-indigo-500/40"
          onMouseEnter={() => setHoveredMetric("balance")}
          onMouseLeave={() => setHoveredMetric(null)}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="size-16 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Balance Actual</span>
              <Badge variant={monthlyPnL >= 0 ? "success" : "destructive"} className="text-[10px] px-1.5 py-0.5">
                {monthlyPnL >= 0 ? <TrendingUp className="mr-0.5 size-3" /> : <TrendingDown className="mr-0.5 size-3" />}
                {monthlyPercentChange >= 0 ? '+' : ''}{monthlyPercentChange.toFixed(1)}%
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-end justify-between">
              <span className={cn("text-xs font-semibold", monthlyPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {monthlyPnL >= 0 ? '+' : ''}${monthlyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })} este mes
              </span>
              {/* Sparkline SVG */}
              <div className="h-10 w-24">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
                  <path
                    d={sparklineBalance}
                    fill="none"
                    stroke="url(#balanceGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  {hoveredMetric === "balance" && (
                    <circle cx="120" cy="5" r="4" className="fill-emerald-400 animate-pulse" />
                  )}
                </svg>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-emerald-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>

        {/* Metrica 2: Win Rate */}
        <Card 
          className="relative overflow-hidden group hover:border-emerald-500/50 dark:hover:border-emerald-500/40"
          onMouseEnter={() => setHoveredMetric("winrate")}
          onMouseLeave={() => setHoveredMetric(null)}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Percent className="size-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Win Rate Global</span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                {winningTrades.length} ganados
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              {Math.round(winRate)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {winningTrades.length} wins / {losingTrades.length} losses
              </span>
              {/* Radial Circle Progress */}
              <div className="relative size-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="transparent"
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="transparent"
                    className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-500"
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - winRate / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(winRate)}%
                </span>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>

        {/* Metrica 3: Profit Factor */}
        <Card 
          className="relative overflow-hidden group hover:border-blue-500/50 dark:hover:border-blue-500/40"
          onMouseEnter={() => setHoveredMetric("profit")}
          onMouseLeave={() => setHoveredMetric(null)}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="size-16 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Profit Factor</span>
              <Badge variant={parseFloat(profitFactor) >= 1.5 ? "success" : parseFloat(profitFactor) >= 1 ? "info" : "destructive"} className="text-[10px] px-1.5 py-0.5">
                {parseFloat(profitFactor) >= 2.0 ? 'Excelente' : parseFloat(profitFactor) >= 1.0 ? 'Saludable' : 'Pérdida'}
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              {profitFactor}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Objetivo: &gt; 2.0</span>
                <span className="font-semibold text-blue-500">{profitFactor} / 4.0</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${pfPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>

        {/* Metrica 4: Risk Reward */}
        <Card 
          className="relative overflow-hidden group hover:border-amber-500/50 dark:hover:border-amber-500/40"
          onMouseEnter={() => setHoveredMetric("risk")}
          onMouseLeave={() => setHoveredMetric(null)}
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Scale className="size-16 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Ratio R:R Promedio</span>
              <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                {avgRR !== '0.0' ? `1 : ${avgRR}` : 'N/A'}
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              1 : {avgRR}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Distribución Ganador/Perdedor</span>
                <span className="text-amber-500 font-semibold">{winRate >= 50 ? 'Favorable' : 'Riesgoso'}</span>
              </div>
              <div className="flex h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500/80" style={{ width: `${100 - winRate}%` }}></div>
                <div className="h-full bg-emerald-500" style={{ width: `${winRate}%` }}></div>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>
      </div>

      {/* Tabs Principales de Visualización */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
          <TabsList className="p-0 bg-transparent gap-2 h-auto">
            <TabsTrigger 
              value="overview" 
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-semibold cursor-pointer"
            >
              <Activity className="size-4 mr-1.5" />
              Vista General
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-semibold cursor-pointer"
            >
              <Scale className="size-4 mr-1.5" />
              Estadísticas Operativas
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-semibold cursor-pointer"
            >
              <Briefcase className="size-4 mr-1.5" />
              Operaciones Recientes
            </TabsTrigger>
          </TabsList>

          <span className="hidden sm:inline-flex items-center text-xs text-indigo-400 font-semibold animate-pulse">
            <Sparkles className="size-3 mr-1" />
            Actualizado en tiempo real
          </span>
        </div>

        {/* CONTENIDO 1: VISTA GENERAL */}
        <TabsContent value="overview" className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-6">
          {/* Curva de Equity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Curva de Equity (Balance en Tiempo Real)
                </CardTitle>
                <CardDescription>
                  Representación gráfica del crecimiento de capital acumulado de todas las cuentas.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 text-xs font-semibold">
                {totalTradesCount} operaciones registradas
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[260px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/50 rounded-xl p-2 overflow-hidden">
                
                {/* Shadcn Chart de Alta Calidad */}
                {equityPoints.length > 0 ? (
                  <ChartContainer
                    config={chartConfig}
                    className="w-full h-full"
                  >
                    <AreaChart
                      data={equityPoints}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800/60" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={30}
                        className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500"
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        domain={['dataMin - 100', 'dataMax + 100']}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        className="text-[10px] font-bold fill-slate-400"
                        width={60}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => payload[0]?.payload?.date} />}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--color-balance)"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={3}
                        activeDot={{ r: 6, className: "fill-indigo-500 stroke-white dark:stroke-slate-950 stroke-2" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="text-slate-400 text-sm">Cargando curva de crecimiento de capital...</div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/40 mt-2 pt-4">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="size-3.5 text-emerald-500" />
                Crecimiento neto de <strong className={cn(totalPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong> global
              </span>
              <span className="text-slate-455 dark:text-slate-500 text-[11px] font-semibold">
                Balance Inicial: ${totalStartingBalance.toLocaleString()}
              </span>
            </CardFooter>
          </Card>

          {/* Distribución por Activo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Operativa por Activo
              </CardTitle>
              <CardDescription>
                Rendimiento de los activos y pares más operados en tu diario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 mt-2">
              {finalAssetSummary.map((asset) => (
                <div key={asset.name} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", asset.color)} />
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{asset.name}</span>
                      <span className="text-[10px] text-slate-455 font-semibold">({asset.count} trades)</span>
                    </div>
                    <Badge variant={asset.profit >= 0 ? "success" : "destructive"} className="text-[10px]">
                      {asset.profit >= 0 ? `+$${asset.profit.toLocaleString()}` : `-$${Math.abs(asset.profit).toLocaleString()}`}
                    </Badge>
                  </div>
                  
                  {/* Winrate Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Win Rate</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        {asset.count > 0 ? Math.round((asset.wins / asset.count) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", asset.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500/80')}
                        style={{ width: `${asset.count > 0 ? (asset.wins / asset.count) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENIDO 2: ESTADÍSTICAS OPERATIVAS */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* Mediana / Promedio de Trade */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-500" />
                  Métricas de Eficiencia
                </CardTitle>
                <CardDescription>Comparativa entre ganancias y pérdidas promedio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-455">Trade Prom. Ganador</span>
                    <p className="text-lg font-bold text-emerald-500">
                      +${avgWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-455">Trade Prom. Perdedor</span>
                    <p className="text-lg font-bold text-rose-500">
                      -${avgLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Ratio de Eficacia Operativa</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {efficiencyRatio === '0.0' ? 'N/A' : `${efficiencyRatio}x`}
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-emerald-500" style={{ width: `${avgWin + avgLoss > 0 ? (avgWin / (avgWin + avgLoss)) * 100 : 50}%` }} />
                    <div className="h-full bg-rose-500/80" style={{ width: `${avgWin + avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : 50}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rachas y Drawdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-amber-500" />
                  Control de Riesgos
                </CardTitle>
                <CardDescription>Límites operativos y rachas en tus cuentas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-center">
                    <span className="text-xs text-slate-455 block mb-1">Racha Ganadora</span>
                    <strong className="text-lg font-extrabold text-slate-800 dark:text-white">{maxWinStreak} trades</strong>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-center">
                    <span className="text-xs text-slate-455 block mb-1">Racha Perdedora</span>
                    <strong className="text-lg font-extrabold text-slate-800 dark:text-white">{maxLossStreak} trades</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Drawdown Máximo Global</span>
                    <span className="font-bold text-rose-500">-{maxDrawdownPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-rose-500/80 rounded-full" style={{ width: `${Math.min(maxDrawdownPercentage * 10, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-455 block text-right font-semibold">Cálculo en base a balance inicial histórico</span>
                </div>
              </CardContent>
            </Card>

            {/* Tiempos de Retención */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="size-4 text-blue-500" />
                  Métricas de Tiempo
                </CardTitle>
                <CardDescription>Sesión operativa y duración promedio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <Clock className="size-8 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-455 block">Tiempo de Retención Prom.</span>
                    <strong className="text-md text-slate-800 dark:text-white">4 horas, 15 minutos</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> NY Session (62%)
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> LDN Session (28%)
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Asia Session (10%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CONTENIDO 3: OPERACIONES RECIENTES */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Historial de Operaciones Recientes
                </CardTitle>
                <CardDescription>
                  Listado con el detalle del P&L de tus últimas posiciones en mercado.
                </CardDescription>
              </div>
              <Link 
                to="/trades/new" 
                className="flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-all hover:bg-indigo-500 shadow-sm cursor-pointer animate-in fade-in duration-300"
              >
                <Plus className="size-3.5" />
                Registrar Trade
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-800/80">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-bold">Activo</th>
                      <th scope="col" className="px-6 py-4 font-bold">Dirección</th>
                      <th scope="col" className="px-6 py-4 font-bold">Entrada</th>
                      <th scope="col" className="px-6 py-4 font-bold">Salida</th>
                      <th scope="col" className="px-6 py-4 font-bold">PnL</th>
                      <th scope="col" className="px-6 py-4 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {recentTrades.length > 0 ? (
                      recentTrades.map((trade) => (
                        <tr 
                          key={trade.id} 
                          className="bg-white dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Coins className="size-4 text-slate-400" />
                            {trade.asset}
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "px-2 py-0.5 select-none rounded text-[11px] font-bold",
                                trade.direction === "Long" 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                  : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                              )}
                            >
                              {trade.direction === "Long" ? (
                                <ArrowUpRight className="inline size-3.5 mr-0.5" />
                              ) : (
                                <ArrowDownRight className="inline size-3.5 mr-0.5" />
                              )}
                              {trade.direction === "Long" ? 'BUY' : 'SELL'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                            ${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                            {trade.exitPrice !== undefined && trade.exitPrice !== null && trade.exitPrice !== 0
                              ? `$${trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("font-mono font-bold text-base",
                              trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {trade.pnl >= 0 
                                ? `+$${trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : `-$${Math.abs(trade.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={trade.status === "Closed" ? "secondary" : "info"} className="rounded select-none gap-1 font-semibold">
                              {trade.status === "Open" && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                </span>
                              )}
                              {trade.status === 'Closed' ? 'Cerrado' : 'Abierto'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                          No hay operaciones registradas aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
