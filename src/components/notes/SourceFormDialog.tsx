import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { NoteSource, NoteSourceType } from '@/types';
import { useCreateNoteSource, useUpdateNoteSource } from '@/hooks/useNoteSources';
import { SOURCE_TYPE_LABEL } from '@/lib/apuntes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SourceFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source?: NoteSource;
}

export function SourceFormDialog({ open, onOpenChange, source }: SourceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{source ? 'Editar fuente' : 'Nueva fuente'}</DialogTitle>
          <DialogDescription>Un video, curso, libro o artículo que agrupa tus apuntes.</DialogDescription>
        </DialogHeader>
        {open && <SourceFormBody source={source} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SourceFormBody({ source, onClose }: { source?: NoteSource; onClose: () => void }) {
  const createSource = useCreateNoteSource();
  const updateSource = useUpdateNoteSource();
  const saving = createSource.isPending || updateSource.isPending;

  const [title, setTitle] = useState(source?.title ?? '');
  const [type, setType] = useState<NoteSourceType>(source?.type ?? 'youtube_live');
  const [url, setUrl] = useState(source?.url ?? '');
  const [authors, setAuthors] = useState((source?.authors ?? []).join(', '));
  const [date, setDate] = useState(source?.date ? source.date.slice(0, 10) : '');
  const [summary, setSummary] = useState(source?.summary ?? '');
  const [transcript, setTranscript] = useState(source?.transcript ?? '');

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Ponle un título a la fuente');
      return;
    }
    const payload = {
      title: title.trim(),
      type,
      url: url.trim() || undefined,
      authors: authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      date: date ? new Date(date).toISOString() : undefined,
      summary: summary.trim() || undefined,
      transcript: transcript.trim() || undefined,
    };
    try {
      if (source) {
        await updateSource.mutateAsync({ id: source.id, fields: payload });
        toast.success('Fuente actualizada');
      } else {
        await createSource.mutateAsync(payload);
        toast.success('Fuente creada');
      }
      onClose();
    } catch {
      toast.error('No se pudo guardar la fuente');
    }
  };

  return (
    <>
      <ScrollArea className="max-h-[60vh] pr-3">
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ej. Cómo lidiar con la pérdida" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as NoteSourceType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fecha (opcional)</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>URL (opcional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Autores / ponentes (separados por comas)</Label>
            <Input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="José, Ivelina Castillo" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Resumen (opcional)</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Transcripción / notas largas (opcional)</Label>
            <RichTextEditor value={transcript} onChange={setTranscript} />
          </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-500">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {source ? 'Guardar cambios' : 'Crear fuente'}
        </Button>
      </div>
    </>
  );
}
