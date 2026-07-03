"use client";

import { Button } from "~/components/ui/button";
import { useSupabase } from "./providers";

export function LoginCTA() {
  const supabase = useSupabase();

  const handleGitHubLogin = async () => {
    const baseUrl = new URL(window.location.origin);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + `auth/callback?redirectTo=false&`,
      },
    });
  };

  return (
    <Button
      onClick={handleGitHubLogin}
      className="animate-in hover:scale-105 hover:shadow-md transition-all duration-500"
    >
      Continue with GitHub -{">"}
    </Button>
  );
}
