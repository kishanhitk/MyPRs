import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { createClient } from "@supabase/supabase-js";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo");
  let redirectUrl = redirectTo && redirectTo !== "false" ? redirectTo : "/";

  if (code) {
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    const { data } = await supabaseClient.auth.exchangeCodeForSession(code);
    const githubUsername = data.user?.user_metadata.user_name;

    if (githubUsername && redirectTo !== "false") {
      redirectUrl = `/${githubUsername}`;
    }
  }

  return redirect(redirectUrl);
};
