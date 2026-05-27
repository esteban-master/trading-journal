import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Building2, DollarSign, TrendingUp, Layers } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'


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
    .min(1000, 'El balance mínimo es $1,000'),
  targetProfitPercentage: z.coerce.number().optional(),
  maxDrawdownPercentage: z.coerce.number().optional(),
  targetProfitPercentagePhase2: z.coerce.number().optional(),
  maxDrawdownPercentagePhase2: z.coerce.number().optional(),
  phase: z.coerce.number().optional(),
  totalPhases: z.coerce.number().optional(),
  profitSplit: z.coerce.number().min(0).max(100).optional(),
})

type CreateAccountValues = z.infer<typeof createAccountSchema>

// ─── Common Firms ──────────────────────────────────────────────────────────────
const FIRMS = ['Topstep', 'FTMO', 'MyForexFunds', 'Apex Trader Funding', 'The Funded Trader', 'True Forex Funds', 'Otra']

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

      <DialogContent className="max-w-lg">
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
            <div className="flex flex-col gap-5 max-h-[55vh] md:max-h-[60vh] overflow-y-auto pr-3 -mr-3 pb-2">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
