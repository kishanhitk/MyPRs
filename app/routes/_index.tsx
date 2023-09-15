import type { LoaderArgs, V2_MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Button } from "~/components/ui/button";
import { createServerClient } from "@supabase/auth-helpers-remix";
import type { Env } from "~/types/shared";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/supabase-js";

export const meta: V2_MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ request, context }: LoaderArgs) => {
  const response = new Response();
  const env = context.env as Env;
  console.log(context.env);
  const supabaseClient = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data } = await supabaseClient.from("test").select("*");
  console.log(data);

  const user = await supabaseClient.auth.getUser();
  return json(
    { data, user },
    {
      headers: response.headers,
    }
  );
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "http://localhost:8788/auth/callback",
      },
    });
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
      <Button onClick={handleGitHubLogin} className="m-4" variant="outline">
        Login with GitHub
      </Button>
      {user.data?.user?.email && <p>Logged in as {user.data.user.email}</p>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
