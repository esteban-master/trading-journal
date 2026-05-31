import { Info, ShieldAlert, TrendingUp, Target, Scale, Zap } from 'lucide-react';
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

interface RiskExplanationModalProps {
  account: Account;
}

export function RiskExplanationModal({ account }: RiskExplanationModalProps) {
  const baseRisk = account.baseRiskPercent ?? 0.55;
  const lossMult = account.lossMultiplier ?? 1.2;
  const maxRisk = account.maxRiskPercent ?? 2.8;
  const phase2Risk = (baseRisk + 0.5).toFixed(2);

  const isEval = account.status === 'Evaluation';
  const targetPct = account.targetProfitPercentage ?? 6;
  const startingBal = account.startingBalance ?? 10000;
  const currentBal = account.currentBalance ?? startingBal;
  const targetValue = startingBal * (targetPct / 100);
  const targetBalance = startingBal + targetValue;

  let remainingToTarget = targetBalance - currentBal;
  let isExampleSimulated = false;

  if (remainingToTarget <= 0 || !isEval) {
    remainingToTarget = startingBal * 0.01; // simulate 1% remaining
    isExampleSimulated = true;
  }

  const riskNeededDls = remainingToTarget / 2;
  const riskNeededPct = (riskNeededDls / currentBal) * 100;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors">
          <Info className="size-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Scale className="size-5 text-indigo-500" />
            Estrategia de Riesgo Dinámico ("Buffer Strategy")
          </DialogTitle>
          <DialogDescription>
            Conoce cómo el Asesor de Riesgo calcula tu porcentaje recomendado paso a paso.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
          <div className="space-y-6 pr-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              El algoritmo matemático divide tu operativa en 4 fases distintas. Su objetivo principal es <strong>proteger tu capital inicial</strong> y, una vez tengas ganancias ("dinero de la casa"), apalancarte de forma inteligente para alcanzar tu meta.
            </p>

            {/* Fase 1 */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <h4 className="font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-400 mb-2">
                <ShieldAlert className="size-4" />
                Fase 1: Supervivencia (PnL 0% a 1%)
              </h4>
              <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80 mb-2">
                Estás operando cerca de tu balance inicial. El algoritmo será extremadamente conservador.
              </p>
              <ul className="text-sm space-y-1 list-disc pl-4 text-emerald-900/80 dark:text-emerald-200/80">
                <li>Se utiliza tu <strong>Riesgo Base</strong> ({baseRisk.toFixed(2)}%).</li>
                <li>Si pierdes un trade, se aplica el multiplicador de recuperación ({lossMult.toFixed(2)}x) para salir del drawdown.</li>
              </ul>
            </div>

            {/* Fase 2 */}
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <h4 className="font-bold flex items-center gap-2 text-blue-800 dark:text-blue-400 mb-2">
                <TrendingUp className="size-4" />
                Fase 2: Aceleración / Colchón (PnL 1% a 3%)
              </h4>
              <p className="text-sm text-blue-900/80 dark:text-blue-200/80 mb-2">
                ¡Felicidades! Tienes un colchón de ganancias mayor al 1%. Ahora usaremos el dinero de la firma a nuestro favor.
              </p>
              <ul className="text-sm space-y-1 list-disc pl-4 text-blue-900/80 dark:text-blue-200/80">
                <li>Por cada 1% adicional de ganancia, se suma 0.50% a tu Riesgo Base.</li>
                <li><strong>Ejemplo con tu cuenta:</strong> Si tu cuenta está en +2%, tu riesgo será: Base ({baseRisk.toFixed(2)}%) + (0.50%) = <strong>{phase2Risk}%</strong>.</li>
                <li>Si pierdes, sigues estando en positivo, pero el sistema desactiva esta fase y vuelves a riesgo base.</li>
              </ul>
            </div>

            {/* Fase 3 */}
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <h4 className="font-bold flex items-center gap-2 text-indigo-800 dark:text-indigo-400 mb-2">
                <Zap className="size-4" />
                Fase 3: Snowball / Apalancamiento (PnL &gt; 3%)
              </h4>
              <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 mb-2">
                Tienes ganancias gigantescas. El sistema escala tu riesgo hasta topar con tu <strong>Riesgo Máximo</strong> ({maxRisk.toFixed(2)}%).
              </p>
              <ul className="text-sm space-y-1 list-disc pl-4 text-indigo-900/80 dark:text-indigo-200/80">
                <li>Te permite sacar retiros enormes o pasar pruebas rápidamente.</li>
                <li>Aún perdiendo un trade al {maxRisk.toFixed(2)}%, tu cuenta seguirá estando en positivo.</li>
              </ul>
            </div>

            {/* Fase 4 */}
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <h4 className="font-bold flex items-center gap-2 text-purple-800 dark:text-purple-400 mb-2">
                <Target className="size-4" />
                Fase 4: Cierre de Prueba (Freno por Target)
              </h4>
              <p className="text-sm text-purple-900/80 dark:text-purple-200/80 mb-3">
                <em>Solo activo en cuentas de Evaluación.</em> Es un "guardaespaldas matemático" que previene que arriesgues más de lo estrictamente necesario para fondearte.
              </p>
              <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg text-sm text-purple-900 dark:text-purple-200 font-mono">
                <strong>{isExampleSimulated ? 'Ejemplo simulado (si te faltara 1% para la meta):' : 'Ejemplo basado en tu cuenta:'}</strong>
                <br />
                • Meta restante: <strong>${remainingToTarget.toFixed(2)}</strong>
                <br />
                • Asumimos RR 1:2. Por tanto, necesitas arriesgar <strong>${riskNeededDls.toFixed(2)}</strong> (${remainingToTarget.toFixed(2)} / 2).
                <br />
                • Con tu balance actual (${currentBal.toFixed(2)}), esos ${riskNeededDls.toFixed(2)} equivalen al <strong>{riskNeededPct.toFixed(2)}%</strong> de tu cuenta.
                <br />
                • Aunque estuvieras en Fase 3 y tu riesgo fuera {maxRisk.toFixed(2)}%, el sistema te pone un <strong>freno al {riskNeededPct.toFixed(2)}%</strong>, asegurando que si ganas tu próximo trade a 1:2, pases la prueba exacto.
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
