import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useImportReminders } from '@/hooks/useReminders';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ImportRemindersDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface RawItem {
  title?: unknown;
  message?: unknown;
  detail?: unknown;
}

export function ImportRemindersDialog({ open, onOpenChange }: ImportRemindersDialogProps) {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const importReminders = useImportReminders();

  const handleImport = async () => {
    setError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(json.trim());
    } catch {
      setError('El JSON no es válido. Revisa que esté bien formado.');
      return;
    }

    if (!Array.isArray(parsed)) {
      setError('El JSON debe ser un array [ { title, message }, … ]');
      return;
    }

    const items = (parsed as RawItem[])
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        detail: String(item.message ?? item.detail ?? '').trim(),
      }))
      .filter((item) => item.title.length > 0);

    if (items.length === 0) {
      setError('No se encontró ningún item con "title" válido.');
      return;
    }

    try {
      const count = await importReminders.mutateAsync(items);
      toast.success(`${count} recordatorio${count === 1 ? '' : 's'} importado${count === 1 ? '' : 's'}`);
      setJson('');
      onOpenChange(false);
    } catch {
      toast.error('No se pudieron importar los recordatorios');
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setError('');
      setJson('');
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar lista de recordatorios</DialogTitle>
          <DialogDescription>
            Pega un array JSON con objetos <code className="text-xs">&#123; title, message &#125;</code>. Se crearán
            todos de una vez con trigger "General".
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>JSON</Label>
            <textarea
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                setError('');
              }}
              rows={12}
              wrap="off"
              placeholder={'[\n  { "title": "Acepta la pérdida", "message": "Asume la pérdida de inmediato…" },\n  …\n]'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-auto resize-y whitespace-pre"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importReminders.isPending || !json.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {importReminders.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
