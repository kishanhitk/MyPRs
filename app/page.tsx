import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Highlighter } from "~/components/ui/highlighter";
import { AnimatedShinyText } from "~/components/ui/animated-shiny-text";
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
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyPRs - One link to highlight your Open-Source Contributions",
    description:
      "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    images: ["/api/og"],
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1
        className="rise text-[clamp(34px,6vw,46px)] font-semibold leading-[1.1] tracking-[-0.02em] text-zinc-900 dark:text-zinc-100"
      >
        One link to{" "}
        <Highlighter action="highlight" delay={700} animationDuration={700}>
          highlight
        </Highlighter>{" "}
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

      <Suspense fallback={<DemoSkeleton />}>
        <DemoSection />
      </Suspense>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-3">
        <a
          href="https://github.com/kishanhitk/MyPRs"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 font-mono text-xs text-zinc-600 transition-colors duration-150 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
        >
          <span aria-hidden className="group-hover:hidden">
            ☆
          </span>
          <span aria-hidden className="hidden group-hover:inline">
            ★
          </span>
          <AnimatedShinyText>Star on GitHub ↗</AnimatedShinyText>
        </a>
        <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-600">
          *GitLab support coming soon.
        </p>
      </div>
    </div>
  );
}

// Streams in after the shell: the demo needs the full profile fetch, which
// is the slow path on a cold cache. The shell paints immediately.
async function DemoSection() {
  const demo = await getProfileData(DEMO_USER);
  const demoPRs = [...demo.featuredPRs, ...demo.nonFeaturedPRs].slice(0, 3);
  if (!demoPRs.length) return null;

  return (
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
                <li key={item.id} className="group relative pl-10 pb-2">
                  <span
                    aria-hidden
                    className="absolute left-[18px] top-[27px] h-px w-[14px] bg-zinc-200 transition-colors duration-150 group-hover:bg-zinc-300 dark:bg-zinc-800 dark:group-hover:bg-zinc-700"
                  />
                  <span
                    aria-hidden
                    className={`absolute left-[7px] top-[22px] h-[11px] w-[11px] rounded-full border-2 transition-colors duration-150 ${
                      idx === 0
                        ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                        : "border-zinc-400 bg-[#fdfafa] group-hover:border-zinc-500 dark:border-zinc-600 dark:bg-[#191919] dark:group-hover:border-zinc-500"
                    }`}
                  />
                  <Link
                    href={`/${DEMO_USER}`}
                    prefetch
                    className="block py-2"
                  >
                    <span className="block truncate text-[15px] font-medium leading-snug text-zinc-900 decoration-zinc-300 underline-offset-4 group-hover:underline dark:decoration-zinc-600 dark:text-zinc-200">
                      {item.title}
                    </span>
                    <span className="font-mono mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      {item.repo}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
  );
}

function DemoSkeleton() {
  // Just reserved space — the demo streams into exactly this box, so the
  // footer row below never moves. Height = label row + gap + 3 fixed cards.
  return <section aria-hidden className="mt-14 h-[228px]" />;
}
