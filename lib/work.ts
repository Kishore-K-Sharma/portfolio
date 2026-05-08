import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import portfolioData from "@/data/portfolio.json";
import { renderMarkdown } from "./markdown";

export interface WorkFrontmatter {
  title: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  domain: "telecom" | "fintech" | "edtech" | "govtech";
  summary: string;
  /** Quantified outcomes — appear in the case-study header band. */
  outcomes: { label: string; value: string }[];
  /** Technologies — used for filter chips and site-wide search. */
  stack: string[];
  /** Optional cover image path (in /public). */
  cover?: string;
  draft?: boolean;
}

/** Frontmatter-only view — synchronous, used by listings / sitemap / OG. */
export interface WorkMeta extends WorkFrontmatter {
  slug: string;
}

/** Full case study — meta + raw markdown + rendered HTML. */
export interface WorkCase extends WorkMeta {
  raw: string;
  html: string;
}

const WORK_DIR = path.join(process.cwd(), "content", "work");

function readSource(slug: string): { fm: Partial<WorkFrontmatter>; content: string } | null {
  const mdPath = path.join(WORK_DIR, `${slug}.md`);
  const mdxPath = path.join(WORK_DIR, `${slug}.mdx`);
  const file = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  if (!file) return null;

  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  return { fm: parsed.data as Partial<WorkFrontmatter>, content: parsed.content };
}

function metaFrom(slug: string, fm: Partial<WorkFrontmatter>): WorkMeta | null {
  if (!fm.title || !fm.company || !fm.role || !fm.startDate || !fm.endDate || !fm.domain || !fm.summary) {
    return null;
  }
  return {
    slug,
    title: fm.title,
    company: fm.company,
    role: fm.role,
    startDate: fm.startDate,
    endDate: fm.endDate,
    domain: fm.domain,
    summary: fm.summary,
    outcomes: fm.outcomes ?? [],
    stack: fm.stack ?? [],
    cover: fm.cover,
    draft: fm.draft ?? false,
  };
}

export function loadWorkMeta(slug: string): WorkMeta | null {
  const r = readSource(slug);
  if (!r) return null;
  return metaFrom(slug, r.fm);
}

export async function loadWork(slug: string): Promise<WorkCase | null> {
  const r = readSource(slug);
  if (!r) return null;
  const meta = metaFrom(slug, r.fm);
  if (!meta) return null;
  const html = await renderMarkdown(r.content);
  return { ...meta, raw: r.content, html };
}

export function listWork({ includeDrafts = false } = {}): WorkMeta[] {
  if (!fs.existsSync(WORK_DIR)) return [];
  const files = fs.readdirSync(WORK_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  return files
    .map((file) => loadWorkMeta(file.replace(/\.(md|mdx)$/, "")))
    .filter((w): w is WorkMeta => !!w)
    .filter((w) => includeDrafts || !w.draft)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function listWorkSlugs(): string[] {
  return listWork().map((w) => w.slug);
}

/**
 * Heuristic: link a case-study slug to one of the experience entries
 * in portfolio.json so we can cross-reference dates / company info.
 */
export function findExperienceFor(work: WorkMeta) {
  return portfolioData.experience.find((e) =>
    e.company.toLowerCase().includes(work.company.toLowerCase().split(" ")[0])
  );
}
