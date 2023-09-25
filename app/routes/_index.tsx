import type { MetaFunction } from "@remix-run/react";
import { Link, useOutletContext, useRouteLoaderData } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import type { loader as rootLoader } from "~/root";

export const config = { runtime: "edge" };

export const meta: MetaFunction = () => {
  return [
    { title: "MyPRs - Showcase your PRs that matter" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const [isLoading, setIsLoading] = useState(false);
  const session = data?.session;
  const userName = session?.user?.user_metadata?.user_name;
  const avatarUrl = session?.user?.user_metadata?.avatar_url;
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    const baseUrl = new URL(window.location.origin);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + "auth/callback/",
      },
    });
    setIsLoading(false);
  };

  return (
    <div>
      <div className="px-10 mt-48">
        <div className="text-sm underline text-slate-500 decoration-wavy flex  items-baseline">
          Souce Code on GitHub
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
              Continue as {userName}
              <img src={avatarUrl} className="h-6 w-6 mx-1" alt={userName} />-
              {">"}
            </Link>
          </Button>
        ) : (
          <Button
            size="default"
            onClick={handleGitHubLogin}
            disabled={isLoading}
          >
            Continue with GitHub -{">"}
          </Button>
        )}
        <p className="text-xs mt-1 text-slate-500">
          *GitLab support coming soon.
        </p>
      </div>
    </div>
  );
}
