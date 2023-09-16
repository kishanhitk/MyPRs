import type { LoaderArgs, V2_MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useOutletContext } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "~/components/ui/button";
import type { Env } from "~/types/shared";

export const meta: V2_MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ request, context }: LoaderArgs) => {
  const response = new Response();
  const env = context.env as Env;
  const supabaseClient = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (user) {
    const gitHubUserName = user.user_metadata.user_name;
    return redirect(`/${gitHubUserName}`, {
      headers: response.headers,
    });
  }

  return json({
    headers: response.headers,
  });
};

export default function Index() {
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleGitHubLogin = async () => {
    const baseUrl = new URL(window.location.origin);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: baseUrl + "auth/callback",
      },
    });
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <Button onClick={handleGitHubLogin} className="m-4" variant="default">
        Login with GitHub
      </Button>
    </div>
  );
}
