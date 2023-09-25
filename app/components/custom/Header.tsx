import { Link, useLoaderData } from "@remix-run/react";
import { Button } from "../ui/button";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GitPullRequest } from "lucide-react";

interface HeaderProps {
  supabase: SupabaseClient;
}
export const Header = ({ supabase }: HeaderProps) => {
  const { user } = useLoaderData();

  const handleGitHubLogin = async () => {
    const baseUrl = new URL(window.location.origin);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + "auth/callback",
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
          <GitPullRequest className="h-5 w-5 mb-1" />
        </Link>

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
      <div className="h-[1px] w-full bg-slate-200"></div>
    </>
  );
};
