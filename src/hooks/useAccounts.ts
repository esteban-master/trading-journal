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
  Timestamp,
  DocumentData
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { Account } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

const accountColectionKey = 'accounts';

// Helper to normalize Firestore Account document data
const normalizeAccount = (docId: string, data: DocumentData): Account => {
  return {
    id: docId,
    userId: data.userId,
    name: data.name,
    firm: data.firm,
    status: data.status,
    cost: data.cost ?? 0,
    startingBalance: data.startingBalance ?? 0,
    currentBalance: data.currentBalance ?? 0,
    equity: data.equity ?? data.currentBalance ?? 0,
    totalWithdrawals: data.totalWithdrawals ?? 0,
    targetProfitPercentage: data.targetProfitPercentage,
    maxDrawdownPercentage: data.maxDrawdownPercentage,
    targetProfitPercentagePhase2: data.targetProfitPercentagePhase2,
    maxDrawdownPercentagePhase2: data.maxDrawdownPercentagePhase2,
    phase: data.phase,
    totalPhases: data.totalPhases,
    profitSplit: data.profitSplit,
    baseRiskPercent: data.baseRiskPercent,
    lossMultiplier: data.lossMultiplier,
    enableEquityScaling: data.enableEquityScaling,
    maxRiskPercent: data.maxRiskPercent,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt ?? new Date().toISOString()
  };
};

// 1. Hook to fetch all accounts
export function useAccounts() {
  const { user } = useAuthStore();

  return useQuery<Account[]>({
    queryKey: ['accounts', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const q = query(
        collection(db, accountColectionKey),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const accounts = snap.docs.map(d => normalizeAccount(d.id, d.data()));

      // Ordenar localmente para evitar la necesidad de un índice compuesto en Firebase
      return accounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes cache validity
  });
}

// 2. Hook to fetch a single account detail
export function useAccountDetail(id: string | undefined) {
  return useQuery<Account | null>({
    queryKey: ['accounts', id],
    queryFn: async () => {
      if (!id) return null;
      const docRef = doc(db, accountColectionKey, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return normalizeAccount(snap.id, snap.data());
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// 3. Hook to create a new account
export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (newAccount: Omit<Account, 'id' | 'createdAt' | 'userId'>) => {
      if (!user?.uid) throw new Error("Unauthenticated");
      const docRef = await addDoc(collection(db, accountColectionKey), {
        ...newAccount,
        userId: user.uid,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}

// 4. Hook to update an existing account
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Account> }) => {
      const docRef = doc(db, accountColectionKey, id);
      await updateDoc(docRef, fields);
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.id] });
    }
  });
}

// 5. Hook to delete an account
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, accountColectionKey, id);
      await deleteDoc(docRef);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}
