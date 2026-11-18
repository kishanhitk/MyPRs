"use client";

import * as React from "react";
import posthog from "posthog-js";
import { useSession } from "~/app/providers";

// One profile_viewed per profile view. The capture waits until the session
// resolves (undefined -> null | Session) so is_owner and is_self are final.
export default function ProfileViewTracker({
  username,
  ownerRowId,
  totalCount,
  featuredCount,
}: {
  username: string;
  ownerRowId: string | undefined;
  totalCount: number;
  featuredCount: number;
}) {
  const session = useSession();
  const captured = React.useRef(false);

  React.useEffect(() => {
    if (session === undefined || captured.current) return;
    captured.current = true;
    const viewerLogin: unknown = session?.user.user_metadata?.user_name;
    posthog.capture("profile_viewed", {
      profile: username,
      is_owner: Boolean(ownerRowId && session?.user.id === ownerRowId),
      is_self:
        typeof viewerLogin === "string" &&
        viewerLogin.toLowerCase() === username.toLowerCase(),
      is_claimed: Boolean(ownerRowId),
      total_prs: totalCount,
      featured_count: featuredCount,
    });
  }, [session, username, ownerRowId, totalCount, featuredCount]);

  return null;
}
