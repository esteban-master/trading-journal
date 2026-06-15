import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { mdToHtml } from '@/lib/markdownImport';
import { NoteSourceType, ReminderTrigger } from '@/types';

// Importa los .md de ejemplo tal cual (Vite ?raw). Viven en /notes en la raíz del proyecto.
import lidiarMd from '../../notes/como_lidiar_con_la_perdida/lidiarconperdida.md?raw';
import resilienciaMd from '../../notes/como_lidiar_con_la_perdida/reciliencia.md?raw';
import conflictosMd from '../../notes/como_lidiar_con_la_perdida/confilctos_delpasado.md?raw';
import transcriptMd from '../../notes/como_lidiar_con_la_perdida/textocompleto_video.md?raw';

const SEED_KEY = 'como_lidiar_con_la_perdida';

const SEED_NOTES: { title: string; md: string; tags: string[] }[] = [
  {
    title: 'Lidiar con la pérdida: "el mejor perdedor gana"',
    md: lidiarMd,
    tags: ['perdida', 'disciplina', 'stop-loss'],
  },
  {
    title: 'Reestructuración cognitiva y resiliencia',
    md: resilienciaMd,
    tags: ['resiliencia', 'mentalidad'],
  },
  {
    title: 'Conflictos del pasado que afectan tu operativa',
    md: conflictosMd,
    tags: ['mentalidad-de-escasez', 'crianza'],
  },
];

const SEED_REMINDERS: { title: string; detail: string; triggers: ReminderTrigger[] }[] = [
  {
    title: 'Desvincula tu identidad de la pérdida',
    detail: 'No eres una cuenta quemada ni un número rojo. Perdiste dinero, no tu valor ni tus habilidades.',
    triggers: ['tilt', 'afterLoss'],
  },
  {
    title: 'Llama la pérdida por su nombre',
    detail: 'Di "perdí dinero" o "perdí una oportunidad", no "soy un fracaso". El abanico de oportunidades sigue abierto.',
    triggers: ['tilt', 'afterLoss'],
  },
  {
    title: 'Haz una pausa, no operes por venganza',
    detail: 'Separa el hecho técnico del impacto emocional. No operes bajo ira ni para "recuperar" lo perdido.',
    triggers: ['tilt', 'afterLoss'],
  },
  {
    title: 'Siempre usa Stop-Loss',
    detail: 'El SL no es negociable. Tocarlo es información: tu hipótesis era incorrecta, no un fracaso personal.',
    triggers: ['beforeTrade', 'general'],
  },
  {
    title: 'Nunca promedies a la baja',
    detail: 'Añadir dinero a una posición perdedora es negarte a aceptar el error y multiplica el riesgo.',
    triggers: ['beforeTrade', 'general'],
  },
  {
    title: 'Convierte la pérdida en aprendizaje',
    detail: 'Pregúntate: ¿qué aprendí? ¿qué no debo repetir? ¿qué haré mejor mañana?',
    triggers: ['afterLoss', 'general'],
  },
];

export function useSeedApuntes() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (): Promise<{ skipped: boolean }> => {
      if (!user?.uid) throw new Error('Unauthenticated');

      // Idempotencia: si ya existe la fuente sembrada, no duplicar.
      const sourcesRef = collection(db, 'note_sources');
      const existing = await getDocs(
        query(sourcesRef, where('userId', '==', user.uid), where('seedKey', '==', SEED_KEY)),
      );
      if (!existing.empty) return { skipped: true };

      const now = new Date().toISOString();

      const sourceDoc = await addDoc(sourcesRef, {
        userId: user.uid,
        title: 'Cómo lidiar con la pérdida',
        type: 'youtube_live' as NoteSourceType,
        authors: ['José', 'Ivelina Castillo (psicóloga)'],
        summary:
          'En vivo sobre la gestión psicológica de la pérdida en trading: desvincular la identidad de la pérdida, reestructuración cognitiva, resiliencia y reglas de gestión de riesgo.',
        transcript: mdToHtml(transcriptMd),
        seedKey: SEED_KEY,
        createdAt: now,
      });
      const sourceId = sourceDoc.id;

      for (const n of SEED_NOTES) {
        await addDoc(collection(db, 'notes'), {
          userId: user.uid,
          sourceId,
          title: n.title,
          content: mdToHtml(n.md),
          category: 'psicologia',
          tags: n.tags,
          linkedTradeIds: [],
          createdAt: now,
        });
      }

      for (const r of SEED_REMINDERS) {
        await addDoc(collection(db, 'reminders'), {
          userId: user.uid,
          title: r.title,
          detail: r.detail,
          triggers: r.triggers,
          category: 'psicologia',
          sourceId,
          active: true,
          createdAt: now,
        });
      }

      return { skipped: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note_sources'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}
