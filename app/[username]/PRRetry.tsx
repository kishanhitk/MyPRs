"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

// Degraded mode: identity and the contribution graph rendered, but the PR
// search failed (usually GitHub rate-limiting the search pool). Poll the
// prs route with backoff; the first success warms the server cache, so a
// refresh re-renders the full page.
const BASE_DELAY_MS = 8000;
const MAX_DELAY_MS = 30000;
const MAX_ATTEMPTS = 10;

export default function PRRetry({
  username,
  reason,
}: {
  username: string;
  reason: string;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    posthog.capture("profile_degraded", { profile: username, reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  React.useEffect(() => {
    if (attempt >= MAX_ATTEMPTS) return;
    let cancelled = false;
    const delay =
      Math.min(BASE_DELAY_MS * (attempt + 1), MAX_DELAY_MS) +
      Math.random() * 2000;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/${username}/prs`);
        if (cancelled) return;
        if (res.ok) {
          posthog.capture("profile_degraded_recovered", {
            profile: username,
            attempts: attempt + 1,
          });
          router.refresh();
          return;
        }
      } catch {
        // network hiccup — fall through to the next attempt
      }
      if (!cancelled) setAttempt((a) => a + 1);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt, username, router]);

  return (
    <div className="relative mt-10">
      <span
        aria-hidden
        className="rail-line absolute bottom-2 left-3 top-0 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800"
      />
      <p className="font-mono relative pl-10 text-sm text-zinc-500 dark:text-zinc-400">
        {attempt >= MAX_ATTEMPTS
          ? "GitHub still isn't answering — reload the page to try again."
          : reason === "rate_limited"
            ? "GitHub is rate-limiting us right now — the pull requests will load automatically in a moment."
            : "GitHub isn't answering right now — retrying automatically."}
      </p>
    </div>
  );
}
