import { Info, Gauge, Brain, BarChart3, ShieldCheck, MinusCircle, Lock, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Account } from '@/types';

interface RiskGuardianExplanationModalProps {
  account: Account;
}

const money = (v: number) => `$${Math.round(v).toLocaleString('es-ES')}`;

export function RiskGuardianExplanationModal({ account }: RiskGuardianExplanationModalProps) {
  const startingBalance = account.startingBalance || 50000;
  const dllPct = account.dailyLossLimitPercent ?? 2;
  const dllAmount = startingBalance * (dllPct / 100);
  const lockoutN = account.maxConsecutiveLossesLockout ?? 3;
  const maxTrades = account.maxTradesPerDay ?? 5;
  const profitLockPct = account.dailyProfitLockPercent ?? 3;
  const profitLockAmount = startingBalance * (profitLockPct / 100);
  const baseRisk = account.baseRiskPercent ?? 0.55;
  const deRisked = baseRisk / 2;
  const isFundedOrReal = account.status === 'Funded' || account.status === 'Real';
  const streakScopeLabel = account.streakScope === 'sameDay'
    ? 'solo del día actual'
    : 'por trades (acumulada entre días)';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors"
        >
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Gauge className="size-5 text-rose-500" />
            ¿Cómo funciona el Centinela de Riesgo?
          </DialogTitle>
          <DialogDescription>
            Tu copiloto de control de riesgo y disciplina emocional, con ejemplos de tu propia cuenta.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[62vh] px-6 py-4">
          <div className="space-y-6 pr-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              El Centinela vigila tu operativa <strong>en tiempo real</strong> con un semáforo, y cuando
              encadenas pérdidas activa el <strong>Tilt Guard</strong> para que decidas con la cabeza fría,
              no en caliente. Todo se <strong>reinicia automáticamente cada nuevo día</strong>.
            </p>

            {/* 1. El Semáforo */}
            <div className="bg-sky-50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-100 dark:border-sky-900/50">
              <h4 className="font-bold flex items-center gap-2 text-sky-800 dark:text-sky-400 mb-2">
                <Gauge className="size-4" />
                1. El semáforo en vivo
              </h4>
              <p className="text-sm text-sky-900/80 dark:text-sky-200/80 mb-2">
                Arriba de la cuenta verás una luz por regla: <span className="font-semibold text-emerald-600">verde</span> (bien),
                <span className="font-semibold text-amber-600"> amarillo</span> (precaución),
                <span className="font-semibold text-rose-600"> rojo</span> (peligro).
              </p>
              <ul className="text-sm space-y-1.5 list-disc pl-4 text-sky-900/80 dark:text-sky-200/80">
                <li><strong>Pérdida diaria:</strong> tu límite es {dllPct}% (≈ {money(dllAmount)}). Verde hasta la mitad, rojo al llegar al límite.</li>
                <li><strong>Máx. trades/día:</strong> tope de {maxTrades}. Se pone amarillo al 80% y rojo al llegar (anti-overtrading).</li>
                <li><strong>Racha perdedora:</strong> rojo al llegar a <strong>{lockoutN} SL seguidos</strong> → dispara el Tilt Guard. Modo actual: <strong>{streakScopeLabel}</strong> (lo cambias al editar la cuenta).</li>
                <li><strong>Drawdown:</strong> mide tu caída desde el pico ({account.trailingDrawdown === false ? 'estático: desde el balance inicial' : 'trailing: desde tu máximo'}).</li>
                <li><strong>Objetivo diario:</strong> al llegar a +{profitLockPct}% (≈ {money(profitLockAmount)}) te avisa para <em>proteger el día verde</em>.</li>
              </ul>
            </div>

            {/* 2. El árbitro estadístico */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <h4 className="font-bold flex items-center gap-2 text-indigo-800 dark:text-indigo-400 mb-2">
                <BarChart3 className="size-4" />
                2. El árbitro estadístico (lo más importante)
              </h4>
              <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 mb-2">
                No todas las rachas son iguales. El Centinela corre <strong>miles de simulaciones Monte Carlo</strong> con
                TU winrate y tu RR para saber qué rachas son normales y cuáles no.
              </p>
              <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg text-sm text-indigo-900 dark:text-indigo-200 mb-3">
                <strong>Ejemplo:</strong> con 50% de aciertos, encadenar <strong>5-6 pérdidas seguidas</strong> en 100 trades
                es completamente <strong>normal</strong>. No es que tu sistema esté roto: es el costo de hacer negocio.
              </div>
              <ul className="text-sm space-y-1.5 pl-1 text-indigo-900/80 dark:text-indigo-200/80">
                <li><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 align-middle" /><strong>Ruido</strong> (tu racha ≤ la media esperada): mantén el plan. Tu tamaño en $ ya baja solo al encoger el balance.</li>
                <li><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 align-middle" /><strong>Elevada</strong> (por encima de la media, dentro del peor 10%): descansa y considera reducir.</li>
                <li><span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5 align-middle" /><strong>Anómala</strong> (supera el peor 10% o tu drawdown excede lo simulado): posible deterioro del edge → reduce o cierra y audita.</li>
              </ul>
              <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mt-3 italic">
                Una racha por sí sola no predice el siguiente trade (falacia del jugador). El árbitro distingue
                varianza normal de un problema real.
              </p>
              <div className="mt-3 bg-white/60 dark:bg-black/20 p-2.5 rounded-lg text-xs text-indigo-900 dark:text-indigo-200">
                <strong>En vivo:</strong> el veredicto se recalcula solo y aparece como un chip de color en la
                barra del Centinela (Ruido / Elevada / Anómala), sin abrir este modal. Pasa el cursor por encima
                para ver la explicación completa.
              </div>
            </div>

            {/* 3. El Tilt Guard */}
            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50">
              <h4 className="font-bold flex items-center gap-2 text-rose-800 dark:text-rose-400 mb-2">
                <Brain className="size-4" />
                3. El Tilt Guard (control emocional)
              </h4>
              <p className="text-sm text-rose-900/80 dark:text-rose-200/80 mb-2">
                Se abre <strong>solo</strong> al llegar a {lockoutN} pérdidas seguidas (o ábrelo con "Abrir Centinela"). Te guía paso a paso:
              </p>
              <ul className="text-sm space-y-1.5 list-disc pl-4 text-rose-900/80 dark:text-rose-200/80">
                <li><strong>Reencuadre:</strong> te dice si tu racha es ruido, elevada o anómala (el árbitro de arriba).</li>
                <li><strong>Respiración 4-4-4-4</strong> + checklist anti-tilt (aléjate, relee tu plan, sin revancha).</li>
                <li><strong>Registro emocional obligatorio</strong> antes de continuar (queda guardado).</li>
                <li><strong>Cooldown opcional:</strong> 15 / 30 / 60 min o el resto del día. Mientras corre, la app <strong>bloquea registrar nuevos trades</strong> (puedes anular, pero quedará marcado como "revancha").</li>
              </ul>
            </div>

            {/* 4. Las 3 decisiones */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200 mb-3">
                <Target className="size-4 text-slate-500" />
                4. Las 3 decisiones
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Mantener plan:</strong> riesgo constante. Es lo recomendado cuando la racha es "ruido".</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <MinusCircle className="size-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>Reducir 50% (de-risk):</strong> corta el tamaño a la mitad hasta tu próximo trade ganador.
                    Ejemplo: si tu riesgo base es {baseRisk}%, pasa a <strong>{deRisked.toFixed(2)}%</strong>. El Asesor de Riesgo lo refleja con un badge.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Bloquear día:</strong> cierra la jornada; el Asesor muestra "No operar". Ideal para proteger cuentas de fondeo.</p>
                </div>
              </div>
              <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Regla de oro:</strong> el Centinela <strong>nunca</strong> sube tu riesgo para "recuperar" (martingala){isFundedOrReal ? ', y menos en esta cuenta de fondeo/real donde una racha normal a tamaño inflado revienta el drawdown' : ''}.
                </p>
              </div>
            </div>

            {/* 5. Disciplina */}
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <h4 className="font-bold flex items-center gap-2 text-purple-800 dark:text-purple-400 mb-2">
                <Brain className="size-4" />
                5. Disciplina y revancha
              </h4>
              <ul className="text-sm space-y-1.5 list-disc pl-4 text-purple-900/80 dark:text-purple-200/80">
                <li>En cada trade calificas tu <strong>adherencia al plan (1-5)</strong> y tu <strong>emoción</strong>. Un trade perdedor bien ejecutado puede ser un 5: cuenta el proceso, no el resultado.</li>
                <li>Si registras un trade durante un bloqueo o cooldown, se marca como <strong>"revancha"</strong> automáticamente.</li>
                <li>En <strong>"Estadísticas Operativas"</strong> verás cuánto ganas/pierdes <em>siguiendo el plan vs. fuera de él</em> y por emoción: la prueba de cuánto te cuesta operar en caliente.</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
