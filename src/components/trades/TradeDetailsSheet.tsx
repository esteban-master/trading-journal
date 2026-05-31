import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, TrendingUp, TrendingDown, Crosshair, Target, Activity, Image as ImageIcon } from 'lucide-react';
import { Trade } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/formatDate';
import { cn } from '@/lib/utils';

interface TradeDetailsSheetProps {
  trade: Trade;
}

export function TradeDetailsSheet({ trade }: TradeDetailsSheetProps) {
  const isLong = trade.direction === 'Long';
  const isPositive = trade.pnl >= 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400">
          <Eye className="size-4" />
          <span className="sr-only">Ver Detalles</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="p-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SheetTitle className="flex items-center gap-2 text-2xl font-bold">
                {trade.asset.toUpperCase()}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs ml-2",
                    isLong
                      ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                      : 'text-rose-500 border-rose-500/30 bg-rose-500/10'
                  )}
                >
                  {isLong ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                  {trade.direction}
                </Badge>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 mt-1">
                <Calendar className="size-3.5" />
                {formatDate({ size: 'sm', date: new Date(trade.date) })}
              </SheetDescription>
            </div>
            <div className={cn(
              "text-2xl font-black tracking-tight",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              {isPositive ? '+' : ''}${trade.pnl.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 flex flex-col gap-8">
          {/* Metricas Principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Crosshair className="size-3" /> Entrada</span>
              <span className="font-bold">{trade.entryPrice.toLocaleString('en-US')}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Target className="size-3" /> Salida</span>
              <span className="font-bold">{trade.exitPrice ? trade.exitPrice.toLocaleString('en-US') : '—'}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Activity className="size-3" /> R:R Real</span>
              <span className="font-bold">{trade.riskRewardRatio ? `1:${trade.riskRewardRatio}` : '—'}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground">Riesgo Tomado</span>
              <span className="font-bold">{trade.riskPercent ? `${trade.riskPercent}%` : '—'}</span>
            </div>
          </div>

          <Separator />

          {/* Estrategia y Descripción */}
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-muted-foreground mb-2">Estrategia</h4>
              {trade.strategy ? (
                <Badge variant="secondary" className="px-3 py-1 text-sm">{trade.strategy}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground italic">No se especificó estrategia</span>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-muted-foreground mb-3">Descripción y Notas</h4>
              {trade.description && trade.description !== '<p></p>' ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-a:text-indigo-500"
                  dangerouslySetInnerHTML={{ __html: trade.description }} 
                />
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-sm text-muted-foreground text-center bg-slate-50/30 dark:bg-slate-900/30">
                  No hay notas registradas para este trade.
                </div>
              )}
            </div>
          </div>

          {/* Capturas de Pantalla */}
          {trade.images && trade.images.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <ImageIcon className="size-4" />
                Capturas Adjuntas ({trade.images.length})
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {trade.images.map((imgUrl, idx) => (
                  <a 
                    key={idx} 
                    href={imgUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="relative group overflow-hidden rounded-xl border shadow-sm aspect-video bg-slate-950 flex items-center justify-center hover:ring-2 hover:ring-indigo-500 transition-all"
                  >
                    <img 
                      src={imgUrl} 
                      alt={`Captura ${idx + 1}`} 
                      className="object-contain max-w-full max-h-full"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white font-medium text-sm">
                        Ver Imagen Completa
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
