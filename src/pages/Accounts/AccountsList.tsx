import { DollarSign, Wallet, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateAccountDialog } from '@/components/accounts/CreateAccountDialog';
import { useAccounts } from '@/hooks/useAccounts';

export default function AccountsList() {
  const { data: accounts = [], isLoading: loading } = useAccounts();

  const totalCost = accounts.reduce((acc, curr) => acc + curr.cost, 0);
  const totalWithdrawals = accounts.reduce((acc, curr) => acc + curr.totalWithdrawals, 0);
  const netProfit = totalWithdrawals - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Portafolio de Cuentas
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Gestiona tus evaluaciones y cuentas fondeadas. Controla tu ROI global.
          </p>
        </div>
        <CreateAccountDialog />
      </div>

      {/* Métricas Globales */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              Inversión Total (Costo)
              <Wallet className="size-4 text-slate-400" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">${totalCost.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              Retiros Totales (Payouts)
              <DollarSign className="size-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-500">
              ${totalWithdrawals.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
              ROI Global
              <TrendingUp className={`size-4 ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            </CardDescription>
            <CardTitle className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Estado de carga */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="pb-4 border-b border-border">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent className="py-4 flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
        {accounts.map((account) => {
          const isFunded = account.status === 'Funded';
          const isBlown = account.status === 'Blown';
          
          return (
            <Card key={account.id} className="flex flex-col hover:border-indigo-500/50 transition-colors">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{account.name}</CardTitle>
                    <CardDescription className="mt-1">{account.firm} • ${account.startingBalance.toLocaleString()}</CardDescription>
                  </div>
                  <Badge 
                    variant={isFunded ? 'success' : isBlown ? 'destructive' : 'info'}
                  >
                    {account.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="py-4 flex-1">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Balance Actual</span>
                    <span className={`font-semibold ${account.currentBalance >= account.startingBalance ? 'text-emerald-500' : 'text-rose-500'}`}>
                      ${account.currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Costo</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ${account.cost}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Retiros Totales</span>
                    <span className="font-semibold text-emerald-500">
                      ${account.totalWithdrawals.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 pt-0 mt-auto">
                <Link to={`/accounts/${account.id}`} className="w-full">
                  <button className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer">
                    Ver Detalles <ArrowRight className="size-4" />
                  </button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
