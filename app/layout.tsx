import "@fontsource/inter";
import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/react";
import { ClientHintCheck } from "~/utils/ClientHintCheck";
import { getHints } from "~/utils/client-hints";
import { getTheme } from "~/utils/theme.server";
import { createClient } from "~/lib/supabase/server";
import { Header } from "~/components/custom/Header";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myprs.dev"
  ),
  title: "MyPRs - One link to highlight your Open-Source Contributions",
  description:
    "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hints = getHints(cookieStore.toString());
  const userPrefs = { theme: await getTheme() };
  const theme = userPrefs.theme ?? hints.theme;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <head>
        <ClientHintCheck />
      </head>
      <body className="max-w-4xl mx-auto bg-[#fdfafa] dark:bg-[#191919]">
        <Providers
          serverAccessToken={session?.access_token}
          requestInfo={{ hints, userPrefs }}
        >
          <Header user={session?.user ?? null} />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
