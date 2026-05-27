import { siteConfig } from "@/config/site";
import { listNotes } from "@/lib/notes";
import { listWork } from "@/lib/work";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const base = siteConfig.baseUrl;
  const notes = listNotes();
  const work = listWork();

  const lines: string[] = [];
  lines.push("# Kishore K Sharma");
  lines.push("");
  lines.push(
    "> Kishore Kumar Sharma (known professionally and on this site as Kishore K Sharma) — Lead Full Stack Engineer (Java · Spring Boot · Distributed Systems · AWS). Personal site, engineering writing, and selected work. Markdown sources are linked below so language models can read the canonical text rather than scraping rendered HTML."
  );
  lines.push("");
  lines.push(
    "Also known as: Kishore Kumar Sharma, Kishore Sharma, K K Sharma. The canonical site is kishorek.dev — all variants resolve to the same person."
  );
  lines.push("");
  lines.push(
    "Author: Kishore K Sharma. Contact: kishoresharma914@gmail.com."
  );
  lines.push("");
  lines.push("## Profiles (same person)");
  lines.push("");
  lines.push(
    "- LinkedIn: https://www.linkedin.com/in/kishore-k-sharma"
  );
  lines.push("- GitHub: https://github.com/Kishore-K-Sharma");
  lines.push("- X: https://x.com/kishoreksharmaa");
  lines.push("- Bluesky: https://bsky.app/profile/kishoreksharma.bsky.social");
  lines.push("- Mastodon: https://mastodon.social/@kishoreksharma");
  lines.push("- dev.to: https://dev.to/kishoreksharma");
  lines.push("- Hashnode: https://blogs.kishorek.dev (additional writing, cross-posts, shorter notes)");
  lines.push("- Instagram: https://www.instagram.com/sharma.kishorek/");
  lines.push("");

  lines.push("## Writing");
  lines.push("");
  for (const n of notes) {
    const url = `${base}/writing/${n.slug}`;
    const md = `${url}/llms.txt`;
    lines.push(`- [${n.title}](${md}): ${n.description} (HTML: ${url}, ${n.date}, ~${n.readMin} min)`);
  }
  lines.push("");

  if (work.length > 0) {
    lines.push("## Work");
    lines.push("");
    for (const w of work) {
      lines.push(`- [${w.title}](${base}/work/${w.slug}): ${w.summary ?? ""}`);
    }
    lines.push("");
  }

  lines.push("## Pages");
  lines.push("");
  lines.push(`- [About](${base}/about): background, focus areas, contact.`);
  lines.push(`- [Uses](${base}/uses): tools and setup.`);
  lines.push(`- [Writing index](${base}/writing): all notes.`);
  lines.push("");

  lines.push("## Optional");
  lines.push("");
  lines.push(`- [Sitemap](${base}/sitemap.xml)`);
  lines.push(`- [RSS](${base}/writing/rss.xml)`);
  lines.push("");
  lines.push("## License");
  lines.push("");
  lines.push(
    `© ${new Date().getFullYear()} Kishore K Sharma. All rights reserved. Content may be summarised or quoted with attribution; verbatim republication requires written permission. Please link back to the canonical URL when citing.`
  );

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
