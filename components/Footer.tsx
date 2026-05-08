import Link from "next/link";
import portfolioData from "@/data/portfolio.json";
import { SmoothAnchor } from "@/components/SmoothAnchor";

export function Footer() {
  const year = new Date().getFullYear();
  const { personal } = portfolioData;
  const firstName = personal.name.split(" ")[0];

  return (
    <footer className="relative border-t border-subtle/60 mt-20">
      <div className="container-editorial py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-6">
            <p className="eyebrow mb-4">/footer · still here</p>
            <p className="font-display text-display-sm text-balance text-foreground">
              If you&apos;re building something hard, let&apos;s talk.
            </p>
            <SmoothAnchor
              href="#contact"
              className="mt-8 inline-flex items-center gap-2 text-foreground border-b border-foreground pb-1 hover:border-accent hover:text-accent transition-colors"
            >
              Start a conversation
              <span aria-hidden>→</span>
            </SmoothAnchor>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow mb-4">Direct</p>
            <ul className="space-y-2 text-[0.92rem] text-muted-foreground">
              <li>
                <SmoothAnchor href="#contact" className="hover:text-foreground transition-colors">
                  via the contact form →
                </SmoothAnchor>
              </li>
              <li className="font-mono text-[0.8rem]">{personal.location}</li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow mb-4">Elsewhere</p>
            <ul className="space-y-2 text-[0.92rem] text-muted-foreground">
              <li>
                <a href={personal.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  LinkedIn ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-subtle/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[0.78rem] text-muted-foreground font-mono">
          <span>© {year} {firstName} · Built with restraint.</span>
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-edtech animate-pulse-soft" aria-hidden />
            v2 · System online
          </span>
        </div>
      </div>
    </footer>
  );
}
