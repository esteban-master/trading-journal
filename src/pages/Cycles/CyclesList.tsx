import { Link } from 'react-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestmentCycles } from '@/hooks/useInvestmentCycles';
import { InvestmentCycle } from '@/types';
import CreateCycleDialog from './CreateCycleDialog';

const STATUS_BADGE: Record<
  InvestmentCycle['status'],
  { label: string; className: string }
> = {
  active: { label: 'Activo', className: 'border-indigo-500/50 text-indigo-400' },
  completed: { label: 'Completado', className: 'border-emerald-500/50 text-emerald-400' },
  cancelled: { label: 'Cancelado', className: 'border-red-500/50 text-red-400' },
};

export default function CyclesList() {
  const { data: cycles = [], isLoading } = useInvestmentCycles();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="size-5 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">Ciclos de Inversión</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada ciclo es un grupo de cuentas que operas en rotación diaria bajo la estrategia Topstep.
          </p>
        </div>
        <CreateCycleDialog />
      </div>

      {/* Lista de ciclos */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <RefreshCw className="size-12 opacity-20" />
          <div className="text-center">
            <p className="font-medium">Sin ciclos todavía</p>
            <p className="text-sm mt-1">Crea tu primer ciclo para empezar a trackear la estrategia</p>
          </div>
          <CreateCycleDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.map((cycle) => (
            <CycleCard key={cycle.id} cycle={cycle} />
          ))}
        </div>
      )}
    </div>
  );
}

function CycleCard({ cycle }: { cycle: InvestmentCycle }) {
  const badge = STATUS_BADGE[cycle.status];
  const numAccounts = cycle.accountIds.length;

  let formattedDate = '—';
  try {
    formattedDate = format(new Date(cycle.startDate + 'T12:00:00'), "d MMM yyyy", { locale: es });
  } catch {
    formattedDate = cycle.startDate;
  }

  return (
    <Link to={`/ciclos/${cycle.id}`}>
      <Card className="hover:border-indigo-500/40 transition-all cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{cycle.name}</CardTitle>
            <Badge variant="outline" className={`text-[11px] shrink-0 ${badge.className}`}>
              {badge.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Inicio: {formattedDate}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" />
                <span>{numAccounts} cuentas</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
          </div>

          {/* Barra de progreso visual */}
          <div className="mt-3 flex gap-0.5">
            {cycle.accountIds.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export { CycleCard };
