import type { MetaFunction } from "@remix-run/react";
import {
  Link,
  unstable_useViewTransitionState,
  useOutletContext,
  useRouteLoaderData,
} from "@remix-run/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { loader as rootLoader } from "~/root";

export const headers = () => {
  return {
    "Cache-Control":
      "public, max-age=60, s-maxage=120, stale-while-revalidate=86400",
  };
};

export const meta: MetaFunction = ({ location, params }) => {
  return [
    { title: "MyPRs - One link to highlight your Open-Source Contributions" },
    {
      name: "description",
      content:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    },
    {
      property: "og:image",
      content: "https://www.myprs.xyz/assets/og-banner.png",
    },
    {
      property: "og:title",
      content: "MyPRs - One link to highlight your Open-Source Contributions",
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
      content: "MyPRs - One link to highlight your Open-Source Contributions",
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

export default function Index() {
  console.log("rendering index");
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const session = data?.session;
  const userName = session?.user?.user_metadata?.user_name;
  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleGitHubLogin = async () => {
    const baseUrl = new URL(window.location.origin);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + `auth/callback?redirectTo=false&`,
      },
    });
  };
  const isTransitioning = unstable_useViewTransitionState(`/${userName}`);

  return (
    <div className="px-10 mt-28 flex md:justify-between items-center justify-center flex-wrap space-y-10">
      <div className="sm:w-1/2">
        <a
          href="https://github.com/kishanhitk/MyPRs"
          className="text-sm underline text-slate-500 decoration-wavy flex  items-baseline underline-offset-4 dark:text-slate-400"
        >
          Star the repo on GitHub
          <ExternalLinkIcon className="ml-[1px] h-3 w-3" />
        </a>
        <h1 className="font-semibold text-5xl mt-5 mb-3 leading-[1.1]">
          One link to
          {/* <span> */}
          <span className="underline underline-offset-4  decoration-github_merged/5 hover:decoration-github_merged/70 transition-all duration-700  ">
            {" "}
            highlight
          </span>{" "}
          your Open-Source Contributions.
        </h1>
        <h2 className="mb-3 text-slate-600 dark:text-slate-300">
          The 'link-in-bio' for your Open-Source PRs. Curate a selection of your
          proudest GitHub PRs, showcase your expertise, and set yourself apart
          in the crowd.
        </h2>
        {userName ? (
          <Button
            asChild
            className="hover:scale-105 hover:shadow-md transition-all duration-500"
          >
            <Link to={`/${userName}`} prefetch="render" unstable_viewTransition>
              <img
                src={avatarUrl}
                className="h-6 w-6 mr-2 rounded-full "
                alt={userName}
                style={{
                  viewTransitionName: isTransitioning ? "profile-picture" : "",
                }}
              />
              Continue as {userName}-{">"}
            </Link>
          </Button>
        ) : (
          <Button
            onClick={handleGitHubLogin}
            className="hover:scale-105 hover:shadow-md transition-all duration-500"
          >
            Continue with GitHub -{">"}
          </Button>
        )}
        <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
          *GitLab support coming soon.
        </p>
      </div>
      <Link to="/kishanhitk" prefetch="intent">
        <img
          src="/assets/hero-screenshot.webp"
          alt="MyPRs"
          height="645.078px"
          width="300px"
          className="rounded-3xl border-dashed border-2 hover:border-slate-300 border-slate-100 transition-all duration-500"
        />
      </Link>
    </div>
  );
}
