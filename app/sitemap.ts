import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "~/lib/supabase/anon";
import { SITE_URL } from "~/lib/site";

// Registered profiles only — the unregistered space is unbounded and those
// pages get discovered through links and social cards instead.
async function getProfileUsernames(): Promise<string[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("sitemap");
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("users")
    .select("github_username")
    .not("github_username", "is", null);
  if (error) {
    console.error("sitemap query failed:", error);
    throw error; // never cache a failed read
  }
  return (data ?? [])
    .map((row) => row.github_username as string)
    .filter(Boolean);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const usernames = await getProfileUsernames().catch(() => []);
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...usernames.map((username) => ({
      url: `${SITE_URL}/${username}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
