import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Note, NoteCategory, NoteSource } from '@/types';
import { useCreateNote, useUpdateNote } from '@/hooks/useNotes';
import { useAuthStore } from '@/store/useAuthStore';
import { uploadImages } from '@/lib/uploadImages';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageUploader } from '@/components/ui/image-uploader';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const NO_SOURCE = '__none__';

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  note?: Note;
  defaultSourceId?: string;
  categories: NoteCategory[];
  sources: NoteSource[];
}

export function NoteFormDialog({ open, onOpenChange, note, defaultSourceId, categories, sources }: NoteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[760px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{note ? 'Editar apunte' : 'Nuevo apunte'}</DialogTitle>
          <DialogDescription>Escribe tu apunte y clasifícalo por categoría y fuente.</DialogDescription>
        </DialogHeader>
        {open && (
          <NoteFormBody
            note={note}
            defaultSourceId={defaultSourceId}
            categories={categories}
            sources={sources}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface NoteFormBodyProps {
  note?: Note;
  defaultSourceId?: string;
  categories: NoteCategory[];
  sources: NoteSource[];
  onClose: () => void;
}

// Cuerpo del formulario. Se monta al abrir el diálogo, por lo que los valores
// iniciales (incluido el contenido del editor TipTap) son correctos en edición.
function NoteFormBody({ note, defaultSourceId, categories, sources, onClose }: NoteFormBodyProps) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const saving = createNote.isPending || updateNote.isPending || uploading;

  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? categories[0]?.slug ?? 'general');
  const [sourceId, setSourceId] = useState(note?.sourceId ?? defaultSourceId ?? NO_SOURCE);
  const [tags, setTags] = useState((note?.tags ?? []).join(', '));
  const [content, setContent] = useState(note?.content ?? '');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(note?.images ?? []);

  const handleContentChange = async (html: string) => {
    setContent(html);
    if (!note) return;
    setAutoSaveStatus('saving');
    try {
      await updateNote.mutateAsync({ id: note.id, fields: { content: html } });
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch {
      setAutoSaveStatus('idle');
      toast.error('No se pudo guardar automáticamente');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Ponle un título al apunte');
      return;
    }
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      let imageUrls = existingImageUrls;
      if (files.length > 0 && user) {
        setUploading(true);
        try {
          const tempId = crypto.randomUUID();
          const newUrls = await uploadImages(files, `notes/${user.uid}/${tempId}`);
          imageUrls = [...existingImageUrls, ...newUrls];
        } finally {
          setUploading(false);
        }
      }
      const payload = {
        title: title.trim(),
        content,
        category,
        tags: parsedTags,
        sourceId: sourceId === NO_SOURCE ? undefined : sourceId,
        images: imageUrls,
      };
      if (note) {
        await updateNote.mutateAsync({ id: note.id, fields: payload });
        toast.success('Apunte actualizado');
      } else {
        await createNote.mutateAsync({ ...payload, linkedTradeIds: [] });
        toast.success('Apunte creado');
      }
      onClose();
    } catch {
      toast.error('No se pudo guardar el apunte');
    }
  };

  return (
    <>
      <ScrollArea className="h-[60vh] pr-3">
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ej. No promediar a la baja" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
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
              <Label>Fuente (opcional)</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SOURCE}>Sin fuente</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Etiquetas (separadas por comas)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="psicologia, stop-loss" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Contenido</Label>
            <RichTextEditor value={content} onChange={handleContentChange} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Imágenes / capturas (opcional)</Label>
            <ImageUploader
              files={files}
              onFilesChange={setFiles}
              existingUrls={existingImageUrls}
              onRemoveExisting={(url) => setExistingImageUrls((prev) => prev.filter((u) => u !== url))}
              maxFiles={5}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground h-4">
          {autoSaveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-slate-400">
              <Loader2 className="size-3 animate-spin" /> Guardando…
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
              <CheckCircle2 className="size-3" /> Guardado
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-500">
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando…
              </>
            ) : note ? (
              'Guardar cambios'
            ) : (
              'Crear apunte'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
