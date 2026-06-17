import { DollarSign, Wallet, TrendingUp, ArrowRight, Activity, Flame, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateAccountDialog } from '@/components/accounts/CreateAccountDialog';
import { useAccounts } from '@/hooks/useAccounts';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Account } from '@/types';

export default function AccountsList() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals();

  const loading = accountsLoading || withdrawalsLoading;

  const getAccountNetWithdrawals = (account: Account) => {
    const accWithdrawals = withdrawals.filter(w => w.accountId === account.id);
    return accWithdrawals.reduce((acc, w) => {
      if (w.netAmount !== undefined) {
        return acc + w.netAmount;
      }
      const split = account.status === 'Real' ? 100 : (account.profitSplit ?? 100);
      return acc + (w.amount * split / 100);
    }, 0);
  };

  const totalCost = accounts.reduce((acc, curr) => acc + curr.cost, 0);
  const totalWithdrawals = accounts.reduce((acc, curr) => acc + curr.totalWithdrawals, 0);

  const totalNetWithdrawals = accounts.reduce((acc, account) => {
    return acc + getAccountNetWithdrawals(account);
  }, 0);

  const netProfit = totalNetWithdrawals - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  // Filter accounts by active / lost status
  const activeAccounts = accounts.filter(account => account.status !== 'Blown');
  const blownAccounts = accounts.filter(account => account.status === 'Blown');

  const renderAccountRow = (account: Account) => {
    const isFunded = account.status === 'Funded';
    const isBlown = account.status === 'Blown';
    const netWithdrawals = getAccountNetWithdrawals(account);
    const pnl = account.currentBalance - account.startingBalance;

    return (
      <Link key={account.id} to={`/accounts/${account.id}`}>
        <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border hover:border-indigo-500/40 hover:bg-muted/30 transition-all cursor-pointer group">
          {/* Status dot */}
          <div className={`size-2 rounded-full shrink-0 ${
            isFunded ? 'bg-emerald-500' : isBlown ? 'bg-red-500' : 'bg-blue-400'
          }`} />

          {/* Nombre + firma */}
          <div className="min-w-0 flex-[2]">
            <p className="font-semibold text-sm truncate">{account.name}</p>
            <p className="text-xs text-muted-foreground">{account.firm}</p>
          </div>

          {/* Badge */}
          <div className="shrink-0 hidden sm:block">
            <Badge
              variant={isFunded ? 'success' : isBlown ? 'destructive' : account.status === 'Real' ? 'default' : 'info'}
              className="text-[11px]"
            >
              {account.status === 'Real' ? 'Real' : account.status}
            </Badge>
          </div>

          {/* Balance */}
          <div className="text-right shrink-0 hidden md:block w-28">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`text-sm font-semibold ${account.currentBalance >= account.startingBalance ? 'text-emerald-500' : 'text-rose-500'}`}>
              ${account.currentBalance.toLocaleString()}
            </p>
          </div>

          {/* PNL */}
          <div className="text-right shrink-0 hidden md:block w-24">
            <p className="text-xs text-muted-foreground">P&L</p>
            <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}
            </p>
          </div>

          {/* Costo */}
          <div className="text-right shrink-0 hidden lg:block w-20">
            <p className="text-xs text-muted-foreground">Costo</p>
            <p className="text-sm font-semibold">${account.cost}</p>
          </div>

          {/* Retiros neto */}
          <div className="text-right shrink-0 hidden lg:block w-28">
            <p className="text-xs text-muted-foreground">Retiros neto</p>
            <p className="text-sm font-semibold text-emerald-500">
              ${netWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <ArrowRight className="size-4 text-muted-foreground group-hover:text-indigo-400 transition-colors shrink-0 ml-auto" />
        </div>
      </Link>
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

        {/* Header de columnas */}
        {!loading && (
          <div className="flex items-center gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="size-2 shrink-0" />
            <div className="flex-[2]">Cuenta</div>
            <div className="shrink-0 hidden sm:block w-20">Estado</div>
            <div className="text-right shrink-0 hidden md:block w-28">Balance</div>
            <div className="text-right shrink-0 hidden md:block w-24">P&L</div>
            <div className="text-right shrink-0 hidden lg:block w-20">Costo</div>
            <div className="text-right shrink-0 hidden lg:block w-28">Retiros neto</div>
            <div className="size-4 shrink-0 ml-auto" />
          </div>
        )}

        {/* Estado de carga */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
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
                <div className="flex flex-col gap-1.5">
                  {activeAccounts.map(renderAccountRow)}
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
                <div className="flex flex-col gap-1.5">
                  {blownAccounts.map(renderAccountRow)}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

