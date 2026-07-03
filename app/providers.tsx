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

  // Initialize PostHog once on the client.
  React.useEffect(() => {
    if (typeof window !== "undefined" && !posthogLoaded) {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return;
      posthog.init(key, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        loaded: (ph) => {
          if (process.env.NODE_ENV === "development") ph.debug();
          setPosthogLoaded(true);
        },
        capture_pageview: false, // captured manually below
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token !== serverAccessToken) {
        if (session?.user?.id && session?.user?.email && posthogLoaded) {
          try {
            posthog.identify(session.user.id, { email: session.user.email });
          } catch {}
        }
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
