import type { GitHubIssuesResponse, GitHubUser } from "~/types/shared";

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
  )}&per_page=${limit}}`;
  const init = {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "User-Agent": "request",
    },
  };

  try {
    const response = await fetch(url, init);
    const data = await response.json();
    if (data.message) throw new Error(data.message);
    return { data, error: null } as { data: GitHubIssuesResponse; error: null };
  } catch (error) {
    console.error(error);
    return { data: null, error };
  }
};

export const getGitHubUserData = async (username: string) => {
  const url = `https://api.github.com/users/${username}`;

  const init = {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "User-Agent": "request",
    },
  };

  try {
    const response = await fetch(url, init);
    const data = await response.json();
    if (data.message) throw new Error(data.message);
    return { data, error: null } as { data: GitHubUser; error: null };
  } catch (error) {
    console.error(error);
    return { data: null, error };
  }
};
