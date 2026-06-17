import { useState, useEffect, useMemo } from 'react';
import { useForm , Resolver} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2, Info, Plus, Brain, ShieldAlert, Lock, BookOpen, ImageUp } from 'lucide-react';
import { ImageUploader } from '@/components/ui/image-uploader';
import { useReminders } from '@/hooks/useReminders';
import { useAuthStore } from '@/store/useAuthStore';
import { uploadTradeImages } from '@/lib/uploadTradeImages';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateTrade } from '@/hooks/useTrades';
import { useRiskGuardianStore } from '@/store/useRiskGuardianStore';
import { getDayKey } from '@/lib/riskGuardian';
import { guessSession, SESSION_LABELS } from '@/lib/tradeStats';
import { EmotionalState, TradeSession } from '@/types';
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

const DEFAULT_DESCRIPTION_TEMPLATE = `<h1>📈 Contexto Técnico</h1>
<h3>• Tendencia HTF (1H/4H):</h3>
<p></p>
<h3>• Confirmaciones de Entrada:</h3>
<p></p>
<h3>• Sesión / Horario:</h3>
<p></p>
<h1>⚙️ Gestión del Trade</h1>
<h3>• ¿Seguí mi plan?:</h3>
<p></p>
<h3>• Notas de gestión:</h3>
<p></p>
<h1>🧠 Psicología y Emociones</h1>
<h3>• Estado mental antes/durante:</h3>
<p></p>
<h3>• Nivel de confianza (1-10):</h3>
<p></p>
<h1>🎓 Lección del Día</h1>
<h3>• Aciertos:</h3>
<p></p>
<h3>• Errores a corregir:</h3>
<p></p>`;

const EMOTION_OPTIONS: { value: EmotionalState; label: string }[] = [
  { value: 'Calm', label: 'Tranquilo' },
  { value: 'Confident', label: 'Confiado' },
  { value: 'Anxious', label: 'Ansioso' },
  { value: 'FOMO', label: 'FOMO / Urgencia' },
  { value: 'Revenge', label: 'Revancha' },
  { value: 'Bored', label: 'Aburrido' },
];

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const tradeSchema = z.object({
  accountId: z.string().min(1, 'Selecciona una cuenta'),
  asset: z.string().min(1, 'Selecciona un activo'),
  direction: z.enum(['Long', 'Short'] as const, { error: 'Selecciona la dirección' }),
  entryPrice: z.coerce.number({ error: 'Número inválido' }),
  exitPrice: z.coerce.number({ error: 'Número inválido' }).optional().default(0),
  pnl: z.coerce.number({ error: 'Número inválido' }),
  strategy: z.string().min(1, 'Introduce la estrategia'),
  description: z.string().optional(),
  riskReward: z.coerce.number({ error: 'Número inválido' }).optional().default(0),
  riskPercent: z.coerce.number({ error: 'Número inválido' }).optional(),
  date: z.string().min(1, 'Selecciona la fecha y hora de la operación'),
  emotionalState: z.string().optional(),
  disciplineScore: z.coerce.number().min(1).max(5).optional(),
  followedPlan: z.boolean().optional(),
  exitDate: z.string().optional(),
  session: z.string().optional(),
});

type TradeValues = z.infer<typeof tradeSchema>;

interface CreateTradeDialogProps {
  defaultAccountId?: string;
}

export default function CreateTradeDialog({ defaultAccountId: propAccountId }: CreateTradeDialogProps = {}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultAccountId = propAccountId || searchParams.get('accountId') || '';

  const { data: accounts = [] } = useAccounts();
  const createTradeMutation = useCreateTrade();
  const getGuardianSession = useRiskGuardianStore((s) => s.getSession);

  const { data: beforeTradeReminders = [] } = useReminders({ trigger: 'beforeTrade', onlyActive: true });
  const { data: afterLossReminders = [] } = useReminders({ trigger: 'afterLoss', onlyActive: true });

  const { user } = useAuthStore();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAfterLoss, setShowAfterLoss] = useState(false);
  const [afterLossAccountId, setAfterLossAccountId] = useState('');
  const saving = createTradeMutation.isPending || uploading;

  const form = useForm<TradeValues>({
    resolver: zodResolver(tradeSchema) as unknown as Resolver<TradeValues>,
    defaultValues: {
      accountId: defaultAccountId,
      asset: 'E-mini Nasdaq-100',
      direction: 'Long',
      entryPrice: 0,
      exitPrice: 0,
      pnl: 0,
      strategy: '',
      description: DEFAULT_DESCRIPTION_TEMPLATE,
      riskReward: 0,
      date: getLocalDateTimeString(),
      exitDate: '',
      session: guessSession(getLocalDateTimeString()),
      emotionalState: undefined,
      disciplineScore: 3,
      followedPlan: true,
    },
  });

  // ─── Bloqueo del Centinela para la cuenta seleccionada (cooldown / día bloqueado) ───
  const selectedAccountId = form.watch('accountId') || defaultAccountId;
  const guardianSession = useRiskGuardianStore((s) => (selectedAccountId ? s.sessions[selectedAccountId] : undefined));
  const isGuardianToday = guardianSession?.dayKey === getDayKey(new Date());
  const cooldownUntil = isGuardianToday ? guardianSession?.cooldownUntil ?? null : null;
  const manualLockout = isGuardianToday ? guardianSession?.manualLockout ?? false : false;

  const [override, setOverride] = useState(false);
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);
  // Reinicia la anulación al abrir el diálogo o cambiar de cuenta
  useEffect(() => { setOverride(false); }, [open, selectedAccountId]);

  const cooldownRemainingMs = cooldownUntil ? cooldownUntil - Date.now() : 0;
  const cooldownActive = cooldownRemainingMs > 0;
  const isBlocked = cooldownActive || manualLockout;
  const cooldownLabel = useMemo(() => {
    if (!cooldownActive) return '';
    const total = Math.ceil(cooldownRemainingMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [cooldownActive, cooldownRemainingMs]);


  const onSubmit = async (values: TradeValues) => {
    try {
      // Bloqueo real del Centinela: durante cooldown o día bloqueado no se puede registrar
      // (salvo anulación explícita, que deja el trade marcado como "revancha").
      const session = getGuardianSession(values.accountId);
      const cdActive = session.cooldownUntil ? session.cooldownUntil > Date.now() : false;
      const blockedNow = cdActive || session.manualLockout;
      if (blockedNow && !override) {
        toast.error('Bloqueado por el Centinela', {
          description: cdActive
            ? 'Estás en cooldown. Espera a que termine o púlsalo para anular.'
            : 'Cerraste la jornada (día bloqueado).',
        });
        return;
      }
      const isRevenge = blockedNow;

      // Subir imágenes a Firebase Storage antes de crear el trade
      let imageUrls: string[] = [];
      if (files.length > 0 && user) {
        setUploading(true);
        const tempId = crypto.randomUUID();
        try {
          imageUrls = await uploadTradeImages(files, user.uid, tempId);
        } finally {
          setUploading(false);
        }
      }

      await createTradeMutation.mutateAsync({
        accountId: values.accountId,
        asset: values.asset,
        direction: values.direction,
        entryPrice: values.entryPrice,
        exitPrice: values.exitPrice,
        pnl: values.pnl,
        strategy: values.strategy,
        description: values.description,
        riskRewardRatio: values.riskReward,
        riskPercent: values.riskPercent,
        images: imageUrls,
        status: 'Closed',
        date: new Date(values.date).toISOString(),
        exitDate: values.exitDate ? new Date(values.exitDate).toISOString() : undefined,
        session: (values.session || undefined) as TradeSession | undefined,
        emotionalState: values.emotionalState as EmotionalState | undefined,
        disciplineScore: values.disciplineScore,
        followedPlan: values.followedPlan,
        isRevenge,
      });

      form.reset();
      setFiles([]);
      toast.success('Trade registrado exitosamente');

      if (values.pnl < 0 && afterLossReminders.length > 0) {
        setAfterLossAccountId(values.accountId);
        setShowAfterLoss(true);
      } else {
        setOpen(false);
        navigate(`/accounts/${values.accountId}`);
      }
    } catch (err) {
      console.error('Error saving trade:', err);
      toast.error('Error al guardar el trade');
    }
  };

  const handleAfterLossDismiss = () => {
    setShowAfterLoss(false);
    setOpen(false);
    navigate(`/accounts/${afterLossAccountId}`);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setShowAfterLoss(false);
      setAfterLossAccountId('');
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          Nuevo Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[850px] w-[95vw]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">Registrar Nuevo Trade</DialogTitle>
          <DialogDescription>
            Añade los detalles de tu operación y adjunta capturas de pantalla.
          </DialogDescription>
        </DialogHeader>
        {showAfterLoss ? (
          <div className="flex flex-col gap-5 py-2">
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3">
                <BookOpen className="size-4" /> Antes de seguir — recuerda esto
              </h4>
              <ul className="space-y-2">
                {afterLossReminders.map((r) => (
                  <li key={r.id} className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">{r.title}</span>
                    {r.detail && <span className="block text-xs text-slate-500 dark:text-slate-400">{r.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAfterLossDismiss} className="bg-indigo-600 text-white hover:bg-indigo-500">
                Entendido
              </Button>
            </div>
          </div>
        ) : (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 pt-1 ">
              {isBlocked && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                    {manualLockout ? <Lock className="size-5 shrink-0" /> : <ShieldAlert className="size-5 shrink-0" />}
                    <span className="font-bold text-sm">
                      {manualLockout ? 'Día bloqueado por el Centinela' : `Cooldown activo · ${cooldownLabel} restante`}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                    {manualLockout
                      ? 'Cerraste la jornada en el Tilt Guard. Registrar nuevos trades está bloqueado hasta mañana.'
                      : 'Estás en tiempo de enfriamiento tras tu racha de pérdidas. Respira y espera a que termine.'}
                  </p>
                  {!override ? (
                    <button
                      type="button"
                      onClick={() => setOverride(true)}
                      className="self-start text-xs font-semibold text-rose-700 dark:text-rose-300 underline underline-offset-2 hover:text-rose-900 dark:hover:text-rose-200"
                    >
                      Operé igual: registrar de todas formas (quedará marcado como “revancha”)
                    </button>
                  ) : (
                    <span className="self-start text-xs font-semibold text-amber-700 dark:text-amber-400">
                      ⚠ Anulado: este trade se guardará marcado como “revancha”.
                    </span>
                  )}
                </div>
              )}
              {beforeTradeReminders.length > 0 && (
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
                    <BookOpen className="size-4" /> Checklist antes de operar
                  </h4>
                  <ul className="space-y-1.5">
                    {beforeTradeReminders.map((r) => (
                      <li key={r.id} className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-medium">{r.title}</span>
                        {r.detail && <span className="block text-xs text-slate-500 dark:text-slate-400">{r.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ScrollArea className="h-[55vh] md:h-[60vh] pr-3">
                <div className="flex flex-col gap-5 pb-2">
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
                                  {acc.name} {acc.status === 'Real' ? '(Real 🏦)' : '(Fondeo)'} - {acc.firm}
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
                    {/* Estrategia, R:R y Riesgo Tomado */}
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
                            Riesgo / Beneficio
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Info className="size-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] p-3 shadow-lg border-primary/20">
                                  <p className="text-sm">Escribe el multiplicador real final (R:R Realizado). Si ganaste 3 veces tu riesgo, pon <strong className="">3</strong>. Si perdiste tu SL completo, pon <strong className="text-rose-500">0</strong>.</p>
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
                          <FormLabel className="flex items-center gap-2">
                            Riesgo Tomado (%)
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Info className="size-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] p-3 shadow-lg border-primary/20">
                                  <p className="text-sm">Escribe el <strong>riesgo inicial</strong> con el que entraste al mercado, incluso si moviste a Break Even después. Sirve para medir qué tan agresiva fue tu decisión al inicio.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="ej. 0.55" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Psicología y Disciplina */}
                  <div className="flex flex-col gap-4 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
                    <div className="flex items-center gap-2">
                      <Brain className="size-4 text-rose-500" />
                      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300">Psicología y Disciplina</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Estado emocional */}
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

                      {/* Disciplina 1-5 */}
                      <FormField
                        control={form.control}
                        name="disciplineScore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Disciplina (1-5)
                              <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <Info className="size-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[280px] p-3 shadow-lg border-primary/20">
                                    <p className="text-sm">Califica tu <strong>adherencia al plan</strong>, no el resultado. Un trade perdedor bien ejecutado puede ser un 5.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
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

                      {/* ¿Seguí mi plan? */}
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

                  {/* Descripción (Rich Text) */}
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

                  {/* Fecha/Hora de entrada y cierre */}
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
                                // Sugerir sesión automáticamente al cambiar la hora de entrada
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
                          <FormLabel className="flex items-center gap-2">
                            Cierre (opcional)
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Info className="size-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[280px] p-3 shadow-lg border-primary/20">
                                  <p className="text-sm">Hora a la que cerraste la operación. Se usa para calcular tu <strong>tiempo de retención</strong> promedio.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
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

                  {/* Subida de Imágenes */}
                  <div className="space-y-2">
                    <FormLabel>Evidencia (Imágenes)</FormLabel>
                    <ImageUploader files={files} onFilesChange={setFiles} maxFiles={3} />
                  </div>
                </div>
                
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type='button' onClick={(e) => {
                  e.preventDefault(); 
                  form.reset();
                  setFiles([]);
                  setOpen(false)
                  }} className="">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || (isBlocked && !override)} className=" bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? (
                    <>
                      <ImageUp className="animate-pulse mr-2 size-4" />
                      Subiendo imágenes…
                    </>
                  ) : createTradeMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (isBlocked && !override) ? (
                    <>
                      <Lock className="mr-2 size-4" />
                      Bloqueado
                    </>
                  ) : (
                    'Guardar Trade'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
