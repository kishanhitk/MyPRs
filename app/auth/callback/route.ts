import type { User } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { NextResponse, after } from "next/server";
import {
  captureServerEvent,
  getBrowserDistinctId,
} from "~/lib/observability";
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

// Supabase Auth puts `error_code` in the redirect URL. A visitor can edit the
// URL, so only these known values go into an event.
const PROVIDER_ERROR_CODES = new Set([
  "unexpected_failure",
  "validation_failed",
  "bad_oauth_state",
  "bad_oauth_callback",
  "oauth_provider_not_supported",
  "provider_disabled",
  "provider_email_needs_verification",
  "signup_disabled",
  "user_banned",
  "email_exists",
  "identity_already_exists",
  "flow_state_not_found",
  "flow_state_expired",
  "over_request_rate_limit",
  "request_timeout",
]);

// Supabase Auth returns no first-login flag. It writes the GitHub identity
// row again on each later login, so the row is unchanged only on the login
// that created the account.
function isFirstLogin(user: User): boolean {
  const identity = user.identities?.find((i) => i.provider === "github");
  if (!identity?.created_at || !identity.updated_at) return false;
  return (
    Date.parse(identity.updated_at) - Date.parse(identity.created_at) < 1000
  );
}

function accountAgeSeconds(user: User): number | null {
  if (!user.last_sign_in_at) return null;
  return Math.round(
    (Date.parse(user.last_sign_in_at) - Date.parse(user.created_at)) / 1000
  );
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
      captureServerEvent(
        (await getBrowserDistinctId()) ?? "server",
        "login_failed",
        {
          reason: "exchange_failed",
          error_name: error.name,
          error_code: error.code ?? null,
          status: error.status ?? null,
        }
      );
      return NextResponse.redirect(new URL("/?error=auth", url.origin));
    }
    // The browser cannot tell a login from a reload; a code exchanges once.
    captureServerEvent(data.user.id, "login_completed", {
      is_new_user: isFirstLogin(data.user),
      account_age_seconds: accountAgeSeconds(data.user),
    });
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
  } else {
    const providerError = url.searchParams.get("error");
    const errorCode = url.searchParams.get("error_code");
    captureServerEvent(
      (await getBrowserDistinctId()) ?? "server",
      "login_failed",
      providerError
        ? {
            reason:
              providerError === "access_denied"
                ? "access_denied"
                : "provider_error",
            error_code:
              errorCode && PROVIDER_ERROR_CODES.has(errorCode)
                ? errorCode
                : null,
          }
        : { reason: "no_code" }
    );
  }

  return NextResponse.redirect(new URL(redirectUrl ?? "/", url.origin));
}
