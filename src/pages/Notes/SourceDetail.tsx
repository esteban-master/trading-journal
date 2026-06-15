import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Youtube, ExternalLink, Pencil, Trash2, Bell, FileText, Loader2 } from 'lucide-react';

import { Note } from '@/types';
import { useNoteSource, useNoteSources, useDeleteNoteSource } from '@/hooks/useNoteSources';
import { useNotes } from '@/hooks/useNotes';
import { useReminders } from '@/hooks/useReminders';
import { useNoteCategories } from '@/hooks/useNoteCategories';
import { getYouTubeId, getYouTubeThumbnail } from '@/lib/markdownImport';
import { SOURCE_TYPE_LABEL, REMINDER_TRIGGER_LABEL } from '@/lib/apuntes';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteDetailsSheet } from '@/components/notes/NoteDetailsSheet';
import { SourceFormDialog } from '@/components/notes/SourceFormDialog';

export default function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: source, isLoading } = useNoteSource(id);
  const { data: notes = [] } = useNotes({ sourceId: id });
  const { data: reminders = [] } = useReminders({ sourceId: id });
  const { data: categories = [] } = useNoteCategories();
  const { data: sources = [] } = useNoteSources();
  const deleteSource = useDeleteNoteSource();

  const [editOpen, setEditOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const selectedNote: Note | null = notes.find((n) => n.id === selectedNoteId) ?? null;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="text-muted-foreground">No se encontró la fuente.</p>
        <Button asChild variant="outline">
          <Link to="/apuntes">
            <ArrowLeft className="size-4" />
            Volver a Apuntes
          </Link>
        </Button>
      </div>
    );
  }

  const ytId = getYouTubeId(source.url);
  const thumb = getYouTubeThumbnail(source.url);

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar esta fuente? Sus apuntes quedarán sin fuente asociada.')) return;
    try {
      await deleteSource.mutateAsync(source.id);
      toast.success('Fuente eliminada');
      navigate('/apuntes');
    } catch {
      toast.error('No se pudo eliminar la fuente');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/apuntes">
          <ArrowLeft className="size-4" />
          Apuntes
        </Link>
      </Button>

      {/* Cabecera de la fuente */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-slate-100 md:w-80 dark:bg-slate-900">
          {ytId ? (
            <iframe
              className="size-full"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={source.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : thumb ? (
            <img src={thumb} alt={source.title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Youtube className="size-12 text-slate-400" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            {SOURCE_TYPE_LABEL[source.type] ?? source.type}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">{source.title}</h1>
          {source.authors && source.authors.length > 0 && (
            <p className="text-sm text-muted-foreground">{source.authors.join(' · ')}</p>
          )}
          {source.summary && <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{source.summary}</p>}
          <div className="mt-auto flex flex-wrap gap-2">
            {source.url && (
              <Button asChild variant="outline" size="sm">
                <a href={source.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Abrir
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* Apuntes de esta fuente */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Apuntes ({notes.length})</h2>
        {notes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                category={catBySlug[n.category]}
                onOpen={() => {
                  setSelectedNoteId(n.id);
                  setSheetOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Esta fuente todavía no tiene apuntes.
          </p>
        )}
      </section>

      {/* Recordatorios originados aquí */}
      {reminders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bell className="size-5 text-indigo-500" />
            Recordatorios de esta fuente
          </h2>
          <div className="flex flex-col gap-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 rounded-xl border bg-card p-4">
                <span className="font-semibold">{r.title}</span>
                {r.detail && <span className="text-sm text-muted-foreground">{r.detail}</span>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.triggers.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {REMINDER_TRIGGER_LABEL[t]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transcripción completa */}
      {source.transcript && (
        <section className="flex flex-col gap-3">
          <details className="group rounded-2xl border bg-card">
            <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold">
              <FileText className="size-5 text-indigo-500" />
              Transcripción completa
              <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Mostrar</span>
              <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Ocultar</span>
            </summary>
            <div
              className="prose prose-sm max-w-none border-t p-4 dark:prose-invert prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: source.transcript }}
            />
          </details>
        </section>
      )}

      <SourceFormDialog open={editOpen} onOpenChange={setEditOpen} source={source} />
      <NoteDetailsSheet
        note={selectedNote}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categories={categories}
        sources={sources}
      />
    </div>
  );
}
