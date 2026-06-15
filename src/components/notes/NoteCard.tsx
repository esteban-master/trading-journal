import { FileText, Link2 } from 'lucide-react';
import { Note, NoteCategory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { categoryChipClass } from '@/lib/apuntes';
import { stripHtml } from '@/lib/markdownImport';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: Note;
  category?: NoteCategory;
  sourceTitle?: string;
  onOpen: () => void;
}

export function NoteCard({ note, category, sourceTitle, onOpen }: NoteCardProps) {
  const preview = stripHtml(note.content).slice(0, 180);
  const linkedCount = note.linkedTradeIds?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:border-indigo-400 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        {category ? (
          <Badge variant="outline" className={cn('text-[11px]', categoryChipClass(category.color))}>
            {category.label}
          </Badge>
        ) : (
          <span />
        )}
        {linkedCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Link2 className="size-3" />
            {linkedCount}
          </span>
        )}
      </div>

      <h3 className="line-clamp-2 font-bold leading-snug">{note.title}</h3>
      <p className="line-clamp-3 text-sm text-muted-foreground">{preview || 'Sin contenido'}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        {sourceTitle ? (
          <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <FileText className="size-3 shrink-0" />
            {sourceTitle}
          </span>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap justify-end gap-1">
          {(note.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
