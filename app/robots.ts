import type { MetadataRoute } from "next";
import { SITE_URL } from "~/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // OG images stay crawlable for social cards; JSON and auth do not.
        disallow: ["/api/*/prs", "/auth/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
