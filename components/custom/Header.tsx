"use client";

import Link from "next/link";
import posthog from "posthog-js";
import PullRequestIcon from "./PullRequestIcon";
import DarkModeToggle from "./DarkModeToggle";
import { useSession, useSupabase } from "~/app/providers";

export const Header = () => {
  const supabase = useSupabase();
  // Static shell renders the signed-out state; the label corrects itself
  // once the client session resolves.
  const user = useSession()?.user ?? null;

  const handleGitHubLogin = async () => {
    posthog.capture("login_clicked", { source: "header" });
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
    posthog.capture("logged_out");
    await supabase.auth.signOut();
    posthog.reset();
  };

  return (
    <header className="site-header sticky top-0 z-20">
      <div className="mx-auto flex max-w-2xl items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100"
        >
          MyPRs
          <PullRequestIcon className="h-[13px] w-[13px] fill-zinc-900 dark:fill-white" />
        </Link>

        <div className="flex items-center gap-1">
          <DarkModeToggle />
          <button
            type="button"
            onClick={user ? handleLogout : handleGitHubLogin}
            className="font-mono text-xs text-zinc-500 underline-offset-4 transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-zinc-900 hover:underline active:scale-95 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {user ? "logout" : "login ↗"}
          </button>
        </div>
      </div>
    </header>
  );
};
