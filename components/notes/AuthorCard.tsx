import Image from "next/image";
import portfolioData from "@/data/portfolio.json";

const { personal } = portfolioData;

// Curated "follow the author" set — the four highest-conversion platforms for
// a reader who just finished an article. Full set lives in the footer; this
// keeps the post-end block tight rather than a wall of icons.
const POST_END_PROFILES: Array<[label: string, key: keyof typeof personal.social]> = [
  ["LinkedIn", "linkedin"],
  ["X", "x"],
  ["GitHub", "github"],
  ["Hashnode", "hashnode"],
];

export function AuthorCard() {
  return (
    <section
      aria-label={`Written by ${personal.name}`}
      className="mt-20 pt-2"
    >
      <div className="flex items-center gap-6">
        <div className="flex-1 h-px bg-subtle/50" aria-hidden />
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border border-subtle/70 bg-subtle/30 flex-shrink-0">
          <Image
            src="/profile-picture.jpg"
            alt=""
            fill
            sizes="(min-width: 768px) 96px, 80px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 h-px bg-subtle/50" aria-hidden />
      </div>

      <div className="mt-6 text-center">
        <p className="font-display text-heading-sm md:text-heading text-foreground tracking-[-0.02em]">
          {personal.name}
        </p>
        <p className="mt-3 max-w-[60ch] mx-auto text-[0.92rem] md:text-[0.95rem] text-muted-foreground leading-relaxed text-pretty">
          {personal.authorHeadline}
        </p>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[0.78rem] text-muted-foreground">
          {POST_END_PROFILES.map(([label, key], i) => (
            <li key={key} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="text-muted-foreground/40">·</span>}
              <a
                href={personal.social[key]}
                target="_blank"
                rel="noopener noreferrer me"
                className="hover:text-foreground transition-colors"
              >
                {label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
