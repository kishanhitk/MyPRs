import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ request, context }: LoaderArgs) => {
  const response = new Response();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabaseClient = createServerClient(
      context.env.SUPABASE_URL!,
      context.env.SUPABASE_ANON_KEY!,
      { request, response }
    );
    await supabaseClient.auth.exchangeCodeForSession(code);
  }

  return redirect("/", {
    headers: response.headers,
  });
};
