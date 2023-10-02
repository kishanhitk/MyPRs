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
    <div className="px-10 mt-48 flex justify-between flex-wrap">
      <div>
        <div className="text-sm underline text-slate-500 decoration-wavy flex  items-baseline">
          Source Code on GitHub
          <ExternalLinkIcon className="ml-[1px] h-3 w-3" />
        </div>
        <h1 className="font-semibold text-5xl mt-5 mb-3 leading-[1.1]">
          Showcase <br /> Your PRs
          <br />
          that matter
        </h1>
        <h2 className="mb-3">
          Highlight your coolest
          <br />
          GitHub PRs and make your <br />
          developer profile sparkle <br />
          with MyPRs!
        </h2>
        {userName ? (
          <Button asChild>
            <Link to={`/${userName}`} prefetch="render">
              <img src={avatarUrl} className="h-6 w-6 mr-2" alt={userName} />
              Continue as {userName} -{">"}
            </Link>
          </Button>
        ) : (
          <Button size="default" onClick={handleGitHubLogin}>
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
        className="h-[600px] sm:-mt-24 mt-10"
      />
    </div>
  );
}
