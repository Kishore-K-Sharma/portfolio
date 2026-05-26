/**
 * Writing categories — the top-level groupings that drive the filter chips
 * on /writing. Source of truth for slug ↔ label mapping. Add a new entry here
 * to introduce a new section; existing posts default to "engineering".
 */
export const WRITING_CATEGORIES = [
  {
    slug: "engineering",
    label: "Engineering",
    description: "Architecture, distributed systems, the discipline behind production software.",
  },
  {
    slug: "career",
    label: "Career & Leadership",
    description: "Industry observations, career growth, mentoring, hiring, senior engineering.",
  },
  // {
  //   slug: "personal",
  //   label: "Personal & Opinion",
  //   description: "Life lessons, philosophy, takes that aren't strictly technical.",
  // },
  // {
  //   slug: "reviews",
  //   label: "Reviews",
  //   description: "Books, tools, products, courses — short or long-form.",
  // },
  // {
  //   slug: "logs",
  //   label: "Notes & Logs",
  //   description: "Shorter reading notes, learning logs, quick takes — lower bar than full articles.",
  // },
] as const;

export type CategorySlug = (typeof WRITING_CATEGORIES)[number]["slug"];

export const DEFAULT_CATEGORY: CategorySlug = "engineering";

const KNOWN: ReadonlySet<string> = new Set(WRITING_CATEGORIES.map((c) => c.slug));

/** Coerce an unknown frontmatter value into a valid category slug. */
export function normalizeCategory(value: unknown): CategorySlug {
  return typeof value === "string" && KNOWN.has(value) ? (value as CategorySlug) : DEFAULT_CATEGORY;
}

/** Lookup label by slug, or the slug itself if unknown. */
export function categoryLabel(slug: string): string {
  return WRITING_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
