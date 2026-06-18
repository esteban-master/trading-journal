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
  DocumentData,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { InvestmentCycle } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

const COLLECTION = 'investmentCycles';

function normalizeCycle(docId: string, data: DocumentData): InvestmentCycle {
  return {
    id: docId,
    userId: data.userId,
    name: data.name,
    status: data.status ?? 'active',
    startDate: data.startDate instanceof Timestamp
      ? data.startDate.toDate().toISOString().split('T')[0]
      : data.startDate ?? new Date().toISOString().split('T')[0],
    accountIds: data.accountIds ?? [],
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt ?? new Date().toISOString(),
    strategyMode: data.strategyMode ?? undefined,
  };
}

export function useInvestmentCycles() {
  const { user } = useAuthStore();

  return useQuery<InvestmentCycle[]>({
    queryKey: ['investmentCycles', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const q = query(collection(db, COLLECTION), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const cycles = snap.docs.map((d) => normalizeCycle(d.id, d.data()));
      return cycles.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInvestmentCycleDetail(id: string | undefined) {
  return useQuery<InvestmentCycle | null>({
    queryKey: ['investmentCycles', id],
    queryFn: async () => {
      if (!id) return null;
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (!snap.exists()) return null;
      return normalizeCycle(snap.id, snap.data());
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInvestmentCycle() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (
      newCycle: Omit<InvestmentCycle, 'id' | 'createdAt' | 'userId'>
    ) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...newCycle,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investmentCycles'] });
    },
  });
}

export function useUpdateInvestmentCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<InvestmentCycle>;
    }) => {
      await updateDoc(doc(db, COLLECTION, id), fields);
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investmentCycles'] });
      queryClient.invalidateQueries({ queryKey: ['investmentCycles', variables.id] });
    },
  });
}

export function useDeleteInvestmentCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, COLLECTION, id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investmentCycles'] });
    },
  });
}
