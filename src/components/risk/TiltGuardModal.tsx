import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Brain, Wind, ShieldCheck, MinusCircle, CheckCircle2, Lock, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Account, Trade, RiskDecision, EmotionalState } from '@/types';
import {
  computeAccountRiskStatus,
  classifyStreak,
  recommendActionForStreak,
  buildStreakReference,
  StreakReference,
} from '@/lib/riskGuardian';
import { useRiskGuardianStore } from '@/store/useRiskGuardianStore';
import { useLogRiskEvent } from '@/hooks/useRiskEvents';
import { useReminders } from '@/hooks/useReminders';

interface TiltGuardModalProps {
  account: Account;
  trades: Trade[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winRate: number; // % real de la cuenta
  avgRR: number;   // RR promedio real
  maxDrawdownLimitPercent?: number;
}

const EMOTIONS: { value: EmotionalState; label: string }[] = [
  { value: 'Calm', label: 'Tranquilo' },
  { value: 'Confident', label: 'Confiado' },
  { value: 'Anxious', label: 'Ansioso' },
  { value: 'FOMO', label: 'FOMO / Urgencia' },
  { value: 'Revenge', label: 'Revancha' },
  { value: 'Bored', label: 'Aburrido' },
];

const VERDICT_STYLE = {
  noise: {
    border: 'border-emerald-200 dark:border-emerald-900/50',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-800 dark:text-emerald-300',
    badge: 'bg-emerald-500',
    label: 'Ruido estadístico',
  },
  elevated: {
    border: 'border-amber-200 dark:border-amber-900/50',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-800 dark:text-amber-300',
    badge: 'bg-amber-500',
    label: 'Racha elevada',
  },
  anomaly: {
    border: 'border-rose-200 dark:border-rose-900/50',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    text: 'text-rose-800 dark:text-rose-300',
    badge: 'bg-rose-500',
    label: 'Racha anómala',
  },
} as const;

const CHECKLIST = [
  'Aléjate de la pantalla: levántate y camina 2 minutos.',
  'Relee tu plan: ¿el próximo setup cumple TODAS tus reglas?',
  'Sin revancha: no aumentes el tamaño para "recuperar".',
  'Recuerda: una racha esperada no significa que tu sistema esté roto.',
];

// Respiración en caja 4-4-4-4
const BREATH_PHASES = ['Inhala', 'Mantén', 'Exhala', 'Mantén'];

function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPhase(p => {
        const next = (p + 1) % 4;
        if (next === 0) setRounds(r => r + 1);
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [running]);

  const big = phase === 0 || phase === 1; // inhala/mantén-arriba → círculo grande

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative h-28 w-28 flex items-center justify-center">
        <div
          className="absolute rounded-full bg-indigo-500/20 dark:bg-indigo-400/20 transition-all ease-in-out"
          style={{ width: big ? '100%' : '45%', height: big ? '100%' : '45%', transitionDuration: '4000ms' }}
        />
        <div
          className="absolute rounded-full border-2 border-indigo-500 transition-all ease-in-out"
          style={{ width: big ? '100%' : '45%', height: big ? '100%' : '45%', transitionDuration: '4000ms' }}
        />
        <span className="relative text-sm font-bold text-indigo-700 dark:text-indigo-300">
          {running ? BREATH_PHASES[phase] : 'Respira'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" variant={running ? 'outline' : 'default'} onClick={() => setRunning(r => !r)}>
          <Wind className="size-4 mr-1.5" />
          {running ? 'Pausar' : 'Empezar respiración'}
        </Button>
        {rounds > 0 && <span className="text-xs text-slate-500">{rounds} ciclo{rounds > 1 ? 's' : ''} completado{rounds > 1 ? 's' : ''}</span>}
      </div>
      <p className="text-[11px] text-slate-400">Caja 4-4-4-4: inhala 4s · mantén 4s · exhala 4s · mantén 4s</p>
    </div>
  );
}

const COOLDOWN_OPTIONS = [15, 30, 60];

function minutesUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 60000));
}

export function TiltGuardModal({ account, trades, open, onOpenChange, winRate, avgRR, maxDrawdownLimitPercent }: TiltGuardModalProps) {
  const { startCooldown, setDeRisk, setLockout, markStreakHandled } = useRiskGuardianStore();
  const logEvent = useLogRiskEvent();
  const { data: tiltReminders = [] } = useReminders({ trigger: 'tilt', onlyActive: true });

  const [emotion, setEmotion] = useState<EmotionalState | ''>('');
  const [note, setNote] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState(0); // 0 = sin cooldown

  // Reset de inputs al abrir
  useEffect(() => {
    if (open) {
      setEmotion('');
      setNote('');
      setCooldownMinutes(0);
    }
  }, [open]);

  const activeSettings = useMemo(() => ({
    baseRiskPercent: account.baseRiskPercent ?? 0.55,
    lossMultiplier: account.lossMultiplier ?? 1.2,
    enableEquityScaling: account.enableEquityScaling ?? true,
    maxRiskPercent: account.maxRiskPercent ?? 2.8,
  }), [account.baseRiskPercent, account.lossMultiplier, account.enableEquityScaling, account.maxRiskPercent]);

  const status = useMemo(
    () => computeAccountRiskStatus(account, trades, new Date(), maxDrawdownLimitPercent),
    [account, trades, maxDrawdownLimitPercent]
  );

  // Árbitro estadístico: referencia de rachas (Monte Carlo o heurística)
  const ref: StreakReference | null = useMemo(() => {
    if (!open) return null;
    const closedCount = trades.filter(t => t.status === 'Closed' || t.exitPrice !== undefined).length;
    return buildStreakReference(closedCount, winRate, avgRR, activeSettings, account.startingBalance);
  }, [open, trades, winRate, avgRR, activeSettings, account.startingBalance]);

  const classification = ref ? classifyStreak(status.consecutiveLosses, status.currentDrawdownPercent, ref) : null;
  const recommended: RiskDecision | null = classification ? recommendActionForStreak(classification.verdict, account) : null;
  const style = classification ? VERDICT_STYLE[classification.verdict] : VERDICT_STYLE.elevated;

  const emotionLabel = EMOTIONS.find(e => e.value === emotion)?.label ?? '';

  const handleDecision = async (decision: RiskDecision) => {
    if (cooldownMinutes > 0) startCooldown(account.id, cooldownMinutes);

    // Si hay lockout sugerido (regla dura en rojo), el día siempre se bloquea
    // independientemente del botón elegido en el modal.
    if (status.lockoutSuggested || decision === 'lockout') setLockout(account.id, true);
    if (decision === 'derisk') setDeRisk(account.id, 0.5);
    else if (decision === 'keep_plan') setDeRisk(account.id, 1);

    markStreakHandled(account.id, status.consecutiveLosses);

    try {
      await logEvent.mutateAsync({
        accountId: account.id,
        type: decision === 'lockout' ? 'lockout' : decision === 'derisk' ? 'derisk' : 'tilt_triggered',
        dayKey: status.dayKey,
        consecutiveLosses: status.consecutiveLosses,
        verdict: classification?.verdict,
        emotionNote: note ? `${emotionLabel} — ${note}` : emotionLabel,
        decision,
        date: new Date().toISOString(),
      });
    } catch {
      // El registro en Firestore es best-effort; no bloquea la decisión
    }

    const msg: Record<RiskDecision, string> = {
      keep_plan: 'Mantienes el plan con riesgo constante.',
      derisk: 'Riesgo reducido al 50% hasta tu próximo trade ganador.',
      lockout: 'Día bloqueado hasta las 8:00 AM de mañana. Descansa y vuelve con la mente fresca.',
    };
    toast.success('Decisión registrada', { description: msg[decision] });
    onOpenChange(false);
  };

  const pos = (v: number) => (ref && ref.expectedWorst > 0 ? Math.min(100, (v / (ref.expectedWorst * 1.2)) * 100) : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="size-5 text-rose-500" />
            Tilt Guard · Control emocional
          </DialogTitle>
          <DialogDescription>
            Llevas {status.consecutiveLosses} pérdidas seguidas. Antes de seguir, respira y decide con la cabeza fría.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
            {/* Reencuadre estadístico */}
            {classification && (
              <div className={`p-4 rounded-xl border ${style.border} ${style.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {classification.source === 'montecarlo' ? 'Según tu Monte Carlo' : 'Estimación heurística (pocos datos)'}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${style.text}`}>{classification.message}</p>

                {/* Mini distribución: tu racha vs media vs peor 10% */}
                <div className="mt-4">
                  <div className="relative h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="absolute -top-0.5 h-3 w-0.5 bg-slate-400" style={{ left: `${pos(classification.expectedMedian)}%` }} />
                    <div className="absolute -top-0.5 h-3 w-0.5 bg-slate-500" style={{ left: `${pos(classification.expectedWorst)}%` }} />
                    <div className={`absolute -top-1 h-4 w-1 rounded ${style.badge}`} style={{ left: `${pos(status.consecutiveLosses)}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Tu racha: <strong className={style.text}>{status.consecutiveLosses}</strong></span>
                    <span>Media: <strong>{classification.expectedMedian}</strong></span>
                    <span>Peor 10%: <strong>{classification.expectedWorst}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Respiración */}
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
              <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Protocolo de regulación</h4>
              <BreathingExercise />
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              {CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Recordatorios de tus apuntes */}
            {tiltReminders.length > 0 && (
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                    <BookOpen className="size-4" /> Recordatorios de tus apuntes
                  </h4>
                  <Link to="/apuntes" className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400">
                    Ver apuntes
                  </Link>
                </div>
                <ul className="space-y-2">
                  {tiltReminders.map((r) => (
                    <li key={r.id} className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{r.title}</span>
                      {r.detail && <span className="block text-xs text-slate-500 dark:text-slate-400">{r.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Journaling obligatorio */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">¿Cómo te sientes ahora? <span className="text-rose-500">*</span></label>
              <Select value={emotion} onValueChange={(v) => setEmotion(v as EmotionalState)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona tu estado emocional" />
                </SelectTrigger>
                <SelectContent>
                  {EMOTIONS.map(e => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Opcional: ¿qué disparó estas pérdidas? ¿seguiste tu plan? ¿qué harás distinto?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Cooldown */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tiempo de enfriamiento (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {COOLDOWN_OPTIONS.map(m => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={cooldownMinutes === m ? 'default' : 'outline'}
                    onClick={() => setCooldownMinutes(cooldownMinutes === m ? 0 : m)}
                  >
                    {m} min
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={cooldownMinutes >= minutesUntilMidnight() ? 'default' : 'outline'}
                  onClick={() => setCooldownMinutes(cooldownMinutes >= minutesUntilMidnight() ? 0 : minutesUntilMidnight())}
                >
                  Resto del día
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: decisión */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 space-y-3">
          {!emotion && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">Registra tu estado emocional para continuar.</p>
          )}
          {status.lockoutSuggested ? (
            /* Bloqueo forzado: regla dura en rojo → un solo botón */
            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] text-rose-600 dark:text-rose-400 text-center">
                Una regla dura está en rojo. La jornada se cierra automáticamente hasta mañana a las 8:00 AM.
              </p>
              <button
                type="button"
                disabled={!emotion}
                onClick={() => handleDecision('lockout')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Lock className="size-4" />
                Cerrar la jornada · hasta mañana 8:00 AM
              </button>
            </div>
          ) : (
            /* Sin regla dura: el usuario elige */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <DecisionButton
                decision="keep_plan"
                recommended={recommended === 'keep_plan'}
                disabled={!emotion}
                onClick={() => handleDecision('keep_plan')}
                icon={<ShieldCheck className="size-4" />}
                title="Mantener plan"
                subtitle="Riesgo constante"
              />
              <DecisionButton
                decision="derisk"
                recommended={recommended === 'derisk'}
                disabled={!emotion}
                onClick={() => handleDecision('derisk')}
                icon={<MinusCircle className="size-4" />}
                title="Reducir 50%"
                subtitle="De-risk hasta verde"
              />
              <DecisionButton
                decision="lockout"
                recommended={recommended === 'lockout'}
                disabled={!emotion}
                onClick={() => handleDecision('lockout')}
                icon={<Lock className="size-4" />}
                title="Bloquear día"
                subtitle="Cerrar la jornada"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DecisionButtonProps {
  decision: RiskDecision;
  recommended: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function DecisionButton({ recommended, disabled, onClick, icon, title, subtitle }: DecisionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed
        ${recommended
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-300 dark:ring-indigo-700'
          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
    >
      {recommended && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wide text-white bg-indigo-500 px-2 py-0.5 rounded-full">
          Recomendado
        </span>
      )}
      <span className="text-slate-700 dark:text-slate-200">{icon}</span>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</span>
    </button>
  );
}
