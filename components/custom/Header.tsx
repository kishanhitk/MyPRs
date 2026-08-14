"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
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
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100"
        >
          MyPRs
          <PullRequestIcon className="mb-0.5 h-4 w-4 fill-github_merged dark:fill-[#A371F7]" />
        </Link>

        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <button
            type="button"
            onClick={user ? handleLogout : handleGitHubLogin}
            className="font-mono text-xs text-zinc-500 underline-offset-4 transition-colors duration-150 hover:text-zinc-900 hover:underline active:scale-95 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {user ? "logout" : "login ↗"}
          </button>
        </div>
      </div>
    </header>
  );
};
