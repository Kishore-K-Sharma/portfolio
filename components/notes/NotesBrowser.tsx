"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type NoteSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readMin: number;
};

const PAGE_SIZE = 6;

interface NotesBrowserProps {
  notes: NoteSummary[];
  /** Override the search input placeholder (e.g. for tag pages). */
  searchPlaceholder?: string;
  /** Path the page lives on; used when rewriting the URL. Defaults to "/notes". */
  basePath?: string;
}

export function NotesBrowser({
  notes,
  searchPlaceholder = "Search by title, description, or tag…",
  basePath = "/notes",
}: NotesBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);

  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const haystack = [n.title, n.description, ...(n.tags ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageNotes = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 whenever the query changes.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Keep the URL in sync with state so links are shareable.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (safePage > 1) params.set("page", String(safePage));
    const qs = params.toString();
    const url = qs ? `${basePath}?${qs}` : basePath;
    router.replace(url, { scroll: false });
  }, [query, safePage, router, basePath]);

  // Scroll to the top of the browser when the user changes pages — but NOT
  // on every keystroke during search (that would be janky).
  const goToPage = useCallback((next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const matchLabel = (() => {
    if (!query.trim()) return `${notes.length} ${notes.length === 1 ? "note" : "notes"}`;
    return `${filtered.length} ${filtered.length === 1 ? "match" : "matches"} for "${query.trim()}"`;
  })();

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search notes"
            className="w-full pl-9 pr-9 py-2.5 rounded-md border border-subtle/60 bg-background text-foreground text-[0.92rem] placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/40 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="font-mono text-[0.72rem] text-muted-foreground sm:whitespace-nowrap">
          {matchLabel}
        </span>
      </div>

      {pageNotes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-mono text-[0.85rem] text-muted-foreground">
            No matches. Try a different keyword.
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 font-mono text-[0.78rem] text-accent hover:underline"
            >
              clear search
            </button>
          )}
        </div>
      ) : (
        <ol className="divide-y divide-subtle/60">
          {pageNotes.map((n) => (
            <li key={n.slug} className="py-7 first:pt-0 last:pb-0">
              <Link href={`/notes/${n.slug}`} className="group block">
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <time
                    dateTime={n.date}
                    className="font-mono text-[0.72rem] text-muted-foreground"
                  >
                    {formatDate(n.date)}
                  </time>
                  <span className="font-mono text-[0.7rem] text-muted-foreground">
                    {n.readMin} min read
                  </span>
                </div>
                <h2 className="font-display text-heading md:text-display-sm text-foreground tracking-[-0.025em] leading-[1.1] text-balance group-hover:text-accent transition-colors">
                  {n.title}
                </h2>
                <p className="mt-3 text-[0.95rem] text-muted-foreground leading-relaxed text-pretty max-w-[58ch]">
                  {n.description}
                </p>
                {n.tags && n.tags.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-1.5 gap-y-1.5">
                    {n.tags.map((t) => (
                      <li
                        key={t}
                        className="font-mono text-[0.7rem] text-muted-foreground"
                      >
                        #{t}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 pt-6 border-t border-subtle/40 flex items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-subtle/60 font-mono text-[0.78rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← prev
          </button>

          <ol className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => goToPage(n)}
                  aria-current={n === safePage ? "page" : undefined}
                  className={`min-w-[2rem] h-8 px-2 rounded font-mono text-[0.78rem] transition-colors ${
                    n === safePage
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-subtle/60 font-mono text-[0.78rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            next →
          </button>
        </nav>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
