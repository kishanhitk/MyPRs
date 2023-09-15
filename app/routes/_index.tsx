import type { LoaderArgs, V2_MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Button } from "~/components/ui/button";
import { createServerClient } from "@supabase/auth-helpers-remix";
import type { Env } from "~/types/shared";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";

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

  const user = await supabaseClient.auth.getUser();

  // var d = "2018-09-30T10%3A00%3A00%2B00%3A00"; // start date
  // var f = "2018-11-01T12%3A00%3A00%2B00%3A00"; // end date
  const currentDate = new Date();
  const currentDateForTheApi = currentDate.toISOString();
  const OneYearAgoDateForTheAPi = new Date(
    currentDate.setFullYear(currentDate.getFullYear() - 1)
  ).toISOString();

  var t = "kishanhitk";

  var url = `https://api.github.com/search/issues?q=-label:invalid+created:${OneYearAgoDateForTheAPi}..${currentDateForTheApi}+type:pr+is:public+author:${t}&per_page=30`;
  // console.log(url);
  const resp = await fetch(url);
  const ghData = await resp.json();
  console.log(ghData);
  return json(
    { user, url, ghData },
    {
      headers: response.headers,
    }
  );
};

export default function Index() {
  const { user, url, ghData } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const fetchData = async () => {
      const resp = await fetch(url);
      console.log(resp);
      const data1 = await resp.json();
      console.log(data1);
    };
    fetchData();
  }, []);

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

      {JSON.stringify(ghData)}
    </div>
  );
}
