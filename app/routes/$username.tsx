import type { ActionFunctionArgs, LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";
import { useLoaderData } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { DemoGithub } from "~/components/custom/GithubCard";
import PRFilter from "~/components/custom/PRFilter";
import type { Env, GitHubIssuesResponse } from "~/types/shared";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const response = new Response();
  const env = process.env as Env;
  const username = params.username!;
  const supabaseClient = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  const domain = new URL(request.url).origin;
  const dateBeforeGettingUser = new Date();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  const dateAfterGettingUser = new Date();
  const timeTakenToGetUser =
    dateAfterGettingUser.getTime() - dateBeforeGettingUser.getTime();

  const dateBeforeGettingUserData = new Date();
  const { data: userDataOfUsername, error: userDataOfUsernameError } =
    await supabaseClient
      .from("users")
      .select("*")
      .eq("github_username", username);
  const dateAfterGettingUserData = new Date();

  const timeTakenToGetUserData =
    dateAfterGettingUserData.getTime() - dateBeforeGettingUserData.getTime();
  if (userDataOfUsernameError) console.error(userDataOfUsernameError);
  let excludedGitHubRepos: string[] = [];
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

  const dateBeforeGettingPRsFromAPI = new Date();

  const respFromAPI = await fetch(`${domain}/api/${username}`);
  const dataFromAPI = await respFromAPI.json();
  const {
    ghData,
    error,
  }: {
    ghData: GitHubIssuesResponse;
    error: any;
  } = dataFromAPI;

  ghData.items = ghData.items.filter(
    (item) => !excludedGitHubRepos.includes(item.repository_url.slice(29))
  );

  const dateAfterGettingPRsFromAPI = new Date();
  const timeTakenToGetPRsFromAPI =
    dateAfterGettingPRsFromAPI.getTime() -
    dateBeforeGettingPRsFromAPI.getTime();
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
  return json(
    {
      timeTaken: {
        timeTakenToGetUser,
        timeTakenToGetUserData,
        timeTakenToGetPRsFromAPI,
      },
      user,
      ghData,
      error,
      excludedGitHubRepos,
      featured_github_prs: featuredGithubPRIds,
      featuredPRs,
      nonFeaturedPRs,
      isOwner,
      username,
    },
    {
      headers: response.headers,
    }
  );
};

const Index = () => {
  const {
    ghData,
    excludedGitHubRepos,
    isOwner,
    featuredPRs,
    nonFeaturedPRs,
    username,
  } = useLoaderData<typeof loader>();
  const repoNames = ghData?.items.map((item) => item.repository_url.slice(29));
  const uniqueRepoNames = [...new Set(repoNames)];

  return (
    <div className="max-w-2xl mx-auto flex flex-col font-light">
      {/* Time Taken:
      <p>Time taken to get user: {timeTaken.timeTakenToGetUser}ms</p>
      <p>Time taken to get user data: {timeTaken.timeTakenToGetUserData}ms</p>
      <p>
        Time taken to get PRs from API: {timeTaken.timeTakenToGetPRsFromAPI}ms
      </p>
      {user ? (
        <>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </>
      ) : null} */}
      {ghData ? (
        <>
          {ghData.items.length ? (
            <>
              <img
                src={ghData.items[0].user.avatar_url}
                alt={ghData.items[0].user.login}
                className="h-40 w-40 rounded-full self-center"
              ></img>
              <p className="self-center  text-3xl mb-3 mt-1">
                {ghData.items[0].user.login}
              </p>

              <img
                src={`https://ghchart.rshah.org/${ghData.items[0].user.login}`}
                alt={`${ghData.items[0].user.login}'s Github chart`}
                className="my-2"
              />
              {isOwner ? (
                <PRFilter
                  repoNames={uniqueRepoNames}
                  excludedRepoNames={excludedGitHubRepos}
                />
              ) : null}
              {featuredPRs?.length ? (
                <div className="mt-5">
                  <p className="font-semibold">Featured PRs ✨</p>
                  {featuredPRs.map((item) => (
                    <DemoGithub
                      key={item.id}
                      item={item}
                      isFeatured
                      isOwner={isOwner}
                    />
                  ))}
                </div>
              ) : null}
              {nonFeaturedPRs?.length ? (
                <div className="mt-5">
                  <p className="font-semibold"> All My PRs</p>
                  {nonFeaturedPRs.map((item) => (
                    <DemoGithub key={item.id} item={item} isOwner={isOwner} />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>
              Looks like {username} has not created any public PR for quite a
              while.
              {isOwner ? <>Go make some PRs!🚀</> : null}
            </p>
          )}
        </>
      ) : (
        <p>The username is not valid</p>
      )}
    </div>
  );
};

export default Index;

export async function action({ request, context }: ActionFunctionArgs) {
  const response = new Response();
  const env = process.env as Env;
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
