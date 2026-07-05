import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

// Only allow same-origin relative paths ("/foo"), never "//evil.com" or
// "https://evil.com" — prevents an open redirect via the `redirectTo` param.
function safeRelativePath(value: string | null): string | null {
  if (!value || value === "false") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo");
  let redirectUrl = safeRelativePath(redirectTo) ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(new URL("/?error=auth", url.origin));
    }
    const githubUsername = data.user?.user_metadata?.user_name;

    if (githubUsername && redirectTo !== "false") {
      redirectUrl = `/${githubUsername}`;
    }
  }

  return NextResponse.redirect(new URL(redirectUrl, url.origin));
}
