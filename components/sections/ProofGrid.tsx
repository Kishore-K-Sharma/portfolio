"use client";

import { useState } from "react";
import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { Modal } from "@/components/Modal";

const FEATURED_CERT_COUNT = 6;

export function ProofGrid() {
  const { testimonials, awards, certifications, articles } = portfolioData;
  const [activeCert, setActiveCert] = useState<typeof certifications[number] | null>(null);
  const [showAllCerts, setShowAllCerts] = useState(false);

  // Specializations (multi-course bundles) carry more signal than individual
  // courses, so they go first; everything else keeps its source order.
  const sortedCerts = [...certifications].sort((a, b) => {
    const aSpec = a.title.includes("Specialization") ? 1 : 0;
    const bSpec = b.title.includes("Specialization") ? 1 : 0;
    return bSpec - aSpec;
  });
  const visibleCerts = showAllCerts ? sortedCerts : sortedCerts.slice(0, FEATURED_CERT_COUNT);
  const hiddenCount = certifications.length - FEATURED_CERT_COUNT;

  const allTestimonials = testimonials;

  return (
    <Section id="proof" index="04" eyebrow="Proof · what others say & ship-credentials">
      <Reveal>
        <h2 className="font-display text-display text-foreground text-balance max-w-[20ch] leading-[1.02] tracking-[-0.03em]">
          Credibility, <span className="font-display-soft italic text-accent">documented</span>.
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-[60ch] text-body-lg text-muted-foreground text-pretty">
          Recognition from the people I&apos;ve shipped with — managers, peers, and direct reports — alongside the awards and credentials behind the work.
        </p>
      </Reveal>

      {/* Testimonials */}
      <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-px bg-subtle/40 border border-subtle/40 rounded-xl overflow-hidden">
        {allTestimonials.map((t, i) => (
          <Reveal
            key={t.name}
            delay={Math.min(i * 0.04, 0.3)}
            as="div"
            className="bg-background p-7 md:p-9 flex flex-col md:[&:nth-child(odd):last-child]:col-span-2"
          >
            <p className="text-foreground text-[1rem] md:text-[1.05rem] leading-relaxed text-pretty mb-6">
              <span className="font-display-soft italic text-accent text-[1.4em] leading-none align-top mr-1">&ldquo;</span>
              {t.content}
            </p>
            <div className="mt-auto pt-5 border-t border-subtle/50">
              <p className="font-display text-heading-sm text-foreground">{t.name}</p>
              <p className="font-mono text-[0.72rem] text-muted-foreground mt-1 line-clamp-2">{t.title}</p>
              <p className="font-mono text-[0.7rem] text-foreground/60 mt-1.5">{t.relationship}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Awards + Articles row */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
        <div className="md:col-span-5">
          <Reveal>
            <p className="eyebrow mb-6">Recognition</p>
          </Reveal>
          <ul className="space-y-3">
            {awards.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.04} as="li" className="flex items-baseline gap-3 text-[0.92rem]">
                <span className="font-mono text-[0.7rem] text-fintech num">★</span>
                <span className="text-foreground/85">{a.title}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="md:col-span-7">
          <Reveal>
            <p className="eyebrow mb-6">Writing</p>
          </Reveal>
          <ul className="space-y-4">
            {articles.map((a) => (
              <Reveal key={a.title} as="li">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block py-4 border-t border-subtle/50 hover:border-foreground/30 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <span className="font-mono text-[0.7rem] text-muted-foreground">{a.platform}</span>
                    <span className="font-mono text-[0.7rem] text-muted-foreground">{a.date}</span>
                  </div>
                  <h4 className="font-display text-heading-sm text-foreground group-hover:text-accent transition-colors text-balance">
                    {a.title} <span aria-hidden className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">↗</span>
                  </h4>
                  <p className="mt-2 text-[0.9rem] text-muted-foreground text-pretty">{a.description}</p>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>

      {/* Certifications — featured first, expandable */}
      <div className="mt-20">
        <Reveal>
          <div className="flex items-baseline justify-between mb-6">
            <p className="eyebrow">Credentials</p>
            <p className="font-mono text-[0.7rem] text-muted-foreground num">
              {certifications.length.toString().padStart(2, "0")} verified
            </p>
          </div>
        </Reveal>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-subtle/40 border border-subtle/40 rounded-lg overflow-hidden">
          {visibleCerts.map((c, i) => (
            <Reveal key={c.credentialId} delay={Math.min(i * 0.02, 0.3)} as="li" className="bg-background">
              <button
                onClick={() => setActiveCert(c)}
                className="w-full text-left px-6 py-5 hover:bg-surface/60 transition-colors"
              >
                <div className="flex items-baseline gap-2 font-mono text-[0.7rem] text-muted-foreground mb-2">
                  <span>{c.year}</span>
                  <span className="text-subtle">·</span>
                  <span>{c.issuer}</span>
                </div>
                <p className="text-[0.92rem] text-foreground/90 line-clamp-2 text-pretty leading-snug">
                  {c.title}
                </p>
              </button>
            </Reveal>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <Reveal>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllCerts((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-subtle/60 font-mono text-[0.78rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                aria-expanded={showAllCerts}
              >
                {showAllCerts ? "Show fewer" : `Show all ${certifications.length}`}
                <span aria-hidden>{showAllCerts ? "↑" : "↓"}</span>
              </button>
            </div>
          </Reveal>
        )}
      </div>

      <Modal
        isOpen={!!activeCert}
        onClose={() => setActiveCert(null)}
        certificate={activeCert}
      />
    </Section>
  );
}
