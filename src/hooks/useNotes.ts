import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { Note } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

const collectionKey = 'notes';

const toIso = (v: unknown): string =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? new Date().toISOString();

const normalizeNote = (docId: string, data: DocumentData): Note => ({
  id: docId,
  userId: data.userId,
  sourceId: data.sourceId,
  title: data.title ?? '',
  content: data.content ?? '',
  category: data.category ?? 'general',
  tags: data.tags ?? [],
  keyTakeaways: data.keyTakeaways ?? [],
  linkedTradeIds: data.linkedTradeIds ?? [],
  linkedAccountId: data.linkedAccountId,
  images: data.images ?? [],
  createdAt: toIso(data.createdAt),
  updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
});

interface NotesFilter {
  sourceId?: string;
  tradeId?: string;
}

// Lista de apuntes. Filtra en servidor por fuente o por trade (array-contains);
// el resto de filtros (categoría, texto, tags) se hace en el cliente.
export function useNotes(filter?: NotesFilter) {
  const { user } = useAuthStore();
  const { sourceId, tradeId } = filter ?? {};

  return useQuery<Note[]>({
    queryKey: ['notes', { sourceId, tradeId }, user?.uid],
    queryFn: async () => {
      try {
        if (!user?.uid) return [];
        const ref = collection(db, collectionKey);
        let q;

        if (tradeId) {
          q = query(ref, where('userId', '==', user.uid), where('linkedTradeIds', 'array-contains', tradeId));
        } else if (sourceId) {
          q = query(ref, where('userId', '==', user.uid), where('sourceId', '==', sourceId));
        } else {
          q = query(ref, where('userId', '==', user.uid));
        }

        const snap = await getDocs(q);
        return snap.docs
          .map((d) => normalizeNote(d.id, d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error('Error fetching notes:', error);
        return [];
      }
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (note: Omit<Note, 'id' | 'userId' | 'createdAt'>) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      const docRef = await addDoc(collection(db, collectionKey), {
        ...note,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Note> }) => {
      await updateDoc(doc(db, collectionKey, id), { ...fields, updatedAt: new Date().toISOString() });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, collectionKey, id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useLinkNoteToTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, tradeId, accountId }: { noteId: string; tradeId: string; accountId?: string }) => {
      await updateDoc(doc(db, collectionKey, noteId), {
        linkedTradeIds: arrayUnion(tradeId),
        ...(accountId ? { linkedAccountId: accountId } : {}),
        updatedAt: new Date().toISOString(),
      });
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUnlinkNoteFromTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, tradeId }: { noteId: string; tradeId: string }) => {
      await updateDoc(doc(db, collectionKey, noteId), {
        linkedTradeIds: arrayRemove(tradeId),
        updatedAt: new Date().toISOString(),
      });
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
