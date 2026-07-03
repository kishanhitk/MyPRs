import { cache } from "react";
import { createClient } from "~/lib/supabase/server";
import { getGitHubUserData, getPRsFromGithubAPI } from "~/lib/github";
import type { GitHubIssue, GithubUser } from "~/types/shared";

/**
 * Loads everything needed to render a profile: the owner's curation row, the
 * GitHub profile, and the merged PRs partitioned into featured / non-featured
 * (after applying excluded repos). Viewer-independent.
 *
 * Wrapped in React `cache()` so `generateMetadata` and the page component share
 * a single execution per request.
 */
export const getProfileData = cache(async (username: string) => {
  const supabase = createClient();
  const { data: rows, error: rowError } = await supabase
    .from("users")
    .select("*")
    .eq("github_username", username);
  if (rowError) console.error(rowError);

  const row = rows?.[0];
  const excludedGitHubRepos: string[] = row?.excluded_github_repos ?? [];
  const featuredGithubPRIds: string[] = row?.featured_github_prs ?? [];

  const [ghResponse, userResponse] = await Promise.all([
    getPRsFromGithubAPI({ author: username, limit: 100 }),
    getGitHubUserData(username),
  ]);

  const ghData = ghResponse.data;
  const userData = userResponse.data as GithubUser | null;

  let items: GitHubIssue[] = [];
  let featuredPRs: GitHubIssue[] = [];
  let nonFeaturedPRs: GitHubIssue[] = [];

  if (ghData?.items?.length) {
    items = ghData.items.filter(
      (item) => !excludedGitHubRepos.includes(item.repository_url.slice(29))
    );
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
    hasGhData: Boolean(ghData),
    items,
    featuredPRs,
    nonFeaturedPRs,
    excludedGitHubRepos,
    featuredGithubPRIds,
  };
});
