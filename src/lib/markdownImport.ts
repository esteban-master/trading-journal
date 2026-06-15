import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Markdown → HTML una sola vez, saneado para poder renderizar con dangerouslySetInnerHTML.
marked.setOptions({ breaks: true, gfm: true });

export function mdToHtml(md: string): string {
  const raw = marked.parse(md ?? '', { async: false }) as string;
  return DOMPurify.sanitize(raw);
}

export interface MarkdownSection {
  title: string;
  html: string;
}

const MAX_TITLE = 90;

function truncateTitle(s: string): string {
  const clean = s.replace(/[#*_`>]/g, '').replace(/^\d+\.\s*/, '').trim();
  return clean.length > MAX_TITLE ? `${clean.slice(0, MAX_TITLE).trim()}…` : clean;
}

/**
 * Divide un documento Markdown en varios apuntes:
 *  1) por encabezados ATX (#, ##, ###) si hay 2 o más,
 *  2) si no, por items de lista numerada de primer nivel ("1. ", "2. "),
 *  3) si no, devuelve un único apunte con todo el contenido.
 */
export function splitMarkdownSections(md: string, fallbackTitle = 'Apunte'): MarkdownSection[] {
  const text = (md ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const lines = text.split('\n');

  // 1) Encabezados ATX
  const headings = lines
    .map((l, i) => ({ i, m: /^(#{1,3})\s+(.+)$/.exec(l.trim()) }))
    .filter((x): x is { i: number; m: RegExpExecArray } => x.m !== null);

  if (headings.length >= 2) {
    return headings.map((h, k) => {
      const start = h.i;
      const end = k + 1 < headings.length ? headings[k + 1].i : lines.length;
      const body = lines.slice(start + 1, end).join('\n').trim();
      return { title: truncateTitle(h.m[2]), html: mdToHtml(body || h.m[2]) };
    });
  }

  // 2) Lista numerada de primer nivel (sin indentación)
  const numbered = lines
    .map((l, i) => ({ i, m: /^(\d+)\.\s+(.+)$/.exec(l) }))
    .filter((x): x is { i: number; m: RegExpExecArray } => x.m !== null);

  if (numbered.length >= 2) {
    return numbered.map((n, k) => {
      const start = n.i;
      const end = k + 1 < numbered.length ? numbered[k + 1].i : lines.length;
      const body = lines.slice(start, end).join('\n').trim();
      return { title: truncateTitle(n.m[2]), html: mdToHtml(body) };
    });
  }

  // 3) Un solo apunte
  const firstNonEmpty = lines.find((l) => l.trim()) ?? fallbackTitle;
  return [{ title: truncateTitle(firstNonEmpty) || fallbackTitle, html: mdToHtml(text) }];
}

/** Texto plano a partir de HTML, para previews y búsqueda. */
export function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/))([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}

export function getYouTubeThumbnail(url?: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
