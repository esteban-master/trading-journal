import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { toast } from 'sonner'

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
import { Loader2, Plus, Building2, DollarSign, TrendingUp, Layers } from 'lucide-react'

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
  status: z.enum(['Evaluation', 'Funded', 'Blown', 'Payout'] as const, {
    error: 'Selecciona un estado para la cuenta',
  }),
  cost: z.coerce
    .number({ error: 'Introduce un número válido' })
    .min(0, 'El costo no puede ser negativo'),
  startingBalance: z.coerce
    .number({ error: 'Introduce un número válido' })
    .min(1000, 'El balance mínimo es $1,000'),
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
  const [saving, setSaving] = useState(false)

  const form = useForm<CreateAccountValues, unknown, CreateAccountValues>({
    resolver: zodResolver(createAccountSchema) as any,
    defaultValues: {
      name: '',
      firm: '',
      status: 'Evaluation',
      cost: 49,
      startingBalance: 50000,
    },
  })

  const onSubmit = async (values: CreateAccountValues) => {
    setSaving(true)
    try {
      await addDoc(collection(db, 'accounts'), {
        name: values.name,
        firm: values.firm,
        status: values.status,
        cost: values.cost,
        startingBalance: values.startingBalance,
        currentBalance: values.startingBalance,
        equity: values.startingBalance,
        totalWithdrawals: 0,
        createdAt: serverTimestamp(),
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
    } finally {
      setSaving(false)
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
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Costo */}
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
