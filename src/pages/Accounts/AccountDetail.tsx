import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { doc, onSnapshot, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Account, Trade } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  Search,
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
          {date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
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

  const [account, setAccount] = useState<Account | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suscripción en tiempo real a la cuenta
  useEffect(() => {
    if (!id) return;

    const accountRef = doc(db, 'accounts', id);
    const unsubscribe = onSnapshot(
      accountRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setAccount({
            id: snap.id,
            name: data.name,
            firm: data.firm,
            status: data.status,
            cost: data.cost,
            startingBalance: data.startingBalance,
            currentBalance: data.currentBalance,
            equity: data.equity ?? data.currentBalance,
            totalWithdrawals: data.totalWithdrawals ?? 0,
            // Convertir Timestamp de Firestore a ISO string si aplica
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
          });
        } else {
          setAccount(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error leyendo la cuenta:', err);
        setError('No se pudo cargar la cuenta. Verifica tu conexión.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Suscripción en tiempo real a los trades de esta cuenta
  useEffect(() => {
    if (!id) return;

    const tradesRef = collection(db, 'trades');
    const q = query(
      tradesRef,
      where('accountId', '==', id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTrades: Trade[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            accountId: data.accountId,
            asset: data.asset,
            direction: data.direction,
            entryPrice: data.entryPrice,
            exitPrice: data.exitPrice,
            pnl: data.pnl,
            strategy: data.strategy ?? '',
            riskRewardRatio: data.riskRewardRatio ?? 0,
            images: data.images ?? [],
            date:
              data.date instanceof Timestamp
                ? data.date.toDate().toISOString()
                : data.date,
            status: data.status,
          };
        });
        setTrades(fetchedTrades);
      },
      (err) => {
        console.error('Error leyendo trades:', err);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // --- Estados de UI ---
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data: trades,
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
  const pnlNeto = account.currentBalance - account.startingBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
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
            <Badge variant={isFunded ? 'success' : isBlown ? 'destructive' : 'info'}>
              {account.status}
            </Badge>
          </h1>
          <p className="text-sm text-slate-500">
            {account.firm} • Creada el {new Date(account.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Panel de resumen */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Balance Inicial</span>
              <p className="text-xl font-bold">${account.startingBalance.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Balance Actual</span>
              <p
                className={`text-2xl font-bold ${
                  account.currentBalance >= account.startingBalance
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                }`}
              >
                ${account.currentBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">PnL Neto</span>
              <p
                className={`text-lg font-bold ${
                  pnlNeto >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {pnlNeto >= 0 ? '+' : ''}${pnlNeto.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Costo</span>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                ${account.cost.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Retiros</span>
              <p className="text-lg font-bold text-emerald-500">
                ${account.totalWithdrawals.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Historial de Trades */}
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="text-lg">Historial de Trades</CardTitle>
              <CardDescription>Operaciones registradas en esta cuenta.</CardDescription>
            </div>
            <Link to={`/trades/new?accountId=${account.id}`}>
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm cursor-pointer">
                <Plus className="size-4" /> Registrar Trade
              </button>
            </Link>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
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
                    className="pl-9 h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className="text-slate-500 dark:text-slate-400 px-4 py-3 font-semibold text-xs uppercase tracking-wider"
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
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} ({table.getFilteredRowModel().rows.length} de {trades.length} trades)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-xs active:scale-95 duration-100"
                      title="Página Anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-xs active:scale-95 duration-100"
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
      </div>
    </div>
  );
}
