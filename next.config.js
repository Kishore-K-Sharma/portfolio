/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // 301 redirects from the old /notes paths to the new /writing paths.
    // Preserves SEO equity for any indexed URLs (GSC, backlinks, social shares).
    // Article assets (the SVG diagrams) used to live under /public/notes/* but
    // were moved to /public/writing/* — redirects fire BEFORE static-file
    // resolution, so leaving them under /notes/ caused 404s for image refs.
    // Any old /notes/foo.svg URL still resolves: redirect → /writing/foo.svg.
    return [
      { source: '/notes', destination: '/writing', permanent: true },
      { source: '/notes/:path*', destination: '/writing/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
