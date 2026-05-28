
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Account } from '@/types';
import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

export function AccountEquityChart({equityPoints, account, pnlNeto}: {equityPoints: { date: string; balance: number }[], account: Account, pnlNeto: number}) {
    return (
        <Card className="lg:col-span-2 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Curva de Equity (Balance en Tiempo Real)
                </CardTitle>
                <CardDescription>
                  Representación gráfica del crecimiento de capital en tu cuenta trade a trade.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 text-xs font-semibold">
                {equityPoints.length - 1} operaciones
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[260px] flex items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/50 p-2 overflow-hidden">
                {equityPoints.length > 0 ? (
                  <ChartContainer
                    config={{
                      balance: {
                        label: "Balance",
                        color: "var(--chart-2)",
                      },
                    } satisfies ChartConfig}
                    className="w-full h-full"
                  >
                    <AreaChart
                      data={equityPoints}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800/60" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={30}
                        className="text-[10px] font-bold fill-slate-455 dark:fill-slate-500"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        className="text-[10px] font-bold fill-slate-400"
                        width={60}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => payload[0]?.payload?.date} />}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--color-balance)"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={3}
                        activeDot={{ r: 6, className: "fill-indigo-500 stroke-white dark:stroke-slate-950 stroke-2" }}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="text-slate-400 text-sm">No hay datos suficientes para el gráfico.</div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/40 mt-2 pt-4">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="size-3.5 text-emerald-500" />
                Crecimiento neto total de <strong className={cn(pnlNeto >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {pnlNeto >= 0 ? '+' : ''}${pnlNeto.toLocaleString()}
                </strong>
              </span>
              <span className="text-slate-455 dark:text-slate-500 text-[11px] font-semibold">
                Balance Inicial: ${account.startingBalance.toLocaleString()}
              </span>
            </CardFooter>
          </Card>
    )
}