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

export function RiskExplanationModal() {
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

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <div className="space-y-6">
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
                <li>Se utiliza tu <strong>Riesgo Base</strong> (ej. 0.55%).</li>
                <li>Si pierdes un trade, se aplica el multiplicador de recuperación (ej. 1.20x) para salir del drawdown.</li>
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
                <li><strong>Ejemplo:</strong> Si tu cuenta está en +2%, tu riesgo será: Base (0.55%) + (0.50%) = <strong>1.05%</strong>.</li>
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
                Tienes ganancias gigantescas. El sistema escala tu riesgo hasta topar con tu <strong>Riesgo Máximo</strong> (ej. 2.80%).
              </p>
              <ul className="text-sm space-y-1 list-disc pl-4 text-indigo-900/80 dark:text-indigo-200/80">
                <li>Te permite sacar retiros enormes o pasar pruebas rápidamente.</li>
                <li>Aún perdiendo un trade al 2.8%, tu cuenta seguirá estando en positivo.</li>
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
                <strong>Ejemplo de Freno:</strong>
                <br />
                • Meta restante: <strong>$184</strong>
                <br />
                • Asumimos RR 1:2. Por tanto, necesitas arriesgar <strong>$92</strong> ($184 / 2).
                <br />
                • Si tu balance es $10,616, esos $92 equivalen al <strong>0.86%</strong> de tu cuenta.
                <br />
                • Aunque estuvieras en Fase 3 y tu riesgo fuera 2.80%, el sistema te pone un <strong>freno al 0.86%</strong>, asegurando que si ganas tu próximo trade a 1:2, pases la prueba exacto.
              </div>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
