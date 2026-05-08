import { marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { codeToHtml } from "shiki";

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

// Shiki dual-theme config — `defaultColor: false` emits both palettes as CSS
// custom properties (--shiki-light / --shiki-dark) so we can drive the active
// one purely from the next-themes class on <html>. See app/globals.css.
const SHIKI_THEMES = {
  light: "github-light",
  dark: "github-dark-dimmed",
} as const;

async function highlightCode(code: string, lang: string): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang,
      themes: SHIKI_THEMES,
      defaultColor: false,
    });
  } catch {
    // Unknown language — render as plain text rather than crashing the build.
    return await codeToHtml(code, {
      lang: "text",
      themes: SHIKI_THEMES,
      defaultColor: false,
    });
  }
}

// ── Single-shot global marked configuration ─────────────────────────────────
// `marked.use()` mutates the global instance, so we run it exactly once at
// module load. Both /writing and /work pipelines import from here, so they
// get the same renderer and sanitizer regardless of which page renders first.
let _configured = false;

function configure() {
  if (_configured) return;
  _configured = true;

  marked.use({
    async: true,
    walkTokens: async (token) => {
      if (token.type !== "code") return;
      const lang = (token.lang || "").trim() || "text";
      const t = token as Tokens.Code;
      t.text = await highlightCode(t.text, lang);
      t.escaped = true;
    },
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
      // walkTokens replaced token.text with shiki-rendered HTML — pass it through.
      code(token: Tokens.Code) {
        return token.text;
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
    // Shiki tokenises every word as a <span>; allow-list it explicitly.
    "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "loading", "decoding"],
    pre: ["class", "style", "tabindex"],
    code: ["class", "style"],
    span: ["class", "style"],
  },
  // Shiki emits inline `style` containing CSS custom properties
  // (`--shiki-light`, `--shiki-dark`). sanitize-html's default style filter
  // would strip them. The markdown source is fully trusted (it lives in our
  // repo), so we disable style parsing entirely on this pipeline.
  parseStyleAttributes: false,
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
 * Parse markdown to safe HTML. Single entry point used by both /writing and /work.
 * Combines marked (with figure-image + shiki code renderers) and sanitize-html.
 */
export async function renderMarkdown(source: string): Promise<string> {
  configure();
  const rawHtml = (await marked.parse(source)) as string;
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}
