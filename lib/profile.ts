import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "~/lib/supabase/anon";
import {
  getContributionCalendar,
  getDeepRepoNames,
  getGitHubUserData,
  searchMergedPRs,
  type PRPageResult,
} from "~/lib/github";
import type { GithubUser, ProfilePR } from "~/types/shared";

// Curated profiles may feature PRs deeper than page 1; walk until every
// featured URL resolves. Bounded by search's own 1000-result ceiling.
const MAX_FEATURED_WALK_PAGES = 10;

/**
 * Loads everything needed to render a profile: the owner's curation row, the
 * GitHub profile, and the first page (100) of merged PRs — one GraphQL
 * request including the exact "since" year. Deeper pages stream to the
 * client through /api/[username]/prs as the visitor scrolls; only profiles
 * whose featured PRs sit past page 1 fetch further pages server-side.
 *
 * Wrapped in React `cache()` so `generateMetadata` and the page component
 * share a single execution per request.
 */
// Curation is public data (it shapes the page every visitor sees) read
// through the cookie-free client so it can live in the static shell. The
// curation server actions revalidate this tag, so an owner's edit purges
// the shell immediately.
async function getCurationRow(username: string) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(`curation-${username}`);
  const supabase = createAnonClient();
  const { data: rows, error } = await supabase
    .from("users")
    .select("id, github_username, excluded_github_repos, featured_github_prs")
    .eq("github_username", username);
  if (error) {
    console.error(error);
    throw error; // never cache a failed read
  }
  return rows?.[0] ?? null;
}

export const getProfileData = cache(async (username: string) => {
  const row = await getCurationRow(username).catch(() => null);
  const excludedGitHubRepos: string[] = row?.excluded_github_repos ?? [];
  // PR URLs (https://github.com/owner/repo/pull/N) — the one id both the
  // GraphQL and REST engines agree on.
  const featuredPRUrls: string[] = row?.featured_github_prs ?? [];

  const [firstPage, userResponse, contributionCalendar] = await Promise.all([
    searchMergedPRs(username),
    getGitHubUserData(username),
    getContributionCalendar(username),
  ]);

  const userData = userResponse.data as GithubUser | null;

  // Exact repo list without loading full PR pages (one skinny aliased
  // request, ~1 point). Null = unknown; the client falls back to a floor.
  let repoNames: string[] | null = null;
  if (!firstPage.error) {
    const page1Repos = firstPage.items.map((i) => i.repo);
    if (firstPage.hasNext) {
      const deep = await getDeepRepoNames(username, firstPage.totalCount);
      repoNames = deep ? [...new Set([...page1Repos, ...deep])] : null;
    } else {
      repoNames = [...new Set(page1Repos)];
    }
  }

  let page: PRPageResult = firstPage;
  let loaded: ProfilePR[] = firstPage.items;
  if (featuredPRUrls.length) {
    const resolved = new Set(loaded.map((i) => i.html_url));
    let walked = 1;
    while (
      page.hasNext &&
      page.endCursor &&
      walked < MAX_FEATURED_WALK_PAGES &&
      !featuredPRUrls.every((url) => resolved.has(url))
    ) {
      // A transient failure must not clobber the last good cursor — the
      // client resumes deep-loading from wherever the walk stopped.
      const next = await searchMergedPRs(username, page.endCursor);
      if (next.error) break;
      page = next;
      loaded = [...loaded, ...page.items];
      page.items.forEach((i) => resolved.add(i.html_url));
      walked += 1;
    }
  }

  // Distinguish "no such user" (404) from a transient failure (rate-limit,
  // network, timeout) so the page can show the right message. A search
  // failure with a healthy user is degraded, not dead: identity and the
  // contribution graph still render while the PR list retries client-side.
  const notFound = userResponse.status === 404;
  const searchFailed = Boolean(firstPage.error);
  const loadError = Boolean(userResponse.error) && userResponse.status !== 404;
  const prsDegraded = !loadError && !notFound && searchFailed;
  const errorReason =
    loadError || prsDegraded
      ? (firstPage.reason ?? userResponse.reason ?? "error")
      : undefined;

  const items = loaded.filter(
    (item) => !excludedGitHubRepos.includes(item.repo)
  );
  const featuredPRs = items
    .filter((item) => featuredPRUrls.includes(item.html_url))
    .sort(
      (a, b) =>
        featuredPRUrls.indexOf(a.html_url) - featuredPRUrls.indexOf(b.html_url)
    );
  const nonFeaturedPRs = items.filter(
    (item) => !featuredPRUrls.includes(item.html_url)
  );

  return {
    ownerRowId: row?.id as string | undefined,
    userData,
    notFound,
    loadError,
    prsDegraded,
    errorReason,
    totalCount: firstPage.totalCount,
    sinceYear: firstPage.sinceYear,
    contributionCalendar,
    items,
    featuredPRs,
    nonFeaturedPRs,
    // Where the client resumes loading deeper pages.
    endCursor: page.endCursor,
    hasNext: page.hasNext,
    repoNames,
    excludedGitHubRepos,
    featuredPRUrls,
  };
});
