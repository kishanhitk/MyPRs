import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo");
  let redirectUrl = redirectTo && redirectTo !== "false" ? redirectTo : "/";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const githubUsername = data.user?.user_metadata?.user_name;

    if (githubUsername && redirectTo !== "false") {
      redirectUrl = `/${githubUsername}`;
    }
  }

  return NextResponse.redirect(new URL(redirectUrl, url.origin));
}
