// TODO: Add a buttton to share the profile
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@vercel/remix";
import { json } from "@vercel/remix";
import { useLoaderData } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { DemoGithub } from "~/components/custom/GithubCard2";
import PRFilter from "~/components/custom/PRFilter";
import type { Env, GitHubIssuesResponse, GithubUser } from "~/types/shared";
import { AnimatePresence } from "framer-motion";
import { Share2, TwitterIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `PRs by ${data?.userData.login} | MyPRs` },
    {
      property: "og:title",
      content: `PRs by ${data?.userData.login}`,
    },
    {
      property: "og:image",
      content: "https://www.myprs.xyz/assets/og-banner.png",
    },
    {
      name: "description",
      content: `Best of the Pull Requests created by ${data?.userData.login} | MyPRs`,
    },
    {
      property: "og:description",
      content:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    },
    {
      property: "og:url",
      content: "https://myprs.xyz/",
    },
    {
      property: "twitter:card",
      content: "summary_large_image",
    },
    {
      property: "twitter:image",
      content: "https://www.myprs.xyz/assets/og-banner.png",
    },
    {
      property: "twitter:title",
      content: "MyPRs - Showcase your PRs that matter",
    },
    {
      property: "twitter:description",
      content:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    },
    {
      property: "twitter:url",
      content: "https://myprs.xyz/",
    },
  ];
};

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

  const respFromAPI = await fetch(`${domain}/api/${username}`);
  const dataFromAPI = await respFromAPI.json();
  const {
    ghData,
    userData,
    error,
  }: {
    ghData: GitHubIssuesResponse;
    userData: GithubUser;
    error: any;
  } = dataFromAPI;
  let featuredPRs: GitHubIssuesResponse["items"] = [];
  let nonFeaturedPRs: GitHubIssuesResponse["items"] = [];
  if (ghData?.items?.length) {
    ghData.items = ghData.items.filter(
      (item) => !excludedGitHubRepos.includes(item.repository_url.slice(29))
    );

    featuredPRs = ghData?.items.filter((item) =>
      featuredGithubPRIds.includes(item.id.toString())
    );

    nonFeaturedPRs = ghData?.items.filter(
      (item) => !featuredGithubPRIds.includes(item.id.toString())
    );
  }
  let isOwner = false;

  if (user) {
    isOwner = user.id === userDataOfUsername?.[0]?.id;
  }
  return json(
    {
      timeTaken: {
        timeTakenToGetUser,
        timeTakenToGetUserData,
      },
      userData,
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
    userData,
  } = useLoaderData<typeof loader>();
  const repoNames = ghData?.items.map((item) => item.repository_url.slice(29));
  const uniqueRepoNames = [...new Set(repoNames)];
  return (
    <div className="mx-5 flex  flex-col">
      {ghData ? (
        <>
          {ghData.items.length ? (
            <>
              <img
                src={userData.avatar_url}
                alt={userData.login}
                className="h-52 w-52 mt-5 rounded-full self-center"
              ></img>
              <p className="self-center text-3xl mt-1">{userData.name}</p>
              <p className="self-center text-slate-700 flex text-lg">
                {userData.login}{" "}
              </p>
              <div className="flex items-center self-center mb-3 text-slate-500">
                {userData.twitter_username ? (
                  <a href={`https://x.com/${userData.twitter_username}`}>
                    <TwitterIcon className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
              {isOwner ? (
                <Button className="self-center mb-3" asChild>
                  <a
                    href={`https://twitter.com/intent/tweet?text=Check%20out%20some%20of%20my%20proudest%20Open-Source%20pull%20requests%20on%20MyPRs.%0Amyprs.xyz/${username}%0AIt's%20like%20a%20'link-in-bio'%20for%20my%20Open-Source%20contributions.%0A%23OpenSource`}
                  >
                    Share
                    <Share2 className="h-5 w-5 ml-2" />
                  </a>
                </Button>
              ) : null}
              <img
                src={`https://ghchart.rshah.org/${userData.login}`}
                alt={`${userData.login}'s Github chart`}
                className="my-2"
              />
              {isOwner ? (
                <PRFilter
                  repoNames={uniqueRepoNames}
                  excludedRepoNames={excludedGitHubRepos}
                />
              ) : null}
              <AnimatePresence>
                {featuredPRs?.length ? (
                  <div className="mt-5">
                    <p className="font-medium">Featured PRs ✨</p>
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
                    <p className="font-medium"> All My PRs</p>
                    {nonFeaturedPRs.map((item) => (
                      <DemoGithub key={item.id} item={item} isOwner={isOwner} />
                    ))}
                  </div>
                ) : null}
              </AnimatePresence>
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
        <p className="self-center mt-10">The username is not valid</p>
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
