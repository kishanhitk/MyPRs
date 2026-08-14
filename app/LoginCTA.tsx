"use client";

import { ArrowRight } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "~/components/ui/button";
import { useSupabase } from "./providers";

export function LoginCTA() {
  const supabase = useSupabase();

  const handleGitHubLogin = async () => {
    posthog.capture("login_clicked", { source: "homepage_cta" });
    const baseUrl = new URL(window.location.origin);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + `auth/callback?redirectTo=false&`,
      },
    });
    if (error) console.error("GitHub sign-in failed:", error.message);
  };

  return (
    <Button
      onClick={handleGitHubLogin}
      className="animate-in hover:scale-105 hover:shadow-md transition-all duration-500"
    >
      Continue with GitHub
      <ArrowRight aria-hidden className="ml-1.5 size-4" />
    </Button>
  );
}
