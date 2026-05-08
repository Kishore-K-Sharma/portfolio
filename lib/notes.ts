import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderMarkdown } from "./markdown";

export interface NoteFrontmatter {
  title: string;
  description: string;
  date: string; // ISO YYYY-MM-DD
  tags?: string[];
  /** Estimated read time in minutes; computed if absent. */
  readMin?: number;
  draft?: boolean;
}

/** Frontmatter-only view — cheap to compute, no HTML rendering required. */
export interface NoteMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readMin: number;
  wordCount: number;
  draft?: boolean;
}

/** Full note — meta + raw markdown + rendered HTML. Async to load. */
export interface Note extends NoteMeta {
  content: string;
  html: string;
}

const NOTES_DIR = path.join(process.cwd(), "content", "notes");

function countWords(text: string): number {
  return text.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean).length;
}

function wordsPerMinute(text: string): number {
  return Math.max(1, Math.round(countWords(text) / 220));
}

function readSource(slug: string): { fm: Partial<NoteFrontmatter>; content: string } | null {
  const mdPath = path.join(NOTES_DIR, `${slug}.md`);
  const mdxPath = path.join(NOTES_DIR, `${slug}.mdx`);
  const file = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!file) return null;

  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  return { fm: parsed.data as Partial<NoteFrontmatter>, content: parsed.content };
}

/** Load metadata only — synchronous, used by listings/sitemap/OG. */
export function loadNoteMeta(slug: string): NoteMeta | null {
  const r = readSource(slug);
  if (!r) return null;
  const { fm, content } = r;
  if (!fm.title || !fm.description || !fm.date) return null;

  return {
    slug,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    tags: fm.tags ?? [],
    draft: fm.draft ?? false,
    readMin: fm.readMin ?? wordsPerMinute(content),
    wordCount: countWords(content),
  };
}

/** Load full note including rendered HTML. Async because shiki is async. */
export async function loadNote(slug: string): Promise<Note | null> {
  const r = readSource(slug);
  if (!r) return null;
  const meta = loadNoteMeta(slug);
  if (!meta) return null;
  const html = await renderMarkdown(r.content);
  return { ...meta, content: r.content, html };
}

export function listNotes({ includeDrafts = false } = {}): NoteMeta[] {
  if (!fs.existsSync(NOTES_DIR)) return [];
  const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  return files
    .map((file) => loadNoteMeta(file.replace(/\.(md|mdx)$/, "")))
    .filter((n): n is NoteMeta => !!n)
    .filter((n) => includeDrafts || !n.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function listSlugs(): string[] {
  return listNotes().map((n) => n.slug);
}

/** All tags across published notes, with post count, sorted by frequency desc. */
export function listTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of listNotes()) {
    for (const t of n.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function notesByTag(tag: string): NoteMeta[] {
  const t = tag.toLowerCase();
  return listNotes().filter((n) => (n.tags ?? []).some((x) => x.toLowerCase() === t));
}

/** Slugify a tag for URL use (preserve simple cases, lowercase, hyphenate). */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// djb2 hash — small, stable, no deps. Used to pick neighbors deterministically.
function hashSlug(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Pick a prev/next pair for a given note that is NOT in date order, but is
 * stable per slug — so static generation produces consistent HTML and a user
 * walking forward through "next → next → next" doesn't see the same post twice
 * in a row. Falls back gracefully when there are 0 or 1 other notes.
 */
export function relatedNotes(currentSlug: string): { prev: NoteMeta | null; next: NoteMeta | null } {
  const others = listNotes().filter((n) => n.slug !== currentSlug);
  if (others.length === 0) return { prev: null, next: null };
  if (others.length === 1) return { prev: null, next: others[0] };

  const seed = hashSlug(currentSlug);
  const nextIdx = seed % others.length;
  // Different multiplicative spread so prev rarely collides with next.
  let prevIdx = ((seed * 2654435761) >>> 0) % others.length;
  if (prevIdx === nextIdx) prevIdx = (prevIdx + 1) % others.length;

  return { prev: others[prevIdx], next: others[nextIdx] };
}
