import { revalidateTag } from "next/cache";
import { NextResponse, after } from "next/server";
import { createClient } from "~/lib/supabase/server";

// Prevents an open redirect via the `redirectTo` param. Resolve the value
// against our own origin and only accept it if it stays same-origin — this
// rejects "//evil.com", "https://evil.com", and backslash tricks like
// "/\evil.com" (the URL parser normalizes "\" to "/") in one check.
function safeRelativePath(
  value: string | null,
  origin: string
): string | null {
  if (!value || value === "false") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const resolved = new URL(value, origin);
    if (resolved.origin !== origin) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo");
  // A real deep path (e.g. the profile being viewed at login) is preserved;
  // otherwise land on the instant homepage while the profile warms behind
  // (the "Continue as" link there is prefetched and will be warm on click).
  const redirectUrl = safeRelativePath(redirectTo, url.origin);

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(new URL("/?error=auth", url.origin));
    }
    const githubUsername = data.user?.user_metadata?.user_name;

    if (githubUsername) {
      // A profile viewed before its owner ever signed in cached a missing
      // curation row (no ownerRowId) — without this purge the owner could
      // not curate for up to an hour after their first login. updateTag is
      // Server-Action-only; revalidateTag is the Route Handler equivalent
      // (SWR semantics: at worst one stale render right after login).
      revalidateTag(`curation-${githubUsername}`, "max");

      // Warm the profile while they read the homepage: a real self-fetch
      // through the normal render path fills the use-cache-remote entries
      // AND the cached shell, starting the 5-14s cold fill at the earliest
      // possible moment. after() runs once the redirect is sent.
      const profileUrl = new URL(`/${githubUsername}`, url.origin);
      after(async () => {
        try {
          await fetch(profileUrl, { cache: "no-store" });
          console.log(`login warm completed for ${githubUsername}`);
        } catch (error) {
          console.error("login warm failed:", error);
        }
      });
    }
  }

  return NextResponse.redirect(new URL(redirectUrl ?? "/", url.origin));
}
