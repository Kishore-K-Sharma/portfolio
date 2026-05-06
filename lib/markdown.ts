import { marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";

// ── URL scheme allowlist for image src ───────────────────────────────────────
// http(s), protocol-relative ("//host"), and same-host-relative ("/path") are OK.
// Anything else (javascript:, data:, etc.) is dropped to "#".
const SAFE_IMG_SCHEME = /^(https?:\/\/|\/\/?|#)/i;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Single-shot global marked configuration ─────────────────────────────────
// `marked.use()` mutates the global instance, so we run it exactly once at
// module load. Both /notes and /work pipelines import from here, so they get
// the same renderer and sanitizer regardless of which page renders first.
let _configured = false;

function configure() {
  if (_configured) return;
  _configured = true;

  marked.use({
    renderer: {
      // Render images as <figure> blocks: lazy-loaded, async-decoded,
      // optional caption from markdown title syntax: ![alt](src "caption").
      // Values are escaped; src scheme is allowlisted.
      image(token: Tokens.Image) {
        const { href, title, text } = token;
        const safeHref = SAFE_IMG_SCHEME.test(href) ? escapeAttr(href) : "#";
        const safeAlt = escapeAttr(text ?? "");
        const captionHtml = title ? `<figcaption>${escapeText(title)}</figcaption>` : "";
        return `<figure><img src="${safeHref}" alt="${safeAlt}" loading="lazy" decoding="async" />${captionHtml}</figure>`;
      },
    },
  });
}

// ── Sanitization config — shared by both pipelines ──────────────────────────
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "blockquote", "ul", "ol", "li",
    "strong", "em", "code", "pre", "hr", "br",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "loading", "decoding"],
    code: ["class"],
    pre: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: true,
  transformTags: {
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target === "_blank") out.rel = "noopener noreferrer";
      return { tagName, attribs: out };
    },
  },
};

/**
 * Parse markdown to safe HTML. Single entry point used by both /notes and /work.
 * Combines marked (with the figure-image renderer) and sanitize-html (allowlist).
 */
export function renderMarkdown(source: string): string {
  configure();
  const rawHtml = marked.parse(source, { async: false }) as string;
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}
