import { DollarSign, Wallet, TrendingUp, ArrowRight, Activity, Flame, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateAccountDialog } from '@/components/accounts/CreateAccountDialog';
import { useAccounts } from '@/hooks/useAccounts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Account } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

export default function AccountsList() {
  const { user } = useAuthStore();
  console.log(user)
  const { data: accounts = [], isLoading: loading } = useAccounts();

  const totalCost = accounts.reduce((acc, curr) => acc + curr.cost, 0);
  const totalWithdrawals = accounts.reduce((acc, curr) => acc + curr.totalWithdrawals, 0);

  const totalNetWithdrawals = accounts.reduce((acc, curr) => {
    const split = curr.status === 'Real' ? 100 : (curr.profitSplit ?? 100);
    const net = curr.totalWithdrawals * split / 100;
    return acc + net;
  }, 0);

  const netProfit = totalNetWithdrawals - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  // Filter accounts by active / lost status
  const activeAccounts = accounts.filter(account => account.status !== 'Blown');
  const blownAccounts = accounts.filter(account => account.status === 'Blown');

  const renderAccountCard = (account: Account) => {
    const isFunded = account.status === 'Funded';
    const isBlown = account.status === 'Blown';

    return (
      <Card key={account.id} className="flex flex-col hover:border-indigo-500/50 transition-colors shadow-sm duration-200">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-bold truncate text-slate-900 dark:text-white" title={account.name}>
                {account.name}
              </CardTitle>
              <CardDescription className="mt-1 truncate">
                {account.firm} • ${account.startingBalance.toLocaleString()}
              </CardDescription>
            </div>
            <Badge
              variant={isFunded ? 'success' : isBlown ? 'destructive' : account.status === 'Real' ? 'default' : 'info'}
              className="shrink-0"
            >
              {account.status === 'Real' ? 'Real' : account.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="py-4 flex-1">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Balance Actual</span>
              <span className={`font-semibold ${account.currentBalance >= account.startingBalance ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${account.currentBalance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Costo</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ${account.cost}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Retiros (Neto)</span>
              <span className="font-semibold text-emerald-500">
                ${(account.totalWithdrawals * (account.status === 'Real' ? 100 : (account.profitSplit ?? 100)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Retiros (Bruto)</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                ${account.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  };

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
              ${totalNetWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
            <CardDescription className="text-xs mt-1 text-slate-400">
              Monto Bruto: ${totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardDescription>
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

      {/* Tabs de Cuentas */}
      <Tabs defaultValue="active" className="space-y-6">
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/50 p-1 border-0">
            <TabsTrigger value="active" className="gap-2 px-4 py-1.5 text-sm">
              <Activity className="size-4 text-emerald-500" />
              <span>Cuentas Activas</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-100">
                {activeAccounts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-2 px-4 py-1.5 text-sm">
              <Flame className="size-4 text-rose-500" />
              <span>Cuentas Perdidas</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-100">
                {blownAccounts.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Estado de carga */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
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
          </div>
        ) : (
          <>
            <TabsContent value="active" className="mt-0 outline-none">
              {activeAccounts.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                  <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-3 mb-4">
                    <Wallet className="size-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay cuentas activas</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Crea tu primera cuenta para empezar a registrar y analizar tus operaciones de trading.
                  </p>
                  <div className="mt-6">
                    <CreateAccountDialog />
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeAccounts.map(renderAccountCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="lost" className="mt-0 outline-none">
              {blownAccounts.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3 mb-4">
                    <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">¡Todo excelente!</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    No tienes ninguna cuenta quemada. Tu disciplina y gestión de riesgo están dando frutos. ¡Sigue así!
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blownAccounts.map(renderAccountCard)}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

