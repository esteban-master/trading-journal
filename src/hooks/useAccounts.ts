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
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { Account } from '@/types';

const accountColectionKey = 'accounts';

// Helper to normalize Firestore Account document data
const normalizeAccount = (docId: string, data: DocumentData): Account => {
  return {
    id: docId,
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
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt ?? new Date().toISOString()
  };
};

// 1. Hook to fetch all accounts
export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const q = query(collection(db, accountColectionKey), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => normalizeAccount(d.id, d.data()));
    },
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

  return useMutation({
    mutationFn: async (newAccount: Omit<Account, 'id' | 'createdAt'>) => {
      console.log({newAccount})
      const docRef = await addDoc(collection(db, accountColectionKey), {
        ...newAccount,
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
