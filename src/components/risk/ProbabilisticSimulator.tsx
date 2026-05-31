import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Dices, RefreshCw, Info, Hash, AlertTriangle, TrendingUp, Skull, Scale, TrendingDown } from 'lucide-react';
import { useRiskStore } from '@/store/useRiskStore';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';
import { runMonteCarloSimulation, SimulationResult } from '@/lib/simulator';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';

export function ProbabilisticSimulator() {
  const [open, setOpen] = useState(false);
  
  const { settings: globalSettings } = useRiskStore();
  const { account, avgRR } = useAccountDetailStore();

  // Inputs state
  const [winRate, setWinRate] = useState(40);
  const [riskRewardRatio, setRiskRewardRatio] = useState(parseFloat(avgRR) || 2);
  const [numberOfTrades, setNumberOfTrades] = useState(100);
  const [iterations, setIterations] = useState(500);
  const [commissionPerTrade, setCommissionPerTrade] = useState(0);
  
  // Settings overrides
  const [baseRiskPercent, setBaseRiskPercent] = useState(account?.baseRiskPercent || globalSettings.baseRiskPercent);
  const [lossMultiplier, setLossMultiplier] = useState(account?.lossMultiplier || globalSettings.lossMultiplier);
  const [maxRiskPercent, setMaxRiskPercent] = useState(account?.maxRiskPercent || globalSettings.maxRiskPercent);
  const [enableEquityScaling, setEnableEquityScaling] = useState(account?.enableEquityScaling ?? globalSettings.enableEquityScaling);

  // Result state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [autoZoom, setAutoZoom] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const runSimulation = () => {
    setIsSimulating(true);
    
    // Use setTimeout to allow UI to show loading state before heavy calculation
    setTimeout(() => {
      const startingBalance = account?.startingBalance || 10000;
      
      const simResult = runMonteCarloSimulation({
        winRate,
        riskRewardRatio,
        numberOfTrades,
        startingBalance,
        iterations,
        commissionPerTrade,
        settings: {
          baseRiskPercent,
          lossMultiplier,
          maxRiskPercent,
          enableEquityScaling,
        }
      });

      setResult(simResult);
      setIsSimulating(false);
    }, 50);
  };

  // Run initial simulation
  useEffect(() => {
    if (open && !result) {
      runSimulation();
    }
  }, [open]);

  // Transform data for ComposedChart
  const chartData = useMemo(() => {
    if (!result) return [];
    
    return result.chartData.map((cd, index) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newCd: any = { ...cd };
      result.samplePaths.forEach((path, i) => {
        newCd[`sample${i}`] = path.data[index]?.balance;
      });
      return newCd;
    });
  }, [result]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:hover:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800 transition-all">
          <Dices className="w-4 h-4 mr-2 text-indigo-500" />
          Proyección Probabilística
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1300px] w-[95vw] max-h-[95vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex justify-between items-center text-2xl w-full pr-8">
            <div className="flex items-center gap-2">
              <Dices className="text-indigo-500 w-6 h-6" />
              Laboratorio de Backtest Avanzado (Monte Carlo)
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowExplanation(true)} className="rounded-full text-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 h-8 w-8">
              <Info className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Simula miles de escenarios simultáneos usando matemáticas puras. Descubre tu riesgo real de ruina y el rendimiento más probable.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT SIDEBAR: CONTROLS */}
          <div className="xl:col-span-1 flex flex-col gap-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex justify-between items-center">
              Parámetros de la Estrategia
              <Button onClick={runSimulation} disabled={isSimulating} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-8 px-3">
                <RefreshCw className={`w-3 h-3 mr-1 ${isSimulating ? 'animate-spin' : ''}`} /> 
                {isSimulating ? 'Calculando...' : 'Tirar Dados'}
              </Button>
            </h3>

            {/* Trading Metrics */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Winrate (%)</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{winRate}%</span>
                </label>
                <input 
                  type="range" min="1" max="100" value={winRate} 
                  onChange={(e) => setWinRate(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Risk / Reward Ratio (1:X)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">1 :</span>
                  <input 
                    type="number" step="0.1" min="0.1" value={riskRewardRatio} 
                    onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Trades por Camino
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" step="10" min="10" max="10000" value={numberOfTrades} 
                    onChange={(e) => setNumberOfTrades(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Caminos (Iter)
                  </label>
                  <input 
                    type="number" step="100" min="100" max="5000" value={iterations} 
                    onChange={(e) => setIterations(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Comisión por Trade ($)
                  </label>
                  <input 
                    type="number" step="0.5" min="0" value={commissionPerTrade} 
                    onChange={(e) => setCommissionPerTrade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 mt-4 mb-2">
              Gestión de Riesgo Dinámica
            </h3>

            {/* Risk Metrics */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Riesgo Base (%)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{baseRiskPercent}%</span>
                </label>
                <input 
                  type="range" step="0.1" min="0.1" max="5.0" value={baseRiskPercent} 
                  onChange={(e) => setBaseRiskPercent(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Multiplicador (Racha Perdedora)</span>
                  <span className="text-orange-600 dark:text-orange-400 font-black">{lossMultiplier}x</span>
                </label>
                <input 
                  type="range" step="0.1" min="1.0" max="3.0" value={lossMultiplier} 
                  onChange={(e) => setLossMultiplier(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block flex items-center justify-between">
                  <span>Riesgo Máximo (%)</span>
                  <span className="text-red-600 dark:text-red-400 font-black">{maxRiskPercent}%</span>
                </label>
                <input 
                  type="range" step="0.1" min="1.0" max="10.0" value={maxRiskPercent} 
                  onChange={(e) => setMaxRiskPercent(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="equityScaling" 
                  checked={enableEquityScaling} 
                  onChange={(e) => setEnableEquityScaling(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="equityScaling" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Activar Fase Snowball (Apalancamiento)
                </label>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-medium border border-indigo-100 dark:border-indigo-800/50">
              <Info className="w-4 h-4 mb-2" />
              Simulando {iterations} universos paralelos de {numberOfTrades} trades cada uno, asumiendo una precisión del {winRate}%.
            </div>
          </div>

          {/* RIGHT SIDE: RESULTS */}
          <div className="xl:col-span-3 flex flex-col gap-6">
            
            {!result || isSimulating ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[500px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-slate-500 font-medium">Ejecutando {iterations} simulaciones simultáneas...</p>
              </div>
            ) : (
              <>
                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Balance Mediano */}
                  <div className={`p-5 rounded-2xl border shadow-sm flex flex-col relative overflow-hidden ${result.summary.profitPercentMedian >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'}`}>
                    <TrendingUp className={`absolute -right-4 -top-4 w-24 h-24 opacity-5 ${result.summary.profitPercentMedian >= 0 ? 'text-emerald-900' : 'text-red-900'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${result.summary.profitPercentMedian >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      Balance Proyectado (Mediana)
                    </span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 z-10">
                      ${result.summary.finalBalanceMedian.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-sm font-bold mt-1 z-10 ${result.summary.profitPercentMedian >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {result.summary.profitPercentMedian >= 0 ? '+' : ''}{result.summary.profitPercentMedian.toFixed(2)}%
                    </span>
                  </div>

                  {/* Riesgo de Ruina */}
                  <div className={`p-5 rounded-2xl border shadow-sm flex flex-col relative overflow-hidden ${result.summary.probabilityOfRuinPercent > 10 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <Skull className={`absolute -right-2 -bottom-2 w-16 h-16 opacity-[0.03] ${result.summary.probabilityOfRuinPercent > 10 ? 'text-red-900' : 'text-slate-900'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${result.summary.probabilityOfRuinPercent > 10 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {result.summary.probabilityOfRuinPercent > 10 && <AlertTriangle className="w-3 h-3" />}
                      Probabilidad de Ruina
                    </span>
                    <span className={`text-2xl font-black mt-1 z-10 ${result.summary.probabilityOfRuinPercent > 10 ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                      {result.summary.probabilityOfRuinPercent.toFixed(1)}%
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 z-10">
                      {result.summary.probabilityOfRuinPercent === 0 ? 'Riesgo de quiebra casi nulo' : 'Cuentas que perdieron >90%'}
                    </span>
                  </div>

                  {/* Drawdown */}
                  <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Max Drawdown
                    </span>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-2xl font-black text-orange-500">
                        -{result.summary.maxDrawdownMedian.toFixed(1)}%
                      </span>
                      <span className="text-sm font-semibold text-slate-400 mb-1">Mediana</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500">Peor caso:</span>
                      <span className="font-bold text-red-500">-{result.summary.maxDrawdownWorst.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Kelly Criterion */}
                  <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Scale className="w-3 h-3" /> Riesgo Óptimo (Kelly)
                    </span>
                    
                    {result.summary.kellyPercentage > 0 ? (
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-indigo-700/70 dark:text-indigo-400/80">Conservador (1/10):</span>
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{(result.summary.kellyPercentage / 10).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-indigo-700/70 dark:text-indigo-400/80">Agresivo (1/2):</span>
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{(result.summary.kellyPercentage / 2).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-indigo-200 dark:border-indigo-800/50">
                          <span className="text-xs font-semibold text-red-500/80">Límite Teórico (Full):</span>
                          <span className="text-sm font-black text-red-500">{result.summary.kellyPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-500 mt-1">0%</span>
                        <span className="text-xs font-medium text-indigo-700/70 dark:text-indigo-400/70 mt-1">
                          La estrategia no tiene ventaja matemática demostrable.
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative min-h-[400px]">
                  
                  {/* Zoom Toggle */}
                  <div className="absolute top-4 left-20 z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Auto-Zoom</span>
                      <button 
                        onClick={() => setAutoZoom(!autoZoom)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${autoZoom ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${autoZoom ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {/* Legend Overlay */}
                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-bold flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-500 border border-emerald-500 border-dashed"></div> Top 10% (Mejor)</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-indigo-500 rounded-full"></div> Percentil 50 (Mediana)</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-red-500 border border-red-500 border-dashed"></div> Bottom 10% (Peor)</div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickMargin={10} opacity={0.5} axisLine={false} tickLine={false} minTickGap={30} />
                      <YAxis yAxisId="left" fontSize={12} tickFormatter={(val) => `$${val}`} opacity={0.5} axisLine={false} tickLine={false} domain={autoZoom ? ['auto', 'auto'] : [0, 'auto']} />
                      
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const numValue = Number(value);
                          if (name === 'p90') return [`$${numValue.toFixed(2)}`, 'Top 10% Mejor Escenario'];
                          if (name === 'p50') return [`$${numValue.toFixed(2)}`, 'Mediana (Más Probable)'];
                          if (name === 'p10') return [`$${numValue.toFixed(2)}`, 'Top 10% Peor Escenario'];
                          if (String(name).startsWith('sample')) return [`$${numValue.toFixed(2)}`, 'Simulación Aleatoria'];
                          return [value, name];
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}
                      />
                      
                      {/* Background sample paths to visualize Monte Carlo noise */}
                      {result.samplePaths.map((_, i) => (
                        <Line 
                          key={`sample${i}`} 
                          yAxisId="left" 
                          type="monotone" 
                          dataKey={`sample${i}`} 
                          stroke="#94a3b8" 
                          strokeWidth={1} 
                          dot={false} 
                          opacity={0.15} 
                          isAnimationActive={false} 
                          activeDot={false}
                        />
                      ))}

                      {/* Confidence Bands (P90 and P10) */}
                      <Line yAxisId="left" type="monotone" dataKey="p90" stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={true} />
                      <Line yAxisId="left" type="monotone" dataKey="p10" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={true} />
                      
                      {/* Median Area */}
                      <Area yAxisId="left" type="monotone" dataKey="p50" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorP50)" isAnimationActive={true} activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                      
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

              </>
            )}

          </div>
        </div>

      </DialogContent>
    </Dialog>

    <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto z-[100] bg-white dark:bg-slate-950">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Dices className="text-indigo-500 w-5 h-5" /> 
            ¿Cómo funciona el Multiverso del Trading?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
          <p>
            Imagina que el trading es como explorar el <strong>"Multiverso"</strong>.
          </p>
          
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
              <span className="text-lg">🌌</span> El Superpoder del Monte Carlo
            </h4>
            <p>
              Antes, hacer backtest era como jugar una partida de un videojuego una sola vez y decir: <em>"¡Terminé con $15,000, siempre ganaré eso!"</em>. Pero el mercado es travieso. El Monte Carlo crea <strong>cientos de universos paralelos</strong>. En cada universo, juegas las mismas operaciones, pero el "orden" de las victorias y derrotas cambia por pura suerte. Al final, junta las historias de todos los universos y te dice la gran verdad.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1">
              <Skull className="w-4 h-4" /> Probabilidad de Ruina (El "Game Over")
            </h4>
            <p>
              De todos los universos simulados, ¿en cuántos de ellos tu cuenta llegó a cero? Si este número es alto, el simulador te está gritando: <em>"¡Cuidado! Estás arriesgando demasiado por jugada"</em>. Tu misión en el trading siempre es mantener este número cerca al 0%.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4" /> La Mediana (El Universo más "Normal")
            </h4>
            <p>
              Si acomodamos todos los universos en una fila, desde el que tuvo la peor suerte hasta el más afortunado, el que está <strong>exactamente en el centro</strong> es la Mediana. Los profesionales miran la Mediana porque te dice: <em>"Esto es lo más aburrido, normal y probable que te va a pasar en la vida real"</em>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4" /> El Max Drawdown (La Montaña Rusa)
            </h4>
            <p>
              Mide la caída más profunda que sufriste en los simulacros. Conocer tu peor caída te prepara psicológicamente. Si sabes que vas a sufrir una caída del -15% en el futuro, cuando pase de verdad no entrarás en pánico, porque dirás: <em>"Ah, el simulador me advirtió que esto era normal"</em>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
              <Scale className="w-4 h-4" /> El Criterio de Kelly (El Sabio Consejero)
            </h4>
            <p>
              Es una fórmula matemática que te susurra al oído: <em>"Para que tu dinero crezca lo más rápido posible sin quebrar, debes apostar exactamente este porcentaje"</em>. Si arriesgas más de lo que dice Kelly, la volatilidad matemática destruirá tu cuenta. Es tu límite de velocidad.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Las Bandas en el Gráfico (El Cono del Destino)</h4>
            <ul className="space-y-2 list-disc list-inside marker:text-slate-400">
              <li><strong className="text-emerald-600 dark:text-emerald-400">Línea Verde (Top 10%):</strong> Lo que pasa si tienes muchísima suerte.</li>
              <li><strong className="text-red-600 dark:text-red-400">Línea Roja (Bottom 10%):</strong> Tu escudo. Te muestra dónde terminarás si tienes pésima suerte.</li>
              <li><strong className="text-indigo-600 dark:text-indigo-400">Mancha Central:</strong> Es donde vas a terminar el 80% de las veces.</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

