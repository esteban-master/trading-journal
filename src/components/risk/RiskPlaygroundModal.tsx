import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { Trade, Account } from '@/types';
import { calculateNextRisk, RiskProgressionSettings } from '@/lib/risk';
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

interface RiskPlaygroundModalProps {
  trades: Trade[];
  account?: Account | null;
  activeSettings: RiskProgressionSettings;
  avgRR: string;
}

export function RiskPlaygroundModal({ trades, account, activeSettings, avgRR }: RiskPlaygroundModalProps) {
  const [open, setOpen] = useState(false);
  const [autoZoom, setAutoZoom] = useState(false);

  const simulationData = useMemo(() => {
    if (!account) return [];
    
    // Sort trades chronologically
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let currentSimulatedBalance = account.startingBalance;
    const startingBalance = account.startingBalance;
    const history: Trade[] = [];
    const dataPoints = [];

    // Base point
    dataPoints.push({
      name: 'Inicio',
      balance: startingBalance,
      risk: activeSettings.baseRiskPercent,
      pnl: 0,
    });

    for (let i = 0; i < sortedTrades.length; i++) {
      const trade = sortedTrades[i];
      if (trade.status !== 'Closed') continue;

      // Calculate risk BEFORE taking this trade
      const targetProximity = {
        isEvaluation: account.status === 'Evaluation',
        targetProfitPercentage: account.targetProfitPercentage,
        averageRR: parseFloat(avgRR) || 0,
      };

      const riskResult = calculateNextRisk(
        history,
        activeSettings,
        currentSimulatedBalance,
        startingBalance,
        targetProximity
      );

      // Apply the actual PnL of this trade to our simulated balance
      currentSimulatedBalance += trade.pnl;
      history.push(trade);

      dataPoints.push({
        name: `T${i + 1}`,
        balance: currentSimulatedBalance,
        risk: riskResult.riskPercent,
        pnl: trade.pnl,
        date: new Date(trade.date).toLocaleDateString(),
        isCapped: riskResult.isCappedByTarget,
      });
    }

    return dataPoints;
  }, [trades, account, activeSettings, avgRR]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800 transition-all">
          <PlayCircle className="w-4 h-4 mr-2" />
          Ver Simulador (Backtest)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="text-indigo-500" />
            Playground de Riesgo
          </DialogTitle>
          <DialogDescription>
            Así es como tu algoritmo de riesgo se adaptó a tu historial real de trades.
          </DialogDescription>
        </DialogHeader>

        {(!account || simulationData.length <= 1) ? (
          <div className="p-8 text-center text-slate-500">
            No hay suficientes datos o trades cerrados para simular. Realiza algunos trades primero.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 items-start">
            
            {/* Chart and Stats Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Chart */}
              <div className="h-[450px] w-full bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                
                {/* Zoom Toggle */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  
                  {/* Tooltip Info */}
                  <div className="relative group flex items-center">
                    <Info className="w-4 h-4 text-slate-400 hover:text-indigo-500 transition-colors cursor-help mr-1" />
                    <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-slate-800 text-slate-200 text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none border border-slate-700 leading-relaxed">
                      <p className="mb-3">
                        <strong className="text-white block mb-1">🔍 Normal (Apagado):</strong> 
                        Muestra todo tu capital ($0 en adelante). Te ayuda al <strong>control emocional</strong>: verás que tus pérdidas actuales apenas son un rasguño comparadas con tu balance total.
                      </p>
                      <p>
                        <strong className="text-white block mb-1">🔎 Auto-Zoom (Encendido):</strong> 
                        Amplía solo la franja donde se mueve tu dinero. Ideal para <strong>auditoría técnica</strong>: te permite ver con precisión si el algoritmo te protegió bajando el riesgo justo antes de una caída fuerte.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Auto-Zoom Balance</span>
                  <button 
                    onClick={() => setAutoZoom(!autoZoom)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${autoZoom ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${autoZoom ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickMargin={10} opacity={0.5} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={(val) => `$${val}`} opacity={0.5} axisLine={false} tickLine={false} domain={autoZoom ? ['auto', 'auto'] : [0, 'auto']} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(val) => `${val}%`} opacity={0.5} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => {
                        const numValue = Number(value);
                        if (name === 'balance') return [`$${numValue.toFixed(2)}`, 'Balance'];
                        if (name === 'risk') return [`${numValue.toFixed(2)}%`, 'Riesgo Recomendado'];
                        return [value, name];
                      }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    <Line yAxisId="right" type="stepAfter" dataKey="risk" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Balance Final</span>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    ${simulationData[simulationData.length - 1].balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Riesgo Máx Tomado</span>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    {Math.max(...simulationData.map(d => d.risk)).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50">
                  <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Trades Simulados</span>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    {simulationData.length - 1}
                  </div>
                </div>
              </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-1 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[545px] flex flex-col bg-white dark:bg-slate-900/50 shadow-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Historial Detallado</h4>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Trade</th>
                      <th className="px-4 py-3">Riesgo</th>
                      <th className="px-4 py-3 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {simulationData.slice(1).map((point, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {point.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            point.isCapped 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : point.risk > activeSettings.baseRiskPercent 
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {point.risk.toFixed(2)}%
                            {point.isCapped && <AlertTriangle className="w-3 h-3 ml-1" />}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-bold text-right ${point.pnl > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {point.pnl > 0 ? '+' : ''}${Math.abs(point.pnl).toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
