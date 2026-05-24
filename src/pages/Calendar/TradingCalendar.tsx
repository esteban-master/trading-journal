import { useState } from 'react';
import { useJournalStore } from '@/store/useJournalStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

export default function TradingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const trades = useJournalStore(state => state.trades);

  // Generar días del mes actual
  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });

  // Calcular PnL por día
  const pnlByDay = daysInMonth.map(day => {
    const dayTrades = trades.filter(t => isSameDay(new Date(t.date), day));
    const netPnl = dayTrades.reduce((acc, curr) => acc + curr.pnl, 0);
    return { date: day, netPnl, count: dayTrades.length };
  });

  // Totales del mes
  const monthlyPnL = pnlByDay.reduce((acc, curr) => acc + curr.netPnl, 0);
  const winDays = pnlByDay.filter(d => d.netPnl > 0).length;
  const lossDays = pnlByDay.filter(d => d.netPnl < 0).length;

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Calendario Operativo
          </h1>
          <p className="text-slate-500 text-sm">Visualiza tu rendimiento neto diario.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase">PnL del Mes</p>
            <p className={`text-xl font-bold ${monthlyPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {monthlyPnL >= 0 ? '+' : ''}${monthlyPnL.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={nextMonth} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Rellenar espacios vacíos antes del primer día del mes */}
            {Array.from({ length: firstDay.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-transparent"></div>
            ))}

            {/* Días del mes */}
            {pnlByDay.map(({ date, netPnl, count }, i) => {
              const isToday = isSameDay(date, new Date());
              const hasTrades = count > 0;
              let bgColor = 'bg-slate-50 dark:bg-slate-900/50';
              let borderColor = 'border-slate-100 dark:border-slate-800';

              if (hasTrades) {
                if (netPnl > 0) {
                  bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/10';
                  borderColor = 'border-emerald-500/30';
                } else if (netPnl < 0) {
                  bgColor = 'bg-rose-500/10 dark:bg-rose-500/10';
                  borderColor = 'border-rose-500/30';
                } else {
                  bgColor = 'bg-slate-200/50 dark:bg-slate-800';
                }
              }

              return (
                <div 
                  key={i} 
                  className={`relative h-24 rounded-lg border p-2 flex flex-col justify-between transition-colors ${bgColor} ${borderColor} ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {format(date, 'd')}
                  </span>
                  
                  {hasTrades && (
                    <div className="text-right">
                      <span className={`block text-xs font-bold ${netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {netPnl >= 0 ? '+' : ''}${netPnl}
                      </span>
                      <span className="text-[10px] text-slate-400">{count} trade(s)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Resumen Mensual Visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><TrendingUp className="size-5" /></div>
          <div>
            <p className="text-xs text-slate-500">Días Verdes</p>
            <p className="font-bold text-lg">{winDays}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
          <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><TrendingDown className="size-5" /></div>
          <div>
            <p className="text-xs text-slate-500">Días Rojos</p>
            <p className="font-bold text-lg">{lossDays}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
