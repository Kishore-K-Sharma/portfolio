# Portfolio Boost — Design Spec

**Date:** 2026-07-10
**Goal:** Raise the portfolio's traffic, conversion, performance, and polish without a rebuild. The site is already technically strong (JSON-LD @graph, OG images, RSS, sitemap w/ images, llms.txt, next/image everywhere, semantic HTML). This spec fixes concentrated leaks, ranked by ROI.

**Scope approved:** Tiers 1–4 implement now. Tier 5 (visual polish) is a follow-up requiring a design-direction pass with reference URLs.

---

## Tier 1 — Credibility (highest ROI)

### 1.1 Quantify case-study outcomes (safe ranges)
Two case studies use vague values that contradict the site's own line *"if it doesn't move a metric I don't ship it."* Replace with defensible relative/ranged figures the user stands behind. **User approves exact figures before merge.**

`content/work/fintech-crm-loan-modernization.md` — proposed:
| Current | Proposed (safe range) |
|---|---|
| Manual effort: "Major reduction" | "~60% less manual processing" |
| Loan approval time: "Materially shorter" | "Approval cycle ~40% faster" |
| Deploy efficiency: "Significant lift" | "Manual → many deploys/day" (keep qualitative — it's a cadence, not a %) |
| B2B/B2C apps shipped: "Multiple" | "4 apps shipped" |

`content/work/realtime-tutoring-platform.md` — proposed:
| Current | Proposed |
|---|---|
| Live concurrent classrooms: "Significant scale" | "Hundreds of concurrent classrooms" (or exact if known) |
| Session start time: "Sub-second p50" | keep — already concrete |

`college-automation-platform.md` already has hard numbers (+80%). No change.

Also propagate the numbers into the prose `## What I shipped` bullets so body matches the outcome chips.

### 1.2 Low-friction contact paths
`components/sections/Contact.tsx` — add above/beside the form:
- Clickable `mailto:` (email already exists in JSON-LD, just not on-page).
- Résumé/CV download button (link to a PDF in `/public` — **user provides the PDF**, or we generate a print stylesheet later).
- Optional calendar/booking link if the user has one (Cal.com / Calendly). Skip if none.

### 1.3 Name + role in hero
`components/sections/Hero.tsx` — the H1 stays the tagline for impact, but add a visible, crawlable name+role line in the hero (e.g. an eyebrow above or a subhead: "Kishore K Sharma · Lead Full Stack Engineer"). Reinforces on-page entity + passes the <30s test.

---

## Tier 2 — SEO latent wins (no visual change)

### 2.1 Cross-link writing ↔ work (topic clusters)
49 posts and 3 case studies never link to each other. Add:
- Related-posts / related-work blocks driven by shared `tags`/`domain`.
- On each case study, link to 2–3 posts on the same domain (e.g. fintech case → RAG/distributed-systems posts).
- On relevant posts, a "See this in production →" link to the matching case study.
- Implementation: a small `lib/related.ts` that maps by tag/domain overlap; render blocks in `app/writing/[slug]/page.tsx` and `app/work/[slug]/page.tsx`.

### 2.2 Fix work structured data
`app/work/[slug]/page.tsx`:
- Emit `outcomes` into JSON-LD (as `Article` `about`/`mentions` or a `Dataset`-style property — pick the cleanest schema.org fit).
- Add `BreadcrumbList` (writing pages already have it; work pages don't).
- Add `keywords` + `authors`/`creator` to work-detail metadata (blog posts already have them).

### 2.3 Freshness signal
`dateModified` currently always equals `datePublished`. Add an optional `updated` frontmatter field; when present, emit as `dateModified`. Backfill is optional — only set where a post was genuinely revised.

### 2.4 Surface native writing on homepage
`components/sections/ProofGrid.tsx` currently pulls `portfolioData.articles` (1 external item). Switch the "Writing" block to pull the latest N native posts from `content/notes/`.

---

## Tier 3 — Performance

### 3.1 Server-componentize static sections
`Manifesto.tsx`, `Capability.tsx`, `Education.tsx`, `ProofGrid.tsx` are `"use client"` only to use `Reveal`. Move them to server components; keep animation by wrapping only the animated leaf in a small client `Reveal`, or use a CSS-only reveal (IntersectionObserver-free) for static text.

### 3.2 Lighten Reveal / framer-motion
- `Reveal` wraps nearly every text node → hundreds of IntersectionObservers. Replace with a single CSS `@keyframes` + `animation-timeline: view()` (progressive enhancement) or one shared observer, and reserve framer-motion for genuinely interactive motion (hero parallax, command palette).
- framer-motion loads on every route via always-mounted Nav/FloatingActions/CommandPalette. Audit whether these need full framer-motion or can use CSS/`motion` lazy import.

### 3.3 Dead code / asset cleanup
- Remove unused `/public` starter SVGs (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) and unreferenced `Kishore.jpg` (108KB).
- Remove phantom `data-cursor-label` attrs (5 uses, no handler exists).
- Cap `Modal.tsx` cert image `quality={100}` to ~80.
- Consolidate the two `window` scroll listeners (Navigation + FloatingActions) into one shared source.

---

## Tier 4 — Accessibility

`components/sections/Contact.tsx`:
- Associate errors with inputs: `aria-invalid`, `aria-describedby`, `role="alert"` on the error node.
- Reconsider `noValidate` — keep server validation but allow native hints.

Global:
- Add a `:focus-visible` ring in `globals.css` (inputs currently use `outline-none` + border color only).
- Add a focus trap to the mobile nav drawer in `Navigation.tsx` (Modal.tsx already has a correct one — reuse the pattern).
- Complete the testimonial tablist (`role="tabpanel"`, `aria-controls`) in `TestimonialBand.tsx`.
- Fix About heading order (h1 → h3 skip; insert h2 or demote).
- Verify dark-mode domain-hue label contrast (small 0.7rem uppercase mono) meets AA.

---

## Tier 5 — Visual polish (FOLLOW-UP, not this pass)
Needs a design-direction conversation with 2–3 reference URLs before any change (per user's own working rule). Deferred. Will spec separately once direction is chosen.

---

## Sequencing / testing
1. Tier 1 + 2 are content/metadata — low risk, ship first. Verify: `next build` clean, view homepage + one work page + one post, confirm cross-links render and JSON-LD validates (Rich Results test).
2. Tier 3 perf — verify no visual regression on each converted section; check bundle size before/after (`next build` output).
3. Tier 4 a11y — verify with keyboard nav + a screen-reader smoke test on the contact form.
4. After each build verification: `rm -rf .next/` before handing back (prod artifacts break `next dev`).

## Out of scope
- Full visual redesign (Tier 5, separate).
- New blog content (library already strong at 49 posts).
- Backend/infra changes.
