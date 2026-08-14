import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { getProfileData } from "~/lib/profile";
import { LoginCTA } from "./LoginCTA";

export const metadata: Metadata = {
  title: "MyPRs - One link to highlight your Open-Source Contributions",
  description:
    "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
  openGraph: {
    title: "MyPRs - One link to highlight your Open-Source Contributions",
    description:
      "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    url: "https://myprs.dev/",
    images: ["https://www.myprs.dev/assets/og-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyPRs - One link to highlight your Open-Source Contributions",
    description:
      "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    images: ["https://www.myprs.dev/assets/og-banner.png"],
  },
};

const DEMO_USER = "kishanhitk";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.user_name as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  // The demo is the pitch: real cards from a live profile, not a screenshot.
  const demo = await getProfileData(DEMO_USER);
  const demoPRs = [...demo.featuredPRs, ...demo.nonFeaturedPRs].slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <a
        href="https://github.com/kishanhitk/MyPRs"
        className="rise font-mono text-xs text-zinc-500 underline decoration-wavy underline-offset-4 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Star the repo on GitHub ↗
      </a>

      <h1
        className="rise mt-6 text-[clamp(34px,6vw,46px)] font-semibold leading-[1.1] text-zinc-900 dark:text-zinc-100"
        style={{ "--d": "60ms" } as React.CSSProperties}
      >
        One link to{" "}
        <span className="underline decoration-github_merged/60 underline-offset-4">
          highlight
        </span>{" "}
        your open-source contributions.
      </h1>

      <p
        className="rise mt-4 text-zinc-600 dark:text-zinc-300"
        style={{ "--d": "120ms" } as React.CSSProperties}
      >
        The link-in-bio for your merged pull requests. Curate your proudest
        work, hide the noise, and share one page that proves you ship.
      </p>

      <div
        className="rise mt-6"
        style={{ "--d": "180ms" } as React.CSSProperties}
      >
        {userName ? (
          <Button asChild>
            <Link href={`/${userName}`} prefetch>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                className="mr-2 h-6 w-6 rounded-full"
                alt={userName}
              />
              Continue as {userName} →
            </Link>
          </Button>
        ) : (
          <LoginCTA />
        )}
        <p className="font-mono mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Your page already exists — myprs.dev/&lt;your-github-username&gt;
        </p>
      </div>

      {demoPRs.length ? (
        <section
          className="rise mt-14"
          style={{ "--d": "240ms" } as React.CSSProperties}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Live —{" "}
            <Link
              href={`/${DEMO_USER}`}
              prefetch
              className="underline-offset-4 hover:underline"
            >
              myprs.dev/{DEMO_USER}
            </Link>
          </p>
          <div className="relative mt-4">
            <span
              aria-hidden
              className="rail-line absolute bottom-2 left-3 top-1 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
            <ul>
              {demoPRs.map((item, idx) => (
                <li key={item.id} className="relative pl-10 pb-2">
                  <span
                    aria-hidden
                    className={`absolute left-[7px] top-[22px] h-[11px] w-[11px] rounded-full border-2 bg-[#fdfafa] dark:bg-[#191919] ${
                      idx === 0
                        ? "border-github_merged dark:border-[#A371F7]"
                        : "border-zinc-400 dark:border-zinc-600"
                    }`}
                  />
                  <span
                    aria-hidden
                    className="absolute left-[12px] top-[27px] h-px w-5 bg-zinc-200 dark:bg-zinc-800"
                  />
                  <Link
                    href={`/${DEMO_USER}`}
                    prefetch
                    className="group -mx-3 block rounded-lg border border-transparent px-3 py-2 transition-colors duration-150 hover:border-zinc-200 hover:bg-white dark:hover:border-zinc-800 dark:hover:bg-zinc-900/60"
                  >
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {item.repository_url.slice(29)}
                    </span>
                    <span className="mt-0.5 block text-[15px] font-medium leading-snug text-zinc-900 dark:text-zinc-200">
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <p className="font-mono mt-10 text-xs text-zinc-500 dark:text-zinc-400">
        *GitLab support coming soon.
      </p>
    </div>
  );
}
