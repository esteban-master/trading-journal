import { NoteCategory, ReminderTrigger } from '@/types';

// Categorías por defecto que se siembran la primera vez que se abre el módulo.
export const DEFAULT_CATEGORIES: Omit<NoteCategory, 'id' | 'userId'>[] = [
  { slug: 'psicologia', label: 'Psicología', color: 'rose' },
  { slug: 'gestion_riesgo', label: 'Gestión de riesgo', color: 'amber' },
  { slug: 'estrategia', label: 'Estrategia', color: 'indigo' },
  { slug: 'general', label: 'General', color: 'slate' },
];

// Mapeo color → clases de chip (Tailwind).
export const CATEGORY_COLORS: Record<string, string> = {
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export const CATEGORY_COLOR_OPTIONS = Object.keys(CATEGORY_COLORS);

export function categoryChipClass(color?: string): string {
  return CATEGORY_COLORS[color ?? 'slate'] ?? CATEGORY_COLORS.slate;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Disparadores de recordatorios y sus etiquetas para la UI.
export const REMINDER_TRIGGERS: { value: ReminderTrigger; label: string; description: string }[] = [
  { value: 'tilt', label: 'Tilt Guard', description: 'Cuando saltan varias pérdidas seguidas' },
  { value: 'afterLoss', label: 'Después de una pérdida', description: 'Tras cerrar un trade perdedor' },
  { value: 'beforeTrade', label: 'Antes de operar', description: 'Checklist previo a entrar' },
  { value: 'greenDay', label: 'Día verde', description: 'Cuando vas ganando, para no devolver' },
  { value: 'general', label: 'General', description: 'Siempre disponible' },
];

export const REMINDER_TRIGGER_LABEL: Record<ReminderTrigger, string> = Object.fromEntries(
  REMINDER_TRIGGERS.map((t) => [t.value, t.label]),
) as Record<ReminderTrigger, string>;

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  youtube_live: 'En vivo de YouTube',
  video: 'Video',
  article: 'Artículo',
  book: 'Libro',
  course: 'Curso',
  other: 'Otro',
};
