import type { LoaderFunctionArgs } from "@vercel/remix";
import { redirect } from "@vercel/remix";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const response = new Response();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo");
  let redirectUrl = redirectTo ? redirectTo : "/";

  if (code) {
    const supabaseClient = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { request, response }
    );
    const { data } = await supabaseClient.auth.exchangeCodeForSession(code);
    const githubUsername = data.user?.user_metadata.user_name;
    if (githubUsername) {
      redirectUrl = `/${githubUsername}`;
    }
  }

  return redirect(redirectUrl, {
    headers: response.headers,
  });
};
