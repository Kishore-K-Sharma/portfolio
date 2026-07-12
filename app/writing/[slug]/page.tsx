import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listSlugs, loadNote, loadNoteMeta, relatedNotes } from "@/lib/notes";
import type { NoteMeta } from "@/lib/notes";
import { workForNote } from "@/lib/related";
import { categoryLabel } from "@/config/categories";
import { ShareBar } from "@/components/notes/ShareBar";
import { ReadingProgress } from "@/components/notes/ReadingProgress";
import { AuthorCard } from "@/components/notes/AuthorCard";
import { CopyAttribution } from "@/components/notes/CopyAttribution";
import { safeJsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/config/site";
import portfolioData from "@/data/portfolio.json";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return listSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  // Metadata only needs frontmatter — skip the markdown render.
  const note = loadNoteMeta(params.slug);
  // Drafts are not public — empty metadata so search engines don't pick up the
  // title/description for an URL the page route below will 404.
  if (!note || note.draft) return {};
  const url = `${siteConfig.baseUrl}/writing/${note.slug}`;
  const tags = note.tags ?? [];
  return {
    title: note.title,
    description: note.description,
    keywords: tags,
    authors: [{ name: "Kishore K Sharma", url: siteConfig.baseUrl }],
    creator: "Kishore K Sharma",
    publisher: "Kishore K Sharma",
    category: tags[0],
    alternates: {
      canonical: url,
      // Expose a clean markdown source so AI crawlers / LLM agents can fetch
      // the canonical text without scraping rendered HTML. Mirrors the
      // llms.txt convention; the route returns text/markdown with frontmatter.
      types: { "text/markdown": `${url}/llms.txt` },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: note.title,
      description: note.description,
      type: "article",
      url,
      siteName: "Kishore K Sharma",
      locale: "en_IN",
      publishedTime: note.date,
      modifiedTime: note.updated ?? note.date,
      authors: ["Kishore K Sharma"],
      tags,
      section: tags[0],
    },
    twitter: {
      card: "summary_large_image",
      title: note.title,
      description: note.description,
      site: "@kishoreksharmaa",
      creator: "@kishoreksharmaa",
    },
  };
}

export default async function NotePage(props: Props) {
  const params = await props.params;
  const note = await loadNote(params.slug);
  if (!note || note.draft) notFound();

  const { prev, next } = relatedNotes(note.slug);
  const relatedWork = workForNote(note);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = `${siteConfig.baseUrl}/writing/${note.slug}`;
  const ogImage = `${siteConfig.baseUrl}/writing/${note.slug}/opengraph-image`;
  const tags = note.tags ?? [];

  // Reference the canonical Person record defined in the root layout via @id
  // so Google joins this byline to the full author profile (worksFor,
  // alumniOf, knowsLanguage, etc.) without duplicating the data here.
  const author = {
    "@type": "Person" as const,
    "@id": `${siteConfig.baseUrl}/#person`,
    name: "Kishore K Sharma",
    url: siteConfig.baseUrl,
    sameAs: Object.values(portfolioData.personal.social),
    jobTitle: "Lead Full Stack Engineer",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: note.title,
    description: note.description,
    image: [ogImage],
    author,
    publisher: author,
    datePublished: note.date,
    dateModified: note.updated ?? note.date,
    url,
    inLanguage: "en",
    keywords: tags.join(", "),
    articleSection: tags[0],
    wordCount: note.wordCount,
    timeRequired: `PT${note.readMin}M`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // Copyright signals — helpful for SEO, DMCA evidence, and AI training
    // provenance. License intentionally restrictive; relax per-post via
    // frontmatter later if you want some posts under CC-BY.
    copyrightYear: Number(note.date.slice(0, 4)),
    copyrightHolder: author,
    copyrightNotice: `© ${note.date.slice(0, 4)} Kishore K Sharma. All rights reserved.`,
    license: `${siteConfig.baseUrl}/terms`,
    // Speakable hint for voice assistants / AI summarisers — points them at
    // the title and lede paragraph rather than navigation chrome.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "header p", "article p:first-of-type"],
    },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Writing",
        item: `${siteConfig.baseUrl}/writing`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: note.title,
        item: url,
      },
    ],
  };

  return (
    <article className="min-h-screen pt-32 pb-24">
      <ReadingProgress />
      <CopyAttribution url={url} author="Kishore K Sharma" />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />

      <div className="container-narrow">
        <header className="mb-12">
          <Link
            href="/writing"
            className="font-mono text-[0.72rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← writing
          </Link>
          <div className="mt-8 flex items-baseline justify-between gap-4 mb-5">
            <div className="flex items-baseline gap-3">
              <Link
                href={`/writing?category=${note.category}`}
                className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-accent hover:underline"
              >
                {categoryLabel(note.category)}
              </Link>
              <span className="text-subtle">·</span>
              <time dateTime={note.date} className="font-mono text-[0.72rem] text-muted-foreground">
                {formatDate(note.date)}
              </time>
            </div>
            <span className="font-mono text-[0.7rem] text-muted-foreground">
              {note.readMin} min read
            </span>
          </div>
          <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            {note.title}
          </h1>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            {note.description}
          </p>
          {note.tags && note.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-1.5 gap-y-1.5">
              {note.tags.map((t) => (
                <li key={t} className="font-mono text-[0.7rem] text-muted-foreground">
                  #{t}
                </li>
              ))}
            </ul>
          )}
          <ShareBar url={url} title={note.title} description={note.description} compact />
        </header>

        <div
          className="prose prose-neutral dark:prose-invert
                     max-w-none
                     prose-headings:font-display prose-headings:tracking-[-0.02em] prose-headings:text-balance
                     prose-h2:text-heading prose-h2:mt-14 prose-h2:mb-5
                     prose-h3:text-heading-sm prose-h3:mt-10 prose-h3:mb-4
                     prose-p:text-foreground/90 prose-p:leading-[1.7] prose-p:text-pretty
                     prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-foreground prose-strong:font-semibold
                     prose-em:text-foreground prose-em:font-display-soft
                     prose-code:font-mono prose-code:text-[0.88em] prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                     prose-pre:bg-surface prose-pre:border prose-pre:border-subtle/60 prose-pre:rounded-lg prose-pre:overflow-x-auto
                     prose-blockquote:border-l-accent prose-blockquote:not-italic prose-blockquote:font-normal prose-blockquote:text-foreground/80
                     prose-li:text-foreground/90 prose-li:leading-[1.7]
                     prose-hr:border-subtle/60 prose-hr:my-12
                     prose-img:rounded-lg prose-img:border prose-img:border-subtle/60 prose-img:my-0 prose-img:max-w-full prose-img:h-auto
                     prose-figure:my-10 prose-figure:flex prose-figure:flex-col prose-figure:items-center
                     prose-figcaption:font-mono prose-figcaption:text-[0.78rem] prose-figcaption:text-muted-foreground prose-figcaption:mt-3 prose-figcaption:text-center prose-figcaption:max-w-[50ch]"
          dangerouslySetInnerHTML={{ __html: note.html }}
        />

        <ShareBar url={url} title={note.title} description={note.description} />

        <AuthorCard />

        {relatedWork.length > 0 && (
          <section className="mt-16 pt-8 border-t border-subtle/60">
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-4">
              /seen in production
            </p>
            <ul className="space-y-3">
              {relatedWork.map((work) => (
                <li key={work.slug}>
                  <Link
                    href={`/work/${work.slug}`}
                    className="group flex items-baseline gap-3 text-foreground hover:text-accent transition-colors"
                  >
                    <span aria-hidden className="font-mono text-[0.72rem] text-muted-foreground group-hover:text-accent">→</span>
                    <span className="text-body-lg text-pretty">{work.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(prev || next) && (
          <nav
            aria-label="Related writing"
            className="mt-20 pt-10 border-t border-subtle/60 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {prev ? (
              <NoteCard direction="prev" note={prev} />
            ) : (
              <div aria-hidden className="hidden md:block" />
            )}
            {next ? (
              <NoteCard direction="next" note={next} />
            ) : (
              <div aria-hidden className="hidden md:block" />
            )}
          </nav>
        )}

        <footer className="mt-16 pt-8 border-t border-subtle/60">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/writing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-subtle text-foreground text-[0.85rem] hover:border-foreground/40 transition-colors"
            >
              ← more writing
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-[0.85rem] hover:opacity-90 transition-opacity"
            >
              get in touch <span aria-hidden>→</span>
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function NoteCard({ direction, note }: { direction: "prev" | "next"; note: NoteMeta }) {
  const isNext = direction === "next";
  return (
    <Link
      href={`/writing/${note.slug}`}
      className={`group block rounded-lg border border-subtle/60 p-5 hover:border-foreground/40 transition-colors ${
        isNext ? "md:text-right" : ""
      }`}
    >
      <span className="block font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
        {isNext ? "next →" : "← previous"}
      </span>
      <span className="mt-2 block font-display text-[1.05rem] leading-snug text-foreground tracking-[-0.01em] text-balance group-hover:text-accent transition-colors">
        {note.title}
      </span>
      <span className="mt-2 block text-[0.85rem] text-muted-foreground line-clamp-2 text-pretty">
        {note.description}
      </span>
    </Link>
  );
}

