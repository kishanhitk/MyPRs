import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import { SITE_URL } from "~/lib/site";
import { Analytics } from "@vercel/analytics/react";
import { Header } from "~/components/custom/Header";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MyPRs - One link to highlight your Open-Source Contributions",
  description:
    "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
};

// Pre-paint theme: explicit cookie first, OS preference otherwise. Keeping
// this out of the server render is what lets every route prerender — a
// cookies() read here would dynamize the whole app.
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)en_theme=(light|dark)/);var t=m?m[1]:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var c=document.documentElement.classList;c.toggle("dark",t==="dark");c.toggle("light",t!=="dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore-like note: must run before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="max-w-4xl mx-auto bg-[#fdfafa] dark:bg-[#191919]">
        <Providers>
          <Header />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
