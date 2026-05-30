import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  runTransaction
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { Withdrawal } from '@/types';
import Decimal from 'decimal.js';

const withdrawalsCollectionKey = 'withdrawals';
const accountCollectionKey = 'accounts';

const normalizeWithdrawal = (docId: string, data: DocumentData): Withdrawal => {
  return {
    userId: data.userId,
    id: docId,
    accountId: data.accountId,
    amount: data.amount,
    netAmount: data.netAmount,
    date: data.date instanceof Timestamp
      ? data.date.toDate().toISOString()
      : data.date ?? new Date().toISOString(),
    notes: data.notes
  };
};

export function useWithdrawals(accountId?: string) {
  return useQuery<Withdrawal[]>({
    queryKey: accountId ? ['withdrawals', 'account', accountId] : ['withdrawals'],
    queryFn: async () => {
      try {
        const withdrawalsRef = collection(db, withdrawalsCollectionKey);
        let q;

        if (accountId) {
          q = query(
            withdrawalsRef,
            where('accountId', '==', accountId),
            orderBy('date', 'desc')
          );
        } else {
          q = query(withdrawalsRef, orderBy('date', 'desc'));
        }

        const snap = await getDocs(q);
        return snap.docs.map(d => normalizeWithdrawal(d.id, d.data()));
      } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newWithdrawal: Omit<Withdrawal, 'id'>) => {
      // Usar transacción para asegurar consistencia
      let withdrawalId = '';

      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, accountCollectionKey, newWithdrawal.accountId);
        const accountDoc = await transaction.get(accountRef);

        if (!accountDoc.exists()) {
          throw new Error("La cuenta no existe!");
        }

        const data = accountDoc.data();

        // Calcular nuevos balances usando Decimal
        const currentBalance = new Decimal(data.currentBalance || 0);
        const startingBalance = new Decimal(data.startingBalance || 0);
        const equity = new Decimal(data.equity || data.currentBalance || 0);
        const totalWithdrawals = new Decimal(data.totalWithdrawals || 0);
        const withdrawalAmount = new Decimal(newWithdrawal.amount);

        if (currentBalance.lessThan(withdrawalAmount)) {
          throw new Error("El monto de retiro supera el balance actual.");
        }

        if (data.status === 'Funded' || data.status === 'Real') {
          const profit = currentBalance.minus(startingBalance);
          if (profit.lessThan(100)) {
            throw new Error(`Debes tener al menos $100 de ganancia para retirar. Ganancia actual: $${profit.toNumber()}`);
          }
          if (withdrawalAmount.greaterThan(profit)) {
            throw new Error(`No puedes retirar más de tu ganancia actual ($${profit.toNumber()}).`);
          }
        }

        const profitSplit = data.status === 'Real' ? 100 : (data.profitSplit ?? 100);
        const netAmount = withdrawalAmount.mul(profitSplit).div(100).toNumber();

        // Crear el documento de retiro
        const newWithdrawalRef = doc(collection(db, withdrawalsCollectionKey));
        transaction.set(newWithdrawalRef, {
          accountId: newWithdrawal.accountId,
          amount: newWithdrawal.amount,
          netAmount: netAmount,
          date: newWithdrawal.date,
          createdAt: Timestamp.fromDate(new Date(newWithdrawal.date)),
          notes: newWithdrawal.notes || ''
        });

        // Actualizar la cuenta
        transaction.update(accountRef, {
          currentBalance: currentBalance.minus(withdrawalAmount).toNumber(),
          equity: equity.minus(withdrawalAmount).toNumber(),
          totalWithdrawals: totalWithdrawals.plus(withdrawalAmount).toNumber()
        });

        withdrawalId = newWithdrawalRef.id;
      });

      return withdrawalId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals', 'account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.accountId] });
    }
  });
}
