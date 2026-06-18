import { useEffect, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Info, Pencil, Brain } from 'lucide-react';
import { useUpdateTrade } from '@/hooks/useTrades';
import { Trade, EmotionalState, TradeSession } from '@/types';
import { guessSession, SESSION_LABELS } from '@/lib/tradeStats';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const EMOTION_OPTIONS: { value: EmotionalState; label: string }[] = [
  { value: 'Calm', label: 'Tranquilo' },
  { value: 'Confident', label: 'Confiado' },
  { value: 'Anxious', label: 'Ansioso' },
  { value: 'FOMO', label: 'FOMO / Urgencia' },
  { value: 'Revenge', label: 'Revancha' },
  { value: 'Bored', label: 'Aburrido' },
];

const isoToLocal = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const editTradeSchema = z.object({
  asset: z.string().min(1, 'Selecciona un activo'),
  direction: z.enum(['Long', 'Short'] as const, { error: 'Selecciona la dirección' }),
  entryPrice: z.coerce.number({ error: 'Número inválido' }),
  exitPrice: z.coerce.number({ error: 'Número inválido' }).optional().default(0),
  pnl: z.coerce.number({ error: 'Número inválido' }),
  strategy: z.string().min(1, 'Introduce la estrategia'),
  description: z.string().optional(),
  riskReward: z.coerce.number({ error: 'Número inválido' }).optional().default(0),
  riskPercent: z.coerce.number({ error: 'Número inválido' }).optional(),
  date: z.string().min(1, 'Selecciona la fecha y hora'),
  exitDate: z.string().optional(),
  session: z.string().optional(),
  emotionalState: z.string().optional(),
  disciplineScore: z.coerce.number().min(1).max(5).optional(),
  followedPlan: z.boolean().optional(),
});

type EditTradeValues = z.infer<typeof editTradeSchema>;

interface EditTradeDialogProps {
  trade: Trade;
}

export function EditTradeDialog({ trade }: EditTradeDialogProps) {
  const [open, setOpen] = useState(false);
  const updateTrade = useUpdateTrade();

  const defaultValues = (): EditTradeValues => ({
    asset: trade.asset,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice ?? 0,
    pnl: trade.pnl,
    strategy: trade.strategy,
    description: trade.description ?? '',
    riskReward: trade.riskRewardRatio ?? 0,
    riskPercent: trade.riskPercent,
    date: isoToLocal(trade.date),
    exitDate: isoToLocal(trade.exitDate),
    session: trade.session ?? '',
    emotionalState: trade.emotionalState,
    disciplineScore: trade.disciplineScore ?? 3,
    followedPlan: trade.followedPlan ?? true,
  });

  const form = useForm<EditTradeValues>({
    resolver: zodResolver(editTradeSchema) as unknown as Resolver<EditTradeValues>,
    defaultValues: defaultValues(),
  });

  // Reset form with fresh trade values each time the dialog opens
  useEffect(() => {
    if (open) form.reset(defaultValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: EditTradeValues) => {
    try {
      const pnlDiff = values.pnl - trade.pnl;

      await updateTrade.mutateAsync({
        id: trade.id,
        accountId: trade.accountId,
        pnlDiff,
        fields: {
          asset: values.asset,
          direction: values.direction,
          entryPrice: values.entryPrice,
          exitPrice: values.exitPrice ?? 0,
          pnl: values.pnl,
          strategy: values.strategy,
          description: values.description ?? '',
          riskRewardRatio: values.riskReward ?? 0,
          riskPercent: values.riskPercent,
          date: new Date(values.date).toISOString(),
          exitDate: values.exitDate ? new Date(values.exitDate).toISOString() : undefined,
          session: (values.session || undefined) as TradeSession | undefined,
          emotionalState: values.emotionalState as EmotionalState | undefined,
          disciplineScore: values.disciplineScore,
          followedPlan: values.followedPlan,
        },
      });

      toast.success('Trade actualizado correctamente');
      setOpen(false);
    } catch (err) {
      console.error('Error al actualizar el trade:', err);
      toast.error('Error al actualizar el trade');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
          title="Editar trade"
        >
          <Pencil className="size-4" />
          <span className="sr-only">Editar Trade</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[850px] w-[95vw]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="size-5 text-amber-500" />
            Editar Trade — {trade.asset.toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Corrige los datos de esta operación. Si cambias el PnL, el balance de la cuenta se ajusta automáticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-1">
            <ScrollArea className="h-[55vh] md:h-[60vh] pr-3">
              <div className="flex flex-col gap-5 pb-2">

                <div className="grid grid-cols-2 gap-4">
                  {/* Activo */}
                  <FormField
                    control={form.control}
                    name="asset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un activo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="E-mini Nasdaq-100">E-mini Nasdaq-100</SelectItem>
                              <SelectItem value="E-mini Dow Jones">E-mini Dow Jones</SelectItem>
                              <SelectItem value="EURUSD">EURUSD</SelectItem>
                              <SelectItem value="XAUUSD">XAUUSD</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dirección */}
                  <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={field.value === 'Long' ? 'default' : 'outline'}
                            className={field.value === 'Long' ? 'flex-1 bg-emerald-500/10 border-emerald-500 text-emerald-600 hover:bg-emerald-500/20' : 'flex-1'}
                            onClick={() => field.onChange('Long')}
                          >
                            Long
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === 'Short' ? 'default' : 'outline'}
                            className={field.value === 'Short' ? 'flex-1 bg-rose-500/10 border-rose-500 text-rose-600 hover:bg-rose-500/20' : 'flex-1'}
                            onClick={() => field.onChange('Short')}
                          >
                            Short
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Precios y PnL */}
                  <FormField
                    control={form.control}
                    name="entryPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrada</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salida</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pnl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PnL Neto ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="font-bold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estrategia</FormLabel>
                        <FormControl>
                          <Input placeholder="ej. SMC, Breakout" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="riskReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          R:R Realizado
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <Info className="size-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[260px] p-3">
                                <p className="text-sm">Multiplicador real final. Si ganaste 3× tu riesgo, pon <strong>3</strong>.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="ej. 2.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="riskPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Riesgo Tomado (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="ej. 0.55" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Psicología */}
                <div className="flex flex-col gap-4 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <div className="flex items-center gap-2">
                    <Brain className="size-4 text-rose-500" />
                    <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300">Psicología y Disciplina</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="emotionalState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado emocional</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="¿Cómo te sentías?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectGroup>
                                {EMOTION_OPTIONS.map(e => (
                                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="disciplineScore"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Disciplina (1-5)</FormLabel>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => field.onChange(n)}
                                className={`flex-1 h-9 rounded-lg text-sm font-bold border transition-colors ${
                                  field.value === n
                                    ? 'bg-indigo-500 text-white border-indigo-500'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="followedPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>¿Seguí mi plan?</FormLabel>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={field.value === true ? 'default' : 'outline'}
                              className={field.value === true ? 'flex-1 bg-emerald-500/10 border-emerald-500 text-emerald-600 hover:bg-emerald-500/20' : 'flex-1'}
                              onClick={() => field.onChange(true)}
                            >
                              Sí
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === false ? 'default' : 'outline'}
                              className={field.value === false ? 'flex-1 bg-rose-500/10 border-rose-500 text-rose-600 hover:bg-rose-500/20' : 'flex-1'}
                              onClick={() => field.onChange(false)}
                            >
                              No
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción y notas</FormLabel>
                      <FormControl>
                        <RichTextEditor value={field.value || ''} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fechas y sesión */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrada (Fecha y Hora)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="cursor-pointer font-medium"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (e.target.value) form.setValue('session', guessSession(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exitDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cierre (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="cursor-pointer font-medium"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="session"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sesión</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sesión de mercado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {(Object.keys(SESSION_LABELS) as TradeSession[]).map((s) => (
                                <SelectItem key={s} value={s}>{SESSION_LABELS[s]}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                disabled={updateTrade.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateTrade.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-white font-bold"
              >
                {updateTrade.isPending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 size-4" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Pencil className="mr-2 size-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
