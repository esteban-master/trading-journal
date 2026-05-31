import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Dices, RefreshCw, Info, Hash } from 'lucide-react';
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
  AreaChart,
} from 'recharts';

export function ProbabilisticSimulator() {
  const [open, setOpen] = useState(false);
  const { settings: globalSettings } = useRiskStore();
  const { account, avgRR } = useAccountDetailStore();

  // Inputs state
  const [winRate, setWinRate] = useState(40);
  const [riskRewardRatio, setRiskRewardRatio] = useState(parseFloat(avgRR) || 2);
  const [numberOfTrades, setNumberOfTrades] = useState(100);
  
  // Settings overrides
  const [baseRiskPercent, setBaseRiskPercent] = useState(account?.baseRiskPercent || globalSettings.baseRiskPercent);
  const [lossMultiplier, setLossMultiplier] = useState(account?.lossMultiplier || globalSettings.lossMultiplier);
  const [maxRiskPercent, setMaxRiskPercent] = useState(account?.maxRiskPercent || globalSettings.maxRiskPercent);
  const [enableEquityScaling, setEnableEquityScaling] = useState(account?.enableEquityScaling ?? globalSettings.enableEquityScaling);

  // Result state
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [autoZoom, setAutoZoom] = useState(false);

  const runSimulation = () => {
    const startingBalance = account?.startingBalance || 10000;
    
    const simResult = runMonteCarloSimulation({
      winRate,
      riskRewardRatio,
      numberOfTrades,
      startingBalance,
      settings: {
        baseRiskPercent,
        lossMultiplier,
        maxRiskPercent,
        enableEquityScaling,
      }
    });

    setResult(simResult);
  };

  // Run initial simulation
  useEffect(() => {
    if (open) {
      runSimulation();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:hover:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800 transition-all">
          <Dices className="w-4 h-4 mr-2 text-indigo-500" />
          Proyección Probabilística
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Dices className="text-indigo-500 w-6 h-6" />
            Laboratorio de Backtest (Monte Carlo)
          </DialogTitle>
          <DialogDescription>
            Simula miles de escenarios usando matemáticas puras. Descubre qué rentabilidad te daría tu estrategia con diferentes porcentajes de acierto (Winrate).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT SIDEBAR: CONTROLS */}
          <div className="lg:col-span-1 flex flex-col gap-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex justify-between items-center">
              Parámetros de la Estrategia
              <Button onClick={runSimulation} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-8 px-3">
                <RefreshCw className="w-3 h-3 mr-1" /> Tirar Dados
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
                  Trades a Simular
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
              Cada vez que presionas "Tirar Dados", la computadora juega {numberOfTrades} operaciones lanzando una moneda que está trucada a tu favor ({winRate}% de caer cara).
            </div>
          </div>

          {/* RIGHT SIDE: RESULTS */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {!result ? (
              <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-5 rounded-2xl border shadow-sm flex flex-col ${result.summary.profitPercent >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'}`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${result.summary.profitPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      Balance Proyectado
                    </span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      ${result.summary.finalBalance.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-sm font-bold mt-1 ${result.summary.profitPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {result.summary.profitPercent >= 0 ? '+' : ''}{result.summary.profitPercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Win / Loss
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xl font-black text-emerald-500">{result.summary.totalWon}</span>
                      <span className="text-slate-300 dark:text-slate-600 text-xl">/</span>
                      <span className="text-2xl font-black text-red-500">{result.summary.totalLost}</span>
                    </div>
                    <div className="w-full h-1.5 bg-red-100 dark:bg-red-900/30 rounded-full mt-3 overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${(result.summary.totalWon / numberOfTrades) * 100}%` }} />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Rachas Máximas
                    </span>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-emerald-600">Ganadoras:</span>
                        <span className="font-black text-emerald-500">{result.summary.maxConsecutiveWins}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-red-600">Perdedoras:</span>
                        <span className="font-black text-red-500">{result.summary.maxConsecutiveLosses}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Max Drawdown
                    </span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-500 mt-1">
                      -{result.summary.maxDrawdownPercent.toFixed(2)}%
                    </span>
                    <span className="text-xs font-medium text-orange-700/70 dark:text-orange-400/70 mt-1">
                      Caída máxima experimentada en la cuenta
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative min-h-[400px]">
                  
                  {/* Zoom Toggle */}
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Auto-Zoom Balance</span>
                    <button 
                      onClick={() => setAutoZoom(!autoZoom)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${autoZoom ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${autoZoom ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.dataPoints} margin={{ top: 40, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSimBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={result.summary.profitPercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={result.summary.profitPercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickMargin={10} opacity={0.5} axisLine={false} tickLine={false} minTickGap={30} />
                      <YAxis yAxisId="left" fontSize={12} tickFormatter={(val) => `$${val}`} opacity={0.5} axisLine={false} tickLine={false} domain={autoZoom ? ['auto', 'auto'] : [0, 'auto']} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(val) => `${val}%`} opacity={0.5} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const numValue = Number(value);
                          if (name === 'balance') return [`$${numValue.toFixed(2)}`, 'Balance Proyectado'];
                          if (name === 'risk') return [`${numValue.toFixed(2)}%`, 'Riesgo Recomendado'];
                          if (name === 'pnl') return [`$${numValue.toFixed(2)}`, 'Resultado del Trade'];
                          return [value, name];
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="balance" stroke={result.summary.profitPercent >= 0 ? "#10b981" : "#ef4444"} strokeWidth={3} fillOpacity={1} fill="url(#colorSimBalance)" />
                      <Line yAxisId="right" type="stepAfter" dataKey="risk" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

              </>
            )}

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
