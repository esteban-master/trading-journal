import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dices, RefreshCw, Info, Hash, AlertTriangle, TrendingUp, Skull, Scale, TrendingDown, Save, Sparkles, ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react';
import { useRiskStore } from '@/store/useRiskStore';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';
import { runMonteCarloSimulation, SimulationResult, SimulatedTrade } from '@/lib/simulator';
import { saveSimulationRun, getOptimizedRiskSettings, SimulationRunPayload } from '@/lib/simulationService';
import { toast } from 'sonner';
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
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToDatabase = async () => {
    if (!result) return;

    setIsSaving(true);
    try {
      await saveSimulationRun({
        inputs: {
          winRate,
          riskRewardRatio,
          numberOfTrades,
          iterations,
          commissionPerTrade,
          startingBalance: account?.startingBalance || 10000,
        },
        riskConfig: {
          baseRiskPercent,
          lossMultiplier,
          maxRiskPercent: maxRiskPercent || 5,
          enableEquityScaling: enableEquityScaling || false,
        },
        results: {
          medianBalance: result.summary.finalBalanceMedian,
          ruinProbability: result.summary.probabilityOfRuinPercent,
          maxDrawdown: result.summary.maxDrawdownMedian,
          kelly: result.summary.kellyPercentage,
          maxConsecutiveWinsMedian: result.summary.maxConsecutiveWinsMedian,
          maxConsecutiveLossesMedian: result.summary.maxConsecutiveLossesMedian,
        }
      });
      toast.success('Simulación guardada en la base de datos', {
        description: 'Podrás usarla en el futuro para la Optimización Inteligente.'
      });
    } catch (error) {
      console.log(error);
      toast.error('Error al guardar', {
        description: 'Hubo un problema de conexión con Firestore.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedResults, setOptimizedResults] = useState<SimulationRunPayload[]>([]);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const results = await getOptimizedRiskSettings(winRate, riskRewardRatio);
      setOptimizedResults(results);
      if (results.length === 0) {
        toast.info('Sin resultados', {
          description: 'No se encontraron simulaciones con estos parámetros que tengan ruina aceptable (≤2%). ¡Guarda más escenarios!'
        });
      }
    } catch (error) {
      console.log(error)
      toast.error('Error', { description: 'No se pudo conectar con el optimizador.' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimization = (config: SimulationRunPayload['riskConfig']) => {
    setBaseRiskPercent(config.baseRiskPercent);
    setLossMultiplier(config.lossMultiplier);
    setMaxRiskPercent(config.maxRiskPercent);
    setEnableEquityScaling(config.enableEquityScaling);
    toast.success('Configuración aplicada', { description: 'Los parámetros han sido actualizados en el simulador.' });
  };

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

      console.log(simResult)
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
        <DialogContent className="sm:max-w-[1300px] w-[95vw] max-h-[95vh] overflow-hidden p-0 bg-slate-50 dark:bg-slate-950" onPointerDownOutside={(e) => e.preventDefault()}>
          <ScrollArea className="h-[90vh] p-6">
            <Tabs defaultValue="lab" className="w-full pr-3">
              <div className="flex justify-between items-start mb-4">
                <DialogHeader className="mb-0">
                  <DialogTitle className="flex items-center gap-2 text-2xl w-full">
                    <Dices className="text-indigo-500 w-6 h-6" />
                    Laboratorio de Backtest Avanzado
                  </DialogTitle>
                  <DialogDescription>
                    Simula escenarios simultáneos y optimiza tu riesgo usando matemáticas puras.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-4">
                  <TabsList>
                    <TabsTrigger value="lab" className="flex items-center gap-2"><Dices className="w-4 h-4" /> Laboratorio</TabsTrigger>
                    <TabsTrigger value="optimizer" className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Optimizador</TabsTrigger>
                    <TabsTrigger value="trades" className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Trades</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon" onClick={() => setShowExplanation(true)} className="rounded-full text-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 h-8 w-8">
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="lab" className="mt-0 outline-none">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                  {/* LEFT SIDEBAR: CONTROLS */}
                  <div className="xl:col-span-1 flex flex-col gap-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
                      Parámetros de la Estrategia
                    </h3>

                    {/* Botones de acción a ancho completo */}
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 transition-all font-bold flex items-center justify-center"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isSimulating ? 'animate-spin' : ''}`} />
                        {isSimulating ? 'Calculando...' : 'Tirar Dados'}
                      </Button>
                      {result && (
                        <Button
                          onClick={handleSaveToDatabase}
                          disabled={isSimulating || isSaving}
                          variant="outline"
                          className="w-full rounded-xl h-10 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-all font-bold flex items-center justify-center"
                        >
                          {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Guardar Simulación
                        </Button>
                      )}
                    </div>

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
                          type="range" step="0.1" min="0.1" max="10.0" value={baseRiskPercent}
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
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">

                          {/* Balance Mediano */}
                          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col relative overflow-hidden ${result.summary.profitPercentMedian >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'}`}>
                            <TrendingUp className={`absolute -right-4 -top-4 w-24 h-24 opacity-5 ${result.summary.profitPercentMedian >= 0 ? 'text-emerald-900' : 'text-red-900'}`} />
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${result.summary.profitPercentMedian >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              Balance Proyectado (Mediana)
                            </span>
                            <span className="text-2xl xl:text-3xl font-black text-slate-800 dark:text-slate-100 mt-2 z-10 truncate" title={`$${result.summary.finalBalanceMedian.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}>
                              ${result.summary.finalBalanceMedian.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`text-sm font-bold mt-1 z-10 truncate ${result.summary.profitPercentMedian >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {result.summary.profitPercentMedian >= 0 ? '+' : ''}
                              {result.summary.profitPercentMedian.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%
                            </span>
                          </div>

                          {/* Riesgo de Ruina */}
                          <div className={`p-5 rounded-2xl border shadow-sm flex flex-col relative overflow-hidden ${result.summary.probabilityOfRuinPercent > 10 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            <Skull className={`absolute -right-2 -bottom-2 w-20 h-20 opacity-[0.03] ${result.summary.probabilityOfRuinPercent > 10 ? 'text-red-900' : 'text-slate-900'}`} />
                            <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${result.summary.probabilityOfRuinPercent > 10 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {result.summary.probabilityOfRuinPercent > 10 && <AlertTriangle className="w-3 h-3" />}
                              Probabilidad de Ruina
                            </span>
                            <span className={`text-3xl font-black mt-2 z-10 ${result.summary.probabilityOfRuinPercent > 10 ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                              {result.summary.probabilityOfRuinPercent.toFixed(1)}%
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 z-10">
                              {result.summary.probabilityOfRuinPercent === 0 ? 'Quiebra casi imposible' : 'Peligro de perder >90%'}
                            </span>
                          </div>

                          {/* Drawdown */}
                          <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Max Drawdown
                            </span>
                            <div className="flex items-end gap-2 mt-2">
                              <span className="text-3xl font-black text-orange-500">
                                -{result.summary.maxDrawdownMedian.toFixed(1)}%
                              </span>
                              <span className="text-sm font-semibold text-slate-400 mb-1">Mediana</span>
                            </div>
                            <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <span className="text-slate-500">Peor caso posible:</span>
                              <span className="font-bold text-red-500">-{result.summary.maxDrawdownWorst.toFixed(1)}%</span>
                            </div>
                          </div>

                          {/* Rachas (Span 2 Columns) */}
                          <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 col-span-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                              Rachas Consecutivas (Strikes)
                            </span>
                            <div className="grid grid-cols-2 gap-6 h-full">
                              <div className="flex flex-col justify-center">
                                <span className="text-[10px] font-semibold text-emerald-600 uppercase mb-2">Racha Ganadora (Mejor / Med / Peor)</span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-lg font-black text-emerald-600" title="Top 10%">{result.summary.maxConsecutiveWinsBest}</span>
                                  <span className="text-slate-300">/</span>
                                  <span className="text-3xl font-black text-emerald-500" title="Mediana">{result.summary.maxConsecutiveWinsMedian}</span>
                                  <span className="text-slate-300">/</span>
                                  <span className="text-lg font-black text-emerald-400/70" title="Peor caso">{result.summary.maxConsecutiveWinsWorst}</span>
                                </div>
                              </div>
                              <div className="flex flex-col justify-center pl-6 border-l border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-semibold text-red-600 uppercase mb-2">Racha Perdedora (Mejor / Med / Peor)</span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-lg font-black text-red-400/70" title="Mejor caso">{result.summary.maxConsecutiveLossesBest}</span>
                                  <span className="text-slate-300">/</span>
                                  <span className="text-3xl font-black text-red-500" title="Mediana">{result.summary.maxConsecutiveLossesMedian}</span>
                                  <span className="text-slate-300">/</span>
                                  <span className="text-lg font-black text-red-600" title="Peor 10%">{result.summary.maxConsecutiveLossesWorst}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Kelly Criterion */}
                          <div className="p-5 rounded-2xl border shadow-sm flex flex-col bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Scale className="w-3 h-3" /> Riesgo Óptimo (Kelly)
                            </span>

                            {result.summary.kellyPercentage > 0 ? (
                              <div className="flex flex-col justify-between h-full mt-3">
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
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                              <XAxis dataKey="name" fontSize={12} tickMargin={10} opacity={0.5} axisLine={false} tickLine={false} minTickGap={30} />
                              <YAxis yAxisId="left" fontSize={12} tickFormatter={(val) => `$${val}`} opacity={0.5} axisLine={false} tickLine={false} domain={autoZoom ? ['auto', 'auto'] : [0, 'auto']} />

                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (!active || !payload || !payload.length) return null;

                                  const filteredPayload = payload.filter(item => !String(item.dataKey).startsWith('sample'));

                                  return (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-lg">
                                      <p className="font-bold text-slate-500 dark:text-slate-400 mb-1 text-xs">{label}</p>
                                      <div className="flex flex-col gap-1.5 text-xs font-bold">
                                        {filteredPayload.map((item, idx) => {
                                          const value = Number(item.value).toLocaleString('es-ES', { maximumFractionDigits: 0 });
                                          let name = item.name;
                                          let color = item.color;
                                          if (item.dataKey === 'p90') {
                                            name = 'Top 10% Mejor Escenario';
                                            color = '#10b981';
                                          } else if (item.dataKey === 'p50') {
                                            name = 'Mediana (Más Probable)';
                                            color = '#6366f1';
                                          } else if (item.dataKey === 'p10') {
                                            name = 'Top 10% Peor Escenario';
                                            color = '#ef4444';
                                          }
                                          return (
                                            <div key={idx} className="flex items-center justify-between gap-4" style={{ color }}>
                                              <span>{name}:</span>
                                              <span className="font-black">${value}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }}
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
              </TabsContent>

              <TabsContent value="optimizer" className="mt-0 outline-none">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">

                  {/* LEFT SIDE: CONTROLS */}
                  <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center">
                    <Sparkles className="w-12 h-12 text-indigo-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Optimizador Cuantitativo</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                      Buscamos en la base de datos la configuración de riesgo exacta que generó las mayores ganancias, manteniendo la Ruina segura (≤ 2%).
                    </p>

                    <div className="w-full flex flex-col gap-4 mb-8 text-left">
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Winrate Objetivo (%)</label>
                        <input
                          type="number" min="1" max="100" value={winRate}
                          onChange={(e) => setWinRate(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Risk/Reward (1:X)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">1:</span>
                          <input
                            type="number" step="0.1" min="0.1" value={riskRewardRatio}
                            onChange={(e) => setRiskRewardRatio(Number(e.target.value))}
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleOptimize}
                      disabled={isOptimizing}
                      size="lg"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 h-auto text-base shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                    >
                      {isOptimizing ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                      Analizar Base de Datos
                    </Button>
                  </div>

                  {/* RIGHT SIDE: RESULTS */}
                  <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
                    {optimizedResults.length > 0 ? (
                      <div className="w-full h-full flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Top {optimizedResults.length} Configuraciones Encontradas
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                          {optimizedResults.map((run, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                              <div>
                                <div className="flex flex-col gap-3 mb-5">
                                  <div className="flex justify-start">
                                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                      Recomendación #{idx + 1}
                                    </span>
                                  </div>
                                  <div className="text-left">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Balance Proyectado</div>
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none truncate">
                                      ${((account?.startingBalance || 10000) * (1 + ((run.results.medianBalance - run.inputs.startingBalance) / run.inputs.startingBalance))).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-xs font-bold text-emerald-600/80 mt-1.5">
                                      +{(((run.results.medianBalance - run.inputs.startingBalance) / run.inputs.startingBalance) * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })}% crecimiento
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Riesgo Base:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{run.riskConfig.baseRiskPercent}%</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Multiplicador:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{run.riskConfig.lossMultiplier}x</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Riesgo Máx:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{run.riskConfig.maxRiskPercent}%</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
                                    <span className="text-slate-500 font-medium flex items-center gap-1"><Skull className="w-3 h-3 text-red-500" /> Prob. Ruina:</span>
                                    <span className="font-bold text-emerald-600">{run.results.ruinProbability.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>

                              <Button
                                variant="default"
                                onClick={() => applyOptimization(run.riskConfig)}
                                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-xl"
                              >
                                Aplicar al Simulador <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                        <Sparkles className="w-16 h-16 text-slate-400 mb-4" />
                        <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">Esperando parámetros...</p>
                        <p className="text-sm text-slate-500">Ajusta el winrate y el RR en la izquierda y pulsa "Analizar".</p>
                      </div>
                    )}
                  </div>

                </div>
              </TabsContent>
              <TabsContent value="trades" className="mt-0 outline-none">
                {!result ? (
                  <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[500px]">
                    <ClipboardList className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Ejecuta una simulación primero para ver los trades.</p>
                  </div>
                ) : (
                  <TradeListView
                    medianTrades={result.medianPathTrades}
                    bestTrades={result.bestPathTrades}
                    worstTrades={result.worstPathTrades}
                    startingBalance={account?.startingBalance || 10000}
                  />
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden p-0 z-[100] bg-white dark:bg-slate-950">
          <ScrollArea className="h-[80vh] p-6">
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

              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <h4 className="font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5 mb-2">
                  <span className="text-lg">🔮</span> El Multiverso de las Bolitas Mágicas
                </h4>
                <p className="mb-2 text-indigo-900/80 dark:text-indigo-100/70">
                  Imagina que tienes una bolsa de tela oscura con <strong>100 bolitas</strong> adentro. Si tu Winrate es del 40%, metemos 40 bolitas verdes (ganadoras) y 60 rojas (perdedoras).
                </p>
                <ul className="space-y-2 list-decimal list-inside marker:text-indigo-500/70 text-indigo-900/80 dark:text-indigo-100/70">
                  <li><strong>Un Universo:</strong> Sacas 100 bolitas al azar, calculas el dinero y ves cómo terminaste. Puede que por pura suerte hayas sacado muchas verdes al principio, o puras rojas.</li>
                  <li><strong>El Multiverso:</strong> El simulador crea <strong>1,000 clones de ti</strong>. Cada clon saca 100 bolitas al azar. Cada clon tendrá una historia distinta.</li>
                  <li><strong>La Gran Verdad:</strong> Al final, juntamos a tus 1,000 clones. Si 150 clones quebraron su cuenta, tu Probabilidad de Ruina es del 15%.</li>
                </ul>
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
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TradeListView({
  medianTrades,
  bestTrades,
  worstTrades,
  startingBalance,
}: {
  medianTrades: SimulatedTrade[];
  bestTrades: SimulatedTrade[];
  worstTrades: SimulatedTrade[];
  startingBalance: number;
}) {
  const scenarios = [
    { label: 'Mediano', description: 'El escenario más probable (p50)', trades: medianTrades },
    { label: 'Mejor', description: 'El escenario con mayor balance final', trades: bestTrades },
    { label: 'Peor', description: 'El escenario con menor balance final', trades: worstTrades },
  ];

  return (
    <Tabs defaultValue="mediano" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="mediano" className="flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> Mediano
        </TabsTrigger>
        <TabsTrigger value="mejor" className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Mejor
        </TabsTrigger>
        <TabsTrigger value="peor" className="flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Peor
        </TabsTrigger>
      </TabsList>

      {scenarios.map(({ label, description, trades }) => {
        const key = label.toLowerCase();
        const wins = trades.filter(t => t.isWin).length;
        const losses = trades.filter(t => !t.isWin).length;
        const finalBalance = trades.length > 0 ? trades[trades.length - 1].balance : startingBalance;
        const profitPercent = ((finalBalance - startingBalance) / startingBalance) * 100;
        const isProfitable = finalBalance >= startingBalance;

        return (
          <TabsContent key={key} value={key} className="mt-0 outline-none">
            {/* Summary Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Balance Final</p>
                <p className={`text-2xl font-black mt-1 ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${finalBalance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-xs font-bold mt-0.5 ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isProfitable ? '+' : ''}{profitPercent.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trades Totales</p>
                <p className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">{trades.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ganadores</p>
                <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{wins}</p>
                <p className="text-xs text-emerald-500/70 mt-0.5">{trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : 0}% winrate real</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Perdedores</p>
                <p className="text-2xl font-black mt-1 text-red-600 dark:text-red-400">{losses}</p>
                <p className="text-xs text-red-500/70 mt-0.5">{trades.length > 0 ? ((losses / trades.length) * 100).toFixed(1) : 0}% loss rate real</p>
              </div>
            </div>

            {/* Trade Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>#</span>
                <span>Resultado</span>
                <span className="text-right">Riesgo %</span>
                <span className="text-right">$ Riesgo</span>
                <span className="text-right">P&amp;L</span>
                <span className="text-right">Balance</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[480px] overflow-y-auto">
                {trades.map(trade => (
                  <div
                    key={trade.index}
                    className={`grid grid-cols-6 gap-2 px-4 py-2.5 text-sm transition-colors ${
                      trade.isWin
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        : 'bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20'
                    }`}
                  >
                    <span className="font-mono text-xs text-slate-400 font-semibold self-center">{trade.index}</span>
                    <span className="self-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        trade.isWin
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                      }`}>
                        {trade.isWin ? '▲ WIN' : '▼ LOSS'}
                      </span>
                    </span>
                    <span className={`text-right self-center font-bold ${trade.isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {trade.riskPercent.toFixed(2)}%
                    </span>
                    <span className="text-right self-center text-slate-600 dark:text-slate-400 font-medium">
                      ${trade.dollarRisk.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-right self-center font-black ${trade.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-right self-center font-bold text-slate-800 dark:text-slate-200">
                      ${trade.balance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

