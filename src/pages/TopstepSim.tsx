import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  TrendingUp,
  DollarSign,
  BarChart2,
  PlayCircle,
  Target,
  Percent,
  Zap,
} from 'lucide-react';
import {
  runTopstepSimulation,
  binomialDistribution,
  type AccountSimResult,
  type TopstepSimResult,
} from '@/lib/topstepSimulator';

// ─── Parámetros fijos Topstep 50k ────────────────────────────────────────────
const TOPSTEP_PARAMS = {
  startingBalance: 50_000,
  phaseTarget: 3_000,
  dailyLimit: 1_500,
  maxDrawdown: 2_000,
  riskPerTrade: 2_000,
  rewardPerTrade: 1_500,
  tradesNeeded: 2,
  ratio: '1 : 0.75',
};

const NUM_ACCOUNTS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
type AccountStatus = AccountSimResult['status'] | 'idle';

const STATUS_CONFIG: Record<
  AccountStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  idle: {
    label: 'Pendiente',
    color: 'text-muted-foreground',
    bg: 'bg-muted/30 border-border',
    icon: <Clock className="size-4 text-muted-foreground" />,
  },
  pending: {
    label: 'Activa',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: <Clock className="size-4 text-blue-400" />,
  },
  day1_won: {
    label: 'Día 1 ✓',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: <Target className="size-4 text-amber-400" />,
  },
  passed: {
    label: 'PASÓ',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: <CheckCircle2 className="size-4 text-emerald-400" />,
  },
  blown_day1: {
    label: 'Quemada D1',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    icon: <XCircle className="size-4 text-red-400" />,
  },
  blown_day2: {
    label: 'Quemada D2',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    icon: <XCircle className="size-4 text-orange-400" />,
  },
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtMoney = (n: number) => (n < 0 ? `-$${fmt(Math.abs(n))}` : `$${fmt(n)}`);

// ─── AccountCard ──────────────────────────────────────────────────────────────
function AccountCard({ num, status }: { num: number; status: AccountStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-1.5 transition-all duration-300 ${cfg.bg}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Cuenta #{num}</span>
        {cfg.icon}
      </div>
      <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
      <div className="flex gap-1 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-1 py-0">D{num}</Badge>
        <Badge variant="outline" className="text-[10px] px-1 py-0">D{num + NUM_ACCOUNTS}</Badge>
      </div>
      <div className="text-[10px] text-muted-foreground">R: $2,000 → $1,500</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TopstepSim() {
  const [winRatePct, setWinRatePct] = useState(55);
  const [challengeCost, setChallengeCost] = useState(49);
  const [activationFee, setActivationFee] = useState(149);
  const [grossProfit, setGrossProfit] = useState(2000);
  const [profitSplitPct, setProfitSplitPct] = useState(50);
  const [iterations, setIterations] = useState(5000);

  const fundedValue = grossProfit * (profitSplitPct / 100);

  const [simResult, setSimResult] = useState<TopstepSimResult | null>(null);
  const [accountStates, setAccountStates] = useState<AccountStatus[]>(
    Array(NUM_ACCOUNTS).fill('idle')
  );
  const [isRunning, setIsRunning] = useState(false);

  const winRate = winRatePct / 100;

  const analytics = useMemo(() => {
    const pPass = winRate * winRate;
    const analyticalExpected = NUM_ACCOUNTS * pPass;
    // Break-even: challengeCost + pPass × activationFee = pPass × fundedValue
    // challengeCost = pPass × (fundedValue - activationFee)
    // pPass = challengeCost / (fundedValue - activationFee)  →  W = sqrt(pPass)
    const netValuePerPass = fundedValue - activationFee;
    const breakEvenWinRate = netValuePerPass > 0 ? Math.sqrt(challengeCost / netValuePerPass) : 1;
    const binomial = binomialDistribution(NUM_ACCOUNTS, pPass);
    const totalChallengeCost = NUM_ACCOUNTS * challengeCost;
    const expectedActivationCost = analyticalExpected * activationFee;
    const expectedTotalCost = totalChallengeCost + expectedActivationCost;
    const expectedRevenue = analyticalExpected * fundedValue;
    const expectedEV = expectedRevenue - expectedTotalCost;
    return {
      pPass,
      analyticalExpected,
      breakEvenWinRate,
      binomial,
      totalChallengeCost,
      expectedActivationCost,
      expectedTotalCost,
      expectedRevenue,
      expectedEV,
    };
  }, [winRate, challengeCost, activationFee, fundedValue]);

  const analyticalChartData = analytics.binomial.map((prob, k) => ({
    k,
    prob: prob * 100,
  }));

  async function handleRun() {
    setIsRunning(true);
    setAccountStates(Array(NUM_ACCOUNTS).fill('pending'));
    await new Promise((r) => setTimeout(r, 150));

    const result = runTopstepSimulation({
      winRate,
      numAccounts: NUM_ACCOUNTS,
      iterations,
      challengeCost,
      activationFee,
      fundedValue,
    });

    setSimResult(result);
    setAccountStates(result.sampleRun.map((a) => a.status));
    setIsRunning(false);
  }

  const simChartData = simResult
    ? simResult.distribution.map((count, k) => ({
        k,
        pct: simResult.distributionPct[k],
        count,
      }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="size-5 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight">Simulador 10 Cuentas Topstep</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Rotación diaria: 1 trade por cuenta, ciclo de 10 días. Cada cuenta necesita 2 trades
          ganadores para pasar la Fase 1 y activarse.
        </p>
      </div>

      {/* Parámetros Topstep */}
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-indigo-400">Parámetros Topstep 50k (Fase 1)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ['Objetivo fase', `$${fmt(TOPSTEP_PARAMS.phaseTarget)} (6%)`],
              ['Límite diario', `$${fmt(TOPSTEP_PARAMS.dailyLimit)}`],
              ['Max drawdown', `$${fmt(TOPSTEP_PARAMS.maxDrawdown)}`],
              ['Riesgo/trade', `$${fmt(TOPSTEP_PARAMS.riskPerTrade)}`],
              ['Ganancia/trade', `$${fmt(TOPSTEP_PARAMS.rewardPerTrade)}`],
              ['Ratio', TOPSTEP_PARAMS.ratio],
              ['Trades para pasar', `${TOPSTEP_PARAMS.tradesNeeded} ganadores`],
              ['Ciclo rotación', '10 días'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Config + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel de configuración */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Win Rate */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Win Rate</Label>
                <span className="text-lg font-bold text-indigo-400">{winRatePct}%</span>
              </div>
              <Slider
                min={20}
                max={80}
                step={1}
                value={[winRatePct]}
                onValueChange={([v]) => setWinRatePct(v)}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>20%</span>
                <span>80%</span>
              </div>
            </div>

            {/* Costos separados */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-cost" className="text-sm">
                  Costo del challenge ($)
                </Label>
                <Input
                  id="challenge-cost"
                  type="number"
                  min={0}
                  value={challengeCost}
                  onChange={(e) => setChallengeCost(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Se paga por cada cuenta, gane o pierda
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="activation-fee" className="text-sm">
                  Fee de activación ($)
                </Label>
                <Input
                  id="activation-fee"
                  type="number"
                  min={0}
                  value={activationFee}
                  onChange={(e) => setActivationFee(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Solo se paga al pasar el challenge
                </p>
              </div>
            </div>

            {/* Ganancia bruta + Profit split */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gross-profit" className="text-sm">
                  Ganancia bruta en cuenta fondeada ($)
                </Label>
                <Input
                  id="gross-profit"
                  type="number"
                  min={0}
                  value={grossProfit}
                  onChange={(e) => setGrossProfit(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Profit Split</Label>
                  <span className="text-lg font-bold text-emerald-400">{profitSplitPct}%</span>
                </div>
                <Slider
                  min={25}
                  max={100}
                  step={5}
                  value={[profitSplitPct]}
                  onValueChange={([v]) => setProfitSplitPct(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>25%</span>
                  <span>100%</span>
                </div>
              </div>
              {/* Resultado calculado */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Tu parte: </span>
                <span className="font-bold text-emerald-400">${(grossProfit * profitSplitPct / 100).toLocaleString()}</span>
                <span className="text-muted-foreground text-xs ml-1">
                  ({profitSplitPct}% de ${grossProfit.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Iteraciones */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Iteraciones simulación</Label>
              <Select
                value={String(iterations)}
                onValueChange={(v) => setIterations(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="5000">5,000</SelectItem>
                  <SelectItem value="10000">10,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRun}
              disabled={isRunning}
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <PlayCircle className="size-4" />
              {isRunning ? 'Corriendo...' : 'Correr Simulación'}
            </Button>
          </CardContent>
        </Card>

        {/* Grid 10 cuentas */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estado de Cuentas</CardTitle>
            <CardDescription className="text-xs">
              Muestra el resultado de una corrida de ejemplo. Cada cuenta opera en su día asignado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Array.from({ length: NUM_ACCOUNTS }, (_, i) => (
                <AccountCard key={i + 1} num={i + 1} status={accountStates[i]} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
              {(
                [
                  ['idle', 'Sin correr'],
                  ['day1_won', 'Trade 1 ganado'],
                  ['passed', 'Pasó la fase'],
                  ['blown_day1', 'Quemada en D1'],
                  ['blown_day2', 'Quemada en D2'],
                ] as [AccountStatus, string][]
              ).map(([s, lbl]) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="flex items-center gap-1">
                    {cfg.icon}
                    <span className={cfg.color}>{lbl}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analitica">
        <TabsList className="mb-4">
          <TabsTrigger value="analitica" className="gap-1.5">
            <TrendingUp className="size-3.5" />
            Analítica
          </TabsTrigger>
          <TabsTrigger value="simulacion" className="gap-1.5">
            <BarChart2 className="size-3.5" />
            Simulación
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab Analítica ─────────────────────────────────── */}
        <TabsContent value="analitica" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={<Percent className="size-4 text-indigo-400" />}
              label="P(una cuenta pasa)"
              value={fmtPct(analytics.pPass)}
              sub="= Win Rate²"
            />
            <MetricCard
              icon={<Trophy className="size-4 text-amber-400" />}
              label="Cuentas esperadas"
              value={analytics.analyticalExpected.toFixed(2)}
              sub={`de ${NUM_ACCOUNTS}`}
            />
            <MetricCard
              icon={<Target className="size-4 text-emerald-400" />}
              label="Break-even WR"
              value={
                analytics.breakEvenWinRate >= 1 ? '> 100%' : fmtPct(analytics.breakEvenWinRate)
              }
              sub="para EV = 0"
            />
            <MetricCard
              icon={<DollarSign className="size-4 text-rose-400" />}
              label="Costo challenges"
              value={fmtMoney(-analytics.totalChallengeCost)}
              sub={`${NUM_ACCOUNTS} × $${challengeCost}`}
            />
          </div>

          {/* Desglose de costos analítico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Desglose Financiero Esperado</CardTitle>
              <CardDescription className="text-xs">
                Con win rate {winRatePct}% → se esperan pasar{' '}
                {analytics.analyticalExpected.toFixed(2)} cuentas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="size-3" /> Challenges (10 × ${challengeCost})
                  </span>
                  <span className="text-lg font-bold text-rose-400">
                    {fmtMoney(-analytics.totalChallengeCost)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Siempre se paga</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="size-3" /> Activaciones ({analytics.analyticalExpected.toFixed(1)} × ${activationFee})
                  </span>
                  <span className="text-lg font-bold text-orange-400">
                    {fmtMoney(-analytics.expectedActivationCost)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Solo al pasar</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="size-3" /> Retorno esperado ({profitSplitPct}% split)
                  </span>
                  <span className="text-lg font-bold text-emerald-400">
                    {fmtMoney(analytics.expectedRevenue)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {analytics.analyticalExpected.toFixed(1)} × ${fundedValue.toLocaleString()} neto
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="size-3" /> EV neto
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      analytics.expectedEV >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {fmtMoney(analytics.expectedEV)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Retorno − todos los costos
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribución binomial */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Distribución Teórica (Binomial) — P(pasar k de 10 cuentas)
              </CardTitle>
              <CardDescription className="text-xs">
                Win rate {winRatePct}% → P(cuenta pasa) = {fmtPct(analytics.pPass)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analyticalChartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="k" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(2)}%`, 'Probabilidad']}
                    labelFormatter={(l) => `${l} cuentas pasan`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine
                    x={Math.round(analytics.analyticalExpected)}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    label={{ value: 'Esp.', position: 'top', fontSize: 10, fill: '#6366f1' }}
                  />
                  <Bar dataKey="prob" radius={[4, 4, 0, 0]}>
                    {analyticalChartData.map((entry) => (
                      <Cell
                        key={entry.k}
                        fill={
                          entry.k === 0
                            ? '#ef4444'
                            : entry.k >= Math.ceil(NUM_ACCOUNTS * analytics.pPass)
                            ? '#10b981'
                            : '#6366f1'
                        }
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabla de sensibilidad */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tabla de Sensibilidad</CardTitle>
              <CardDescription className="text-xs">
                Challenge $49 + Activación $149 (solo al pasar)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-4">Win Rate</th>
                      <th className="text-right py-2 pr-4">P(pasa)</th>
                      <th className="text-right py-2 pr-4">Cuentas esp.</th>
                      <th className="text-right py-2 pr-4">Costo total esp.</th>
                      <th className="text-right py-2">EV neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[40, 45, 50, 55, 60, 65, 70].map((wr) => {
                      const w = wr / 100;
                      const pP = w * w;
                      const exp = NUM_ACCOUNTS * pP;
                      const totalCost = NUM_ACCOUNTS * challengeCost + exp * activationFee;
                      const revenue = exp * fundedValue;
                      const ev = revenue - totalCost;
                      const isActive = wr === winRatePct;
                      return (
                        <tr
                          key={wr}
                          className={`border-b border-border/50 transition-colors ${
                            isActive ? 'bg-indigo-500/10' : 'hover:bg-muted/30'
                          }`}
                        >
                          <td className={`py-2 pr-4 font-medium ${isActive ? 'text-indigo-400' : ''}`}>
                            {wr}%
                          </td>
                          <td className="text-right py-2 pr-4 text-muted-foreground">
                            {fmtPct(pP)}
                          </td>
                          <td className="text-right py-2 pr-4 font-semibold">{exp.toFixed(1)}</td>
                          <td className="text-right py-2 pr-4 text-rose-400">
                            {fmtMoney(-totalCost)}
                          </td>
                          <td
                            className={`text-right py-2 font-semibold ${
                              ev >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {fmtMoney(ev)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab Simulación ─────────────────────────────────── */}
        <TabsContent value="simulacion" className="flex flex-col gap-4">
          {!simResult ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <BarChart2 className="size-10 opacity-30" />
              <p className="text-sm">Presiona "Correr Simulación" para ver los resultados Monte Carlo</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={<Trophy className="size-4 text-emerald-400" />}
                  label="Mediana (P50)"
                  value={simResult.p50.toFixed(1)}
                  sub="cuentas pasan"
                />
                <MetricCard
                  icon={<TrendingUp className="size-4 text-blue-400" />}
                  label="Optimista (P90)"
                  value={simResult.p90.toFixed(1)}
                  sub="cuentas pasan"
                />
                <MetricCard
                  icon={<XCircle className="size-4 text-rose-400" />}
                  label="Pesimista (P10)"
                  value={simResult.p10.toFixed(1)}
                  sub="cuentas pasan"
                />
                <MetricCard
                  icon={<BarChart2 className="size-4 text-indigo-400" />}
                  label="Promedio empírico"
                  value={simResult.avgPassed.toFixed(2)}
                  sub={`vs ${simResult.analyticalExpected.toFixed(2)} teórico`}
                />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Distribución Empírica — {iterations.toLocaleString()} iteraciones
                  </CardTitle>
                  <CardDescription className="text-xs">
                    ¿En qué % de los escenarios pasaron 0, 1, 2... cuentas?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={simChartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="k" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} width={40} />
                      <Tooltip
                        formatter={(v: number, _: string, props: { payload?: { count?: number } }) => [
                          `${v.toFixed(2)}% (${props.payload?.count ?? 0} veces)`,
                          'Frecuencia',
                        ]}
                        labelFormatter={(l) => `${l} cuentas pasan`}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <ReferenceLine
                        x={Math.round(simResult.avgPassed)}
                        stroke="#6366f1"
                        strokeDasharray="4 4"
                        label={{ value: 'Prom.', position: 'top', fontSize: 10, fill: '#6366f1' }}
                      />
                      <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                        {simChartData.map((entry) => (
                          <Cell
                            key={entry.k}
                            fill={
                              entry.k === 0
                                ? '#ef4444'
                                : entry.k >= Math.round(simResult.avgPassed)
                                ? '#10b981'
                                : '#6366f1'
                            }
                            fillOpacity={0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Resumen financiero con desglose */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumen Financiero Esperado</CardTitle>
                  <CardDescription className="text-xs">
                    Basado en promedio de {iterations.toLocaleString()} iteraciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Challenges (fijo)</span>
                      <span className="text-xl font-bold text-rose-400">
                        {fmtMoney(-simResult.totalChallengeCost)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {NUM_ACCOUNTS} × ${challengeCost}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Activaciones (esperado)</span>
                      <span className="text-xl font-bold text-orange-400">
                        {fmtMoney(-simResult.expectedActivationCost)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {simResult.avgPassed.toFixed(2)} × ${activationFee}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Retorno esperado ({profitSplitPct}% split)</span>
                      <span className="text-xl font-bold text-emerald-400">
                        {fmtMoney(simResult.expectedRevenue)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {simResult.avgPassed.toFixed(2)} × ${fundedValue.toLocaleString()} neto
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">P&L neto esperado</span>
                      <span
                        className={`text-xl font-bold ${
                          simResult.expectedNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {fmtMoney(simResult.expectedNetPnl)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Break-even WR: {fmtPct(simResult.breakEvenWinRate)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
