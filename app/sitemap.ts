import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { listNotes, listTags, tagSlug } from "@/lib/notes";
import { listWork } from "@/lib/work";

export default function sitemap(): MetadataRoute.Sitemap {
  const notes = listNotes();
  const work = listWork();
  const tags = listTags();
  const now = new Date();

  return [
    { url: siteConfig.baseUrl, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.baseUrl}/work`, lastModified: now, changeFrequency: "monthly", priority: 0.95 },
    { url: `${siteConfig.baseUrl}/writing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.baseUrl}/uses`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...work.map((w) => ({
      url: `${siteConfig.baseUrl}/work/${w.slug}`,
      lastModified: new Date(`${w.startDate}-01`),
      changeFrequency: "yearly" as const,
      priority: 0.85,
    })),
    ...notes.map((n) => ({
      url: `${siteConfig.baseUrl}/writing/${n.slug}`,
      lastModified: new Date(n.date),
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
    ...tags.map(({ tag }) => ({
      url: `${siteConfig.baseUrl}/writing/tag/${tagSlug(tag)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
