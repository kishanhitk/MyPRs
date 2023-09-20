import {
  redirect,
  type HeadersFunction,
  type LoaderFunctionArgs,
  json,
} from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import { useOutletContext } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "~/components/ui/button";

// export const headers: HeadersFunction = () => ({
//   "Cache-Control": "public, max-age=10, s-maxage=20",
// });

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabaseClient = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
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
  return json(
    {},
    {
      headers: {
        // "Cache-Control": "public, max-age=300, s-maxage=3600",
        ...response.headers,
      },
    }
  );
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
