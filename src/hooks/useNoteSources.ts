import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { NoteSource } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

const collectionKey = 'note_sources';

const toIso = (v: unknown): string =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? new Date().toISOString();

const normalizeSource = (docId: string, data: DocumentData): NoteSource => ({
  id: docId,
  userId: data.userId,
  title: data.title ?? '',
  type: data.type ?? 'other',
  url: data.url,
  authors: data.authors ?? [],
  date: data.date ? toIso(data.date) : undefined,
  summary: data.summary,
  transcript: data.transcript,
  seedKey: data.seedKey,
  createdAt: toIso(data.createdAt),
  updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
});

export function useNoteSources() {
  const { user } = useAuthStore();

  return useQuery<NoteSource[]>({
    queryKey: ['note_sources', user?.uid],
    queryFn: async () => {
      try {
        if (!user?.uid) return [];
        const snap = await getDocs(query(collection(db, collectionKey), where('userId', '==', user.uid)));
        return snap.docs
          .map((d) => normalizeSource(d.id, d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error('Error fetching note sources:', error);
        return [];
      }
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useNoteSource(id?: string) {
  const { user } = useAuthStore();

  return useQuery<NoteSource | null>({
    queryKey: ['note_sources', 'one', id, user?.uid],
    queryFn: async () => {
      if (!id) return null;
      const snap = await getDoc(doc(db, collectionKey, id));
      if (!snap.exists()) return null;
      return normalizeSource(snap.id, snap.data());
    },
    enabled: !!id && !!user?.uid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateNoteSource() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (source: Omit<NoteSource, 'id' | 'userId' | 'createdAt'>) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      const docRef = await addDoc(collection(db, collectionKey), {
        ...source,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note_sources'] });
    },
  });
}

export function useUpdateNoteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<NoteSource> }) => {
      await updateDoc(doc(db, collectionKey, id), { ...fields, updatedAt: new Date().toISOString() });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note_sources'] });
    },
  });
}

export function useDeleteNoteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, collectionKey, id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note_sources'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
