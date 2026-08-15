// Canonical origin for absolute URLs (metadata, sitemap, JSON-LD).
// The apex 308s to www, so www is the canonical host.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.myprs.dev";
