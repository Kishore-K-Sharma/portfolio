import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listWorkSlugs, loadWork, loadWorkMeta } from "@/lib/work";
import { safeJsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/config/site";

interface Props {
  params: Promise<{ slug: string }>;
}

const DOMAIN_LABEL: Record<string, string> = {
  telecom: "Telecom",
  fintech: "FinTech",
  edtech: "EdTech",
  govtech: "GovTech",
};

export async function generateStaticParams() {
  return listWorkSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  // Metadata only needs frontmatter — skip the markdown render.
  const work = loadWorkMeta(params.slug);
  if (!work) return {};
  const url = `${siteConfig.baseUrl}/work/${work.slug}`;
  return {
    title: work.title,
    description: work.summary,
    alternates: { canonical: url },
    openGraph: {
      title: work.title,
      description: work.summary,
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: work.title,
      description: work.summary,
    },
  };
}

export default async function WorkPage(props: Props) {
  const params = await props.params;
  const work = await loadWork(params.slug);
  if (!work) notFound();

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = `${siteConfig.baseUrl}/work/${work.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: work.title,
    description: work.summary,
    author: { "@type": "Person", name: "Kishore Kumar Sharma", url: siteConfig.baseUrl },
    datePublished: `${work.startDate}-01`,
    url,
    keywords: work.stack.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <article className="min-h-screen pt-32 pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="container-narrow">
        <Link
          href="/work"
          className="font-mono text-[0.72rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← work
        </Link>

        <header className="mt-8 mb-12">
          <div className="flex items-center justify-between gap-4 mb-5">
            <span
              className="font-mono text-[0.7rem] uppercase tracking-widest"
              style={{ color: `hsl(var(--${work.domain}))` }}
            >
              {DOMAIN_LABEL[work.domain]}
            </span>
            <time className="font-mono text-[0.7rem] text-muted-foreground">
              {fmt(work.startDate)} → {work.endDate === "Present" ? "Present" : fmt(work.endDate)}
            </time>
          </div>
          <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            {work.title}
          </h1>
          <p className="mt-3 font-mono text-[0.82rem] text-muted-foreground">
            {work.role} · {work.company}
          </p>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            {work.summary}
          </p>
        </header>

        {work.outcomes.length > 0 && (
          <aside className="grid grid-cols-2 md:grid-cols-4 gap-px bg-subtle/40 border border-subtle/40 rounded-lg overflow-hidden mb-14">
            {work.outcomes.map((o) => (
              <div key={o.label} className="bg-background p-5">
                <div className="font-mono text-[0.7rem] text-muted-foreground mb-1">{o.label}</div>
                <div className="font-display text-heading-sm text-foreground num">{o.value}</div>
              </div>
            ))}
          </aside>
        )}

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
          dangerouslySetInnerHTML={{ __html: work.html }}
        />

        <section className="mt-16 pt-8 border-t border-subtle/60">
          <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-4">
            /stack
          </p>
          <ul className="flex flex-wrap gap-x-1.5 gap-y-1.5 font-mono text-[0.78rem]">
            {work.stack.map((t) => (
              <li key={t} className="px-2 py-1 rounded border border-subtle/60 text-foreground/85">
                {t}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 pt-8 border-t border-subtle/60">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/work"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-subtle text-foreground text-[0.85rem] hover:border-foreground/40 transition-colors"
            >
              ← all cases
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

function fmt(iso: string): string {
  if (iso === "Present") return iso;
  const [y, m] = iso.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

