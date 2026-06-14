import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Building2, DollarSign, TrendingUp, Layers, Info, ShieldCheck } from 'lucide-react'
import { useCreateAccount } from '@/hooks/useAccounts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'


// ─── Zod Schema ────────────────────────────────────────────────────────────────
const createAccountSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(60, 'Máximo 60 caracteres'),
  firm: z
    .string()
    .min(2, 'Introduce el nombre de la firma')
    .max(40, 'Máximo 40 caracteres'),
  status: z.enum(['Evaluation', 'Funded', 'Blown', 'Payout', 'Real'] as const, {
    error: 'Selecciona un estado para la cuenta',
  }),
  cost: z.coerce
    .number({ error: 'Introduce un número válido' })
    .min(0, 'El costo no puede ser negativo'),
  startingBalance: z.coerce
    .number({ error: 'Introduce un número válido' })
    .min(200, 'El balance mínimo es $200'),
  targetProfitPercentage: z.coerce.number().optional(),
  maxDrawdownPercentage: z.coerce.number().optional(),
  targetProfitPercentagePhase2: z.coerce.number().optional(),
  maxDrawdownPercentagePhase2: z.coerce.number().optional(),
  phase: z.coerce.number().optional(),
  totalPhases: z.coerce.number().optional(),
  profitSplit: z.coerce.number().min(0).max(100).optional(),
  baseRiskPercent: z.coerce.number().min(0.01, 'El riesgo debe ser mayor a 0').max(100, 'Máximo 100%').optional(),
  lossMultiplier: z.coerce.number().min(1, 'El multiplicador debe ser al menos 1').optional(),
  enableEquityScaling: z.boolean().default(true),
  maxRiskPercent: z.coerce.number().min(0.1).max(100).optional(),
  // Centinela de Riesgo
  dailyLossLimitPercent: z.coerce.number().min(0).max(100).optional(),
  maxTradesPerDay: z.coerce.number().min(0).max(100).optional(),
  maxConsecutiveLossesLockout: z.coerce.number().min(1).max(20).optional(),
  dailyProfitLockPercent: z.coerce.number().min(0).max(100).optional(),
  trailingDrawdown: z.boolean().default(true),
  streakScope: z.enum(['allTrades', 'sameDay']).default('allTrades'),
})

type CreateAccountValues = z.infer<typeof createAccountSchema>

// ─── Common Firms ──────────────────────────────────────────────────────────────
const FIRMS = ['Topstep', 'FTMO', 'FundedNext', 'WsFunded', 'Pepperstone', 'Otra']

// ─── Component ─────────────────────────────────────────────────────────────────
interface CreateAccountDialogProps {
  children?: React.ReactNode
}

export function CreateAccountDialog({ children }: CreateAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const createAccountMutation = useCreateAccount()
  const saving = createAccountMutation.isPending

  const form = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema) as unknown as Resolver<CreateAccountValues>,
    defaultValues: {
      name: '',
      firm: '',
      status: 'Evaluation',
      cost: 49,
      startingBalance: 50000,
      targetProfitPercentage: 8,
      maxDrawdownPercentage: 10,
      targetProfitPercentagePhase2: 5,
      maxDrawdownPercentagePhase2: 10,
      phase: 1,
      totalPhases: 2,
      profitSplit: 80,
      baseRiskPercent: 0.55,
      lossMultiplier: 1.20,
      enableEquityScaling: true,
      maxRiskPercent: 2.80,
      dailyLossLimitPercent: 2,
      maxTradesPerDay: 5,
      maxConsecutiveLossesLockout: 3,
      dailyProfitLockPercent: 3,
      trailingDrawdown: true,
      streakScope: 'allTrades',
    },
  })

  const onSubmit = async (values: CreateAccountValues) => {
    try {
      const isEval = values.status === 'Evaluation'
      await createAccountMutation.mutateAsync({
        name: values.name,
        firm: values.firm,
        status: values.status,
        cost: values.status === 'Real' ? 0 : values.cost,
        startingBalance: values.startingBalance,
        currentBalance: values.startingBalance,
        equity: values.startingBalance,
        totalWithdrawals: 0,
        targetProfitPercentage: isEval ? values.targetProfitPercentage : undefined,
        maxDrawdownPercentage: isEval ? values.maxDrawdownPercentage : undefined,
        targetProfitPercentagePhase2: isEval && (values.totalPhases ?? 1) >= 2 ? values.targetProfitPercentagePhase2 : undefined,
        maxDrawdownPercentagePhase2: isEval && (values.totalPhases ?? 1) >= 2 ? values.maxDrawdownPercentagePhase2 : undefined,
        phase: isEval ? values.phase : (values.status === 'Funded' ? 3 : undefined),
        totalPhases: isEval ? values.totalPhases : undefined,
        profitSplit: values.status === 'Real' ? 100 : values.profitSplit,
        baseRiskPercent: values.baseRiskPercent,
        lossMultiplier: values.lossMultiplier,
        enableEquityScaling: values.enableEquityScaling,
        maxRiskPercent: values.maxRiskPercent,
        dailyLossLimitPercent: values.dailyLossLimitPercent,
        maxTradesPerDay: values.maxTradesPerDay,
        maxConsecutiveLossesLockout: values.maxConsecutiveLossesLockout,
        dailyProfitLockPercent: values.dailyProfitLockPercent,
        trailingDrawdown: values.trailingDrawdown,
        streakScope: values.streakScope,
      })

      toast.success('Cuenta creada exitosamente', {
        description: `${values.name} ha sido añadida a tu portafolio.`,
      })

      form.reset()
      setOpen(false)
    } catch (err) {
      console.error('Error al crear la cuenta:', err)
      toast.error('Error al crear la cuenta', {
        description: 'Verifica tu conexión o las credenciales de Firebase.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus data-icon="inline-start" />
            Nueva Cuenta
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="size-5 text-indigo-500" />
            Agregar Cuenta de Fondeo
          </DialogTitle>
          <DialogDescription>
            Registra el costo, la firma y el balance inicial para llevar el control de tu ROI.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-1">

            {/* Contenedor scrollable para los campos */}
            <ScrollArea className="h-[55vh] md:h-[60vh] pr-3">
              <div className="flex flex-col gap-5 pb-2">
                {/* Nombre de la Cuenta */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Cuenta</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="ej. Topstep 50k #1"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Un alias que te permita identificar esta cuenta fácilmente.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Firma */}
                  <FormField
                    control={form.control}
                    name="firm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firma / Empresa</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            if (val === 'Otra') {
                              field.onChange('')
                            } else {
                              field.onChange(val)
                            }
                          }}
                          value={FIRMS.includes(field.value) ? field.value : 'Otra'}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona una firma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {FIRMS.map((firm) => (
                                <SelectItem key={firm} value={firm}>
                                  {firm}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {/* Si selecciona "Otra", mostrar input libre */}
                        {(!FIRMS.slice(0, -1).includes(field.value)) && (
                          <Input
                            placeholder="Nombre de la firma"
                            className="mt-2"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Estado */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            if (val === 'Real' || val === 'Funded') {
                              form.setValue('baseRiskPercent', 0.25);
                              form.setValue('maxRiskPercent', 1.0);
                              form.setValue('lossMultiplier', 1.0);
                              form.setValue('enableEquityScaling', false);
                              form.setValue('dailyLossLimitPercent', 1);
                              form.setValue('maxTradesPerDay', 3);
                              form.setValue('maxConsecutiveLossesLockout', 2);
                              form.setValue('dailyProfitLockPercent', 1.5);
                            } else if (val === 'Evaluation') {
                              form.setValue('baseRiskPercent', 0.55);
                              form.setValue('maxRiskPercent', 2.8);
                              form.setValue('lossMultiplier', 1.2);
                              form.setValue('enableEquityScaling', true);
                              form.setValue('dailyLossLimitPercent', 2);
                              form.setValue('maxTradesPerDay', 5);
                              form.setValue('maxConsecutiveLossesLockout', 3);
                              form.setValue('dailyProfitLockPercent', 3);
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Estado actual" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="Evaluation">Evaluación</SelectItem>
                              <SelectItem value="Funded">Fondeada ✅</SelectItem>
                              <SelectItem value="Payout">Payout pendiente 💰</SelectItem>
                              <SelectItem value="Blown">Quemada ❌</SelectItem>
                              <SelectItem value="Real">Real (Personal) 🏦</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={form.watch('status') === 'Real' ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
                  {/* Costo */}
                  {form.watch('status') !== 'Real' && (
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo de Compra (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="49.00"
                                className="pl-9"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Lo que pagaste por la evaluación.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Balance Inicial */}
                  <FormField
                    control={form.control}
                    name="startingBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balance de la Cuenta</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="number"
                              step="1000"
                              placeholder="50000"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Tamaño de la cuenta (ej. 50,000).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Profit Split */}
                  {form.watch('status') !== 'Real' && (
                    <FormField
                      control={form.control}
                      name="profitSplit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profit Split (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" min="0" max="100" className="pr-8" {...field} value={field.value || ''} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                          </FormControl>
                          <FormDescription>Tu % de ganancias.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Campos de Gestión de Riesgo */}
                <div className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-slate-500" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-300">Estrategia de Riesgo Variable</h4>
                  </div>

                  {(form.watch('status') === 'Real' || form.watch('status') === 'Funded') && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-lg flex items-start gap-3">
                      <Info className="size-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-400">
                        <strong>Recomendación Institucional:</strong> Al ser una cuenta sin meta de profit, tu objetivo es la supervivencia a largo plazo. Hemos pre-llenado parámetros <strong>muy conservadores</strong> para proteger tu capital.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mb-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perfiles de Riesgo Rápidos</span>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex flex-col items-center justify-center p-2 h-auto border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20 transition-colors"
                        onClick={() => {
                          form.setValue('baseRiskPercent', 0.6);
                          form.setValue('lossMultiplier', 1.1);
                        }}
                      >
                        <span className="text-emerald-600 dark:text-emerald-500 font-bold text-xs">Conservador</span>
                        <span className="text-[10px] text-slate-500 font-medium">0.6% | 1.1x</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex flex-col items-center justify-center p-2 h-auto border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20 transition-colors"
                        onClick={() => {
                          form.setValue('baseRiskPercent', 0.7);
                          form.setValue('lossMultiplier', 1.2);
                        }}
                      >
                        <span className="text-blue-600 dark:text-blue-500 font-bold text-xs">Medio</span>
                        <span className="text-[10px] text-slate-500 font-medium">0.7% | 1.2x</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex flex-col items-center justify-center p-2 h-auto border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-900/50 dark:hover:bg-purple-900/20 transition-colors"
                        onClick={() => {
                          form.setValue('baseRiskPercent', 0.8);
                          form.setValue('lossMultiplier', 1.5);
                        }}
                      >
                        <span className="text-purple-600 dark:text-purple-500 font-bold text-xs">Agresivo</span>
                        <span className="text-[10px] text-slate-500 font-medium">0.8% | 1.5x</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="baseRiskPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Riesgo Base (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.01" className="pr-8" {...field} value={field.value || ''} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                          </FormControl>
                          <FormDescription>Porcentaje por defecto.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lossMultiplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Multiplicador</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.01" className="pr-8" {...field} value={field.value || ''} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">x</span>
                            </div>
                          </FormControl>
                          <FormDescription>Incremento tras pérdida.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormField
                      control={form.control}
                      name="enableEquityScaling"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3 shadow-sm bg-white dark:bg-slate-900/50">
                          <div className="space-y-0.5">
                            <FormLabel>Escalamiento (Buffer)</FormLabel>
                            <FormDescription>
                              Sube riesgo al estar en profit.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxRiskPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Riesgo Máximo (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.1" className="pr-8" {...field} value={field.value || ''} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                          </FormControl>
                          <FormDescription>Límite superior.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Centinela de Riesgo */}
                <div className="flex flex-col gap-4 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-rose-500" />
                    <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300">Centinela de Riesgo</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                    Límites de control en vivo. Tras N pérdidas seguidas se activa el Tilt Guard (control emocional).
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dailyLossLimitPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite Pérdida Diaria (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.1" className="pr-8" {...field} value={field.value ?? ''} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                          </FormControl>
                          <FormDescription>Cierra el día si se supera.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxConsecutiveLossesLockout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SL seguidos → Tilt Guard</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="1" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormDescription>Nº de pérdidas que disparan el aviso.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="streakScope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteo de la racha</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'allTrades'}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="allTrades">Por trades (acumulada entre días)</SelectItem>
                            <SelectItem value="sameDay">Solo del día actual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          "Por trades": cuenta pérdidas seguidas aunque sean en días distintos (ideal para CFDs con 1 trade/día). "Solo del día": reinicia cada jornada.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxTradesPerDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máx. Trades / Día</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="1" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormDescription>Anti-overtrading.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dailyProfitLockPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivo Diario (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.1" className="pr-8" {...field} value={field.value ?? ''} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                          </FormControl>
                          <FormDescription>Lock-in del día verde.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="trailingDrawdown"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3 shadow-sm bg-white dark:bg-slate-900/50">
                        <div className="space-y-0.5">
                          <FormLabel>Drawdown Trailing</FormLabel>
                          <FormDescription>
                            Mide el drawdown desde el pico (trailing) en vez de desde el balance inicial (estático).
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campos de Evaluación condicionales */}
                {form.watch('status') === 'Evaluation' && (
                  <div className="flex flex-col gap-4 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-indigo-500" />
                      <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Reglas de Evaluación</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="targetProfitPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Objetivo Profit Fase 1 (%)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type="number" step="0.1" className="pl-3 pr-8" {...field} value={field.value || ''} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxDrawdownPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Drawdown Fase 1 (%)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type="number" step="0.1" className="pl-3 pr-8" {...field} value={field.value || ''} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {(form.watch('totalPhases') || 1) >= 2 && (
                      <>
                        <div className="flex items-center gap-2 mt-2">
                          <TrendingUp className="size-4 text-indigo-400" />
                          <h5 className="text-xs font-semibold text-indigo-800 dark:text-indigo-400 uppercase">Reglas Fase 2</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="targetProfitPercentagePhase2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Objetivo Profit Fase 2 (%)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" step="0.1" className="pl-3 pr-8" {...field} value={field.value || ''} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="maxDrawdownPercentagePhase2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Drawdown Fase 2 (%)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" step="0.1" className="pl-3 pr-8" {...field} value={field.value || ''} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fase Actual</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="totalPhases"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total de Fases</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { form.reset(); setOpen(false) }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {saving ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus data-icon="inline-start" />
                    Crear Cuenta
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
