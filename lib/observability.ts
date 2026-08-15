import { after } from "next/server";
import { PostHog } from "posthog-node";

// Server-side failure reporting for GitHub API calls. Every non-ok response
// lands in the Vercel function logs AND as a durable `github_request_failed`
// PostHog event (chartable, alertable) — the client beacon alone misses
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
}) {
  const remaining = input.headers?.get("x-ratelimit-remaining") ?? null;
  const reset = input.headers?.get("x-ratelimit-reset") ?? null;
  const retryAfter = input.headers?.get("retry-after") ?? null;
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

  const posthog = getClient();
  if (!posthog) return reason;

  // after(): report once the response is done, never on the render path.
  after(async () => {
    try {
      await posthog.captureImmediate({
        distinctId: "server",
        event: "github_request_failed",
        properties: {
          source: input.source,
          status: input.status,
          reason,
          message: input.message,
          rate_limit_remaining: remaining,
          rate_limit_reset: reset,
          retry_after: retryAfter,
        },
      });
    } catch (error) {
      console.error("posthog server capture failed:", error);
    }
  });
  return reason;
}
