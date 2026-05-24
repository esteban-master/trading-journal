import { useJournalStore } from '@/store/useJournalStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle, CheckCircle2, TrendingDown, BedDouble } from 'lucide-react';

export default function RiskManager() {
  const accounts = useJournalStore(state => state.accounts);
  const trades = useJournalStore(state => state.trades);

  // Lógica heurística de riesgo

  // 1. Encontrar la cuenta con mejor rendimiento reciente (últimos 3 trades)
  // 2. Detectar rachas perdedoras (e.g., 3 pérdidas seguidas globales)
  // 3. Detectar cuentas cerca del límite de drawdown (e.g. balance < 95% del startingBalance, asumiendo max drawdown 10%)

  // Racha global
  const recentTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  const isGlobalLosingStreak = recentTrades.length === 3 && recentTrades.every(t => t.pnl < 0);

  const getAccountAnalysis = (account: any) => {
    const pnlNeto = account.currentBalance - account.startingBalance;
    const drawdownPct = account.currentBalance < account.startingBalance 
      ? ((account.startingBalance - account.currentBalance) / account.startingBalance) * 100 
      : 0;
    
    // Asumimos un max trailing/drawdown del 10% para simplificar
    const isNearDrawdown = drawdownPct > 7.5; 
    
    const accountTrades = trades.filter(t => t.accountId === account.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const accountLosingStreak = accountTrades.slice(0, 3).length === 3 && accountTrades.slice(0, 3).every(t => t.pnl < 0);

    if (isGlobalLosingStreak) {
       return { status: 'danger', icon: BedDouble, text: 'Racha global negativa. Día de descanso obligatorio o simulador.' };
    }
    
    if (isNearDrawdown) {
       return { status: 'warning', icon: AlertTriangle, text: 'Riesgo Crítico. Reduce el tamaño de tu lote a la mitad (Micro contratos).' };
    }

    if (accountLosingStreak) {
       return { status: 'warning', icon: TrendingDown, text: 'Acostar Cuenta. Tienes 3 pérdidas seguidas aquí. Opera en otra.' };
    }

    if (pnlNeto > 0) {
      return { status: 'success', icon: CheckCircle2, text: 'Cuenta fuerte. Ideal para operar con riesgo normal hoy.' };
    }

    return { status: 'neutral', icon: CheckCircle2, text: 'Cuenta estable. Procede con tu plan de trading estándar.' };
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'danger': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'success': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldAlert className="size-8 text-amber-500" />
          Gestión de Riesgo Inteligente
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          El sistema analiza tus cuentas para sugerirte la mejor estrategia de mitigación de riesgo (Acostar cuentas).
        </p>
      </div>

      {isGlobalLosingStreak && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4">
          <div className="p-3 bg-rose-500 text-white rounded-full mt-1">
            <BedDouble className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">¡Alerta de Racha Negativa Global!</h3>
            <p className="text-sm text-rose-500 mt-1 font-medium">Has perdido tus últimos 3 trades consecutivos en general. Estadísticamente, operar hoy aumenta un 70% la probabilidad de venganza (revenge trading). Te sugerimos cerrar las pantallas por hoy.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.filter(a => a.status !== 'Blown').map((account) => {
          const analysis = getAccountAnalysis(account);
          const Icon = analysis.icon;
          
          return (
            <Card key={account.id} className={`border-2 ${analysis.status === 'warning' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : analysis.status === 'danger' ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : ''}`}>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">{account.name}</CardTitle>
                  <Badge variant="outline" className={getStatusColor(analysis.status)}>
                    Evaluación de Riesgo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Icon className={`size-5 mt-0.5 ${
                    analysis.status === 'danger' ? 'text-rose-500' :
                    analysis.status === 'warning' ? 'text-amber-500' :
                    analysis.status === 'success' ? 'text-emerald-500' : 'text-slate-400'
                  }`} />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {analysis.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
