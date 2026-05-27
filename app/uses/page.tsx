import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { safeJsonLd } from "@/lib/json-ld";

const PAGE_URL = `${siteConfig.baseUrl}/uses`;

export const metadata: Metadata = {
  title: "Uses",
  description:
    "The editor, hardware, fonts, terminal setup, and tools I reach for as a lead full stack engineer. Updated as the workflow evolves.",
  alternates: { canonical: `${siteConfig.baseUrl}/uses` },
  openGraph: {
    title: "Uses — Kishore K Sharma",
    description: "Editor, terminal, languages, AI workflow, and tooling.",
    url: `${siteConfig.baseUrl}/uses`,
    type: "website",
  },
};

interface UsesItem {
  name: string;
  note?: string;
  href?: string;
}
interface UsesGroup {
  title: string;
  blurb?: string;
  items: UsesItem[];
}

const GROUPS: UsesGroup[] = [
  {
    title: "Editor",
    blurb: "Where the actual writing happens.",
    items: [
      { name: "VS Code", note: "primary daily driver — Java + TypeScript + Markdown all in one place" },
      { name: "Cursor", note: "for AI-pair-programming on bigger refactors" },
      { name: "IntelliJ IDEA", note: "for serious Java work — Spring + Gradle inspections are unmatched" },
      { name: "Vim keybindings everywhere", note: "switched in 2021, never going back" },
    ],
  },
  {
    title: "Languages I reach for",
    items: [
      { name: "Java 17 / 21", note: "most of my production work" },
      { name: "TypeScript", note: "for everything web; never plain JS" },
      { name: "Bash", note: "automation glue, deployment scripts, ops one-offs" },
      { name: "SQL", note: "PostgreSQL dialect; I write queries before ORMs" },
    ],
  },
  {
    title: "Backend stack",
    items: [
      { name: "Spring Boot 3", note: "default for enterprise weight" },
      { name: "NestJS", note: "default for Node — structure beats raw Express any day" },
      { name: "PostgreSQL", note: "system of record" },
      { name: "Redis", note: "cache, rate limit, session, job queue — Swiss army knife" },
      { name: "Resilience4j", note: "circuit breakers + retries + bulkheads in three lines of config" },
    ],
  },
  {
    title: "Cloud & ops",
    items: [
      { name: "AWS", note: "S3, EC2, ECR, Lambda, RDS, Secrets Manager, CloudWatch" },
      { name: "Docker", note: "every service ships in a container" },
      { name: "GitHub Actions / Jenkins", note: "depends on the org; both work" },
      { name: "Grafana + Prometheus", note: "the dashboard goes up before the first incident" },
      { name: "ELK", note: "structured logs, request-id propagation, searchable" },
    ],
  },
  {
    title: "AI workflow",
    blurb: "Force-multiplier, not job title.",
    items: [
      { name: "Claude", note: "for thinking through architecture and writing prose like this page" },
      { name: "Cursor + Claude in IDE", note: "for in-context refactoring" },
      { name: "GitHub Copilot", note: "for autocomplete; honestly use it for less than I expected" },
      { name: "Gemini", note: "for cross-checking; second opinion is cheap" },
    ],
  },
  {
    title: "Terminal",
    items: [
      { name: "Warp", note: "trying it; jury's still out" },
      { name: "iTerm2 + Oh-My-Zsh", note: "the boring choice that just works" },
      { name: "fzf", note: "fuzzy file/history search; can't live without it now" },
      { name: "tmux", note: "for long-running ssh sessions; less than I used to" },
      { name: "lazygit", note: "for anything more complex than a commit" },
    ],
  },
  {
    title: "Hardware",
    items: [
      { name: "MacBook Pro (M-series)", note: "primary workstation" },
      { name: "External 4K display", note: "code on the laptop, browser/terminal on the big screen" },
      { name: "Mechanical keyboard", note: "tactile switches; speed isn't the point, feel is" },
    ],
  },
  {
    title: "Fonts on this site",
    blurb: "Every choice on this page is intentional.",
    items: [
      { name: "Fraunces", note: "display headlines; variable axes give serif character without rigidity" },
      { name: "Inter", note: "UI body; readable at every size, every weight" },
      { name: "JetBrains Mono", note: "code, captions, metrics — engineer-default for a reason" },
    ],
  },
  {
    title: "Reading",
    blurb: "What I keep open in tabs.",
    items: [
      { name: "Hacker News", note: "filtered through habit" },
      { name: "lobste.rs", note: "for engineer-curated signal" },
      { name: "Specific authors I follow", note: "Marc Brooker, Dan Luu, Hillel Wayne, Patrick Collison" },
    ],
  },
];

export default async function UsesPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": PAGE_URL,
    name: "Uses — Kishore K Sharma",
    description:
      "Editor, hardware, fonts, terminal setup, and tools Kishore K Sharma reaches for daily.",
    url: PAGE_URL,
    inLanguage: "en",
    isPartOf: { "@id": `${siteConfig.baseUrl}/#website` },
    about: { "@id": `${siteConfig.baseUrl}/#person` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.baseUrl },
        { "@type": "ListItem", position: 2, name: "Uses", item: PAGE_URL },
      ],
    },
  };

  return (
    <div className="min-h-screen pt-32 pb-24">
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageJsonLd) }}
      />
      <div className="container-narrow">
        <header className="mb-14">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            /uses
          </p>
          <h1 className="font-display text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
            What I <span className="font-display-soft italic text-accent">reach for</span>.
          </h1>
          <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
            Editor, languages, stack, cloud, AI workflow, hardware, fonts. The toolkit of a
            lead full stack engineer in 2026 — what I actually use, with the trade-offs in plain language.
            Updated as the workflow evolves.
          </p>
        </header>

        <div className="space-y-14">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-3">
                /{g.title.toLowerCase().replace(/ /g, "-")}
              </p>
              <h2 className="font-display text-heading-sm md:text-heading text-foreground tracking-[-0.025em] mb-2">
                {g.title}
              </h2>
              {g.blurb && (
                <p className="text-[0.95rem] text-muted-foreground mb-5 max-w-[55ch] text-pretty">
                  {g.blurb}
                </p>
              )}
              <ul className="divide-y divide-subtle/50">
                {g.items.map((it) => (
                  <li key={it.name} className="py-3 flex items-baseline justify-between gap-6">
                    <span className="font-mono text-[0.86rem] text-foreground shrink-0">
                      {it.href ? (
                        <a
                          href={it.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent transition-colors"
                        >
                          {it.name}
                        </a>
                      ) : (
                        it.name
                      )}
                    </span>
                    {it.note && (
                      <span className="text-[0.88rem] text-muted-foreground text-right max-w-[40ch] text-pretty">
                        {it.note}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-20 pt-6 border-t border-subtle/40 font-mono text-[0.78rem]">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
