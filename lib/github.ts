import { unstable_cache } from "next/cache";
import type {
  GitHubIssuesResponse,
  GitHubUser,
  ProfilePR,
} from "~/types/shared";
import {
  type GithubFailureReason,
  reportGithubFailure,
} from "~/lib/observability";

// A GitHub token lifts the unauthenticated 60 req/hr limit to 5000 req/hr.
// Optional: unauthenticated requests still work, just rate-limited.
function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json;charset=UTF-8",
    "User-Agent": "request",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export interface PRFilter {
  startDate?: Date;
  endDate?: Date;
  includedRepos?: string[];
  excludedRepos?: string[];
  includedOrgs?: string[];
  excludedOrgs?: string[];
  author: string;
  limit?: number;
  page?: number;
  order?: "asc" | "desc";
  /** Call-site label for failure reporting, e.g. "history" | "since-year". */
  tag?: string;
}

export const getPRsFromGithubAPI = async (filter: PRFilter) => {
  let queryParts: string[] = [];

  const limit = filter.limit || 30;

  if (filter.includedRepos && filter.includedRepos.length > 0) {
    const includedReposParam = filter.includedRepos
      .map((repo) => `repo:${repo}`)
      .join("+");
    queryParts.push(includedReposParam);
  }

  if (filter.excludedRepos && filter.excludedRepos.length > 0) {
    const excludedReposParam = filter.excludedRepos
      .map((repo) => `-repo:${repo}`)
      .join("+");
    queryParts.push(excludedReposParam);
  }

  if (filter.includedOrgs && filter.includedOrgs.length > 0) {
    const includedOrgsParam = filter.includedOrgs
      .map((org) => `org:${org}`)
      .join("+");
    queryParts.push(includedOrgsParam);
  }

  if (filter.excludedOrgs && filter.excludedOrgs.length > 0) {
    const excludedOrgsParam = filter.excludedOrgs
      .map((org) => `-org:${org}`)
      .join("+");
    queryParts.push(excludedOrgsParam);
  }

  const authorParam = `author:${filter.author}`;
  queryParts.push(authorParam);

  // Only constrain by date when the caller asks for it — the default is the
  // full contribution history (previously a silent 3-year window).
  if (filter.startDate || filter.endDate) {
    const start = filter.startDate ?? new Date("2008-01-01");
    const end = filter.endDate ?? new Date();
    queryParts.push(`created:${start.toISOString()}..${end.toISOString()}`);
  }

  queryParts.push("type:pr");
  queryParts.push("is:public");
  queryParts.push("is:merged");

  const url = `https://api.github.com/search/issues?q=${queryParts.join(
    "+"
  )}&per_page=${limit}&page=${filter.page ?? 1}&sort=created&order=${
    filter.order ?? "desc"
  }`;
  const init = {
    headers: githubHeaders(),
    // Cache on the Next data layer, replacing the old CDN self-fetch contract.
    next: { revalidate: 3600 },
    // Bound the request so a hanging GitHub response can't stall the render.
    signal: AbortSignal.timeout(8000),
  };

  const source = `search:${filter.tag ?? "adhoc"}:p${filter.page ?? 1}`;
  try {
    const response = await fetch(url, init);
    const data = await response.json();
    if (!response.ok || data.message) {
      const reason = reportGithubFailure({
        source,
        status: response.status,
        message: data.message,
        headers: response.headers,
      });
      return {
        data: null,
        error: new Error(data.message ?? `GitHub HTTP ${response.status}`),
        status: response.status,
        reason,
      };
    }
    return { data, error: null, status: response.status } as {
      data: GitHubIssuesResponse;
      error: null;
      status: number;
      reason?: GithubFailureReason;
    };
  } catch (error) {
    const reason = reportGithubFailure({
      source,
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    });
    return { data: null, error, status: 0, reason };
  }
};

/**
 * One page of an author's merged-PR history, oldest-visible-first cursor.
 * GraphQL is the primary engine: the search bills GraphQL points (5000/hr)
 * instead of REST search's 30 req/min, and the first page batches the
 * since-year probe into the same request (~1 point total). REST search
 * remains the tokenless fallback, with cursors encoded as "p:<page>".
 */
export interface PRPage {
  items: ProfilePR[];
  totalCount: number;
  endCursor: string | null;
  hasNext: boolean;
  /** Exact first-merged year; resolved on first pages only. */
  sinceYear: number | null;
}

export type PRPageResult = PRPage & {
  error: unknown | null;
  reason?: GithubFailureReason;
};

const EMPTY_PAGE: PRPage = {
  items: [],
  totalCount: 0,
  endCursor: null,
  hasNext: false,
  sinceYear: null,
};

class GithubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rateLimitRemaining: string | null,
    public readonly rateLimitReset: string | null,
    public readonly retryAfter: string | null
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

const PR_NODE_FIELDS = `... on PullRequest {
  databaseId
  title
  url
  mergedAt
  comments { totalCount }
  reactions { totalCount }
  repository { nameWithOwner }
}`;

interface GraphQLPRNode {
  databaseId: number;
  title: string;
  url: string;
  mergedAt: string;
  comments: { totalCount: number };
  reactions: { totalCount: number };
  repository: { nameWithOwner: string };
}

function nodeToProfilePR(node: GraphQLPRNode): ProfilePR {
  return {
    id: node.databaseId,
    title: node.title,
    html_url: node.url,
    repo: node.repository.nameWithOwner,
    merged_at: node.mergedAt,
    reactions_count: node.reactions.totalCount,
    comments: node.comments.totalCount,
  };
}

// Throws GithubApiError so unstable_cache never caches a failed page.
async function rawGraphQLSearchPage(
  author: string,
  cursor: string | null
): Promise<PRPage> {
  const q = `author:${author} type:pr is:public is:merged sort:created-desc`;
  const probeQ = `author:${author} type:pr is:public is:merged sort:created-asc`;
  const firstPage = cursor === null;

  const query = firstPage
    ? `query($q: String!, $probeQ: String!) {
        search(query: $q, type: ISSUE, first: 100) {
          issueCount
          pageInfo { endCursor hasNextPage }
          nodes { ${PR_NODE_FIELDS} }
        }
        probe: search(query: $probeQ, type: ISSUE, first: 1) {
          nodes { ... on PullRequest { mergedAt } }
        }
      }`
    : `query($q: String!, $cursor: String!) {
        search(query: $q, type: ISSUE, first: 100, after: $cursor) {
          issueCount
          pageInfo { endCursor hasNextPage }
          nodes { ${PR_NODE_FIELDS} }
        }
      }`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({
      query,
      variables: firstPage ? { q, probeQ } : { q, cursor },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = await response.json();
  const search = json?.data?.search;
  if (!response.ok || json.errors || !search) {
    throw new GithubApiError(
      json?.errors?.[0]?.message ?? json?.message ?? `GitHub HTTP ${response.status}`,
      response.status,
      response.headers.get("x-ratelimit-remaining"),
      response.headers.get("x-ratelimit-reset"),
      response.headers.get("retry-after")
    );
  }

  const probeMergedAt: string | undefined =
    json.data.probe?.nodes?.[0]?.mergedAt;
  return {
    items: (search.nodes as GraphQLPRNode[])
      .filter((n) => n && n.databaseId)
      .map(nodeToProfilePR),
    totalCount: search.issueCount,
    endCursor: search.pageInfo.hasNextPage ? search.pageInfo.endCursor : null,
    hasNext: search.pageInfo.hasNextPage,
    sinceYear: probeMergedAt ? new Date(probeMergedAt).getFullYear() : null,
  };
}

const cachedGraphQLSearchPage = unstable_cache(
  rawGraphQLSearchPage,
  ["gh-search-page"],
  { revalidate: 3600 }
);

function restItemToProfilePR(
  item: GitHubIssuesResponse["items"][number]
): ProfilePR {
  return {
    id: item.id,
    title: item.title,
    html_url: item.html_url,
    repo: item.repository_url.slice(29),
    merged_at: item.pull_request.merged_at,
    reactions_count: item.reactions.total_count,
    comments: item.comments,
  };
}

// Tokenless fallback: GraphQL requires auth, REST search allows 10 req/min
// unauthenticated. Dev-only in practice; every real deployment has a token.
async function restSearchPage(
  author: string,
  cursor: string | null
): Promise<PRPageResult> {
  const page = cursor ? Number(cursor.slice(2)) : 1;
  const res = await getPRsFromGithubAPI({
    author,
    limit: 100,
    page,
    tag: "history",
  });
  if (res.error || !res.data) {
    return { ...EMPTY_PAGE, error: res.error, reason: res.reason };
  }
  const total = res.data.total_count;
  const loadedThrough = page * 100;
  const hasNext = loadedThrough < Math.min(total, 1000);
  let sinceYear: number | null = null;
  if (page === 1) {
    if (total <= 100 && res.data.items.length) {
      sinceYear = new Date(
        res.data.items[res.data.items.length - 1].pull_request.merged_at
      ).getFullYear();
    } else {
      const probe = await getPRsFromGithubAPI({
        author,
        limit: 1,
        page: 1,
        order: "asc",
        tag: "since-year",
      });
      const first = probe.data?.items?.[0];
      sinceYear = first
        ? new Date(first.pull_request.merged_at).getFullYear()
        : null;
    }
  }
  return {
    items: res.data.items.map(restItemToProfilePR),
    totalCount: total,
    endCursor: hasNext ? `p:${page + 1}` : null,
    hasNext,
    sinceYear,
    error: null,
  };
}

export const searchMergedPRs = async (
  author: string,
  cursor: string | null = null
): Promise<PRPageResult> => {
  if (!process.env.GITHUB_TOKEN) return restSearchPage(author, cursor);
  try {
    const page = await cachedGraphQLSearchPage(author, cursor);
    return { ...page, error: null };
  } catch (error) {
    const apiError = error instanceof GithubApiError ? error : null;
    const reason = reportGithubFailure({
      source: cursor ? "graphql-search:cursor" : "graphql-search:p1",
      status: apiError?.status ?? 0,
      message: error instanceof Error ? error.message : String(error),
      rateLimitRemaining: apiError?.rateLimitRemaining,
      rateLimitReset: apiError?.rateLimitReset,
      retryAfter: apiError?.retryAfter,
    });
    return { ...EMPTY_PAGE, error, reason };
  }
};

export const getGitHubUserData = async (username: string) => {
  const url = `https://api.github.com/users/${username}`;

  const init = {
    headers: githubHeaders(),
    // Cache on the Next data layer, replacing the old CDN self-fetch contract.
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  };

  try {
    const response = await fetch(url, init);
    const data = await response.json();
    if (!response.ok || data.message) {
      // 404 is expected input (unknown username), not an API failure.
      const reason =
        response.status === 404
          ? undefined
          : reportGithubFailure({
              source: "user",
              status: response.status,
              message: data.message,
              headers: response.headers,
            });
      return {
        data: null,
        error: new Error(data.message ?? `GitHub HTTP ${response.status}`),
        status: response.status,
        reason,
      };
    }
    return { data, error: null, status: response.status } as {
      data: GitHubUser;
      error: null;
      status: number;
      reason?: GithubFailureReason;
    };
  } catch (error) {
    const reason = reportGithubFailure({
      source: "user",
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    });
    return { data: null, error, status: 0, reason };
  }
};

export interface ContributionCalendar {
  total: number;
  /** 53 weeks x 7 days of [level 0-4, count, ISO date]. */
  weeks: [number, number, string][][];
}

const LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

/**
 * First-party contribution calendar via the GraphQL API (replaces the
 * ghchart.rshah.org hotlink). Requires GITHUB_TOKEN; returns null without
 * it so the profile simply omits the graph.
 */
export const getContributionCalendar = async (
  username: string
): Promise<ContributionCalendar | null> => {
  if (!process.env.GITHUB_TOKEN) return null;

  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { contributionLevel contributionCount date }
          }
        }
      }
    }
  }`;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query, variables: { login: username } }),
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    const json = await response.json();
    const calendar =
      json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) {
      reportGithubFailure({
        source: "graphql",
        status: response.status,
        message: json?.errors?.[0]?.message ?? json?.message,
        headers: response.headers,
      });
      return null;
    }
    return {
      total: calendar.totalContributions,
      weeks: calendar.weeks.map(
        (week: {
          contributionDays: {
            contributionLevel: string;
            contributionCount: number;
            date: string;
          }[];
        }) =>
          week.contributionDays.map(
            (day) =>
              [
                LEVELS[day.contributionLevel] ?? 0,
                day.contributionCount,
                day.date,
              ] as [number, number, string]
          )
      ),
    };
  } catch (error) {
    reportGithubFailure({
      source: "graphql",
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};
