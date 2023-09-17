import type {
  ActionArgs,
  HeadersFunction,
  LoaderArgs,
} from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/auth-helpers-remix";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { DemoGithub } from "~/components/custom/GithubCard";
import PRFilter from "~/components/custom/PRFilter";
import { Button } from "~/components/ui/button";
import { getPRsFromGithubAPI } from "~/lib/github";
import type { Env } from "~/types/shared";

export const headers: HeadersFunction = () => ({
  "Cache-Control": "public, max-age=300, s-maxage=3600",
});

export const loader = async ({ request, context, params }: LoaderArgs) => {
  const response = new Response();
  const env = context.env as Env;
  const username = params.username!;
  const supabaseClient = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: userDataOfUsername, error: userDataOfUsernameError } =
    await supabaseClient
      .from("users")
      .select("*")
      .eq("github_username", username);
  if (userDataOfUsernameError) console.error(userDataOfUsernameError);
  let excludedGitHubRepos = [];
  let featuredGithubPRIds: string[] = [];
  if (
    userDataOfUsername?.length &&
    userDataOfUsername[0]?.excluded_github_repos
  ) {
    excludedGitHubRepos = userDataOfUsername?.[0]?.excluded_github_repos;
  }
  if (
    userDataOfUsername?.length &&
    userDataOfUsername[0]?.featured_github_prs
  ) {
    featuredGithubPRIds = userDataOfUsername[0].featured_github_prs;
  }

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  const { data: ghData, error } = await getPRsFromGithubAPI({
    author: username,
    excludedRepos: excludedGitHubRepos,
    limit: 200,
  });

  const fakeDelay = new Promise((resolve) => setTimeout(resolve, 2000));
  await fakeDelay;

  const featuredPRs = ghData?.items.filter((item) =>
    featuredGithubPRIds.includes(item.id.toString())
  );

  const nonFeaturedPRs = ghData?.items.filter(
    (item) => !featuredGithubPRIds.includes(item.id.toString())
  );
  let isOwner = false;

  if (user) {
    isOwner = user.id === userDataOfUsername?.[0]?.id;
  }
  console.log("GETTING DATA");
  const headers = {
    "Cache-Control": isOwner
      ? "public, maxage=300"
      : "public, s-maxage=300 maxage-300",
    ...response.headers,
  };
  return json(
    {
      user,
      ghData,
      error,
      excludedGitHubRepos,
      featured_github_prs: featuredGithubPRIds,
      featuredPRs,
      nonFeaturedPRs,
      isOwner,
    },
    {
      headers: headers,
    }
  );
};

const Index = () => {
  const {
    user,
    ghData,
    excludedGitHubRepos,
    isOwner,
    featuredPRs,
    nonFeaturedPRs,
  } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };
  const repoNames = ghData?.items.map((item) => item.repository_url.slice(29));
  const uniqueRepoNames = [...new Set(repoNames)];
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <div className="max-w-2xl mx-auto flex flex-col font-light">
      {user ? (
        <>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </>
      ) : null}

      {ghData ? (
        <>
          <img
            src={ghData.items[0].user.avatar_url}
            alt={ghData.items[0].user.login}
            className="h-20 w-20 rounded-full self-center"
          ></img>
          <p className="self-center font-thin text-3xl mb-3">
            {ghData.items[0].user.login}
          </p>
          <img
            src={`https://ghchart.rshah.org/${ghData.items[0].user.login}`}
            alt="2016rshah's Github chart"
          />
          {isOwner ? (
            <PRFilter
              repoNames={uniqueRepoNames}
              excludedRepoNames={excludedGitHubRepos}
            />
          ) : null}
          {featuredPRs?.length ? (
            <div className="m">
              <p className="font-semibold">Featured</p>
              {featuredPRs.map((item) => (
                <DemoGithub key={item.id} item={item} isFeatured />
              ))}
            </div>
          ) : null}
          {nonFeaturedPRs?.length ? (
            <div className="mt-5 space-y-4">
              <p className="font-semibold"> All My PRs</p>
              {nonFeaturedPRs.map((item) => (
                <DemoGithub key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p>The username is not valid</p>
      )}
    </div>
  );
};

export default Index;

export async function action({ request, context }: ActionArgs) {
  const response = new Response();
  const env = context.env as Env;
  const supabaseClient = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return json({ error: "You must be logged in to do that" }, { status: 401 });
  }
  const body = await request.formData();
  const repos_to_exclude = body.get("repos_to_exclude") as string;
  const { data, error } = await supabaseClient
    .from("users")
    .update({
      excluded_github_repos: repos_to_exclude.split(","),
    })
    .eq("id", user.id);
  if (error) console.error(error);

  return json({ data, error });
}
