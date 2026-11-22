import { cacheLife, cacheTag } from "next/cache";
import type {
  GitHubIssuesResponse,
  GithubUser,
  ProfilePR,
  RepoBreakdown,
} from "~/types/shared";
import {
  type GithubFailureReason,
  type GithubFailureReport,
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

const NETWORK_TIMEOUT_CODES = new Set([
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

function errorCauseCode(error: Error): string | null {
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : null;
}

// AbortSignal.timeout rejects with a TimeoutError. Undici reports its own
// socket timeouts as a "fetch failed" TypeError with the code on its cause.
function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = errorCauseCode(error);
  return (
    error.name === "TimeoutError" ||
    (code !== null && NETWORK_TIMEOUT_CODES.has(code))
  );
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = errorCauseCode(error);
  return `${error.name}: ${error.message}${code ? ` (${code})` : ""}`;
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
      message: describeError(error),
      timedOut: isTimeoutError(error),
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

async function cachedGraphQLSearchPage(
  author: string,
  cursor: string | null
): Promise<PRPage> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(`profile-${author}`);
  return rawGraphQLSearchPage(author, cursor);
}

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

// Search returns at most 1,000 results: 10 pages of 100.
const MAX_SEARCH_PAGES = 10;
// GitHub ends every request after 10 s; stop waiting for a page before that.
const REPO_PAGE_TIME_LIMIT_MS = 8000;

const REPO_PAGE_QUERY = `query($q: String!, $after: String!) {
  search(query: $q, type: ISSUE, first: 100, after: $after) {
    issueCount
    nodes { ... on PullRequest { repository { nameWithOwner } } }
  }
}`;

interface RepoPageResponse {
  data?: {
    search?: {
      issueCount: number;
      nodes?: ({ repository?: { nameWithOwner: string } } | null)[] | null;
    } | null;
  } | null;
  errors?: { type?: string; message: string }[];
  message?: string;
}

interface RepoPage {
  names: string[];
  /** Search total when the page was fetched. */
  totalCount: number;
}

// Only the digest of an error thrown inside "use cache" reaches the caller:
// production drops the class and the message. A page therefore reports its
// own failure, then throws an error whose digest says it was reported.
const REPORTED_DIGEST_PREFIX = "GITHUB_FAILURE_REPORTED:";

class ReportedGithubFailure extends Error {
  readonly digest: string;

  constructor(report: GithubFailureReport) {
    super(report.message);
    this.name = "ReportedGithubFailure";
    this.digest = REPORTED_DIGEST_PREFIX + report.source;
  }
}

function reportAndMark(report: GithubFailureReport): ReportedGithubFailure {
  reportGithubFailure(report);
  return new ReportedGithubFailure(report);
}

function isReported(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith(REPORTED_DIGEST_PREFIX);
}

function repoPageSource(offset: number): string {
  return `graphql-repo-breakdown:p${offset / 100 + 1}`;
}

async function fetchRepoPage(author: string, offset: number): Promise<RepoPage> {
  const source = repoPageSource(offset);
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({
      query: REPO_PAGE_QUERY,
      variables: {
        q: `author:${author} type:pr is:public is:merged sort:created-desc`,
        after: btoa(`cursor:${offset}`),
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REPO_PAGE_TIME_LIMIT_MS),
  }).catch((error: unknown) => {
    throw reportAndMark({
      source,
      status: 0,
      message: describeError(error),
      timedOut: isTimeoutError(error),
    });
  });
  const json: RepoPageResponse | null = await response
    .json()
    .catch((error: unknown) => {
      throw reportAndMark({
        source,
        status: response.status,
        message: describeError(error),
        timedOut: isTimeoutError(error),
        headers: response.headers,
      });
    });

  const search = json?.data?.search;
  const nodes = search?.nodes;
  const graphqlError = json?.errors?.[0];
  if (!response.ok || graphqlError || !search || !Array.isArray(nodes)) {
    throw reportAndMark({
      source,
      status: response.status,
      message:
        graphqlError?.message ?? json?.message ?? `GitHub HTTP ${response.status}`,
      graphqlErrorType: graphqlError?.type ?? null,
      headers: response.headers,
    });
  }
  return {
    names: nodes.flatMap((node) =>
      node?.repository ? [node.repository.nameWithOwner] : []
    ),
    totalCount: search.issueCount,
  };
}

async function cachedRepoPage(author: string, offset: number): Promise<RepoPage> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(`profile-${author}`);
  return fetchRepoPage(author, offset);
}

/**
 * Every repo the author merged into, as far as search reaches. Page 1 comes
 * from the PR list. Search cursors are deterministic (base64
 * "cursor:<offset>"), so pages 2..10 load in parallel as one skinny search
 * each. Each page is its own cache entry: a failed page is not cached, the
 * other pages still count, and the result is marked incomplete.
 */
export async function getRepoBreakdown(
  author: string,
  firstPage: PRPageResult
): Promise<RepoBreakdown> {
  if (firstPage.error) return { names: [], complete: false };
  const names = new Set(firstPage.items.map((item) => item.repo));
  if (!firstPage.hasNext) return { names: [...names], complete: true };
  // Without a token there is no GraphQL; deeper repos arrive as pages load.
  if (!process.env.GITHUB_TOKEN) return { names: [...names], complete: false };

  const pages = Math.min(
    Math.ceil(firstPage.totalCount / 100),
    MAX_SEARCH_PAGES
  );
  const offsets = Array.from({ length: pages - 1 }, (_, i) => (i + 1) * 100);
  const results = await Promise.allSettled(
    offsets.map((offset) => cachedRepoPage(author, offset))
  );
  let complete = true;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      result.value.names.forEach((name) => names.add(name));
      // Pages cached at different times can come from different result sets:
      // a PR merged in between moves every offset by one, so a PR at a page
      // border can be in no page. A changed search total shows this.
      if (result.value.totalCount !== firstPage.totalCount) complete = false;
      return;
    }
    complete = false;
    if (!isReported(result.reason)) {
      reportGithubFailure({
        source: repoPageSource(offsets[i]),
        status: 0,
        message: describeError(result.reason),
      });
    }
  });
  return { names: [...names], complete };
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

// Throws on real failures so they never cache; a 404 is a valid answer
// (unknown username) and caches like any other result.
async function rawGitHubUserData(
  username: string
): Promise<{ data: GithubUser | null; status: number }> {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: githubHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json();
  if (response.status === 404) return { data: null, status: 404 };
  if (!response.ok || data.message) {
    throw new GithubApiError(
      data.message ?? `GitHub HTTP ${response.status}`,
      response.status,
      response.headers.get("x-ratelimit-remaining"),
      response.headers.get("x-ratelimit-reset"),
      response.headers.get("retry-after")
    );
  }
  return { data: data as GithubUser, status: response.status };
}

async function cachedGitHubUserData(username: string) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(`profile-${username}`);
  return rawGitHubUserData(username);
}

export const getGitHubUserData = async (username: string) => {
  try {
    const { data, status } = await cachedGitHubUserData(username);
    if (status === 404) {
      return {
        data: null,
        error: new Error("Not Found") as Error | null,
        status: 404,
        reason: undefined as GithubFailureReason | undefined,
      };
    }
    return {
      data,
      error: null as Error | null,
      status,
      reason: undefined as GithubFailureReason | undefined,
    };
  } catch (error) {
    const apiError = error instanceof GithubApiError ? error : null;
    const reason = reportGithubFailure({
      source: "user",
      status: apiError?.status ?? 0,
      message: error instanceof Error ? error.message : String(error),
      rateLimitRemaining: apiError?.rateLimitRemaining,
      rateLimitReset: apiError?.rateLimitReset,
      retryAfter: apiError?.retryAfter,
    });
    return { data: null, error, status: apiError?.status ?? 0, reason };
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

// Throws so unstable_cache never stores a failed calendar.
async function rawContributionCalendar(
  username: string
): Promise<ContributionCalendar | null> {
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

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
    // POST fetches never enter the Next data cache; unstable_cache below
    // is the real cache for this call.
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = await response.json();
  const calendar =
    json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    // "no such user" is a valid, cacheable answer, not a failure.
    if (response.ok && json?.errors?.[0]?.type === "NOT_FOUND") return null;
    throw new GithubApiError(
      json?.errors?.[0]?.message ?? json?.message ?? `GitHub HTTP ${response.status}`,
      response.status,
      response.headers.get("x-ratelimit-remaining"),
      response.headers.get("x-ratelimit-reset"),
      response.headers.get("retry-after")
    );
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
}

async function cachedContributionCalendar(
  username: string
): Promise<ContributionCalendar | null> {
  "use cache: remote";
  // Contributions tolerate a day of staleness (today's square may lag);
  // in exchange the hourly shell rebuild almost always finds this warm,
  // so the graph lands with the identity instead of ~1s later.
  cacheLife("days");
  cacheTag(`profile-${username}`);
  return rawContributionCalendar(username);
}

/**
 * First-party contribution calendar via the GraphQL API. Requires
 * GITHUB_TOKEN; returns null without it (or on failure) so the profile
 * simply omits the graph.
 */
export const getContributionCalendar = async (
  username: string
): Promise<ContributionCalendar | null> => {
  if (!process.env.GITHUB_TOKEN) return null;
  try {
    return await cachedContributionCalendar(username);
  } catch (error) {
    const apiError = error instanceof GithubApiError ? error : null;
    reportGithubFailure({
      source: "graphql",
      status: apiError?.status ?? 0,
      message: error instanceof Error ? error.message : String(error),
      rateLimitRemaining: apiError?.rateLimitRemaining,
      rateLimitReset: apiError?.rateLimitReset,
      retryAfter: apiError?.retryAfter,
    });
    return null;
  }
};
