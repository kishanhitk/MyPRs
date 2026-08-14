"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";
import { getPRsFromGithubAPI } from "~/lib/github";

/**
 * Fetch the next page of merged PRs for lazy loading. Applies the owner's
 * excluded repos and drops already-featured PRs server-side, so the client
 * can append the result as-is. Search API pages are capped at 10 (1000 results).
 */
export async function loadMorePRsAction(input: {
  username: string;
  page: number;
}) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("users")
    .select("excluded_github_repos, featured_github_prs")
    .eq("github_username", input.username);
  const row = rows?.[0];
  const excluded: string[] = row?.excluded_github_repos ?? [];
  const featured: string[] = row?.featured_github_prs ?? [];

  const res = await getPRsFromGithubAPI({
    author: input.username,
    limit: 100,
    page: input.page,
  });
  if (res.error || !res.data) {
    return { error: "Couldn't load more PRs", items: [], hasMore: false };
  }

  const items = res.data.items.filter(
    (item) =>
      !excluded.includes(item.repository_url.slice(29)) &&
      !featured.includes(item.id.toString())
  );
  const hasMore =
    res.data.items.length === 100 &&
    input.page < 10 &&
    input.page * 100 < res.data.total_count;

  return { error: null, items, hasMore };
}

/**
 * Toggle a PR's "featured" status for the signed-in owner.
 * Re-auth is enforced server-side; UI gating is not trusted.
 */
export async function toggleFeaturedAction(input: {
  prId: string;
  username: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to do that" };

  // Read the current list from the DB (not a client-supplied snapshot) so
  // concurrent toggles from multiple tabs don't clobber each other.
  const { data: row, error: readError } = await supabase
    .from("users")
    .select("featured_github_prs")
    .eq("id", user.id)
    .single();
  if (readError) {
    console.error(readError);
    return { error: readError.message };
  }

  const current: string[] = row?.featured_github_prs ?? [];
  const updated = current.includes(input.prId)
    ? current.filter((id) => id !== input.prId)
    : [...current, input.prId];

  const { error } = await supabase
    .from("users")
    .update({ featured_github_prs: updated })
    .eq("id", user.id);
  if (error) console.error(error);

  revalidatePath(`/${input.username}`);
  return { error: error?.message ?? null };
}

/**
 * Persist the owner's excluded repositories.
 */
export async function saveExcludedReposAction(input: {
  reposToExclude: string[];
  username: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to do that" };

  const { error } = await supabase
    .from("users")
    .update({ excluded_github_repos: input.reposToExclude })
    .eq("id", user.id);
  if (error) console.error(error);

  revalidatePath(`/${input.username}`);
  return { error: error?.message ?? null };
}
