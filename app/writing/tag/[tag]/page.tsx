import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listTags, notesByTag, tagSlug } from "@/lib/notes";
import { safeJsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/config/site";
import { NotesBrowser, type NoteSummary } from "@/components/notes/NotesBrowser";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return listTags().map(({ tag }) => ({ tag: tagSlug(tag) }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const tag = decodeURIComponent(params.tag);
  const url = `${siteConfig.baseUrl}/writing/tag/${tagSlug(tag)}`;
  const description = `Notes on ${tag} — long-form writing on architecture, distributed systems, and shipping discipline by Kishore Kumar Sharma.`;
  return {
    title: `#${tag}`,
    description,
    keywords: [tag, "software engineering", "backend", "Kishore Kumar Sharma"],
    authors: [{ name: "Kishore Kumar Sharma", url: siteConfig.baseUrl }],
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
    openGraph: {
      title: `Notes tagged #${tag}`,
      description,
      url,
      type: "website",
      siteName: "Kishore Kumar Sharma",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: `Notes tagged #${tag}`,
      description,
    },
  };
}

export default async function TagPage(props: Props) {
  const params = await props.params;
  // Resolve slug back to original tag (case-insensitive match against listTags)
  const slug = decodeURIComponent(params.tag);
  const all = listTags();
  const match = all.find((t) => tagSlug(t.tag) === slug);
  if (!match) notFound();

  const notes = notesByTag(match.tag);
  if (notes.length === 0) notFound();

  const summaries: NoteSummary[] = notes.map((n) => ({
    slug: n.slug,
    title: n.title,
    description: n.description,
    date: n.date,
    tags: n.tags ?? [],
    readMin: n.readMin,
  }));

  const basePath = `/writing/tag/${tagSlug(match.tag)}`;
  const url = `${siteConfig.baseUrl}${basePath}`;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    name: `Notes tagged #${match.tag}`,
    description: `Long-form notes by Kishore Kumar Sharma tagged ${match.tag}.`,
    url,
    inLanguage: "en",
    isPartOf: { "@type": "Blog", "@id": `${siteConfig.baseUrl}/writing` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: notes.length,
      itemListElement: notes.map((n, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteConfig.baseUrl}/writing/${n.slug}`,
        name: n.title,
      })),
    },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.baseUrl },
      { "@type": "ListItem", position: 2, name: "Writing", item: `${siteConfig.baseUrl}/writing` },
      { "@type": "ListItem", position: 3, name: `#${match.tag}`, item: url },
    ],
  };

  return (
    <div className="min-h-screen pt-32 pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />
      <div className="container-narrow">
        <Link
          href="/writing"
          className="font-mono text-[0.72rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← writing
        </Link>

        <header className="mt-8 mb-14">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            /tag
          </p>
          <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            #{match.tag}
          </h1>
        </header>

        <Suspense fallback={null}>
          <NotesBrowser
            notes={summaries}
            basePath={basePath}
            searchPlaceholder={`Search within #${match.tag}…`}
          />
        </Suspense>

        <div className="mt-14 pt-6 border-t border-subtle/40">
          <Link
            href="/writing"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← all writing
          </Link>
        </div>
      </div>
    </div>
  );
}
