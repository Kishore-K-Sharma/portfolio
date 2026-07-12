import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { RevealHeading } from "@/components/editorial/RevealHeading";

export function Education() {
  const { education, languages } = portfolioData;

  return (
    <Section id="education" index="05" eyebrow="Foundations" narrow>
      <RevealHeading as="h2" className="font-display text-display-sm text-foreground text-balance max-w-[26ch] leading-[1.05] tracking-[-0.025em]">
        Where the <span className="font-display-soft italic text-accent">groundwork</span> was laid.
      </RevealHeading>

      <ol className="mt-14">
        {education.map((e, idx) => (
          <Reveal key={e.degree} delay={idx * 0.06} as="li" className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-8 border-t border-subtle/50 last:border-b">
            <div className="md:col-span-3 font-mono text-[0.78rem] text-muted-foreground">
              {e.startDate} → {e.endDate}
            </div>
            <div className="md:col-span-9">
              <h3 className="font-display text-heading-sm text-foreground text-balance">{e.degree}</h3>
              <p className="font-mono text-[0.78rem] text-muted-foreground mt-1">{e.institution}</p>
              <p className="mt-4 text-[0.95rem] text-foreground/80 leading-relaxed text-pretty max-w-[60ch]">
                {e.description}
              </p>
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal>
        <div className="mt-14 flex flex-wrap gap-x-10 gap-y-3 pt-8 border-t border-subtle/50">
          <span className="eyebrow">Languages</span>
          {languages.map((l) => (
            <span key={l.language} className="font-mono text-[0.82rem] text-foreground/85">
              {l.language}{" "}
              <span className="text-muted-foreground">· {l.proficiency.split(" ")[0].toLowerCase()}</span>
            </span>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
