import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { listNotes, listTags, tagSlug } from "@/lib/notes";
import { safeJsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/config/site";
import { NotesBrowser, type NoteSummary } from "@/components/notes/NotesBrowser";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Long-form notes on architecture, distributed systems, microservices, and the engineering discipline behind production software.",
  keywords: [
    "software engineering blog",
    "backend architecture",
    "distributed systems",
    "microservices",
    "system design",
    "production engineering",
    "Kishore Kumar Sharma",
  ],
  authors: [{ name: "Kishore Kumar Sharma", url: siteConfig.baseUrl }],
  alternates: { canonical: `${siteConfig.baseUrl}/writing` },
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
    title: "Writing — Kishore Kumar Sharma",
    description: "Notes on architecture, distributed systems, and shipping discipline.",
    type: "website",
    url: `${siteConfig.baseUrl}/writing`,
    siteName: "Kishore Kumar Sharma",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Writing — Kishore Kumar Sharma",
    description: "Notes on architecture, distributed systems, and shipping discipline.",
  },
};

export default async function NotesIndex() {
  const notes = listNotes();
  const tags = listTags();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Slim down for the client — drop raw markdown and rendered html.
  const summaries: NoteSummary[] = notes.map((n) => ({
    slug: n.slug,
    title: n.title,
    description: n.description,
    date: n.date,
    tags: n.tags ?? [],
    readMin: n.readMin,
  }));

  const author = {
    "@type": "Person" as const,
    "@id": `${siteConfig.baseUrl}/#person`,
    name: "Kishore Kumar Sharma",
    url: siteConfig.baseUrl,
    sameAs: ["https://www.linkedin.com/in/kishore-kumar-sharma/"],
  };

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteConfig.baseUrl}/writing`,
    name: "Writing — Kishore Kumar Sharma",
    description:
      "Long-form notes on architecture, distributed systems, and the discipline behind production software.",
    url: `${siteConfig.baseUrl}/writing`,
    inLanguage: "en",
    author,
    publisher: author,
    blogPost: notes.map((n) => ({
      "@type": "BlogPosting",
      headline: n.title,
      description: n.description,
      url: `${siteConfig.baseUrl}/writing/${n.slug}`,
      datePublished: n.date,
      dateModified: n.date,
      author,
      keywords: (n.tags ?? []).join(", "),
    })),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.baseUrl },
      { "@type": "ListItem", position: 2, name: "Writing", item: `${siteConfig.baseUrl}/writing` },
    ],
  };

  return (
    <div className="min-h-screen pt-32 pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(blogJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />
      <div className="container-narrow">
        <header className="mb-16 md:mb-20">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            /writing
          </p>
          <h1 className="font-display text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            Writing on building <span className="font-display-soft italic text-accent">things that hold</span>.
          </h1>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            Long-form thinking on architecture, distributed systems, and the discipline behind
            production software. What I share when I sit down to write rather than ship.
          </p>
        </header>

        {summaries.length === 0 ? (
          <p className="font-mono text-[0.85rem] text-muted-foreground">
            No posts yet — first one is being drafted.
          </p>
        ) : (
          <Suspense fallback={null}>
            <NotesBrowser notes={summaries} />
          </Suspense>
        )}

        {tags.length > 0 && (
          <section className="mt-20 pt-8 border-t border-subtle/40">
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-4">
              /tags
            </p>
            <ul className="flex flex-wrap gap-x-1.5 gap-y-1.5">
              {tags.map(({ tag, count }) => (
                <li key={tag}>
                  <Link
                    href={`/writing/tag/${tagSlug(tag)}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-subtle/60 font-mono text-[0.74rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    #{tag}
                    <span className="text-muted-foreground/60 num">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 pt-6 border-t border-subtle/40 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to portfolio
          </Link>
          <span className="font-mono text-[0.7rem] text-muted-foreground">
            {notes.length} {notes.length === 1 ? "piece" : "pieces"}
          </span>
        </div>
      </div>
    </div>
  );
}
