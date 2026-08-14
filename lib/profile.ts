import { cache } from "react";
import { createClient } from "~/lib/supabase/server";
import {
  getAllMergedPRs,
  getFirstMergedYear,
  getGitHubUserData,
} from "~/lib/github";
import type { GithubUser, ProfilePR } from "~/types/shared";

/**
 * Loads everything needed to render a profile: the owner's curation row, the
 * GitHub profile, and the complete merged-PR history (search API caps at
 * 1000) partitioned into featured / non-featured after applying excluded
 * repos. Metadata (repo list, counts, "since") is exact from the first
 * render; the client windows the list for rendering, not for data.
 *
 * Wrapped in React `cache()` so `generateMetadata` and the page component
 * share a single execution per request.
 */
export const getProfileData = cache(async (username: string) => {
  const supabase = await createClient();
  const { data: rows, error: rowError } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", username);
  if (rowError) console.error(rowError);

  const row = rows?.[0];
  const excludedGitHubRepos: string[] = row?.excluded_github_repos ?? [];
  const featuredGithubPRIds: string[] = row?.featured_github_prs ?? [];

  const [ghResponse, userResponse, sinceYear] = await Promise.all([
    getAllMergedPRs(username),
    getGitHubUserData(username),
    // Exact first-merged-PR year even past the search API's 1000-result cap.
    getFirstMergedYear(username),
  ]);

  const ghData = ghResponse.data;
  const userData = userResponse.data as GithubUser | null;

  // Distinguish "no such user" (404) from a transient failure (rate-limit,
  // network, timeout) so the page can show the right message.
  const notFound = userResponse.status === 404;
  const loadError =
    (Boolean(userResponse.error) && userResponse.status !== 404) ||
    (Boolean(ghResponse.error) && ghResponse.status !== 404);

  let items: ProfilePR[] = [];
  let featuredPRs: ProfilePR[] = [];
  let nonFeaturedPRs: ProfilePR[] = [];

  if (ghData?.items?.length) {
    items = ghData.items
      .map((item) => ({
        id: item.id,
        title: item.title,
        html_url: item.html_url,
        repo: item.repository_url.slice(29),
        merged_at: item.pull_request.merged_at,
        reactions_count: item.reactions.total_count,
        comments: item.comments,
      }))
      .filter((item) => !excludedGitHubRepos.includes(item.repo));
    featuredPRs = items.filter((item) =>
      featuredGithubPRIds.includes(item.id.toString())
    );
    nonFeaturedPRs = items.filter(
      (item) => !featuredGithubPRIds.includes(item.id.toString())
    );
  }

  return {
    ownerRowId: row?.id as string | undefined,
    userData,
    notFound,
    loadError,
    totalCount: ghData?.total_count ?? 0,
    sinceYear,
    items,
    featuredPRs,
    nonFeaturedPRs,
    excludedGitHubRepos,
    featuredGithubPRIds,
  };
});
