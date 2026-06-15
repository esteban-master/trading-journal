import { useState } from 'react';
import { Link as LinkIcon, X, Plus, BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useNotes, useLinkNoteToTrade, useUnlinkNoteFromTrade } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RelatedNotesProps {
  tradeId: string;
  accountId?: string;
}

export function RelatedNotes({ tradeId, accountId }: RelatedNotesProps) {
  const { data: linked = [] } = useNotes({ tradeId });
  const { data: all = [] } = useNotes();
  const link = useLinkNoteToTrade();
  const unlink = useUnlinkNoteFromTrade();
  const [selected, setSelected] = useState('');

  const available = all.filter((n) => !(n.linkedTradeIds ?? []).includes(tradeId));

  const handleLink = async () => {
    if (!selected) return;
    try {
      await link.mutateAsync({ noteId: selected, tradeId, accountId });
      setSelected('');
      toast.success('Apunte vinculado a este trade');
    } catch {
      toast.error('No se pudo vincular el apunte');
    }
  };

  const handleUnlink = async (noteId: string) => {
    try {
      await unlink.mutateAsync({ noteId, tradeId });
      toast.success('Vínculo eliminado');
    } catch {
      toast.error('No se pudo eliminar el vínculo');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <BookOpen className="size-4" />
        Lecciones / apuntes vinculados
      </h4>

      {linked.length > 0 ? (
        <div className="flex flex-col gap-2">
          {linked.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between gap-2 rounded-xl border bg-slate-50/50 px-3 py-2 dark:bg-slate-900/50"
            >
              <Link
                to="/apuntes"
                className="flex items-center gap-2 truncate text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <LinkIcon className="size-3.5 shrink-0 text-indigo-500" />
                {n.title}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-rose-500"
                onClick={() => handleUnlink(n.id)}
              >
                <X className="size-4" />
                <span className="sr-only">Desvincular</span>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground">
          No hay apuntes vinculados a este trade.
        </p>
      )}

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Vincular un apunte existente…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleLink} disabled={!selected || link.isPending}>
            <Plus className="size-4" />
            Vincular
          </Button>
        </div>
      )}
    </div>
  );
}
