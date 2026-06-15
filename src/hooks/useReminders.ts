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
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { Reminder, ReminderTrigger } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

const collectionKey = 'reminders';

const toIso = (v: unknown): string =>
  v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? new Date().toISOString();

const normalizeReminder = (docId: string, data: DocumentData): Reminder => ({
  id: docId,
  userId: data.userId,
  title: data.title ?? '',
  detail: data.detail,
  triggers: data.triggers ?? ['general'],
  category: data.category,
  tags: data.tags ?? [],
  sourceId: data.sourceId,
  noteId: data.noteId,
  active: data.active ?? true,
  createdAt: toIso(data.createdAt),
  updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
});

interface RemindersFilter {
  trigger?: ReminderTrigger;
  sourceId?: string;
  onlyActive?: boolean;
}

// Trae todos los recordatorios del usuario y filtra en memoria (dataset pequeño,
// evita índices compuestos de Firestore).
export function useReminders(filter?: RemindersFilter) {
  const { user } = useAuthStore();
  const { trigger, sourceId, onlyActive } = filter ?? {};

  return useQuery<Reminder[]>({
    queryKey: ['reminders', user?.uid],
    queryFn: async () => {
      try {
        if (!user?.uid) return [];
        const snap = await getDocs(query(collection(db, collectionKey), where('userId', '==', user.uid)));
        return snap.docs
          .map((d) => normalizeReminder(d.id, d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error('Error fetching reminders:', error);
        return [];
      }
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5,
    select: (data) =>
      data.filter(
        (r) =>
          (trigger ? r.triggers.includes(trigger) : true) &&
          (sourceId ? r.sourceId === sourceId : true) &&
          (onlyActive ? r.active : true),
      ),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'userId' | 'createdAt'>) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      const docRef = await addDoc(collection(db, collectionKey), {
        ...reminder,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Reminder> }) => {
      await updateDoc(doc(db, collectionKey, id), { ...fields, updatedAt: new Date().toISOString() });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, collectionKey, id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useImportReminders() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (items: Array<{ title: string; detail?: string; triggers?: ReminderTrigger[] }>) => {
      if (!user?.uid) throw new Error('Unauthenticated');
      const now = new Date().toISOString();
      await Promise.all(
        items.map((item) =>
          addDoc(collection(db, collectionKey), {
            userId: user.uid,
            title: item.title,
            detail: item.detail ?? '',
            triggers: item.triggers ?? ['general'],
            active: true,
            tags: [],
            createdAt: now,
          }),
        ),
      );
      return items.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
