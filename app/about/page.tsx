import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import portfolioData from "@/data/portfolio.json";
import { siteConfig } from "@/config/site";
import { safeJsonLd } from "@/lib/json-ld";

const { personal, summary, manifesto, experience, education, awards, certifications } =
  portfolioData;

export const metadata: Metadata = {
  title: "About",
  description: `${personal.name} — ${personal.title} based in ${personal.location}. ${personal.experienceYears} years across telecom, fintech, govtech and edtech. Backend-deep by training, full-stack by delivery.`,
  alternates: { canonical: `${siteConfig.baseUrl}/about` },
  keywords: [
    `About ${personal.name}`,
    "Senior Full Stack Engineer",
    "Engineer profile",
    "Java Spring Boot Node.js engineer",
    "Software engineer Noida",
  ],
  openGraph: {
    title: `About — ${personal.name}`,
    description: `${personal.title} · ${personal.experienceYears} years · ${personal.location}.`,
    url: `${siteConfig.baseUrl}/about`,
    type: "profile",
    siteName: personal.name,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `About — ${personal.name}`,
    description: `${personal.title} · ${personal.experienceYears} years · ${personal.location}.`,
  },
};

export default async function AboutPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const url = `${siteConfig.baseUrl}/about`;

  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": url,
    url,
    inLanguage: "en",
    mainEntity: { "@id": `${siteConfig.baseUrl}/#person` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.baseUrl },
        { "@type": "ListItem", position: 2, name: "About", item: url },
      ],
    },
  };

  return (
    <main className="min-h-screen pt-32 pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(profileJsonLd) }}
      />

      <div className="container-narrow">
        <header className="mb-14">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            /about
          </p>
          <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            {personal.name}
          </h1>
          <p className="mt-4 font-mono text-[0.85rem] text-muted-foreground">
            {personal.title} · {personal.location} · {personal.experienceYears} years
          </p>
          <p className="mt-8 max-w-[58ch] text-body-lg text-foreground/90 text-pretty leading-relaxed">
            {summary}
          </p>
        </header>

        <section className="mb-16">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mb-5">
            /manifesto
          </p>
          <ul className="space-y-5 max-w-[64ch]">
            {manifesto.map((line, i) => (
              <li key={i} className="text-body text-foreground/85 leading-relaxed text-pretty">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-16">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mb-6">
            /experience
          </p>
          <ol className="space-y-10">
            {experience.map((job) => (
              <li key={`${job.company}-${job.startDate}`} className="border-l-2 border-subtle/60 pl-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                  <h3 className="font-display text-heading-sm text-foreground tracking-[-0.02em]">
                    {job.role}
                  </h3>
                  <time className="font-mono text-[0.72rem] text-muted-foreground">
                    {job.startDate} — {job.endDate}
                  </time>
                </div>
                <p className="font-mono text-[0.78rem] text-accent mb-3">{job.company}</p>
                <ul className="mt-3 space-y-2 text-[0.92rem] text-foreground/85 leading-relaxed">
                  {job.description.map((d, i) => (
                    <li key={i} className="text-pretty">
                      — {d}
                    </li>
                  ))}
                </ul>
                {job.technologies && job.technologies.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-1.5 gap-y-1.5">
                    {job.technologies.map((t) => (
                      <li
                        key={t}
                        className="font-mono text-[0.7rem] px-2 py-0.5 rounded border border-subtle/60 text-muted-foreground"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-16">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mb-6">
            /education
          </p>
          <ol className="space-y-8">
            {education.map((ed) => (
              <li key={`${ed.institution}-${ed.startDate}`} className="border-l-2 border-subtle/60 pl-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                  <h3 className="font-display text-[1.1rem] text-foreground tracking-[-0.01em]">
                    {ed.degree}
                  </h3>
                  <time className="font-mono text-[0.72rem] text-muted-foreground">
                    {ed.startDate} — {ed.endDate}
                  </time>
                </div>
                <p className="font-mono text-[0.78rem] text-accent">{ed.institution}</p>
                {ed.description && (
                  <p className="mt-3 text-[0.92rem] text-foreground/80 leading-relaxed text-pretty">
                    {ed.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {awards && awards.length > 0 && (
          <section className="mb-16">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mb-5">
              /awards
            </p>
            <ul className="space-y-2 text-[0.92rem] text-foreground/85">
              {awards.map((a, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="font-mono text-[0.7rem] text-muted-foreground/70">·</span>
                  <span className="text-pretty">{a.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {certifications && certifications.length > 0 && (
          <section className="mb-16">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mb-5">
              /certifications
            </p>
            <p className="font-mono text-[0.78rem] text-muted-foreground mb-4">
              {certifications.length} certifications across cloud, DevOps, full-stack, and
              data fundamentals.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[0.88rem] text-foreground/80">
              {certifications.slice(0, 12).map((c, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="font-mono text-[0.7rem] text-muted-foreground/70">·</span>
                  <span className="text-pretty">
                    {c.title}
                    <span className="text-muted-foreground/70"> · {c.issuer}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-12 pt-8 border-t border-subtle/60">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/work"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-subtle text-foreground text-[0.85rem] hover:border-foreground/40 transition-colors"
            >
              see work →
            </Link>
            <Link
              href="/writing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-subtle text-foreground text-[0.85rem] hover:border-foreground/40 transition-colors"
            >
              read writing →
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
    </main>
  );
}
