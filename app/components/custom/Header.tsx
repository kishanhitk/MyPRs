import { Link, useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { Button } from "../ui/button";
import type { SupabaseClient } from "@supabase/supabase-js";
import posthog from "posthog-js";
import PullRequestIcon from "./PullRequestIcon";
import DarkModeToggle from "./DarkModeToggle";
import { loader } from "~/root";

interface HeaderProps {
  supabase: SupabaseClient;
}
export const Header = ({ supabase }: HeaderProps) => {
  const { user } = useRouteLoaderData<typeof loader>("root");

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    posthog.reset();
  };

  return (
    <>
      <div className="py-2 px-4 flex justify-between items-center">
        <Link
          to="/"
          className="font-semibold text-lg flex items-center "
          prefetch="intent"
        >
          MyPRs
          <PullRequestIcon className="h-4 w-4 ml-1 mb-1 dark:fill-white"></PullRequestIcon>
        </Link>

        <div className="flex">
          <DarkModeToggle />
          {user ? (
            <div className="flex items-center">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleGitHubLogin}>
              Login
            </Button>
          )}
        </div>
      </div>
      <div className="h-[1px] w-full bg-slate-200 dark:bg-slate-700"></div>
    </>
  );
};
