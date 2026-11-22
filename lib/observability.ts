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

export function classifyGithubFailure(failure: {
  status: number;
  message?: string;
  timedOut?: boolean;
  graphqlErrorType?: string | null;
  rateLimitRemaining?: string | null;
}): GithubFailureReason {
  if (failure.timedOut) return "timeout";
  if (
    failure.status === 429 ||
    failure.rateLimitRemaining === "0" ||
    failure.graphqlErrorType === "RATE_LIMITED" ||
    /rate limit/i.test(failure.message ?? "")
  ) {
    return "rate_limited";
  }
  if (failure.status >= 500) return "github_down";
  return "error";
}

export interface GithubFailureReport {
  /** Call site: "search:history:p2", "graphql-repo-breakdown:p3", "user". */
  source: string;
  /** HTTP status; 0 when no response arrived. */
  status: number;
  message?: string;
  /** Our time limit or a network timeout ended the request. */
  timedOut?: boolean;
  /** `type` of the first GraphQL error, e.g. "RATE_LIMITED". */
  graphqlErrorType?: string | null;
  headers?: Headers;
  /** Direct rate fields for callers that can't pass Headers (cached scopes). */
  rateLimitRemaining?: string | null;
  rateLimitReset?: string | null;
  retryAfter?: string | null;
}

export function reportGithubFailure(input: GithubFailureReport) {
  const remaining =
    input.headers?.get("x-ratelimit-remaining") ??
    input.rateLimitRemaining ??
    null;
  const reset =
    input.headers?.get("x-ratelimit-reset") ?? input.rateLimitReset ?? null;
  const retryAfter =
    input.headers?.get("retry-after") ?? input.retryAfter ?? null;
  const reason = classifyGithubFailure({
    status: input.status,
    message: input.message,
    timedOut: input.timedOut,
    graphqlErrorType: input.graphqlErrorType,
    rateLimitRemaining: remaining,
  });

  console.error(
    `github request failed [${input.source}] ${input.status} ${reason}`,
    {
      message: input.message,
      timedOut: input.timedOut ?? false,
      graphqlErrorType: input.graphqlErrorType ?? null,
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
    timed_out: input.timedOut ?? false,
    graphql_error_type: input.graphqlErrorType ?? null,
    rate_limit_remaining: remaining,
    rate_limit_reset: reset,
    retry_after: retryAfter,
  });
  return reason;
}
