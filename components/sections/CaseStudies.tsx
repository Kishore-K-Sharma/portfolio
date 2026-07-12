"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { RevealHeading } from "@/components/editorial/RevealHeading";
import { RequestTrace } from "@/components/RequestTrace";
import { DOMAIN_META, type DomainId } from "@/lib/domains";

// Explicit mapping: experience index → /work slug + domain.
// Source of truth, matches the frontmatter in content/work/*.md.
// `slug: null` means the entry shows in the homepage timeline but has no
// deep case-study page (e.g. current TCS engagement — kept off the public
// /work routes for confidentiality, surfaced here only as a timeline row).
const WORK_META: { slug: string | null; domain: DomainId }[] = [
  { slug: null, domain: "telecom" },
  { slug: "fintech-crm-loan-modernization", domain: "fintech" },
  { slug: "realtime-tutoring-platform", domain: "edtech" },
  { slug: "college-automation-platform", domain: "govtech" },
];

const DOMAINS: DomainId[] = ["telecom", "fintech", "edtech", "govtech"];

export function CaseStudies() {
  const { experience } = portfolioData;
  const [filter, setFilter] = useState<DomainId | null>(null);

  // Tag every experience entry with a domain (for filter)
  const tagged = useMemo(
    () =>
      experience.map((e, idx) => ({
        ...e,
        slug: WORK_META[idx]?.slug,
        domain: WORK_META[idx]?.domain ?? "telecom",
        index: idx,
      })),
    [experience]
  );

  const visible = filter ? tagged.filter((t) => t.domain === filter) : tagged;
  const lead = visible[0];
  const rest = visible.slice(1);

  return (
    <Section id="work" index="03" eyebrow="Selected work · 2019 → present">
      <RevealHeading className="font-display text-display text-foreground text-balance max-w-[22ch] leading-[1.02] tracking-[-0.03em]">
        Four verticals. One <span className="font-display-soft italic text-accent">discipline</span>.
      </RevealHeading>

      <Reveal delay={0.1}>
        <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
          Same patterns, different domains: model the system, draw clean boundaries, instrument
          what matters, ship measurable lift. Each engagement is one deliberate study.
        </p>
      </Reveal>

      {/* Domain filter */}
      <Reveal delay={0.18}>
        <div className="mt-10 md:mt-12 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-2">filter</span>
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-md border font-mono text-[0.75rem] transition-colors ${
              filter === null
                ? "border-foreground/60 bg-foreground text-background"
                : "border-subtle/60 text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            all
          </button>
          {DOMAINS.map((d) => {
            const meta = DOMAIN_META[d];
            const active = filter === d;
            return (
              <button
                key={d}
                onClick={() => setFilter(active ? null : d)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-[0.75rem] transition-colors ${
                  active
                    ? "border-foreground/60 bg-foreground text-background"
                    : "border-subtle/60 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: `hsl(${meta.cssVar})` }}
                  aria-hidden
                />
                {meta.name}
              </button>
            );
          })}
          <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground num">
            {visible.length} of {tagged.length}
          </span>
        </div>
      </Reveal>

      {/* Empty state */}
      {visible.length === 0 && (
        <p className="mt-16 font-mono text-[0.85rem] text-muted-foreground">
          no engagements in that domain — clear the filter to see all.
        </p>
      )}

      {/* Lead study */}
      {lead && (
        <article className="mt-16 md:mt-20">
          <header className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 mb-10 md:mb-14">
            <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-4 md:gap-2">
              <span
                className="font-mono text-[0.7rem] tracking-widest uppercase"
                style={{ color: `hsl(${DOMAIN_META[lead.domain].cssVar})` }}
              >
                {lead === tagged[0] ? "✦ Lead study" : DOMAIN_META[lead.domain].name}
              </span>
              <span className="font-mono text-[0.78rem] text-muted-foreground">
                {lead.startDate} → {lead.endDate}
              </span>
            </div>
            <div className="md:col-span-9">
              <Reveal>
                <p className="eyebrow mb-3">{lead.company}</p>
                <h3 className="font-display text-display-sm text-foreground tracking-[-0.025em] leading-[1.05] text-balance">
                  {lead.role}
                </h3>
              </Reveal>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14">
            <div className="md:col-span-7">
              <Reveal>
                <RequestTrace />
              </Reveal>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {lead.projects.map((p) => (
                  <Reveal
                    key={p.title}
                    className="border border-subtle/50 rounded-lg p-5 hover:border-foreground/30 transition-colors"
                  >
                    <p className="font-mono text-[0.7rem] text-muted-foreground mb-2">{p.duration}</p>
                    <h4 className="font-display text-heading-sm text-foreground mb-2">{p.title}</h4>
                    <p className="text-[0.9rem] text-muted-foreground leading-relaxed text-pretty">
                      {p.description}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="md:col-span-5 md:pl-8 md:border-l md:border-subtle/60">
              <Reveal>
                <p className="eyebrow mb-4">What I shipped</p>
                <ul className="space-y-4">
                  {lead.description.map((line, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-[0.95rem] text-foreground/85 leading-relaxed text-pretty"
                    >
                      <span
                        className="mt-2 h-px w-3 shrink-0"
                        style={{ background: `hsl(${DOMAIN_META[lead.domain].cssVar})` }}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.15}>
                <p className="eyebrow mt-10 mb-4">Stack</p>
                <ul className="flex flex-wrap gap-x-2 gap-y-1.5 font-mono text-[0.78rem]">
                  {lead.technologies.map((t) => (
                    <li key={t} className="px-2 py-1 rounded border border-subtle/60 text-foreground/85">
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>

              {lead.slug && (
                <Reveal delay={0.2}>
                  <Link
                    href={`/work/${lead.slug}`}
                    className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-foreground text-background text-[0.85rem] hover:opacity-90 transition-opacity"                  >
                    Read full case study <span aria-hidden>→</span>
                  </Link>
                </Reveal>
              )}
            </div>
          </div>
        </article>
      )}

      {/* Earlier engagements */}
      {rest.length > 0 && (
        <div className="mt-28 md:mt-36">
          <Reveal>
            <p className="eyebrow mb-8">
              {filter ? "more in this domain" : "earlier engagements"}
            </p>
          </Reveal>

          <ol className="border-t border-subtle/50">
            {rest.map((job) => {
              const meta = DOMAIN_META[job.domain];
              const inner = (
                <article className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-12 border-b border-subtle/50 hover:bg-surface/30 transition-colors -mx-3 px-3 rounded">
                  <div className="md:col-span-3 flex flex-col gap-1.5">
                    <span
                      className="font-mono text-[0.7rem] tracking-widest uppercase"
                      style={{ color: `hsl(${meta.cssVar})` }}
                    >
                      {meta.name}
                    </span>
                    <span className="font-mono text-[0.78rem] text-muted-foreground">
                      {job.startDate} → {job.endDate}
                    </span>
                  </div>

                  <div className="md:col-span-6">
                    <h4 className="font-display text-heading text-foreground tracking-[-0.02em] leading-[1.1] text-balance group-hover:text-accent transition-colors">
                      {job.role}
                    </h4>
                    <p className="mt-1.5 text-[0.92rem] text-muted-foreground">{job.company}</p>
                    <p className="mt-5 text-[0.95rem] text-foreground/80 leading-relaxed max-w-[58ch] text-pretty">
                      {job.description[0]}
                    </p>
                    {job.slug && (
                      <p className="mt-4 font-mono text-[0.72rem] text-muted-foreground group-hover:text-foreground transition-colors">
                        read case study →
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <ul className="flex flex-wrap gap-x-2 gap-y-1.5 font-mono text-[0.72rem]">
                      {job.technologies.slice(0, 6).map((t) => (
                        <li key={t} className="text-muted-foreground">
                          {t}
                          <span aria-hidden className="text-subtle ml-2 last:hidden">
                            ·
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
              return (
                <Reveal key={job.company} as="li">
                  {job.slug ? (
                    <Link
                      href={`/work/${job.slug}`}
                      className="block group"                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="block group">{inner}</div>
                  )}
                </Reveal>
              );
            })}
          </ol>
        </div>
      )}

      {/* Show all-cases link at bottom */}
      <Reveal>
        <div className="mt-12 flex justify-end">
          <Link
            href="/work"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"          >
            all cases →
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
