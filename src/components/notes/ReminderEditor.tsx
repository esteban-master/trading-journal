import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { NoteCategory, Reminder, ReminderTrigger } from '@/types';
import { useCreateReminder, useUpdateReminder } from '@/hooks/useReminders';
import { REMINDER_TRIGGERS } from '@/lib/apuntes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ReminderEditorProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reminder?: Reminder;
  categories: NoteCategory[];
}

export function ReminderEditor({ open, onOpenChange, reminder, categories }: ReminderEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}</DialogTitle>
          <DialogDescription>Una regla accionable que aparecerá en los momentos que elijas.</DialogDescription>
        </DialogHeader>
        {open && <ReminderBody reminder={reminder} categories={categories} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ReminderBody({
  reminder,
  categories,
  onClose,
}: {
  reminder?: Reminder;
  categories: NoteCategory[];
  onClose: () => void;
}) {
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const saving = createReminder.isPending || updateReminder.isPending;

  const [title, setTitle] = useState(reminder?.title ?? '');
  const [detail, setDetail] = useState(reminder?.detail ?? '');
  const [triggers, setTriggers] = useState<ReminderTrigger[]>(reminder?.triggers ?? ['general']);
  const [category, setCategory] = useState(reminder?.category ?? '');
  const [active, setActive] = useState(reminder?.active ?? true);

  const toggleTrigger = (t: ReminderTrigger) => {
    setTriggers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Escribe el recordatorio');
      return;
    }
    if (triggers.length === 0) {
      toast.error('Elige al menos un momento donde mostrarlo');
      return;
    }
    const payload = {
      title: title.trim(),
      detail: detail.trim() || undefined,
      triggers,
      category: category || undefined,
      active,
    };
    try {
      if (reminder) {
        await updateReminder.mutateAsync({ id: reminder.id, fields: payload });
        toast.success('Recordatorio actualizado');
      } else {
        await createReminder.mutateAsync(payload);
        toast.success('Recordatorio creado');
      }
      onClose();
    } catch {
      toast.error('No se pudo guardar el recordatorio');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Recordatorio (acción concreta)</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ej. Haz una pausa, no operes por venganza" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Detalle (opcional)</Label>
        <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>¿Cuándo mostrarlo?</Label>
        <div className="flex flex-wrap gap-2">
          {REMINDER_TRIGGERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleTrigger(t.value)}
              title={t.description}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                triggers.includes(t.value)
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Categoría (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs',
                category === '' ? 'border-slate-500 bg-slate-200 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-700',
              )}
            >
              Ninguna
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs',
                  category === c.slug ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 dark:border-slate-700',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
        Activo (se muestra en sus disparadores)
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-500">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {reminder ? 'Guardar' : 'Crear'}
        </Button>
      </div>
    </div>
  );
}
