import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { RevealHeading } from "@/components/editorial/RevealHeading";
import { MetricCounter } from "@/components/editorial/MetricCounter";

export function Manifesto() {
  const { manifesto, stats } = portfolioData;

  return (
    <Section id="manifesto" index="01" eyebrow="Manifesto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
        {/* Left: voice */}
        <div className="md:col-span-7">
          <RevealHeading className="font-display text-display text-foreground text-balance leading-[1] tracking-[-0.03em]">
            I take features <span className="font-display-soft italic text-accent">all the way through</span>.
          </RevealHeading>

          <ul className="mt-12 space-y-8 max-w-[60ch]">
            {manifesto.map((line, i) => (
              <Reveal key={i} delay={0.05 * i} as="li" className="flex gap-5 text-body-lg text-foreground/85 text-pretty">
                <span className="num eyebrow shrink-0 mt-2">0{i + 1}</span>
                <span>{line}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* Right: vital signs / stats panel */}
        <aside className="md:col-span-5 md:pl-8 md:border-l md:border-subtle/60">
          <Reveal>
            <p className="eyebrow mb-6">Vital signs</p>
          </Reveal>
          <dl className="space-y-8">
            {stats.map((s, i) => {
              const numeric = Number(s.value);
              return (
                <Reveal key={i} delay={0.1 + i * 0.06} as="div" className="border-b border-subtle/50 pb-6 last:border-0">
                  <dt className="font-mono text-[0.78rem] text-muted-foreground mb-2">{s.label}</dt>
                  <dd className="font-display text-display-sm text-foreground tracking-[-0.025em] num">
                    {Number.isFinite(numeric) ? (
                      <MetricCounter value={numeric} suffix={s.suffix} />
                    ) : (
                      s.value + s.suffix
                    )}
                  </dd>
                </Reveal>
              );
            })}
          </dl>
        </aside>
      </div>
    </Section>
  );
}
