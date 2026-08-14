import type { GitHubIssuesResponse, GitHubUser } from "~/types/shared";

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
}

export const getPRsFromGithubAPI = async (filter: PRFilter) => {
  let queryParts: string[] = [];

  // Set default values for startDate and endDate
  const currentDate = new Date();
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(currentDate.getFullYear() - 3);

  const startDate = filter.startDate || threeYearsAgo;
  const endDate = filter.endDate || currentDate;
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

  const dateParam = `created:${startDate.toISOString()}..${endDate.toISOString()}`;
  queryParts.push(dateParam);

  queryParts.push("type:pr");
  queryParts.push("is:public");
  queryParts.push("is:merged");

  const url = `https://api.github.com/search/issues?q=${queryParts.join(
    "+"
  )}&per_page=${limit}`;
  const init = {
    headers: githubHeaders(),
    // Cache on the Next data layer, replacing the old CDN self-fetch contract.
    next: { revalidate: 3600 },
    // Bound the request so a hanging GitHub response can't stall the render.
    signal: AbortSignal.timeout(8000),
  };

  try {
    const response = await fetch(url, init);
    const data = await response.json();
    if (!response.ok || data.message) {
      return {
        data: null,
        error: new Error(data.message ?? `GitHub HTTP ${response.status}`),
        status: response.status,
      };
    }
    return { data, error: null, status: response.status } as {
      data: GitHubIssuesResponse;
      error: null;
      status: number;
    };
  } catch (error) {
    console.error(error);
    return { data: null, error, status: 0 };
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
      return {
        data: null,
        error: new Error(data.message ?? `GitHub HTTP ${response.status}`),
        status: response.status,
      };
    }
    return { data, error: null, status: response.status } as {
      data: GitHubUser;
      error: null;
      status: number;
    };
  } catch (error) {
    console.error(error);
    return { data: null, error, status: 0 };
  }
};
