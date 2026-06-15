import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { NoteCategory, NoteSourceType } from '@/types';
import { useCreateNoteSource } from '@/hooks/useNoteSources';
import { useCreateNote } from '@/hooks/useNotes';
import { splitMarkdownSections, mdToHtml } from '@/lib/markdownImport';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportSourceDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: NoteCategory[];
}

export function ImportSourceDialog({ open, onOpenChange, categories }: ImportSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[760px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Importar desde Markdown</DialogTitle>
          <DialogDescription>
            Pega el contenido (.md) de un video o curso. Se creará la fuente y sus apuntes.
          </DialogDescription>
        </DialogHeader>
        {open && <ImportBody categories={categories} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportBody({ categories, onClose }: { categories: NoteCategory[]; onClose: () => void }) {
  const createSource = useCreateNoteSource();
  const createNote = useCreateNote();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<NoteSourceType>('youtube_live');
  const [url, setUrl] = useState('');
  const [authors, setAuthors] = useState('');
  const [category, setCategory] = useState(categories[0]?.slug ?? 'general');
  const [content, setContent] = useState('');
  const [split, setSplit] = useState(true);
  const [transcript, setTranscript] = useState('');

  const sections = useMemo(() => {
    if (!content.trim()) return [];
    if (split) return splitMarkdownSections(content, title || 'Apunte');
    return [{ title: title || 'Apunte', html: mdToHtml(content) }];
  }, [content, split, title]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Ponle un título a la fuente');
      return;
    }
    if (sections.length === 0) {
      toast.error('Pega el contenido en Markdown');
      return;
    }
    setSaving(true);
    try {
      const sourceId = await createSource.mutateAsync({
        title: title.trim(),
        type,
        url: url.trim() || undefined,
        authors: authors
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        transcript: transcript.trim() ? mdToHtml(transcript) : undefined,
      });

      for (const s of sections) {
        await createNote.mutateAsync({
          title: s.title,
          content: s.html,
          category,
          sourceId,
          tags: [],
          linkedTradeIds: [],
        });
      }

      toast.success(`Fuente creada con ${sections.length} apunte${sections.length > 1 ? 's' : ''}`);
      onClose();
    } catch {
      toast.error('No se pudo importar el contenido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollArea className="h-[62vh] pr-3">
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-2">
            <Label>Título de la fuente</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ej. Cómo lidiar con la pérdida" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              <Label>Categoría de los apuntes</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>URL (opcional)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/…" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Autores / ponentes (separados por comas)</Label>
            <Input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="José, Ivelina Castillo" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Contenido en Markdown</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Pega aquí el .md del video. Si tiene encabezados (#) o una lista numerada, se separará en varios apuntes."
              className="font-mono text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={split} onCheckedChange={(v) => setSplit(v === true)} />
            Separar en varios apuntes por secciones (encabezados o lista numerada)
          </label>

          <div className="flex flex-col gap-2">
            <Label>Transcripción completa (opcional)</Label>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              placeholder="Pega aquí la transcripción completa si la tienes. Se guarda en la fuente, colapsada."
              className="font-mono text-xs"
            />
          </div>

          {sections.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <p className="mb-2 text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                Vista previa: {sections.length} apunte{sections.length > 1 ? 's' : ''}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {sections.slice(0, 8).map((s, i) => (
                  <li key={i} className="truncate">
                    {s.title}
                  </li>
                ))}
                {sections.length > 8 && <li className="text-muted-foreground">… y {sections.length - 8} más</li>}
              </ol>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-500">
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Importando…
            </>
          ) : (
            'Importar'
          )}
        </Button>
      </div>
    </>
  );
}
