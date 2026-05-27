import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { listWork } from "@/lib/work";
import { siteConfig } from "@/config/site";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected case studies — telecom, fintech, govtech, edtech. Long-form narratives of the systems I've architected and the outcomes that shipped.",
  alternates: { canonical: `${siteConfig.baseUrl}/work` },
  openGraph: {
    title: "Work — Kishore K Sharma",
    description: "Selected engineering case studies across four verticals.",
    type: "website",
    url: `${siteConfig.baseUrl}/work`,
  },
};

const DOMAIN_LABEL: Record<string, string> = {
  telecom: "Telecom",
  fintech: "FinTech",
  edtech: "EdTech",
  govtech: "GovTech",
};

export default async function WorkIndex() {
  const work = listWork();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = `${siteConfig.baseUrl}/work`;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    name: "Selected Work — Kishore K Sharma",
    description:
      "Engineering case studies across telecom, fintech, govtech, and edtech — architectural decisions and measurable outcomes.",
    url,
    inLanguage: "en",
    isPartOf: { "@id": `${siteConfig.baseUrl}/#website` },
    about: { "@id": `${siteConfig.baseUrl}/#person` },
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: work.length,
      itemListElement: work.map((w, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteConfig.baseUrl}/work/${w.slug}`,
        name: w.title,
      })),
    },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.baseUrl },
      { "@type": "ListItem", position: 2, name: "Work", item: url },
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
        <header className="mb-16 md:mb-20">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            /work
          </p>
          <h1 className="font-display text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            Selected work, in <span className="font-display-soft italic text-accent">long form</span>.
          </h1>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            Each engagement as a real story — the mandate, the architectural calls, what I shipped, what I learned.
            Lists are easy to skim. Narratives are how engineers actually understand systems.
          </p>
        </header>

        <ol className="divide-y divide-subtle/60">
          {work.map((w) => (
            <li key={w.slug} className="py-7 first:pt-0 last:pb-0">
              <Link href={`/work/${w.slug}`} className="group block">
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <span
                    className="font-mono text-[0.7rem] uppercase tracking-widest"
                    style={{ color: `hsl(var(--${w.domain}))` }}
                  >
                    {DOMAIN_LABEL[w.domain]}
                  </span>
                  <time className="font-mono text-[0.7rem] text-muted-foreground">
                    {fmt(w.startDate)} → {w.endDate === "Present" ? "Present" : fmt(w.endDate)}
                  </time>
                </div>
                <h2 className="font-display text-heading md:text-display-sm text-foreground tracking-[-0.025em] leading-[1.1] text-balance group-hover:text-accent transition-colors">
                  {w.title}
                </h2>
                <p className="mt-1.5 font-mono text-[0.78rem] text-muted-foreground">
                  {w.role} · {w.company}
                </p>
                <p className="mt-3 text-[0.95rem] text-muted-foreground leading-relaxed text-pretty max-w-[58ch]">
                  {w.summary}
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-1.5 gap-y-1.5 font-mono text-[0.72rem]">
                  {w.stack.slice(0, 6).map((t) => (
                    <li key={t} className="px-2 py-0.5 rounded border border-subtle/60 text-muted-foreground">
                      {t}
                    </li>
                  ))}
                  {w.stack.length > 6 && (
                    <li className="px-2 py-0.5 text-muted-foreground/70">+{w.stack.length - 6}</li>
                  )}
                </ul>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-20 pt-8 border-t border-subtle/40 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to portfolio
          </Link>
          <span className="font-mono text-[0.7rem] text-muted-foreground">
            {work.length} {work.length === 1 ? "case" : "cases"}
          </span>
        </div>
      </div>
    </div>
  );
}

function fmt(iso: string): string {
  if (iso === "Present") return iso;
  // Accept "YYYY-MM" or "YYYY-MM-DD"
  const [y, m] = iso.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
