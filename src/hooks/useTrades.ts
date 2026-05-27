import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { Decimal } from 'decimal.js';

import { db } from '@/config/firebase';
import { Trade } from '@/types';

const tradeCollectionKey = 'trades';
const accountCollectionKey = 'accounts';

// Helper to normalize Firestore Trade document data
const normalizeTrade = (docId: string, data: DocumentData): Trade => {
  return {
    id: docId,
    accountId: data.accountId,
    asset: data.asset,
    direction: data.direction,
    entryPrice: data.entryPrice,
    exitPrice: data.exitPrice,
    pnl: data.pnl,
    strategy: data.strategy ?? '',
    riskRewardRatio: data.riskRewardRatio ?? 0,
    images: data.images ?? [],
    date: data.date instanceof Timestamp
      ? data.date.toDate().toISOString()
      : data.date ?? new Date().toISOString(),
    status: data.status ?? 'Closed',
    phase: data.phase
  };
};

// 1. Hook to fetch trades (optionally filtered by accountId)
export function useTrades(accountId?: string) {
  return useQuery<Trade[]>({
    queryKey: accountId ? ['trades', 'account', accountId] : ['trades'],
    queryFn: async () => {
      try {
        const tradesRef = collection(db, tradeCollectionKey);
        let q;

        if (accountId) {
          q = query(
            tradesRef,
            where('accountId', '==', accountId),
            orderBy('date', 'desc')
          );
        } else {
          q = query(tradesRef, orderBy('date', 'desc'));
        }

        const snap = await getDocs(q);
        return snap.docs.map(d => normalizeTrade(d.id, d.data()));
      } catch (error) {
        console.error('Error fetching trades:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// 2. Hook to create a new trade (includes updating account balance)
export function useCreateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTrade: Omit<Trade, 'id'>) => {
      // 1. Get the account to find status and current phase/balances
      const accountRef = doc(db, accountCollectionKey, newTrade.accountId);
      const accSnap = await getDoc(accountRef);
      if (!accSnap.exists()) {
        throw new Error('Account does not exist');
      }

      const accData = accSnap.data();
      const currentPhase = accData.phase || 1;

      // 2. Add the trade document
      const tradeDocRef = await addDoc(collection(db, tradeCollectionKey), {
        accountId: newTrade.accountId,
        asset: newTrade.asset,
        direction: newTrade.direction,
        entryPrice: newTrade.entryPrice,
        exitPrice: newTrade.exitPrice ?? 0,
        pnl: newTrade.pnl,
        strategy: newTrade.strategy,
        riskRewardRatio: newTrade.riskRewardRatio,
        images: newTrade.images ?? [],
        status: newTrade.status ?? 'Closed',
        date: newTrade.date,
        createdAt: Timestamp.fromDate(new Date(newTrade.date)),
        phase: accData.status === 'Evaluation' ? currentPhase : (accData.status === 'Funded' ? 3 : null),
      });

      // 3. Update account balance using decimal.js
      const currentBalance = new Decimal(accData.currentBalance || 0);
      const equity = new Decimal(accData.equity || accData.currentBalance || 0);
      const pnl = new Decimal(newTrade.pnl);

      await updateDoc(accountRef, {
        currentBalance: currentBalance.plus(pnl).toNumber(),
        equity: equity.plus(pnl).toNumber(),
      });

      return tradeDocRef.id;
    },
    onSuccess: (_, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['trades', 'account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.accountId] });
    }
  });
}

// 3. Hook to update a trade
export function useUpdateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Trade> }) => {
      const docRef = doc(db, tradeCollectionKey, id);
      await updateDoc(docRef, fields);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      // Invalidate related account queries too just in case
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}

// 4. Hook to delete a trade
export function useDeleteTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      const docRef = doc(db, tradeCollectionKey, id);
      await deleteDoc(docRef);
      return { id, accountId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['trades', 'account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.accountId] });
    }
  });
}
