import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useRevalidator,
} from "@remix-run/react";
import styles from "./tailwind.css";
import { useEffect, useState } from "react";
import {
  createBrowserClient,
  createServerClient,
} from "@supabase/auth-helpers-remix";
import { Analytics } from "@vercel/analytics/react";
import { type LinksFunction, type LoaderFunctionArgs } from "@vercel/remix";
import { Header } from "./components/custom/Header";
import FontStyles from "@fontsource/inter/index.css";
import { json } from "@vercel/remix";
import { useNonce } from "./utils/noonce-provider";
import clsx from "clsx";
import { useTheme } from "./utils/theme";
import posthog from "posthog-js";
import { ClientHintCheck, getHints } from "./utils/client-hints";
import { getTheme } from "./utils/theme.server";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  {
    rel: "stylesheet",
    href: FontStyles,
  },
];

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    POSTHOG_KEY: process.env.POSTHOG_KEY!,
    POSTHOG_HOST: process.env.POSTHOG_HOST!,
    NODE_ENV: process.env.NODE_ENV!,
  };

  const response = new Response();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      request,
      response,
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return json(
    {
      env,
      session,
      user: session?.user,
      requestInfo: {
        hints: getHints(request),
        userPrefs: {
          theme: getTheme(request),
        },
      },
    },
    {
      headers: response.headers,
    }
  );
};

export default function App() {
  const nonce = useNonce();
  const theme = useTheme();
  const { env, session } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const [supabase] = useState(() =>
    createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );
  const [posthogLoaded, setPosthogLoaded] = useState(false);
  const location = useLocation();

  const serverAccessToken = session?.access_token;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== serverAccessToken) {
        // server and client are out of sync.
        if (session?.user?.id && session?.user?.email && posthogLoaded) {
          try {
            posthog.identify(
              session?.user?.id, // Replace 'distinct_id' with your user's unique identifier
              { email: session?.user?.email } // optional: set additional user properties
            );
          } catch (error) {}
        }

        revalidate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverAccessToken, revalidate, posthogLoaded]);

  useEffect(() => {
    if (typeof window !== "undefined" && !posthogLoaded) {
      posthog.init(env.POSTHOG_KEY, {
        api_host: env.POSTHOG_HOST || "https://app.posthog.com",
        // Enable debug mode in development
        loaded: (posthog) => {
          if (env.NODE_ENV === "development") posthog.debug();
          setPosthogLoaded(true);
        },
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      });
    }
  }, []);

  useEffect(() => {
    if (posthogLoaded) {
      posthog.capture("$pageview");
    }
  }, [posthogLoaded, location.pathname]);

  return (
    <html lang="en" className={clsx(theme)}>
      <head>
        {/* @ts-ignore */}
        <ClientHintCheck nonce={nonce} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="max-w-4xl mx-auto bg-[#fdfafa] dark:bg-[#191919]">
        {/* @ts-ignore */}
        <Header supabase={supabase} />
        <DndProvider backend={HTML5Backend}>
          <Outlet context={{ supabase }} />
        </DndProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Analytics />
      </body>
    </html>
  );
}
