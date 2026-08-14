"use client";

import * as React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { createClient } from "~/lib/supabase/client";
import { RequestInfoProvider, type RequestInfo } from "~/utils/request-info";

const SupabaseContext = React.createContext<SupabaseClient | null>(null);

export function useSupabase() {
  const client = React.useContext(SupabaseContext);
  if (!client) throw new Error("useSupabase must be used within <Providers>");
  return client;
}

export function Providers({
  serverAccessToken,
  requestInfo,
  children,
}: {
  serverAccessToken: string | undefined;
  requestInfo: RequestInfo;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = React.useState(() => createClient());
  const [posthogLoaded, setPosthogLoaded] = React.useState(false);
  const hadSessionRef = React.useRef(Boolean(serverAccessToken));

  // Initialize PostHog once on the client.
  React.useEffect(() => {
    if (typeof window !== "undefined" && !posthogLoaded) {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return;
      posthog.init(key, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        loaded: (ph) => {
          if (process.env.NODE_ENV === "development") ph.debug();
          setPosthogLoaded(true);
        },
        capture_pageview: false, // captured manually below
        capture_pageleave: true, // bounce rate + time-on-page
        capture_exceptions: true, // client error tracking
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual pageview capture on route change.
  React.useEffect(() => {
    if (posthogLoaded) posthog.capture("$pageview");
  }, [posthogLoaded, pathname]);

  // Keep server and client auth in sync: refresh RSC data when the token
  // diverges from the server-rendered session.
  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore background token refreshes — they change the access_token on a
      // ~hourly cadence and would otherwise re-fetch every Server Component.
      if (event === "TOKEN_REFRESHED") return;
      // Re-assert identity on every session (INITIAL_SESSION included) so a
      // returning visitor maps to their person even after a cookie reset.
      if (session?.user?.id && posthogLoaded) {
        try {
          posthog.identify(session.user.id, {
            email: session.user.email,
            github_username: session.user.user_metadata?.user_name,
            name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
          });
          if (event === "SIGNED_IN" && !hadSessionRef.current) {
            posthog.capture("login_completed");
          }
        } catch {}
      }
      hadSessionRef.current = Boolean(session);
      if (session?.access_token !== serverAccessToken) {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [serverAccessToken, router, posthogLoaded, supabase]);

  return (
    <SupabaseContext.Provider value={supabase}>
      <RequestInfoProvider value={requestInfo}>{children}</RequestInfoProvider>
    </SupabaseContext.Provider>
  );
}
