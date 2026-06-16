import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, FileText, Link2, Calendar, Images, ZoomIn } from 'lucide-react';
import { Note, NoteCategory, NoteSource } from '@/types';
import { useDeleteNote } from '@/hooks/useNotes';
import { categoryChipClass } from '@/lib/apuntes';
import { formatDate } from '@/lib/formatDate';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NoteFormDialog } from './NoteFormDialog';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface NoteDetailsSheetProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: NoteCategory[];
  sources: NoteSource[];
}

export function NoteDetailsSheet({ note, open, onOpenChange, categories, sources }: NoteDetailsSheetProps) {
  const deleteNote = useDeleteNote();
  const [editOpen, setEditOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const images = note?.images ?? [];

  const category = note ? categories.find((c) => c.slug === note.category) : undefined;
  const source = note?.sourceId ? sources.find((s) => s.id === note.sourceId) : undefined;
  const linkedCount = note?.linkedTradeIds?.length ?? 0;

  const handleDelete = async () => {
    if (!note) return;
    if (!window.confirm('¿Eliminar este apunte? Esta acción no se puede deshacer.')) return;
    try {
      await deleteNote.mutateAsync(note.id);
      toast.success('Apunte eliminado');
      onOpenChange(false);
    } catch {
      toast.error('No se pudo eliminar el apunte');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-2xl">
          {note && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b bg-background/95 p-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {category && (
                    <Badge variant="outline" className={cn('text-[11px]', categoryChipClass(category.color))}>
                      {category.label}
                    </Badge>
                  )}
                  {linkedCount > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Link2 className="size-3" />
                      {linkedCount} trade{linkedCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <SheetTitle className="text-2xl font-bold">{note.title}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {formatDate({ size: 'sm', date: new Date(note.createdAt) })}
                  </span>
                  {source && (
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {source.title}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-6 p-6">
                {note.content && note.content !== '<p></p>' ? (
                  <div
                    className="prose prose-sm max-w-none rounded-xl border bg-slate-50/50 p-4 dark:prose-invert dark:bg-slate-900/50 prose-headings:mt-4 prose-headings:mb-2 prose-p:leading-relaxed prose-a:text-indigo-500"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Este apunte no tiene contenido todavía.
                  </p>
                )}

                {(note.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags!.map((t) => (
                      <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {images.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                      <Images className="size-4" />
                      Imágenes adjuntas ({images.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((url, idx) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setLightboxIndex(idx)}
                          className="group relative aspect-video overflow-hidden rounded-xl border bg-slate-950 transition-all hover:ring-2 hover:ring-indigo-500"
                        >
                          <img src={url} alt={`Imagen ${idx + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <ZoomIn className="size-5 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur-sm">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 size-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="mr-1.5 size-4" />
                  Eliminar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {note && (
        <NoteFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          note={note}
          categories={categories}
          sources={sources}
        />
      )}

      {images.length > 0 && (
        <ImageLightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} />
      )}
    </>
  );
}
