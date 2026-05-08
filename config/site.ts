/**
 * Site-wide configuration.
 * Set BASE_URL and GA_MEASUREMENT_ID in your .env.local (dev) or Vercel dashboard (prod).
 * Fallbacks are used so the build never fails if env vars are missing.
 */

// GA4 measurement IDs match `G-` followed by alphanumerics. Anything else is
// rejected so the env value can never be coerced into script content.
const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

const rawGaId = process.env.GA_MEASUREMENT_ID ?? "";

export const siteConfig = {
  baseUrl: process.env.BASE_URL ?? "https://kishore-kumar-sharma.dev",
  /** Validated GA4 measurement ID, or null if unset / malformed. */
  gaMeasurementId: GA_ID_PATTERN.test(rawGaId) ? rawGaId : null,
};
