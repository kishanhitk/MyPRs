"use client";

import * as React from "react";
import posthog from "posthog-js";

// Real 404 for unknown usernames. No request-bound hooks here — usePathname
// would force this boundary to render client-only, leaving crawlers and
// no-JS agents an empty body; window.location in the effect keeps the
// analytics beacon without costing the server render.
export default function ProfileNotFound() {
  const captured = React.useRef(false);
  React.useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    posthog.capture("profile_error", {
      profile: window.location.pathname.slice(1),
      type: "not_found",
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
        No GitHub user by that name.
      </p>
      <p className="font-mono mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Yours is waiting at myprs.dev/&lt;your-github-username&gt;.
      </p>
    </div>
  );
}
