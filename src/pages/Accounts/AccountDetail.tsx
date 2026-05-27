import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAccountDetail } from '@/hooks/useAccounts';
import { useTrades } from '@/hooks/useTrades';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import {
  ArrowLeft,
  Activity,
  Plus,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  ShieldAlert,
  TrendingUp,
  Search,
  DollarSign,
  Percent,
  Scale,
  Sparkles,
  Coins,
  Briefcase,
  Landmark,
} from 'lucide-react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Decimal } from 'decimal.js';

import { Trade } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { formatDate } from '@/lib/formatDate';
import EvaluationPanel from '@/components/accounts/EvaluationPanel';
import { CreateWithdrawalDialog } from '@/components/accounts/CreateWithdrawalDialog';

// Definición de columnas para TanStack Table
const columns: ColumnDef<Trade>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          Fecha
          <ChevronsUpDown className="size-3.5 text-muted-foreground ml-1" />
        </button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('date'));
      return (
        <span className="text-slate-500 font-medium dark:text-slate-400">
          {formatDate({ size: 'xxsminute', date })}
        </span>
      );
    },
  },
  {
    accessorKey: 'asset',
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          Activo
          <ChevronsUpDown className="size-3.5 text-muted-foreground ml-1" />
        </button>
      );
    },
    cell: ({ row }) => {
      const asset: string = row.getValue('asset');
      return (
        <span className="font-bold tracking-tight text-slate-800 dark:text-slate-200">
          {asset.toUpperCase()}
        </span>
      );
    },
  },
  {
    accessorKey: 'direction',
    header: 'Dirección',
    cell: ({ row }) => {
      const direction: 'Long' | 'Short' = row.getValue('direction');
      const isLong = direction === 'Long';
      return (
        <Badge
          variant="outline"
          className={cn(
            "font-semibold transition-all duration-300",
            isLong
              ? 'text-emerald-500 border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/30'
              : 'text-rose-500 border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-950/30'
          )}
        >
          {direction}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'strategy',
    header: 'Estrategia',
    cell: ({ row }) => {
      const strategy: string = row.getValue('strategy');
      return strategy ? (
        <Badge variant="secondary" className="font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
          {strategy}
        </Badge>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
  {
    accessorKey: 'riskRewardRatio',
    header: 'R:R',
    cell: ({ row }) => {
      const rr: number = row.getValue('riskRewardRatio');
      return rr ? (
        <span className="text-slate-650 dark:text-slate-350 font-medium">
          1:{rr}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
  {
    accessorKey: 'pnl',
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          PnL
          <ChevronsUpDown className="size-3.5 text-muted-foreground ml-1" />
        </button>
      );
    },
    cell: ({ row }) => {
      const pnl = parseFloat(row.getValue('pnl'));
      const isPositive = pnl >= 0;
      return (
        <span
          className={cn(
            "font-extrabold tracking-tight tabular-nums",
            isPositive ? 'text-emerald-500' : 'text-rose-500'
          )}
        >
          {isPositive ? '+' : ''}${pnl.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    id: 'images',
    header: 'Capturas',
    cell: ({ row }) => {
      const images: string[] = row.original.images || [];
      if (images.length === 0) return <span className="text-slate-400 text-xs">—</span>;

      return (
        <TooltipProvider>
          <Tooltip delayDuration={150}>
            <Dialog>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <button className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:text-indigo-655 dark:text-slate-400 dark:hover:text-indigo-400 transition-all cursor-pointer shadow-xs hover:scale-105 duration-200 active:scale-95">
                    <ImageIcon className="size-4" />
                    {images.length > 1 && (
                      <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {images.length}
                      </span>
                    )}
                  </button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="p-1 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl rounded-xl w-48 transition-all duration-300">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                  <img
                    src={images[0]}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white text-center font-semibold">
                    Clic para ampliar
                  </div>
                </div>
              </TooltipContent>
              <DialogContent className="max-w-4xl p-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="size-5 text-indigo-500" />
                    Capturas del Trade - {row.original.asset.toUpperCase()}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500">
                    Registrado el {new Date(row.original.date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })} • {row.original.strategy || 'Sin estrategia'}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-col gap-4">
                  {images.length === 1 ? (
                    <div className="relative aspect-video max-h-[60vh] w-full overflow-hidden rounded-xl border border-slate-250 dark:border-slate-850 shadow-lg bg-slate-950 flex items-center justify-center">
                      <img
                        src={images[0]}
                        alt="Screenshot"
                        className="object-contain max-w-full max-h-full"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {images.map((imgUrl, idx) => (
                          <div key={idx} className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-md bg-slate-950 flex items-center justify-center group hover:border-indigo-500/50 transition-all duration-300">
                            <img
                              src={imgUrl}
                              alt={`Captura ${idx + 1}`}
                              className="object-contain max-w-full max-h-full"
                            />
                            <a
                              href={imgUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold">
                              Imagen {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: account, isLoading: accountLoading, error: accountError } = useAccountDetail(id);
  const { data: trades = [], isLoading: tradesLoading } = useTrades(id);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals(id);

  const loading = accountLoading || tradesLoading || withdrawalsLoading;

  const error = accountError ? 'No se pudo cargar la cuenta. Verifica tu conexión.' : (account === null && !accountLoading ? 'La cuenta no existe.' : null);

  // Estado para la fase seleccionada en la vista (por defecto Fase 1 hasta que cargue la cuenta)
  const [viewPhase, setViewPhase] = useState<number>(1);

  // Mantener la fase de vista sincronizada cuando la cuenta cambia o se carga por primera vez
  useEffect(() => {
    if (account) {
      if (account.status === 'Funded') {
        setViewPhase(3);
      } else if (account.phase) {
        setViewPhase(account.phase);
      }
    }
  }, [account]);


  // --- Estados de UI ---
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  // --- Aislamiento de Fases ---
  // Filtramos los trades para mostrar y calcular solo los que pertenecen a la fase que estamos viendo.
  // A los trades antiguos que no tienen fase, se les asigna fase 1 por defecto.
  const phaseTrades = useMemo(() => {
    if (account?.status === 'Real') return trades;
    return trades.filter(t => (t.phase || 1) === viewPhase);
  }, [trades, viewPhase, account?.status]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: phaseTrades,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (value === undefined || value === null) return false;
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="size-8 animate-spin text-indigo-500" />
        <p className="text-slate-500 text-sm">Cargando cuenta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="size-8 text-rose-500" />
        <p className="text-rose-500 font-semibold">{error}</p>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-2 text-indigo-500 hover:underline text-sm"
        >
          Volver a Mis Cuentas
        </button>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold text-slate-700">Cuenta no encontrada</h2>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-4 text-indigo-500 hover:underline"
        >
          Volver a Mis Cuentas
        </button>
      </div>
    );
  }

  const isFunded = account.status === 'Funded';
  const isBlown = account.status === 'Blown';

  // --- Cálculos dinámicos avanzados de Trades ---
  const closedTrades = phaseTrades.filter(t => t.status === 'Closed' || t.exitPrice !== undefined);
  const totalTradesCount = closedTrades.length;

  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);
  const winRate = totalTradesCount > 0 ? Math.round((winningTrades.length / totalTradesCount) * 100) : 0;

  // Usar Decimal para calcular el PnL Neto y Balance Actual dinámicamente
  const pnlNetoDecimal = closedTrades.reduce((acc, t) => acc.plus(new Decimal(t.pnl || 0)), new Decimal(0));
  const pnlNeto = pnlNetoDecimal.toNumber();

  const isRealOrFundedPhase = account.status === 'Real' || viewPhase === 3;
  const applicableWithdrawals = isRealOrFundedPhase ? withdrawals : [];

  const withdrawalsTotalDecimal = applicableWithdrawals.reduce((acc, w) => acc.plus(new Decimal(w.amount || 0)), new Decimal(0));
  
  const totalNetWithdrawals = applicableWithdrawals.reduce((acc, w) => {
    const split = account.status === 'Real' ? 100 : (account.profitSplit ?? 100);
    return acc.plus(new Decimal(w.netAmount || (w.amount * split / 100) || 0));
  }, new Decimal(0)).toNumber();
  const costOrOne = account.cost > 0 ? account.cost : 1;
  const roi = ((totalNetWithdrawals / costOrOne) * 100).toFixed(1);

  const currentBalanceDecimal = new Decimal(account.startingBalance).plus(pnlNetoDecimal).minus(withdrawalsTotalDecimal);
  const currentBalance = currentBalanceDecimal.toNumber();

  const equity = account.equity !== undefined && account.equity !== null && account.equity !== account.currentBalance
    ? new Decimal(account.equity).toNumber()
    : currentBalance;

  const grossProfitDecimal = winningTrades.reduce((acc, t) => acc.plus(new Decimal(t.pnl || 0)), new Decimal(0));

  const grossLossDecimal = losingTrades.reduce((acc, t) => acc.plus(new Decimal(Math.abs(t.pnl || 0))), new Decimal(0));

  const profitFactor = grossLossDecimal.gt(0)
    ? grossProfitDecimal.div(grossLossDecimal).toFixed(2)
    : grossProfitDecimal.gt(0) ? 'Max' : '0.00';

  const avgWin = winningTrades.length > 0 ? grossProfitDecimal.div(winningTrades.length).toNumber() : 0;
  const avgLoss = losingTrades.length > 0 ? grossLossDecimal.div(losingTrades.length).toNumber() : 0;

  const tradesWithRR = closedTrades.filter(t => t.riskRewardRatio > 0);
  const avgRR = tradesWithRR.length > 0
    ? (tradesWithRR.reduce((acc, t) => acc + t.riskRewardRatio, 0) / tradesWithRR.length).toFixed(1)
    : '0.0';

  // Rachas consecutivas (cronológicas)
  const cronTrades = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  cronTrades.forEach(t => {
    if (t.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (t.pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  });

  // Puntos para la Curva de Equity Dinámica
  const equityPoints = [{ date: 'Inicio', balance: account.startingBalance }];
  let runningBalanceDecimal = new Decimal(account.startingBalance);

  const cronEvents = [
    ...closedTrades.map(t => ({ type: 'trade', date: new Date(t.date).getTime(), pnl: t.pnl || 0 })),
    ...applicableWithdrawals.map(w => ({ type: 'withdrawal', date: new Date(w.date).getTime(), pnl: -w.amount }))
  ].sort((a, b) => a.date - b.date);

  cronEvents.forEach(evt => {
    runningBalanceDecimal = runningBalanceDecimal.plus(new Decimal(evt.pnl));
    const dateObj = new Date(evt.date);
    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    equityPoints.push({
      date: formattedDate,
      balance: runningBalanceDecimal.toNumber()
    });
  });

  if (equityPoints.length === 1) {
    equityPoints.push({
      date: 'Actual',
      balance: currentBalance
    });
  }

  // Distribución por Activos
  const assetsDataMap: Record<string, { count: number, wins: number, profit: Decimal }> = {};
  closedTrades.forEach(t => {
    const assetName = t.asset.toUpperCase();
    if (!assetsDataMap[assetName]) {
      assetsDataMap[assetName] = { count: 0, wins: 0, profit: new Decimal(0) };
    }
    assetsDataMap[assetName].count++;
    if (t.pnl > 0) assetsDataMap[assetName].wins++;
    assetsDataMap[assetName].profit = assetsDataMap[assetName].profit.plus(new Decimal(t.pnl || 0));
  });

  const assetsArray = Object.entries(assetsDataMap).map(([name, data]) => ({
    name,
    count: data.count,
    winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0,
    profit: data.profit.toNumber()
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  const balances = equityPoints.map(p => p.balance);
  const maxVal = Math.max(...balances, account.startingBalance) * 1.002;
  const minVal = Math.min(...balances, account.startingBalance) * 0.998;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/accounts"
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              {account.name}
              <Badge variant={isFunded ? 'success' : isBlown ? 'destructive' : account.status === 'Real' ? 'default' : 'info'}>
                {account.status === 'Real' ? 'Real' : account.status}
              </Badge>
            </h1>
            <p className="text-sm text-slate-500">
              {account.firm} • Creada el {new Date(account.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Phase Selector Tabs */}
        {account.status !== 'Real' && (
          <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
            <Tabs defaultValue="1" value={String(viewPhase)} onValueChange={(v) => setViewPhase(Number(v))}>
              <TabsList className="bg-transparent">
                <TabsTrigger value="1" className="data-[state=active]:shadow-sm">Fase 1</TabsTrigger>
                {(account.totalPhases ?? 1) >= 2 && (
                  <TabsTrigger value="2" className="data-[state=active]:shadow-sm" disabled={account.status !== 'Funded' && (account.phase || 1) < 2}>
                    Fase 2
                  </TabsTrigger>
                )}
                {account.status === 'Funded' && (
                  <TabsTrigger value="3" className="data-[state=active]:text-emerald-600 data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/30 data-[state=active]:shadow-sm">
                    Funded
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Panel de Evaluación (Condicional) */}
      {account.status !== 'Real' && <EvaluationPanel account={account} viewPhase={viewPhase} />}

      {/* Grid de Métricas Clave al estilo Dashboard */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

        {/* Card 1: Balance & Equity */}
        <Card className="relative overflow-hidden group hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="size-16 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Balance Actual</span>
              <Badge variant={pnlNeto >= 0 ? "success" : "destructive"} className="text-[10px] px-1.5 py-0.5 select-none font-bold">
                {pnlNeto >= 0 ? <TrendingUp className="mr-0.5 size-3" /> : <TrendingDown className="mr-0.5 size-3" />}
                {pnlNeto >= 0 ? '+' : ''}{((pnlNeto / (account.startingBalance || 1)) * 100).toFixed(1)}%
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              ${currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-end justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Equity: ${equity.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>

              {/* Sparkline de Equity */}
              <div className="h-10 w-24 select-none">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
                  <path
                    d={
                      equityPoints.length > 2
                        ? `M ${equityPoints.map((pt, idx) => `${(idx / (equityPoints.length - 1)) * 120},${40 - ((pt.balance - minVal) / (maxVal - minVal || 1)) * 30 - 5}`).join(' L ')}`
                        : "M 0 35 Q 30 25, 60 20 T 120 15"
                    }
                    fill="none"
                    stroke="url(#balanceGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor={pnlNeto >= 0 ? "#34d399" : "#f87171"} />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-emerald-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>

        {/* Card 2: Win Rate */}
        <Card className="relative overflow-hidden group hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Percent className="size-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Win Rate</span>
              <Badge variant={winRate >= 50 ? "success" : "warning"} className="text-[10px] px-1.5 py-0.5 font-bold">
                {winningTrades.length} W - {losingTrades.length} L
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              {winRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Total: {totalTradesCount} operaciones
              </span>

              {/* Radial Progress */}
              <div className="relative size-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="transparent"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="transparent"
                    className={cn(
                      "transition-all duration-500",
                      winRate >= 50 ? "stroke-emerald-500" : "stroke-amber-500"
                    )}
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - winRate / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {winRate}%
                </span>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>

        {/* Card 3: Profit Factor */}
        <Card className="relative overflow-hidden group hover:border-blue-500/50 dark:hover:border-blue-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="size-16 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Profit Factor</span>
              <Badge
                variant={profitFactor === 'Max' || parseFloat(profitFactor) >= 2.0 ? "success" : parseFloat(profitFactor) >= 1.0 ? "info" : "destructive"}
                className="text-[10px] px-1.5 py-0.5 font-bold"
              >
                {profitFactor === 'Max' || parseFloat(profitFactor) >= 2.0 ? 'Excelente' : parseFloat(profitFactor) >= 1.0 ? 'Saludable' : 'Critico'}
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              {profitFactor}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Objetivo sugerido: &gt; 1.5</span>
                <span className="font-semibold text-blue-500 font-mono">Factor: {profitFactor}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    profitFactor === 'Max' || parseFloat(profitFactor) >= 2.0 ? "bg-emerald-500" : parseFloat(profitFactor) >= 1.0 ? "bg-blue-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.min((parseFloat(profitFactor) || 0) * 40, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>

        {/* Card 4: Riesgo / Beneficio Promedio */}
        <Card className="relative overflow-hidden group hover:border-amber-500/50 dark:hover:border-amber-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Scale className="size-16 text-amber-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Riesgo / Beneficio Prom.</span>
              <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 font-bold">
                Salud
              </Badge>
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              1 : {avgRR}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>R:R Promedio</span>
                <span className="text-amber-500 font-semibold">{parseFloat(avgRR) >= 1.5 ? 'Excelente' : 'Ajustable'}</span>
              </div>
              <div className="flex h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500/80" style={{ width: `${100 / (1 + parseFloat(avgRR) || 1)}%` }}></div>
                <div className="h-full bg-emerald-500" style={{ width: `${(parseFloat(avgRR) / (1 + parseFloat(avgRR) || 1)) * 100}%` }}></div>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </Card>
      </div>

      {/* Tabs Principales de Visualización de Cuenta */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <TabsList className="p-0 bg-transparent gap-2 h-auto">
            <TabsTrigger
              value="overview"
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-bold"
            >
              <Activity className="size-4 mr-1.5" />
              Vista General
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-bold"
            >
              <Scale className="size-4 mr-1.5" />
              Estadísticas Operativas
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 transition-all font-bold"
            >
              <Briefcase className="size-4 mr-1.5" />
              Operaciones ({phaseTrades.length})
            </TabsTrigger>
            {(account.status === 'Real' || account.status === 'Funded') && (
              <TabsTrigger
                value="withdrawals"
                className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-emerald-500 rounded-none bg-transparent shadow-none dark:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition-all font-bold"
              >
                <Landmark className="size-4 mr-1.5" />
                Retiros ({withdrawals.length})
              </TabsTrigger>
            )}
          </TabsList>

          <span className="hidden sm:inline-flex items-center text-xs text-indigo-400 font-semibold select-none">
            <Sparkles className="size-3 mr-1 animate-pulse" />
            Actualización Activa
          </span>
        </div>

        {/* TAB 1: VISTA GENERAL (Gráfico Equity + Distribución por Activos) */}
        <TabsContent value="overview" className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-6">

          {/* Gráfico de Equity Dinámico */}
          <Card className="lg:col-span-2 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Curva de Equity (Balance en Tiempo Real)
                </CardTitle>
                <CardDescription>
                  Representación gráfica del crecimiento de capital en tu cuenta trade a trade.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 text-xs font-semibold">
                {equityPoints.length - 1} operaciones
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[260px] flex items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/50 p-2 overflow-hidden">
                {equityPoints.length > 0 ? (
                  <ChartContainer
                    config={{
                      balance: {
                        label: "Balance",
                        color: "var(--chart-2)",
                      },
                    } satisfies ChartConfig}
                    className="w-full h-full"
                  >
                    <AreaChart
                      data={equityPoints}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800/60" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={30}
                        className="text-[10px] font-bold fill-slate-455 dark:fill-slate-500"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        className="text-[10px] font-bold fill-slate-400"
                        width={60}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => payload[0]?.payload?.date} />}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--color-balance)"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={3}
                        activeDot={{ r: 6, className: "fill-indigo-500 stroke-white dark:stroke-slate-950 stroke-2" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="text-slate-400 text-sm">No hay datos suficientes para el gráfico.</div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/40 mt-2 pt-4">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="size-3.5 text-emerald-500" />
                Crecimiento neto total de <strong className={cn(pnlNeto >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {pnlNeto >= 0 ? '+' : ''}${pnlNeto.toLocaleString()}
                </strong>
              </span>
              <span className="text-slate-455 dark:text-slate-500 text-[11px] font-semibold">
                Balance Inicial: ${account.startingBalance.toLocaleString()}
              </span>
            </CardFooter>
          </Card>

          {/* Operativa por Activo */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Operativa por Activo
              </CardTitle>
              <CardDescription>
                Rendimiento de los pares y activos más operados en mercado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 mt-2">
              {assetsArray.length === 0 ? (
                <div className="text-center py-12 text-slate-455 text-sm">
                  Registra trades para ver estadísticas por activo.
                </div>
              ) : (
                assetsArray.map((asset, idx) => {
                  const isAssetPositive = asset.profit >= 0;
                  const colors = ["bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-emerald-500"];
                  const assetColor = colors[idx % colors.length];

                  return (
                    <div key={asset.name} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${assetColor}`} />
                          <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{asset.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({asset.count} trades)</span>
                        </div>
                        <Badge variant={isAssetPositive ? "success" : "destructive"} className="text-[10px] font-extrabold select-none">
                          {isAssetPositive ? '+' : ''}${asset.profit.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                        </Badge>
                      </div>

                      {/* Winrate Bar */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Win Rate</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{asset.winRate}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-150 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isAssetPositive ? 'bg-emerald-500' : 'bg-rose-500/80'} transition-all`}
                            style={{ width: `${asset.winRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: METRICAS OPERATIVAS AVANZADAS */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {/* Métricas de Eficiencia */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <DollarSign className="size-4 text-emerald-500" />
                  Métricas de Eficiencia
                </CardTitle>
                <CardDescription>Comparativa entre ganancias y pérdidas promedio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-455">Trade Ganador Prom.</span>
                    <p className="text-lg font-bold text-emerald-500 font-mono">
                      +${avgWin.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-455">Trade Perdedor Prom.</span>
                    <p className="text-lg font-bold text-rose-500 font-mono">
                      -${avgLoss.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-455">
                    <span>Proporción de Eficacia (Wins / Losses)</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {winRate}% efectividad
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${winRate}%` }} />
                    <div className="h-full bg-rose-550/80 transition-all" style={{ width: `${100 - winRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control de Riesgos */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-amber-500" />
                  Control de Riesgos
                </CardTitle>
                <CardDescription>Rachas consecutivas y drawdown dinámico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <span className="text-xs text-slate-400 block mb-1">Racha Ganadora Máx</span>
                    <strong className="text-lg font-extrabold text-slate-850 dark:text-white">
                      {maxWinStreak} trades
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <span className="text-xs text-slate-400 block mb-1">Racha Perdedora Máx</span>
                    <strong className="text-lg font-extrabold text-slate-850 dark:text-white">
                      {maxLossStreak} trades
                    </strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450">Pérdida Neto Neto</span>
                    <span className={cn("font-bold font-mono", pnlNeto < 0 ? "text-rose-500" : "text-emerald-500")}>
                      {pnlNeto < 0 ? `-$${Math.abs(pnlNeto).toLocaleString()}` : `+$${pnlNeto.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pnlNeto < 0 ? "bg-rose-500/80" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(Math.abs(pnlNeto) / (account.startingBalance * 0.1 || 1) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block text-right font-medium">Drawdown actual relativo a Balance Inicial</span>
                </div>
              </CardContent>
            </Card>

            {/* Resumen Financiero Completo */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Coins className="size-4 text-blue-500" />
                  Métricas de Capital
                </CardTitle>
                <CardDescription>Resumen de costos de cuenta, retiros y pnl final.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Balance Inicial</span>
                    <strong className="text-sm font-extrabold text-slate-750 dark:text-slate-200">
                      ${account.startingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Costo Compra</span>
                    <strong className="text-sm font-extrabold text-slate-750 dark:text-slate-200">
                      ${account.cost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Retiros (Brutos)</span>
                    <strong className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
                      ${account.totalWithdrawals.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Retiros (Netos)</span>
                    <strong className="text-sm font-extrabold text-emerald-500">
                      ${totalNetWithdrawals.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ROI (Neto)</span>
                    <strong className={cn("text-sm font-extrabold", totalNetWithdrawals >= account.cost ? "text-emerald-500" : "text-amber-500")}>
                      {roi}%
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100/80 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">PnL Neto</span>
                    <strong className={cn("text-sm font-extrabold", pnlNeto >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {pnlNeto >= 0 ? '+' : ''}${pnlNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: HISTORIAL DE OPERACIONES (Tabla de TanStack) */}
        <TabsContent value="activity" className="mt-6">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row justify-between items-center pb-3">
              <div>
                <CardTitle className="text-lg">Operaciones Registradas</CardTitle>
                <CardDescription>Visualiza, busca y analiza cada una de tus posiciones en esta cuenta.</CardDescription>
              </div>
              <Link to={`/trades/new?accountId=${account.id}`}>
                <button className="flex items-center gap-2 bg-indigo-655 hover:bg-indigo-600 text-white px-3.5 py-1.8 rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer hover:scale-102 active:scale-98 duration-150">
                  <Plus className="size-4" /> Registrar Trade
                </button>
              </Link>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Activity className="size-8 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-500">No hay trades registrados en esta cuenta.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="Filtrar por activo o estrategia..."
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9 h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 rounded-xl"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead
                                key={header.id}
                                className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider"
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="px-4 py-3 align-middle">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className="h-24 text-center text-slate-400 text-sm"
                            >
                              No se encontraron trades que coincidan con la búsqueda.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} ({table.getFilteredRowModel().rows.length} de {trades.length} trades)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-xs active:scale-95 duration-100"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-xs active:scale-95 duration-100"
                        title="Siguiente Página"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: RETIROS */}
        {(account.status === 'Real' || account.status === 'Funded') && (
          <TabsContent value="withdrawals" className="mt-6">
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row justify-between items-center pb-3">
                <div>
                  <CardTitle className="text-lg">Historial de Retiros</CardTitle>
                  <CardDescription>Visualiza todos los retiros (payouts) registrados para esta cuenta.</CardDescription>
                </div>
                <CreateWithdrawalDialog account={account} />
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Landmark className="size-8 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-500">No hay retiros registrados aún.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                        <TableRow>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Fecha</TableHead>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Monto Retirado</TableHead>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Monto Neto</TableHead>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((withdrawal) => (
                          <TableRow
                            key={withdrawal.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                          >
                            <TableCell className="px-4 py-3 align-middle text-slate-500 font-medium dark:text-slate-400">
                              {new Date(withdrawal.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle font-extrabold tracking-tight tabular-nums text-slate-700 dark:text-slate-200">
                              ${withdrawal.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle font-extrabold tracking-tight tabular-nums text-emerald-500">
                              ${(withdrawal.netAmount || (withdrawal.amount * (account.status === 'Real' ? 100 : (account.profitSplit ?? 100)) / 100)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300">
                              {withdrawal.notes || <span className="text-slate-400">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
