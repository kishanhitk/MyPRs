import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const response = new Response();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabaseClient = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { request, response }
    );
    const resp = await supabaseClient.auth.exchangeCodeForSession(code);
    console.log("AUTH RESPO", resp);
  }

  return redirect("/", {
    headers: response.headers,
  });
};
