import type { LoaderArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/auth-helpers-remix";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { Button } from "~/components/ui/button";
import { getPRsFromGithubAPI } from "~/lib/github";
import type { Env } from "~/types/shared";

export const loader = async ({ request, context, params }: LoaderArgs) => {
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
  const { data: ghData, error } = await getPRsFromGithubAPI({
    author: params.username!,
  });

  console.log("ghData", ghData);

  return json(
    { user, ghData, error },
    {
      headers: response.headers,
    }
  );
};

const Index = () => {
  const { user, ghData } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext() as { supabase: SupabaseClient };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <div>
      {user ? (
        <>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </>
      ) : null}

      {ghData ? (
        <>
          <img
            src={ghData.items[0].user.avatar_url}
            alt={ghData.items[0].user.login}
          ></img>
          {ghData.items[0].user.login}
          {ghData.items.map((item) => (
            <a
              href={item.html_url}
              className="border p-4 m-2 rounded-md block"
              key={item.id}
            >
              {item.title}
            </a>
          ))}
        </>
      ) : (
        <p>The username is not valid</p>
      )}
    </div>
  );
};

export default Index;
