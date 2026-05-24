import { useParams, Link, useNavigate } from 'react-router';
import { useJournalStore } from '@/store/useJournalStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, Plus } from 'lucide-react';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useJournalStore(state => state.accounts.find(a => a.id === id));
  const trades = useJournalStore(state => state.trades.filter(t => t.accountId === id));

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-bold text-slate-700">Cuenta no encontrada</h2>
        <button onClick={() => navigate('/accounts')} className="mt-4 text-indigo-500 hover:underline">
          Volver a Mis Cuentas
        </button>
      </div>
    );
  }

  const isFunded = account.status === 'Funded';
  const isBlown = account.status === 'Blown';
  const pnlNeto = account.currentBalance - account.startingBalance;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link to="/accounts" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            {account.name}
            <Badge variant={isFunded ? 'success' : isBlown ? 'destructive' : 'info'}>
              {account.status}
            </Badge>
          </h1>
          <p className="text-sm text-slate-500">{account.firm} • Creada el {new Date(account.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Balance Inicial</span>
              <p className="text-xl font-bold">${account.startingBalance.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Balance Actual</span>
              <p className={`text-2xl font-bold ${account.currentBalance >= account.startingBalance ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${account.currentBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">PnL Neto</span>
              <p className={`text-lg font-bold ${pnlNeto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {pnlNeto >= 0 ? '+' : ''}${pnlNeto.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-lg">Historial de Trades</CardTitle>
              <CardDescription>Operaciones registradas en esta cuenta.</CardDescription>
            </div>
            <Link to={`/trades/new?accountId=${account.id}`}>
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
                <Plus className="size-4" /> Registrar Trade
              </button>
            </Link>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <Activity className="size-8 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-500">No hay trades registrados en esta cuenta.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-800/80">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Activo</th>
                      <th className="px-4 py-3">Dirección</th>
                      <th className="px-4 py-3">Estrategia</th>
                      <th className="px-4 py-3">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {trades.map(trade => (
                      <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(trade.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-bold">{trade.asset}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={trade.direction === 'Long' ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'}>
                            {trade.direction}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{trade.strategy}</td>
                        <td className={`px-4 py-3 font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
