import { useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Loader2, Landmark } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useCreateWithdrawal } from '@/hooks/useWithdrawals';
import { Account } from '@/types';

// Helper to get local date-time string in YYYY-MM-DDTHH:mm format
const getLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const createWithdrawalSchema = z.object({
  amount: z.coerce
    .number()
    .min(1, 'El monto debe ser mayor a 0'),
  date: z.string().min(1, 'Selecciona la fecha'),
  notes: z.string().optional(),
});

type CreateWithdrawalValues = z.infer<typeof createWithdrawalSchema>;

interface CreateWithdrawalDialogProps {
  account: Account;
}

export function CreateWithdrawalDialog({ account }: CreateWithdrawalDialogProps) {
  const [open, setOpen] = useState(false);
  const createWithdrawalMutation = useCreateWithdrawal();

  const form = useForm<CreateWithdrawalValues>({
    resolver: zodResolver(createWithdrawalSchema) as unknown as Resolver<CreateWithdrawalValues>,
    defaultValues: {
      amount: 0,
      date: getLocalDateTimeString(),
      notes: '',
    },
  });

  const onSubmit = async (values: CreateWithdrawalValues) => {
    if (values.amount > account.currentBalance) {
      form.setError('amount', { message: 'El monto supera el balance actual' });
      return;
    }

    try {
      await createWithdrawalMutation.mutateAsync({
        accountId: account.id,
        amount: values.amount,
        date: new Date(values.date).toISOString(),
        notes: values.notes,
      });

      toast.success('Retiro registrado exitosamente');
      setOpen(false);
      form.reset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error saving withdrawal:', err);
      toast.error(err?.message || 'Error al guardar el retiro');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
          <Landmark className="mr-2 size-4" />
          Registrar Retiro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Payout / Retiro</DialogTitle>
          <DialogDescription>
            Registra un retiro de tu cuenta. Esto disminuirá tu balance actual y aumentará tu métrica de retiros totales.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a Retirar (USD)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        className="pl-9 text-emerald-600 font-bold"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Balance disponible: ${account.currentBalance.toLocaleString()}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y Hora</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      className="cursor-pointer"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Retiro mensual para gastos"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={createWithdrawalMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white w-full"
              >
                {createWithdrawalMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 size-4" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Retiro'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
