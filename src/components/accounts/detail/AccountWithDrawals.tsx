import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateWithdrawalDialog } from '@/components/accounts/CreateWithdrawalDialog';
import { Landmark } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import { useAccountDetailStore } from '@/store/useAccountDetailStore';

export function AccountWithDrawals() {
    const { withdrawals, account } = useAccountDetailStore();
    
    if (!account) return null;
    
    return (
        <Card className="shadow-xs">
              <CardHeader className="flex flex-row justify-between items-center pb-3">
                <div>
                  <CardTitle className="text-lg">Historial de Retiros</CardTitle>
                  <CardDescription>Visualiza todos los retiros (payouts) registrados para esta cuenta.</CardDescription>
                </div>
                <CreateWithdrawalDialog />
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Landmark className="size-8 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-500">No hay retiros registrados aún.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                        <TableRow>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Fecha</TableHead>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Monto Retirado</TableHead>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Monto Neto</TableHead>
                          <TableHead className="text-slate-500 dark:text-slate-400 px-4 py-3 font-bold text-xs uppercase tracking-wider">Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((withdrawal) => (
                          <TableRow
                            key={withdrawal.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                          >
                            <TableCell className="px-4 py-3 align-middle text-slate-500 font-medium dark:text-slate-400">
                              {formatDate({ date: new Date(withdrawal.date), size: 'xxsminute' })}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle font-extrabold tracking-tight tabular-nums text-slate-700 dark:text-slate-200">
                              ${withdrawal.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle font-extrabold tracking-tight tabular-nums text-emerald-500">
                              ${(withdrawal.netAmount || (withdrawal.amount * (account.status === 'Real' ? 100 : (account.profitSplit ?? 100)) / 100)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle text-slate-600 dark:text-slate-300">
                              {withdrawal.notes || <span className="text-slate-400">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
    );
}
    
    
    