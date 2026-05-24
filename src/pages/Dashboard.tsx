import { useState } from "react"
import {
  TrendingUp,
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
  ChevronRight,
  Sparkles
} from "lucide-react"

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

export default function Dashboard() {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  // Datos para los sparklines (minigráficos) de las métricas
  const sparklineBalance = "M 0 35 Q 15 25, 30 28 T 60 12 T 90 22 T 120 5"

  // Datos para el gráfico principal de Equity (Curva de Balance)
  const equityPoints = [
    { date: "18 May", balance: 9500 },
    { date: "19 May", balance: 9750 },
    { date: "20 May", balance: 9600 },
    { date: "21 May", balance: 9900 },
    { date: "22 May", balance: 10100 },
    { date: "23 May", balance: 9980 },
    { date: "24 May", balance: 10240 },
  ]

  // Generar path SVG para la curva principal
  // Ancho base 700, Alto base 250
  const svgWidth = 700
  const svgHeight = 250
  const paddingLeft = 60
  const paddingRight = 30
  const paddingTop = 20
  const paddingBottom = 40

  const minVal = 9400
  const maxVal = 10400

  const getX = (index: number) => {
    return paddingLeft + (index / (equityPoints.length - 1)) * (svgWidth - paddingLeft - paddingRight)
  }

  const getY = (value: number) => {
    const ratio = (value - minVal) / (maxVal - minVal)
    return svgHeight - paddingBottom - ratio * (svgHeight - paddingTop - paddingBottom)
  }

  let linePath = ""
  let areaPath = ""

  if (equityPoints.length > 0) {
    const pointsStr = equityPoints.map((pt, idx) => `${getX(idx)},${getY(pt.balance)}`)
    linePath = `M ${pointsStr.join(" L ")}`
    
    // Crear el área sombreada conectando los extremos inferiores
    const firstX = getX(0)
    const lastX = getX(equityPoints.length - 1)
    const bottomY = svgHeight - paddingBottom
    areaPath = `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`
  }

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
            Mayo 2026
          </Badge>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
          <span className="text-xs text-slate-400 dark:text-slate-500">Activo: C-Trader V4</span>
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
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                <TrendingUp className="mr-0.5 size-3" /> +4.5%
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              $10,240.00
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-end justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                +$440.00 este mes
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
              <span>Win Rate Mensual</span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                <TrendingUp className="mr-0.5 size-3" /> +2.1%
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              68%
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                68 wins / 32 losses
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
                    strokeDashoffset={2 * Math.PI * 15 * (1 - 0.68)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  68%
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
              <Badge variant="info" className="text-[10px] px-1.5 py-0.5">
                Excelente
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              2.4
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Objetivo: &gt; 2.0</span>
                <span className="font-semibold text-blue-500">2.4 / 4.0</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: "60%" }}
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
              <span>Riesgo / Beneficio Promedio</span>
              <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                -0.1
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              1 : 2.5
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Promedio mensual</span>
                <span className="text-amber-500 font-semibold">Saludable</span>
              </div>
              <div className="flex h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500/80" style={{ width: "28%" }}></div>
                <div className="h-full bg-emerald-500" style={{ width: "72%" }}></div>
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
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-semibold"
            >
              <Activity className="size-4 mr-1.5" />
              Vista General
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-semibold"
            >
              <Scale className="size-4 mr-1.5" />
              Estadísticas Operativas
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-semibold"
            >
              <Briefcase className="size-4 mr-1.5" />
              Operaciones Recientes
            </TabsTrigger>
          </TabsList>

          <span className="hidden sm:inline-flex items-center text-xs text-indigo-400 font-medium animate-pulse">
            <Sparkles className="size-3 mr-1" />
            Actualizado hace 1 min
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
                  Representación gráfica del crecimiento de capital en tu cuenta.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 text-xs">
                Últimos 7 días
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[260px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-800/40 p-4 overflow-hidden">
                
                {/* SVG Chart */}
                <svg
                  className="w-full h-full"
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                      <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Cuadrículas Horizontales */}
                  {[9400, 9600, 9800, 10000, 10200, 10400].map((val) => (
                    <g key={val}>
                      <line
                        x1={paddingLeft}
                        y1={getY(val)}
                        x2={svgWidth - paddingRight}
                        y2={getY(val)}
                        className="stroke-slate-200 dark:stroke-slate-800/60"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 10}
                        y={getY(val) + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[10px] font-medium"
                      >
                        ${val}
                      </text>
                    </g>
                  ))}

                  {/* Área Sombreada */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#areaGradient)" />
                  )}

                  {/* Línea Principal */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      className="stroke-indigo-500 dark:stroke-indigo-400"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Puntos y Etiquetas del Eje X */}
                  {equityPoints.map((pt, idx) => {
                    const x = getX(idx)
                    const y = getY(pt.balance)
                    const isLast = idx === equityPoints.length - 1

                    return (
                      <g key={idx}>
                        {/* Círculo Interactivo en el último punto */}
                        {isLast ? (
                          <>
                            <circle cx={x} cy={y} r="8" className="fill-indigo-500/30 animate-ping" />
                            <circle cx={x} cy={y} r="5" className="fill-indigo-500 dark:fill-indigo-400 stroke-white dark:stroke-slate-950" strokeWidth="2" />
                          </>
                        ) : (
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            className="fill-indigo-400 dark:fill-indigo-500 hover:r-5 transition-all cursor-pointer"
                          />
                        )}

                        {/* Etiqueta X */}
                        <text
                          x={x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          className="fill-slate-400 dark:fill-slate-500 text-[10px] font-bold"
                        >
                          {pt.date}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/40 mt-2 pt-4">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-emerald-500" />
                Crecimiento neto de <strong>+$740.00</strong> en el periodo seleccionado
              </span>
              <button className="text-indigo-500 dark:text-indigo-400 font-bold hover:underline flex items-center cursor-pointer">
                Ver historial completo <ChevronRight className="size-3.5 ml-0.5" />
              </button>
            </CardFooter>
          </Card>

          {/* Distribución por Activo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Operativa por Activo
              </CardTitle>
              <CardDescription>
                Rendimiento de los pares y activos más operados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 mt-2">
              {[
                { name: "BTCUSD", count: 24, winRate: 75, profit: 1240, color: "bg-amber-500" },
                { name: "EURUSD", count: 18, winRate: 66, profit: 850, color: "bg-blue-500" },
                { name: "Gold (XAU)", count: 12, winRate: 50, profit: -320, color: "bg-yellow-600" },
                { name: "NASDAQ", count: 8, winRate: 80, profit: 900, color: "bg-purple-500" }
              ].map((asset) => (
                <div key={asset.name} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${asset.color}`} />
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{asset.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({asset.count} trades)</span>
                    </div>
                    <Badge variant={asset.profit >= 0 ? "success" : "destructive"} className="text-[10px]">
                      {asset.profit >= 0 ? `+$${asset.profit}` : `-$${Math.abs(asset.profit)}`}
                    </Badge>
                  </div>
                  
                  {/* Winrate Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Win Rate</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">{asset.winRate}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${asset.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500/80'} transition-all`}
                        style={{ width: `${asset.winRate}%` }}
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
                    <span className="text-xs text-slate-400">Trade Prom. Ganador</span>
                    <p className="text-lg font-bold text-emerald-500">+$350.00</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-400">Trade Prom. Perdedor</span>
                    <p className="text-lg font-bold text-rose-500">-$140.00</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Ratio de Eficacia Operativa</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Excelente (2.5x)</span>
                  </div>
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-emerald-500" style={{ width: "71%" }} />
                    <div className="h-full bg-rose-500/80" style={{ width: "29%" }} />
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
                <CardDescription>Límites operativos y rachas de la cuenta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Racha Ganadora</span>
                    <strong className="text-lg font-extrabold text-slate-800 dark:text-white">8 trades</strong>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Racha Perdedora</span>
                    <strong className="text-lg font-extrabold text-slate-800 dark:text-white">3 trades</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Drawdown Máximo</span>
                    <span className="font-bold text-rose-500">-4.2%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-rose-500/80 rounded-full" style={{ width: "42%" }} />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-right">Límite absoluto de cuenta: -10%</span>
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
                <CardDescription>Duración promedio y actividad por sesión.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <Clock className="size-8 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs text-slate-400 block">Tiempo de Retención Promedio</span>
                    <strong className="text-md text-slate-800 dark:text-white">4 horas, 15 minutos</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Nueva York (62%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> Londres (28%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Asia (10%)
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
              <button className="flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-all hover:bg-indigo-500 shadow-sm cursor-pointer">
                <Plus className="size-3.5" />
                Registrar Trade
              </button>
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
                    {[
                      { asset: "EURUSD", type: "BUY", entry: "1.0850", exit: "1.0920", pnl: 700, status: "Cerrado" },
                      { asset: "BTCUSD", type: "SELL", entry: "$68,240", exit: "$67,100", pnl: 1140, status: "Cerrado" },
                      { asset: "XAUUSD (Oro)", type: "BUY", entry: "2340.50", exit: "2332.00", pnl: -850, status: "Cerrado" },
                      { asset: "NASDAQ", type: "BUY", entry: "18,500", exit: "18,590", pnl: 900, status: "Cerrado" },
                      { asset: "ETHUSD", type: "BUY", entry: "$3,420", exit: "-", pnl: 120, status: "Abierto" }
                    ].map((trade, idx) => (
                      <tr 
                        key={idx} 
                        className="bg-white dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Coins className="size-4 text-slate-400" />
                          {trade.asset}
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className={`px-2 py-0.5 select-none rounded text-[11px] font-bold ${
                              trade.type === "BUY" 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {trade.type === "BUY" ? (
                              <ArrowUpRight className="inline size-3.5 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="inline size-3.5 mr-0.5" />
                            )}
                            {trade.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{trade.entry}</td>
                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{trade.exit}</td>
                        <td className="px-6 py-4">
                          <span className={`font-mono font-bold text-base ${
                            trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                          }`}>
                            {trade.pnl >= 0 ? `+$${trade.pnl}.00` : `-$${Math.abs(trade.pnl)}.00`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={trade.status === "Cerrado" ? "secondary" : "info"} className="rounded select-none gap-1 font-semibold">
                            {trade.status === "Abierto" && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                              </span>
                            )}
                            {trade.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
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
