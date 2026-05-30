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
import { ColumnDef, ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table';
import { Trade } from '../../../types';
import { Activity, ChevronLeft, ChevronRight, ChevronsUpDown, ExternalLink, ImageIcon, Plus, Search } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from 'react-router';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';
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
    filterFn: (row, columnId, filterValue) => {
      const val = row.getValue(columnId) as string;
      if (!val) return false;
      return val.toUpperCase() === filterValue.toUpperCase();
    },
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
    filterFn: (row, columnId, filterValue) => {
      const val = row.getValue(columnId) as string;
      if (!val) return false;
      return val === filterValue;
    },
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

export function TradesList() {

  const { phaseTrades, totalTradesCount, account } = useAccountDetailStore();

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data: phaseTrades,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
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

  const assetFacets = useMemo(() => {
    const counts: Record<string, number> = {};
    phaseTrades.forEach(t => {
      if (t.asset) {
        const key = t.asset.toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [phaseTrades]);

  const directionFacets = useMemo(() => {
    const counts: Record<string, number> = {};
    phaseTrades.forEach(t => {
      if (t.direction) {
        counts[t.direction] = (counts[t.direction] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [phaseTrades]);

  const selectedAsset = (columnFilters.find(f => f.id === 'asset')?.value as string) || 'all';
  const selectedDirection = (columnFilters.find(f => f.id === 'direction')?.value as string) || 'all';

  const handleAssetChange = (val: string) => {
    setColumnFilters(prev => {
      const filtered = prev.filter(f => f.id !== 'asset');
      if (val === 'all') return filtered;
      return [...filtered, { id: 'asset', value: val }];
    });
  };

  const handleDirectionChange = (val: string) => {
    setColumnFilters(prev => {
      const filtered = prev.filter(f => f.id !== 'direction');
      if (val === 'all') return filtered;
      return [...filtered, { id: 'direction', value: val }];
    });
  };

  const clearAllFilters = () => {
    setColumnFilters([]);
    setGlobalFilter('');
  };

  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '';
  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row justify-between items-center pb-3">
        <div>
          <CardTitle className="text-lg">Operaciones Registradas</CardTitle>
          <CardDescription>Visualiza, busca y analiza cada una de tus posiciones en esta cuenta.</CardDescription>
        </div>
        <Link to={`/trades/new?accountId=${account?.id}`} className={cn(buttonVariants())}>
          <Plus className="size-4" /> Registrar Trade
        </Link>
      </CardHeader>
      <CardContent>
        {totalTradesCount === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Activity className="size-8 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500">No hay trades registrados en esta cuenta.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between pb-1">
              <div className="flex flex-wrap items-center gap-3">
                {/* Búsqueda */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Filtrar por activo o estrategia..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-9 h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 rounded-xl"
                  />
                </div>

                {/* Filtro de Activo */}
                <div className="w-full sm:w-44">
                  <Select value={selectedAsset} onValueChange={handleAssetChange}>
                    <SelectTrigger className="h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="Activo (Todos)" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800">
                      <SelectItem value="all" className="text-xs font-semibold">Activo (Todos)</SelectItem>
                      {assetFacets.map(facet => (
                        <SelectItem key={facet.value} value={facet.value} className="text-xs font-semibold">
                          {facet.value} ({facet.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Dirección */}
                <div className="w-full sm:w-44">
                  <Select value={selectedDirection} onValueChange={handleDirectionChange}>
                    <SelectTrigger className="h-9 w-full bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="Dirección (Todas)" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800">
                      <SelectItem value="all" className="text-xs font-semibold">Dirección (Todas)</SelectItem>
                      {directionFacets.map(facet => (
                        <SelectItem key={facet.value} value={facet.value} className="text-xs font-semibold">
                          {facet.value} ({facet.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón de limpiar filtros */}
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 h-9"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
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
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} ({table.getFilteredRowModel().rows.length} de {totalTradesCount} trades)
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
  );
}