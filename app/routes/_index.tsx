import type { MetaFunction } from "@remix-run/react";
import { Link, useOutletContext, useRouteLoaderData } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { loader as rootLoader } from "~/root";

export const config = { runtime: "edge" };

export const meta: MetaFunction = ({ location, params }) => {
  return [
    { title: "MyPRs - Showcase your PRs that matter" },
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
      content: "MyPRs - Showcase your PRs that matter",
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

export default function Index() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const session = data?.session;
  // @ts-ignore
  const userName = session?.user?.user_metadata?.user_name;
  // @ts-ignore
  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleGitHubLogin = async () => {
    const baseUrl = new URL(window.location.origin);
    const pathName = window.location.pathname;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + `auth/callback?redirectTo=${pathName}&`,
      },
    });
  };

  return (
    <div className="px-10 mt-28 flex md:justify-between items-center justify-center flex-wrap space-y-10">
      <div className="sm:w-1/2">
        <a
          href="https://github.com/kishanhitk/MyPRs"
          className="text-sm underline text-slate-500 decoration-wavy flex  items-baseline"
        >
          Source Code on GitHub
          <ExternalLinkIcon className="ml-[1px] h-3 w-3" />
        </a>
        <h1 className="font-semibold text-5xl mt-5 mb-3 leading-[1.1]">
          One link to highlight your Open-Source Contributions.
        </h1>
        <h2 className="mb-3 text-slate-800">
          {/* Highlight your coolest GitHub PRs and make your developer profile
          sparkle with MyPRs! <br />
          MyPRs is link-in-bio for your GitHub PRs. */}
          The 'link-in-bio' for your Open-Source PRs. Curate a selection of your
          proudest GitHub PRs, showcase your expertise, and set yourself apart
          in the crowd.
        </h2>
        {userName ? (
          <Button asChild>
            <Link to={`/${userName}`} prefetch="render">
              <img src={avatarUrl} className="h-6 w-6 mr-2" alt={userName} />
              Continue as {userName} -{">"}
            </Link>
          </Button>
        ) : (
          <Button onClick={handleGitHubLogin}>
            Continue with GitHub -{">"}
          </Button>
        )}
        <p className="text-xs mt-1 text-slate-500">
          *GitLab support coming soon.
        </p>
      </div>
      <img
        src="/assets/hero-screenshot.webp"
        alt="MyPRs"
        height="600px"
        className="h-[650px] "
      />
    </div>
  );
}
