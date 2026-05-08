import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 · Not Found",
  description: "The page you tried to reach does not exist.",
};

const SUGGESTIONS = [
  { href: "/", label: "Home", hint: "the actual portfolio" },
  { href: "/work", label: "Work", hint: "case studies" },
  { href: "/writing", label: "Writing", hint: "long-form pieces" },
  { href: "/uses", label: "Uses", hint: "tools I reach for" },
  { href: "/#contact", label: "Contact", hint: "say hi" },
];

export default function NotFound() {
  return (
    <main className="min-h-screen pt-32 pb-24 flex items-center">
      <div className="container-narrow">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          /404 · resource not found
        </p>

        <h1 className="font-display text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
          That route doesn&apos;t <span className="font-display-soft italic text-accent">resolve</span>.
        </h1>

        <p className="mt-6 max-w-[58ch] text-body-lg text-muted-foreground text-pretty">
          The page you tried to reach either moved, never existed, or got renamed in a refactor I
          forgot to redirect. Here are the routes that do exist:
        </p>

        <pre className="mt-10 font-mono text-[0.85rem] bg-surface border border-subtle/60 rounded-lg p-5 overflow-x-auto">
          <span className="text-muted-foreground">$ </span>
          <span className="text-foreground">curl -I </span>
          <span className="text-accent">{"<requested-url>"}</span>
          {"\n"}
          <span className="text-destructive">HTTP/1.1 404 Not Found</span>
        </pre>

        <div className="mt-10">
          <p className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-4">
            /known-routes
          </p>
          <ul className="divide-y divide-subtle/50">
            {SUGGESTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex items-baseline justify-between gap-4 py-3.5 hover:bg-surface/40 -mx-2 px-2 rounded transition-colors"
                >
                  <span className="font-mono text-[0.88rem] text-foreground group-hover:text-accent transition-colors">
                    {s.href}
                    <span className="text-muted-foreground/70"> · {s.label}</span>
                  </span>
                  <span className="font-mono text-[0.78rem] text-muted-foreground">{s.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
