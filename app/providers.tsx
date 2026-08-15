"use client";

import * as React from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import posthog from "posthog-js";
import { createClient } from "~/lib/supabase/client";

const SupabaseContext = React.createContext<SupabaseClient | null>(null);

export function useSupabase() {
  const client = React.useContext(SupabaseContext);
  if (!client) throw new Error("useSupabase must be used within <Providers>");
  return client;
}

// The static shell renders the visitor view for everyone; owner and login
// affordances hydrate from this client-side session. undefined = still
// resolving (render nothing owner-specific yet), null = signed out.
const SessionContext = React.createContext<Session | null | undefined>(
  undefined
);

export function useSession() {
  return React.useContext(SessionContext);
}

// "View as visitor" preview — shared so every owner affordance (share,
// curate, filter) hides together, not just the PR sections.
const VisitorPreviewContext = React.createContext<{
  previewing: boolean;
  setPreviewing: (v: boolean) => void;
}>({ previewing: false, setPreviewing: () => {} });

export function useVisitorPreview() {
  return React.useContext(VisitorPreviewContext);
}

// usePathname is request-dependent, which would block the static shell if
// called in Providers itself; isolated here it streams in after prerender.
function PageViewTracker({ ready }: { ready: boolean }) {
  const pathname = usePathname();
  React.useEffect(() => {
    if (ready) posthog.capture("$pageview");
  }, [ready, pathname]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabase] = React.useState(() => createClient());
  const [session, setSession] = React.useState<Session | null | undefined>(
    undefined
  );
  const [posthogLoaded, setPosthogLoaded] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const hadSessionRef = React.useRef(false);

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
        capture_performance: { web_vitals: true }, // LCP/CLS/INP per view
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Background token refreshes change the access_token hourly; they
      // are not a state change the UI cares about.
      if (event === "TOKEN_REFRESHED") return;
      setSession(nextSession);
      // Re-assert identity on every session (INITIAL_SESSION included) so a
      // returning visitor maps to their person even after a cookie reset.
      if (nextSession?.user?.id && posthogLoaded) {
        try {
          posthog.identify(nextSession.user.id, {
            email: nextSession.user.email,
            github_username: nextSession.user.user_metadata?.user_name,
            name: nextSession.user.user_metadata?.full_name,
            avatar_url: nextSession.user.user_metadata?.avatar_url,
          });
          if (event === "SIGNED_IN" && !hadSessionRef.current) {
            posthog.capture("login_completed");
          }
        } catch {}
      }
      const had = hadSessionRef.current;
      hadSessionRef.current = Boolean(nextSession);
      // Login/logout changes what server actions may do; refresh RSC data
      // only on a real transition, never on the initial resolution.
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && !had)) {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, posthogLoaded, supabase]);

  return (
    <SupabaseContext.Provider value={supabase}>
      <SessionContext.Provider value={session}>
        <VisitorPreviewContext.Provider value={{ previewing, setPreviewing }}>
          <Suspense fallback={null}>
            <PageViewTracker ready={posthogLoaded} />
          </Suspense>
          {children}
        </VisitorPreviewContext.Provider>
      </SessionContext.Provider>
    </SupabaseContext.Provider>
  );
}
