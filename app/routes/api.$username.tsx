import type { LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";
import { getGitHubUserData, getPRsFromGithubAPI } from "~/lib/github";
export const config = { runtime: "edge" };

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const username = params.username!;

  const [ghResponse, userResponse] = await Promise.all([
    getPRsFromGithubAPI({
      author: username,
      limit: 100,
    }),
    getGitHubUserData(username),
  ]);

  const { data: ghData, error } = ghResponse;
  const { data: userData, error: userError } = userResponse;

  return json(
    { ghData, error, userData, userError },
    {
      headers: {
        "Cache-Control":
          "public, max-age=10, s-max-age=3600, stale-while-revalidate=604800",
      },
    }
  );
};
