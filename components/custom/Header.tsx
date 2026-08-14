"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { Button } from "../ui/button";
import PullRequestIcon from "./PullRequestIcon";
import DarkModeToggle from "./DarkModeToggle";
import { useSupabase } from "~/app/providers";

interface HeaderProps {
  user: User | null;
}

export const Header = ({ user }: HeaderProps) => {
  const supabase = useSupabase();

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
        <Link href="/" className="font-semibold text-lg flex items-center ">
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
