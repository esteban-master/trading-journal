import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm , Resolver} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, addDoc, updateDoc, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router';
import Decimal from 'decimal.js';
import { UploadCloud, X, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { db } from '@/config/firebase';
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

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const tradeSchema = z.object({
  accountId: z.string().min(1, 'Selecciona una cuenta'),
  asset: z.string().min(1, 'Introduce el activo (ej. NQ)'),
  direction: z.enum(['Long', 'Short'] as const, { error: 'Selecciona la dirección' }),
  entryPrice: z.coerce.number({ error: 'Número inválido' }),
  exitPrice: z.coerce.number({ error: 'Número inválido' }).optional().default(0),
  pnl: z.coerce.number({ error: 'Número inválido' }),
  strategy: z.string().min(1, 'Introduce la estrategia'),
  riskReward: z.coerce.number({ error: 'Número inválido' }).optional().default(0),
  date: z.string().min(1, 'Selecciona la fecha y hora de la operación'),
});

type TradeValues = z.infer<typeof tradeSchema>;

export default function TradeForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultAccountId = searchParams.get('accountId') || '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  console.log({ accounts })
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const snap = await getDocs(collection(db, 'accounts'));
        const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setAccounts(accs);
      } catch (err) {
        console.error('Error fetching accounts', err);
      }
    };
    fetchAccounts();
  }, []);


  const form = useForm<TradeValues>({
    resolver: zodResolver(tradeSchema) as unknown as Resolver<TradeValues>,
    defaultValues: {
      accountId: defaultAccountId,
      asset: 'NQ',
      direction: 'Long',
      entryPrice: 0,
      exitPrice: 0,
      pnl: 0,
      strategy: '',
      riskReward: 0,
      date: getLocalDateTimeString(),
    },
  });

  // Dropzone para las imágenes (Files reales)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles].slice(0, 3)); // Max 3
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 3,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: TradeValues) => {
    setSaving(true);
    try {
      // // 1. Subir imágenes a Firebase Storage
      // const uploadedImageUrls: string[] = [];
      // for (const file of files) {
      //   const fileRef = ref(storage, `trades/${values.accountId}/${Date.now()}_${file.name}`);
      //   await uploadBytes(fileRef, file);
      //   const url = await getDownloadURL(fileRef);
      //   uploadedImageUrls.push(url);
      // }

      // // 2. Guardar el trade en Firestore
      await addDoc(collection(db, 'trades'), {
        accountId: values.accountId,
        asset: values.asset,
        direction: values.direction,
        entryPrice: values.entryPrice,
        exitPrice: values.exitPrice,
        pnl: values.pnl,
        strategy: values.strategy,
        riskRewardRatio: values.riskReward,
        images: [],
        status: 'Closed',
        date: new Date(values.date).toISOString(),
        createdAt: Timestamp.fromDate(new Date(values.date)),
      });

      // 3. Actualizar balance de la cuenta usando decimal.js
      const accountRef = doc(db, 'accounts', values.accountId);
      const accSnap = await getDoc(accountRef);
      if (accSnap.exists()) {
        const accData = accSnap.data();
        const currentBalance = new Decimal(accData.currentBalance || 0);
        const equity = new Decimal(accData.equity || accData.currentBalance || 0);
        const pnl = new Decimal(values.pnl);

        await updateDoc(accountRef, {
          currentBalance: currentBalance.plus(pnl).toNumber(),
          equity: equity.plus(pnl).toNumber(),
        });
      }

      toast.success('Trade registrado exitosamente');
      navigate(`/accounts/${values.accountId}`);
    } catch (err) {
      console.error('Error saving trade:', err);
      toast.error('Error al guardar el trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 mb-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Registrar Nuevo Trade</CardTitle>
          <CardDescription>Añade los detalles de tu operación y adjunta capturas de pantalla.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Selección de Cuenta */}
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta Asociada</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || defaultAccountId}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona una cuenta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} - {acc.firm}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Activo */}
                <FormField
                  control={form.control}
                  name="asset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activo</FormLabel>
                      <FormControl>
                        <Input placeholder="ej. NQ, ES, EURUSD" {...field} />
                      </FormControl>
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

              <div className="grid grid-cols-2 gap-4">
                {/* Estrategia y R:R */}
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
                      <FormLabel>Riesgo / Beneficio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="ej. 2.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fecha y Hora */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora de Ejecución</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="cursor-pointer font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subida de Imágenes */}
              <div className="space-y-2">
                <FormLabel>Evidencia (Imágenes)</FormLabel>

                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-900/50'}`}>
                  <input {...getInputProps()} />
                  <UploadCloud className="size-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Arrastra tus capturas aquí o haz clic para buscar</p>
                  <p className="text-slate-400 text-xs mt-1">Soporta JPG, PNG (Max 3 imágenes)</p>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {files.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100">
                          <img src={url} alt="Trade preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-sm transition-colors cursor-pointer">
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Trade'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
