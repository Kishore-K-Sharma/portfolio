import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

const EFFECTIVE_DATE = "May 8, 2026";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms of use for this site. The content is mine; you can read, link, and quote with attribution. Code samples are MIT-licensed unless stated otherwise.",
  alternates: { canonical: `${siteConfig.baseUrl}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-32 pb-24">
      <div className="container-narrow">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          /terms
        </p>
        <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
          Terms
        </h1>
        <p className="mt-3 font-mono text-[0.78rem] text-muted-foreground">
          Effective {EFFECTIVE_DATE}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none mt-10
                        prose-headings:font-display prose-headings:tracking-[-0.02em]
                        prose-h2:text-heading prose-h2:mt-12 prose-h2:mb-4
                        prose-p:text-foreground/90 prose-p:leading-[1.7]
                        prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                        prose-li:text-foreground/90 prose-li:leading-[1.7]">
          <p className="lead">
            By using this site, you agree to the terms below. They&apos;re short on purpose.
          </p>

          <h2>Content</h2>
          <p>
            All written content — case studies, articles, diagrams, copy — is © Kishore Kumar
            Sharma. You can read it, link to it, and quote it with attribution. Please don&apos;t
            republish it as your own.
          </p>

          <h2>Code samples</h2>
          <p>
            Code blocks inside articles are illustrations, not packages. Unless an article says
            otherwise, you may use them under the{" "}
            <a href="https://opensource.org/license/mit/" target="_blank" rel="noopener noreferrer">
              MIT License
            </a>
            : do what you want, keep the copyright line in any redistribution. Provided as is,
            with no warranty.
          </p>

          <h2>Acceptable use</h2>
          <p>Don&apos;t use the contact form for spam or anything illegal, and don&apos;t try to circumvent the security controls.</p>

          <h2>No advice</h2>
          <p>
            Articles are engineering opinions, not legal, security, financial, or medical
            advice. Test before you ship.
          </p>

          <h2>Liability</h2>
          <p>
            To the maximum extent permitted by law, the site and its contents are provided as
            is, with no warranties, and I&apos;m not liable for indirect or consequential
            damages.
          </p>

          <h2>Changes</h2>
          <p>
            If these terms change meaningfully, the date above will move with it.
          </p>

          <h2>Contact</h2>
          <p>
            <Link href="/#contact">Use the contact form</Link>.
          </p>
        </div>

        <div className="mt-14 pt-6 border-t border-subtle/40 flex items-center justify-between">
          <Link
            href="/privacy"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← privacy
          </Link>
          <Link
            href="/"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            back to portfolio →
          </Link>
        </div>
      </div>
    </main>
  );
}
