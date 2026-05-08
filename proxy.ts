import { NextResponse, type NextRequest } from "next/server";

// Per-request nonce + Content-Security-Policy.
//
// `'strict-dynamic'` lets nonce-tagged inline scripts load further scripts
// (Next.js bundle, GA, Turnstile). Modern browsers ignore the host allowlist
// once `'strict-dynamic'` is honored; the host list + `'unsafe-inline'` are
// kept as a fallback for older browsers that don't understand it.
//
// Reading the nonce in a server component (via headers()) forces dynamic
// rendering on pages that consume it — the layout does, so all pages SSR.
// Static OG / sitemap routes are excluded from this matcher.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    `default-src 'self'`,
    // Nonce + strict-dynamic + GA + Turnstile + (dev: eval for HMR + RSC).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https: ${
      isDev ? "'unsafe-eval'" : ""
    }`,
    // `'unsafe-inline'` is required here: Next.js injects critical/inline CSS
    // without nonce support, and Tailwind's runtime style insertions can't be
    // nonce-tagged either. Trade-off accepted — script-src is still strict, so
    // an XSS payload can't pivot to script execution via injected styles.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com`,
    `font-src 'self' data:`,
    `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://challenges.cloudflare.com`,
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|opengraph-image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|jpg|jpeg|png|webp|avif|gif|ico|woff2?|ttf|otf)).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
