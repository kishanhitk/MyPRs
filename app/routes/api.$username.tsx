import type { LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";
import { getPRsFromGithubAPI } from "~/lib/github";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const username = params.username!;

  const { data: ghData, error } = await getPRsFromGithubAPI({
    author: username,
    limit: 1000,
  });

  return json(
    { ghData, error },
    {
      headers: {
        "Cache-Control":
          "public, max-age=10, s-max-age=3600, stale-while-revalidate=604800",
      },
    }
  );
};
