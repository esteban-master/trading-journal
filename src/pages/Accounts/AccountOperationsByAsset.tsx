import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";;
import { useAccountDetailStore } from "@/store/useAccountDetailStore";

export function AccountOperationsByAsset() {
    const assetsArray = useAccountDetailStore((s)=> s.assetsArray)    
    return (
        <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Operativa por Activo
              </CardTitle>
              <CardDescription>
                Rendimiento de los pares y activos más operados en mercado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 mt-2">
              {assetsArray.length === 0 ? (
                <div className="text-center py-12 text-slate-455 text-sm">
                  Registra trades para ver estadísticas por activo.
                </div>
              ) : (
                assetsArray.map((asset, idx) => {
                  const isAssetPositive = asset.profit >= 0;
                  const colors = ["bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-emerald-500"];
                  const assetColor = colors[idx % colors.length];

                  return (
                    <div key={asset.name} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${assetColor}`} />
                          <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{asset.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({asset.count} trades)</span>
                        </div>
                        <Badge variant={isAssetPositive ? "success" : "destructive"} className="text-[10px] font-extrabold select-none">
                          {isAssetPositive ? '+' : ''}${asset.profit.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                        </Badge>
                      </div>

                      {/* Winrate Bar */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Win Rate</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{asset.winRate}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-150 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isAssetPositive ? 'bg-emerald-500' : 'bg-rose-500/80'} transition-all`}
                            style={{ width: `${asset.winRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
    )
}
