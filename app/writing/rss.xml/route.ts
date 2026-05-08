import { listNotes } from "@/lib/notes";
import { siteConfig } from "@/config/site";

// Static — the feed only changes when content changes (new build).
export const dynamic = "force-static";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const notes = listNotes().slice(0, 50);
  const baseUrl = siteConfig.baseUrl;
  const feedUrl = `${baseUrl}/writing/rss.xml`;
  const lastBuild = notes.length > 0 ? new Date(notes[0].date) : new Date();

  const items = notes
    .map((n) => {
      const url = `${baseUrl}/writing/${n.slug}`;
      const categories = (n.tags ?? [])
        .map((t) => `      <category>${escapeXml(t)}</category>`)
        .join("\n");
      return `    <item>
      <title>${escapeXml(n.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(n.date).toUTCString()}</pubDate>
      <description>${escapeXml(n.description)}</description>
${categories}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kishore Kumar Sharma — Writing</title>
    <link>${escapeXml(`${baseUrl}/writing`)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>Long-form notes on architecture, distributed systems, and the discipline behind production software.</description>
    <language>en</language>
    <copyright>© ${new Date().getFullYear()} Kishore Kumar Sharma</copyright>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
