import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { RevealHeading } from "@/components/editorial/RevealHeading";

const STACK_GROUPS: Array<{
  key: keyof typeof portfolioData.skills;
  label: string;
  blurb: string;
  tone: string;
}> = [
  { key: "backend", label: "Backend & APIs", blurb: "The core. Java/Spring Boot for enterprise weight; Node/NestJS for velocity.", tone: "text-foreground" },
  { key: "architecturePractices", label: "Architecture", blurb: "Patterns I reach for when systems get real — circuit breakers, idempotency, caches.", tone: "text-telecom" },
  { key: "cloudDevOps", label: "Cloud & DevOps", blurb: "AWS-native deploys, CI/CD discipline, observability before incidents.", tone: "text-fintech" },
  { key: "databases", label: "Data", blurb: "Relational by default, document where it earns its place, Redis when latency demands.", tone: "text-edtech" },
  { key: "frontend", label: "Frontend", blurb: "Where users meet the system. React for product UX, Angular for enterprise, React Native for mobile.", tone: "text-govtech" },
  { key: "aiDeveloperProductivity", label: "AI workflows", blurb: "Force-multiplier, not job title. Cursor + Claude + Gemini compress the loop.", tone: "text-accent" },
];

export function Capability() {
  const { skills } = portfolioData;

  return (
    <Section id="capability" index="02" eyebrow="Capability · operating envelope">
      <RevealHeading className="font-display text-display text-foreground text-balance max-w-[20ch] leading-[1.02] tracking-[-0.03em]">
        The stack I reach for, and <span className="font-display-soft italic text-accent">why</span>.
      </RevealHeading>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-[60ch] text-body-lg text-muted-foreground text-pretty">
          A capability map, not a skill checklist. Grouped by what they do, not by where they sit on a resume.
        </p>
      </Reveal>

      <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-subtle/40 border border-subtle/40 rounded-xl overflow-hidden">
        {STACK_GROUPS.map((group, idx) => {
          const items = skills[group.key] as string[];
          return (
            <Reveal key={group.key} delay={idx * 0.05} className="bg-background p-6 md:p-8 hover:bg-surface/50 transition-colors">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className={`font-display text-heading-sm ${group.tone}`}>{group.label}</h3>
                <span className="font-mono text-[0.7rem] text-muted-foreground num">{items.length.toString().padStart(2, "0")}</span>
              </div>
              <p className="text-[0.92rem] text-muted-foreground mb-6 text-pretty">{group.blurb}</p>
              <ul className="flex flex-wrap gap-x-2 gap-y-1.5 font-mono text-[0.78rem]">
                {items.map((item) => (
                  <li
                    key={item}
                    className="text-foreground/85 hover:text-foreground transition-colors"
                  >
                    {item}
                    <span aria-hidden className="text-subtle ml-2 last:hidden">·</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
