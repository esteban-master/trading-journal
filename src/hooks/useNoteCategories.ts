import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, addDoc, deleteDoc, query, where, DocumentData } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { NoteCategory } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { DEFAULT_CATEGORIES } from '@/lib/apuntes';

const collectionKey = 'note_categories';

const normalizeCategory = (docId: string, data: DocumentData): NoteCategory => ({
  id: docId,
  userId: data.userId,
  slug: data.slug,
  label: data.label,
  color: data.color,
});

// Lista de categorías; siembra las categorías por defecto la primera vez (colección vacía).
export function useNoteCategories() {
  const { user } = useAuthStore();

  return useQuery<NoteCategory[]>({
    queryKey: ['note_categories', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const ref = collection(db, collectionKey);
      const snap = await getDocs(query(ref, where('userId', '==', user.uid)));

      if (snap.empty) {
        const created: NoteCategory[] = [];
        for (const c of DEFAULT_CATEGORIES) {
          const docRef = await addDoc(ref, { ...c, userId: user.uid });
          created.push({ id: docRef.id, userId: user.uid, ...c });
        }
        return created;
      }

      return snap.docs.map((d) => normalizeCategory(d.id, d.data()));
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateNoteCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (cat: Omit<NoteCategory, 'id' | 'userId'>) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      const docRef = await addDoc(collection(db, collectionKey), { ...cat, userId: user.uid });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note_categories'] });
    },
  });
}

export function useDeleteNoteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, collectionKey, id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note_categories'] });
    },
  });
}
