import { useTrades } from "@/hooks/useTrades";
import { Account } from "@/types";
import { Decimal } from 'decimal.js';
import { Card, CardContent } from "../ui/card";
import { Loader2, ShieldAlert, Target, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { useUpdateAccount } from "@/hooks/useAccounts";
import { toast } from "sonner";

export default function EvaluationPanel({ account, viewPhase } : { account: Account, viewPhase: number }) {
  
    const { data: trades = [], isLoading: tradesLoading } = useTrades(account.id);
    const { mutateAsync: updateAccountMutation, isPending: updating } = useUpdateAccount();
    
    const isEval = account.status === 'Evaluation';
    const phaseTrades = trades.filter(t => t.phase === viewPhase);

    const closedTrades = phaseTrades.filter(t => t.status === 'Closed' || t.exitPrice !== undefined);

    const pnlNetoDecimal = closedTrades.reduce((acc, t) => acc.plus(new Decimal(t.pnl || 0)), new Decimal(0));
    const pnlNeto = pnlNetoDecimal.toNumber();
  
    const activeTargetProfitPercentage = viewPhase === 2 && account.targetProfitPercentagePhase2
      ? account.targetProfitPercentagePhase2
      : account.targetProfitPercentage;
      
    const activeMaxDrawdownPercentage = viewPhase === 2 && account.maxDrawdownPercentagePhase2
      ? account.maxDrawdownPercentagePhase2
      : account.maxDrawdownPercentage;
  
    const targetProfitAmount = isEval && activeTargetProfitPercentage 
      ? new Decimal(account.startingBalance).times(new Decimal(activeTargetProfitPercentage).div(100)).toNumber() 
      : null;
    const maxDrawdownAmount = isEval && activeMaxDrawdownPercentage 
      ? new Decimal(account.startingBalance).times(new Decimal(activeMaxDrawdownPercentage).div(100)).toNumber() 
      : null;
    
    const profitProgress = targetProfitAmount && pnlNeto > 0 
      ? Decimal.min(new Decimal(pnlNeto).div(targetProfitAmount).times(100), 100).toNumber() 
      : 0;
      
    const drawdownProgress = maxDrawdownAmount && pnlNeto < 0 
      ? Decimal.min(new Decimal(Math.abs(pnlNeto)).div(maxDrawdownAmount).times(100), 100).toNumber() 
      : 0;

    const handleMarkBlown = async () => {
      if (!account) return;
      try {
        await updateAccountMutation({
          id: account.id,
          fields: { status: 'Blown' }
        });
        toast.error('Cuenta Quemada', { description: 'Has excedido el límite de pérdida o roto una regla.' });
      } catch {
        toast.error('Error', { description: 'No se pudo actualizar la cuenta.' });
      }
    };

    const handlePromotePhase = async () => {
        if (!account) return;
        try {
          const isLastPhase = account.phase && account.totalPhases && account.phase >= account.totalPhases;
          if (isLastPhase) {
            await updateAccountMutation({
              id: account.id,
              fields: { status: 'Funded' }
            });
            toast.success('¡Felicidades!', { description: 'Cuenta aprobada y fondeada.' });
          } else {
            await updateAccountMutation({
              id: account.id,
              fields: { 
                phase: (account.phase || 1) + 1,
                currentBalance: account.startingBalance,
                equity: account.startingBalance
              }
            });
            toast.success('¡Fase superada!', { description: `Avanzaste a la fase ${(account.phase || 1) + 1}.` });
          }
        } catch {
          toast.error('Error', { description: 'No se pudo actualizar la cuenta.' });
        }
    };

    if (tradesLoading) {
      return (
          <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Cargando evaluación...
          </div>
      )
    }

    if (isEval && (targetProfitAmount || maxDrawdownAmount)) {
        return (
            <Card className="relative border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 shadow-sm overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                        <Target className="size-5 text-indigo-500" /> Objetivos de Evaluación
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Fase: <span className="font-semibold text-slate-700 dark:text-slate-200">{viewPhase}</span> de <span className="font-semibold text-slate-700 dark:text-slate-200">{account.totalPhases || 1}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {viewPhase === (account.phase || 1) ? (
                            <>
                                <button 
                                onClick={handleMarkBlown}
                                disabled={updating}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer disabled:opacity-50"
                                >
                                {updating ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />} 
                                Marcar Quemada
                                </button>
                                {profitProgress >= 100 && (
                                <button
                                    onClick={handlePromotePhase}
                                    disabled={updating}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {updating ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
                                    {account.phase && account.totalPhases && account.phase >= account.totalPhases ? 'Aprobar Cuenta (Funded)' : 'Promover a Siguiente Fase'}
                                </button>
                                )}
                            </>
                        ) : (
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-semibold flex items-center gap-2 border border-slate-200 dark:border-slate-700/50">
                                <Target className="size-4 opacity-70" /> Fase Histórica (Lectura)
                            </div>
                        )}
                    </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Target Profit */}
                    {targetProfitAmount && (
                        <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <div>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <TrendingUp className="size-4 text-emerald-500" />
                                Profit Target ({activeTargetProfitPercentage}%)
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                ${targetProfitAmount.toLocaleString()}
                            </p>
                            </div>
                            <div className="text-right">
                            <span className={`font-bold ${pnlNeto >= targetProfitAmount ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                ${Math.max(pnlNeto, 0).toLocaleString()}
                            </span>
                            <span className="text-slate-400 text-sm"> / ${targetProfitAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${profitProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${profitProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 text-right">
                            {profitProgress >= 100 ? '¡Objetivo alcanzado!' : `Faltan $${(targetProfitAmount - Math.max(pnlNeto, 0)).toLocaleString()} para aprobar`}
                        </p>
                        </div>
                    )}

                    {/* Max Drawdown */}
                    {maxDrawdownAmount && (
                        <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <div>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <TrendingDown className="size-4 text-rose-500" />
                                Max Drawdown ({activeMaxDrawdownPercentage}%)
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                -${maxDrawdownAmount.toLocaleString()}
                            </p>
                            </div>
                            <div className="text-right">
                            <span className={`font-bold ${pnlNeto <= -maxDrawdownAmount ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                -${Math.abs(Math.min(pnlNeto, 0)).toLocaleString()}
                            </span>
                            <span className="text-slate-400 text-sm"> / -${maxDrawdownAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${drawdownProgress >= 100 ? 'bg-rose-500' : drawdownProgress > 75 ? 'bg-orange-500' : 'bg-rose-400'}`}
                            style={{ width: `${drawdownProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 text-right">
                            {drawdownProgress >= 100 ? 'Límite de pérdida excedido' : `Margen restante: $${(maxDrawdownAmount - Math.abs(Math.min(pnlNeto, 0))).toLocaleString()}`}
                        </p>
                        </div>
                    )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return null;
}