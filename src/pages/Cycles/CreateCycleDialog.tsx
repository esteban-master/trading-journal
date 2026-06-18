import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateInvestmentCycle } from '@/hooks/useInvestmentCycles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Account, TopstepStrategyMode } from '@/types';
import { TOPSTEP_STRATEGIES } from '@/lib/topstepSimulator';

const MAX_ACCOUNTS = 10;

export default function CreateCycleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selected, setSelected] = useState<Account[]>([]);
  const [strategyMode, setStrategyMode] = useState<TopstepStrategyMode | undefined>(undefined);

  const { data: accounts = [] } = useAccounts();
  const createCycle = useCreateInvestmentCycle();

  // Cuentas disponibles (Evaluation o Funded) no ya seleccionadas
  const available = accounts.filter(
    (a) =>
      (a.status === 'Evaluation' || a.status === 'Funded') &&
      !selected.find((s) => s.id === a.id)
  );

  function addAccount(account: Account) {
    if (selected.length >= MAX_ACCOUNTS) return;
    setSelected((prev) => [...prev, account]);
  }

  function removeAccount(id: string) {
    setSelected((prev) => prev.filter((a) => a.id !== id));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSelected((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }

  function moveDown(idx: number) {
    if (idx === selected.length - 1) return;
    setSelected((prev) => {
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('Dale un nombre al ciclo');
      return;
    }
    if (!startDate) {
      toast.error('Selecciona la fecha de inicio');
      return;
    }
    if (selected.length === 0) {
      toast.error('Selecciona al menos una cuenta');
      return;
    }

    try {
      await createCycle.mutateAsync({
        name: name.trim(),
        status: 'active',
        startDate,
        accountIds: selected.map((a) => a.id),
        ...(strategyMode ? { strategyMode } : {}),
      });
      toast.success('Ciclo creado');
      setOpen(false);
      setName('');
      setSelected([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setStrategyMode(undefined);
    } catch {
      toast.error('Error al crear el ciclo');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="size-4" />
          Nuevo Ciclo
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Ciclo de Inversión</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cycle-name">Nombre del ciclo</Label>
            <Input
              id="cycle-name"
              placeholder="Ciclo #1 – Junio 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Fecha de inicio */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start-date">Fecha de inicio (Día 1)</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              El día que operaste (o planeas operar) la Cuenta #1 por primera vez
            </p>
          </div>

          {/* Estrategia Topstep (solo si hay cuentas Topstep seleccionadas) */}
          {selected.some((a) => a.firm?.toLowerCase().includes('topstep')) && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm">
                Estrategia de riesgo
                <span className="text-muted-foreground ml-1 font-normal">(Topstep)</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TOPSTEP_STRATEGIES.map((s) => {
                  const active = strategyMode === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrategyMode(active ? undefined : s.id as TopstepStrategyMode)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all hover:bg-muted/40"
                      style={{
                        borderColor: active ? s.color : undefined,
                        backgroundColor: active ? `${s.color}15` : undefined,
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ color: s.color }}>
                        {s.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        R${s.risk >= 1000 ? `${s.risk / 1000}K` : s.risk} · T$1.5K
                      </span>
                    </button>
                  );
                })}
              </div>
              {!strategyMode && (
                <p className="text-[11px] text-muted-foreground">
                  Opcional · define cómo se colorea el progreso en el ciclo
                </p>
              )}
            </div>
          )}

          {/* Selector de cuentas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Disponibles */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm">
                Cuentas disponibles
                <span className="text-muted-foreground ml-1 font-normal">
                  ({available.length})
                </span>
              </Label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {available.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No hay cuentas disponibles
                  </p>
                )}
                {available.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => addAccount(acc)}
                    disabled={selected.length >= MAX_ACCOUNTS}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 disabled:opacity-40"
                  >
                    <div>
                      <p className="text-sm font-medium truncate">{acc.name}</p>
                      <p className="text-[11px] text-muted-foreground">{acc.firm}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        acc.status === 'Funded'
                          ? 'border-emerald-500/50 text-emerald-400'
                          : 'border-blue-500/50 text-blue-400'
                      }`}
                    >
                      {acc.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Seleccionadas (ordenadas) */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm">
                Orden de operación
                <span className="text-muted-foreground ml-1 font-normal">
                  ({selected.length}/{MAX_ACCOUNTS})
                </span>
              </Label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {selected.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Selecciona cuentas de la lista
                  </p>
                )}
                {selected.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className="px-2 py-2 flex items-center gap-2"
                  >
                    <GripVertical className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-4 shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{acc.name}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === selected.length - 1}
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                      <button
                        onClick={() => removeAccount(acc.id)}
                        className="p-0.5 hover:bg-red-500/10 hover:text-red-400 rounded ml-1"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCycle.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createCycle.isPending ? 'Creando...' : 'Crear Ciclo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
