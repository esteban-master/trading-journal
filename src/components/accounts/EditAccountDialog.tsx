import { useState, useEffect } from 'react'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Pencil, Building2, Layers, Check, AlertTriangle, Info } from 'lucide-react'
import { useUpdateAccount } from '@/hooks/useAccounts'
import { Account } from '@/types'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const editAccountSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(60, 'Máximo 60 caracteres'),
  profitSplit: z.coerce.number().min(0).max(100).optional(),
  baseRiskPercent: z.coerce.number().min(0.01, 'El riesgo debe ser mayor a 0').max(100, 'Máximo 100%').optional(),
  lossMultiplier: z.coerce.number().min(1, 'El multiplicador debe ser al menos 1').optional(),
  enableEquityScaling: z.boolean().default(true),
  maxRiskPercent: z.coerce.number().min(0.1).max(100).optional(),
})

type EditAccountValues = z.infer<typeof editAccountSchema>

// ─── Component ─────────────────────────────────────────────────────────────────
interface EditAccountDialogProps {
  account: Account
}

export function EditAccountDialog({ account }: EditAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const updateAccountMutation = useUpdateAccount()
  const saving = updateAccountMutation.isPending

  const form = useForm<EditAccountValues>({
    resolver: zodResolver(editAccountSchema) as unknown as Resolver<EditAccountValues>,
    defaultValues: {
      name: account.name,
      profitSplit: account.profitSplit ?? 100,
      baseRiskPercent: account.baseRiskPercent ?? 0.55,
      lossMultiplier: account.lossMultiplier ?? 1.2,
      enableEquityScaling: account.enableEquityScaling ?? true,
      maxRiskPercent: account.maxRiskPercent ?? 2.8,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: account.name,
        profitSplit: account.profitSplit ?? 100,
        baseRiskPercent: account.baseRiskPercent ?? 0.55,
        lossMultiplier: account.lossMultiplier ?? 1.2,
        enableEquityScaling: account.enableEquityScaling ?? true,
        maxRiskPercent: account.maxRiskPercent ?? 2.8,
      });
    }
  }, [open, account, form]);

  const onSubmit = async (values: EditAccountValues) => {
    try {
      await updateAccountMutation.mutateAsync({
        id: account.id,
        fields: {
          name: values.name,
          profitSplit: account.status === 'Real' ? 100 : values.profitSplit,
          baseRiskPercent: values.baseRiskPercent,
          lossMultiplier: values.lossMultiplier,
          enableEquityScaling: values.enableEquityScaling,
          maxRiskPercent: values.maxRiskPercent,
        }
      })

      toast.success('Cuenta actualizada', {
        description: 'Los cambios se han guardado exitosamente.',
      })

      setOpen(false)
    } catch (err) {
      console.error('Error al editar la cuenta:', err)
      toast.error('Error al editar', {
        description: 'Verifica tu conexión o vuelve a intentarlo más tarde.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">
          <Pencil className="size-3.5 mr-1.5" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="size-5 text-indigo-500" />
            Editar Configuración
          </DialogTitle>
          <DialogDescription>
            Modifica los detalles básicos y la configuración de riesgo de tu cuenta.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-1">

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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Profit Split */}
              {account.status !== 'Real' && (
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
                      <FormDescription>Tu % de ganancias actual (afecta nuevos retiros).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campos de Gestión de Riesgo */}
              <div className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-slate-500" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-300">Estrategia de Riesgo Variable</h4>
                  </div>

                  {/* Warning Educativo */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2 items-start bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <Info className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        <strong className="font-semibold block mb-0.5">¿Cuándo editar?</strong>
                        Solo ajusta estos valores en frío (fin de semana) si cambian las reglas de tu empresa de fondeo, o si has acumulado suficiente capital para evolucionar permanentemente tu estrategia.
                      </p>
                    </div>

                    <div className="flex gap-2 items-start bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
                      <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                        <strong className="font-semibold block mb-0.5">NUNCA edites esto:</strong>
                        Durante una racha perdedora para "vengarte" del mercado o ignorar al Asesor de Riesgo. Hacerlo destruye la matemática de la gestión monetaria.
                      </p>
                    </div>
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
                          <FormDescription className="text-[10px] mt-1">
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 size-4" />
                    Guardar Cambios
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
