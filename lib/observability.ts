import { cookies } from "next/headers";
import { after } from "next/server";
import { PostHog } from "posthog-node";

// Server-side PostHog events. captureServerEvent sends events that only the
// server can see, such as login_completed from the auth callback.
// reportGithubFailure logs each non-ok GitHub response to the Vercel function
// logs and sends a `github_request_failed` event. The client alone misses
// failures on pages the browser never renders (OG images, crawlers).

export type GithubFailureReason =
  | "rate_limited"
  | "github_down"
  | "timeout"
  | "error";

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client === undefined) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    client = key
      ? new PostHog(key, {
          host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        })
      : null;
  }
  return client;
}

// after(): send once the response is done, never on the render path.
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const posthog = getClient();
  if (!posthog) return;
  after(async () => {
    try {
      await posthog.captureImmediate({ distinctId, event, properties });
    } catch (error) {
      console.error("posthog server capture failed:", error);
    }
  });
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// posthog-js keeps its distinct id in this cookie. A server event sent with
// it joins the same person as the visitor's browser events. The id is a UUID
// (anonymous id or Supabase user id); a visitor can edit the cookie, so any
// other text is refused.
export async function getBrowserDistinctId(): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  const raw = (await cookies()).get(`ph_${key}_posthog`)?.value;
  if (!raw) return null;
  try {
    const id: unknown = JSON.parse(raw).distinct_id;
    return typeof id === "string" && UUID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function classifyGithubFailure(
  status: number,
  message: string | undefined,
  rateLimitRemaining: string | null | undefined
): GithubFailureReason {
  if (status === 0) return "timeout";
  if (
    status === 429 ||
    rateLimitRemaining === "0" ||
    /rate limit/i.test(message ?? "")
  ) {
    return "rate_limited";
  }
  if (status >= 500) return "github_down";
  return "error";
}

export function reportGithubFailure(input: {
  /** Call site: "search:history:p2", "search:since-year", "user", "graphql". */
  source: string;
  status: number;
  message?: string;
  headers?: Headers;
  /** Direct rate fields for callers that can't pass Headers (cached scopes). */
  rateLimitRemaining?: string | null;
  rateLimitReset?: string | null;
  retryAfter?: string | null;
}) {
  const remaining =
    input.headers?.get("x-ratelimit-remaining") ??
    input.rateLimitRemaining ??
    null;
  const reset =
    input.headers?.get("x-ratelimit-reset") ?? input.rateLimitReset ?? null;
  const retryAfter =
    input.headers?.get("retry-after") ?? input.retryAfter ?? null;
  const reason = classifyGithubFailure(input.status, input.message, remaining);

  console.error(
    `github request failed [${input.source}] ${input.status} ${reason}`,
    {
      message: input.message,
      rateLimitRemaining: remaining,
      rateLimitReset: reset,
      retryAfter,
    }
  );

  captureServerEvent("server", "github_request_failed", {
    source: input.source,
    status: input.status,
    reason,
    message: input.message,
    rate_limit_remaining: remaining,
    rate_limit_reset: reset,
    retry_after: retryAfter,
  });
  return reason;
}
