import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  Plus,
  Upload,
  Search,
  BookOpen,
  Bell,
  Sparkles,
  Youtube,
  Pencil,
  Trash2,
  Loader2,
  Power,
} from 'lucide-react';

import { Note, NoteCategory, Reminder, NoteSource } from '@/types';
import { useNoteCategories } from '@/hooks/useNoteCategories';
import { useNoteSources } from '@/hooks/useNoteSources';
import { useNotes } from '@/hooks/useNotes';
import { useReminders, useUpdateReminder, useDeleteReminder } from '@/hooks/useReminders';
import { useSeedApuntes } from '@/lib/seedApuntes';
import { stripHtml, getYouTubeThumbnail } from '@/lib/markdownImport';
import { REMINDER_TRIGGER_LABEL, SOURCE_TYPE_LABEL } from '@/lib/apuntes';
import { cn } from '@/lib/utils';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFormDialog } from '@/components/notes/NoteFormDialog';
import { ImportSourceDialog } from '@/components/notes/ImportSourceDialog';
import { SourceFormDialog } from '@/components/notes/SourceFormDialog';
import { ReminderEditor } from '@/components/notes/ReminderEditor';
import { NoteDetailsSheet } from '@/components/notes/NoteDetailsSheet';

export default function NotesPage() {
  const { data: categories = [] } = useNoteCategories();
  const { data: sources = [] } = useNoteSources();
  const { data: notes = [] } = useNotes();
  const { data: reminders = [] } = useReminders();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');

  // Diálogos / paneles
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<NoteSource | undefined>(undefined);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>(undefined);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const catBySlug = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c])) as Record<string, NoteCategory>,
    [categories],
  );
  const sourceById = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.id, s])) as Record<string, NoteSource>,
    [sources],
  );
  const noteCountBySource = useMemo(() => {
    const m: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.sourceId) m[n.sourceId] = (m[n.sourceId] ?? 0) + 1;
    });
    return m;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      const matchCat = selectedCategory === 'all' || n.category === selectedCategory;
      const matchSrc = selectedSource === 'all' || n.sourceId === selectedSource;
      const matchQ =
        !q ||
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSrc && matchQ;
    });
  }, [notes, selectedCategory, selectedSource, search]);

  const selectedNote: Note | null = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const openNote = (id: string) => {
    setSelectedNoteId(id);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="size-7 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apuntes</h1>
          <p className="text-sm text-muted-foreground">Tu base de conocimiento de trading y sus recordatorios.</p>
        </div>
      </div>

      <Tabs defaultValue="apuntes" className="w-full">
        <TabsList>
          <TabsTrigger value="apuntes">Apuntes</TabsTrigger>
          <TabsTrigger value="fuentes">Fuentes</TabsTrigger>
          <TabsTrigger value="recordatorios">Recordatorios</TabsTrigger>
        </TabsList>

        {/* ───────── Apuntes ───────── */}
        <TabsContent value="apuntes" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar apuntes…"
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                Importar
              </Button>
              <Button
                onClick={() => setNoteFormOpen(true)}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                <Plus className="size-4" />
                Nuevo apunte
              </Button>
            </div>
          </div>

          {filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  category={catBySlug[n.category]}
                  sourceTitle={n.sourceId ? sourceById[n.sourceId]?.title : undefined}
                  onOpen={() => openNote(n.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="size-8" />}
              title={notes.length === 0 ? 'Aún no tienes apuntes' : 'Sin resultados'}
              hint={
                notes.length === 0
                  ? 'Importa un .md o crea tu primer apunte.'
                  : 'Prueba con otra búsqueda o filtro.'
              }
            />
          )}
        </TabsContent>

        {/* ───────── Fuentes ───────── */}
        <TabsContent value="fuentes" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap justify-end gap-2">
            <SeedButton />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Importar
            </Button>
            <Button
              onClick={() => {
                setEditingSource(undefined);
                setSourceFormOpen(true);
              }}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Plus className="size-4" />
              Nueva fuente
            </Button>
          </div>

          {sources.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((s) => {
                const thumb = getYouTubeThumbnail(s.url);
                return (
                  <Link
                    key={s.id}
                    to={`/apuntes/fuentes/${s.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-indigo-400 hover:shadow-sm"
                  >
                    <div className="flex aspect-video items-center justify-center bg-slate-100 dark:bg-slate-900">
                      {thumb ? (
                        <img src={thumb} alt={s.title} className="size-full object-cover" />
                      ) : (
                        <Youtube className="size-10 text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <Badge variant="secondary" className="w-fit text-[10px]">
                        {SOURCE_TYPE_LABEL[s.type] ?? s.type}
                      </Badge>
                      <h3 className="line-clamp-2 font-bold leading-snug">{s.title}</h3>
                      {s.authors && s.authors.length > 0 && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{s.authors.join(' · ')}</p>
                      )}
                      <span className="mt-auto text-[11px] text-muted-foreground">
                        {noteCountBySource[s.id] ?? 0} apunte{(noteCountBySource[s.id] ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Youtube className="size-8" />}
              title="Aún no tienes fuentes"
              hint='Carga el ejemplo, importa un .md o crea una fuente manualmente.'
            />
          )}
        </TabsContent>

        {/* ───────── Recordatorios ───────── */}
        <TabsContent value="recordatorios" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingReminder(undefined);
                setReminderOpen(true);
              }}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Plus className="size-4" />
              Nuevo recordatorio
            </Button>
          </div>

          {reminders.length > 0 ? (
            <div className="flex flex-col gap-2">
              {reminders.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  onEdit={() => {
                    setEditingReminder(r);
                    setReminderOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bell className="size-8" />}
              title="Sin recordatorios"
              hint="Crea reglas accionables que aparezcan, por ejemplo, cuando salte el Tilt Guard."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogos y paneles */}
      <NoteFormDialog open={noteFormOpen} onOpenChange={setNoteFormOpen} categories={categories} sources={sources} />
      <ImportSourceDialog open={importOpen} onOpenChange={setImportOpen} categories={categories} />
      <SourceFormDialog open={sourceFormOpen} onOpenChange={setSourceFormOpen} source={editingSource} />
      <ReminderEditor
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        reminder={editingReminder}
        categories={categories}
      />
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

function SeedButton() {
  const seed = useSeedApuntes();
  const handleSeed = async () => {
    try {
      const res = await seed.mutateAsync();
      toast.success(res.skipped ? 'El ejemplo ya estaba cargado' : 'Ejemplo cargado: "Cómo lidiar con la pérdida"');
    } catch {
      toast.error('No se pudo cargar el ejemplo');
    }
  };
  return (
    <Button variant="outline" onClick={handleSeed} disabled={seed.isPending}>
      {seed.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      Cargar ejemplo
    </Button>
  );
}

function ReminderRow({ reminder, onEdit }: { reminder: Reminder; onEdit: () => void }) {
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

  const toggleActive = () => updateReminder.mutate({ id: reminder.id, fields: { active: !reminder.active } });
  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este recordatorio?')) return;
    try {
      await deleteReminder.mutateAsync(reminder.id);
      toast.success('Recordatorio eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-xl border bg-card p-4',
        !reminder.active && 'opacity-60',
      )}
    >
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold leading-snug">{reminder.title}</span>
        {reminder.detail && <span className="text-sm text-muted-foreground">{reminder.detail}</span>}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {reminder.triggers.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {REMINDER_TRIGGER_LABEL[t]}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', reminder.active ? 'text-emerald-500' : 'text-muted-foreground')}
          onClick={toggleActive}
          title={reminder.active ? 'Desactivar' : 'Activar'}
        >
          <Power className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-rose-500"
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-12 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
