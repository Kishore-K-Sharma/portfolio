import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

const EFFECTIVE_DATE = "May 8, 2026";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How this site handles the small amount of information you share with it. Plain language, short.",
  alternates: { canonical: `${siteConfig.baseUrl}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-32 pb-24">
      <div className="container-narrow">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          /privacy
        </p>
        <h1 className="font-display text-display-sm md:text-display text-foreground tracking-[-0.03em] leading-[1.02] text-balance">
          Privacy
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
            This is a personal portfolio and writing archive. It does not sell products, host
            accounts, or run user-generated content. The handling here is intentionally small.
          </p>

          <h2>What this site does</h2>
          <ul>
            <li>If you submit the contact form, your message is emailed to me. That&apos;s where it lives.</li>
            <li>The contact form is rate-limited and bot-protected. Counters expire within seconds to minutes; nothing is retained beyond that window.</li>
            <li>I use privacy-friendly, cookie-less analytics to count page views.</li>
            <li>I don&apos;t sell, rent, or share information with anyone for marketing.</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            The site stores your light/dark theme preference in your browser. No advertising,
            retargeting, or social-tracking cookies are set.
          </p>

          <h2>Your rights</h2>
          <p>
            You can ask me to access, correct, or delete anything you&apos;ve sent through the
            contact form. The fastest way is to reply to the email thread, or message me again
            via the form.
          </p>

          <h2>Changes</h2>
          <p>
            If this page changes meaningfully, the date above will move with it.
          </p>

          <h2>Contact</h2>
          <p>
            <Link href="/#contact">Use the contact form</Link>.
          </p>
        </div>

        <div className="mt-14 pt-6 border-t border-subtle/40 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to portfolio
          </Link>
          <Link
            href="/terms"
            className="font-mono text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            terms →
          </Link>
        </div>
      </div>
    </main>
  );
}
