import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { LoginCTA } from "./LoginCTA";

export const metadata: Metadata = {
  title: "MyPRs - One link to highlight your Open-Source Contributions",
  description:
    "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
  openGraph: {
    title: "MyPRs - One link to highlight your Open-Source Contributions",
    description:
      "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    url: "https://myprs.xyz/",
    images: ["https://www.myprs.xyz/assets/og-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyPRs - One link to highlight your Open-Source Contributions",
    description:
      "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
    images: ["https://www.myprs.xyz/assets/og-banner.png"],
  },
};

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.user_name as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="px-10 mt-28 flex md:justify-between items-center justify-center flex-wrap space-y-10">
      <div className="sm:w-1/2">
        <a
          href="https://github.com/kishanhitk/MyPRs"
          className="animate-in text-sm underline text-slate-500 decoration-wavy flex  items-baseline underline-offset-4 dark:text-slate-400"
        >
          Star the repo on GitHub
          <ExternalLinkIcon className="ml-[1px] h-3 w-3" />
        </a>
        <h1 className="animate-in font-semibold text-5xl mt-5 mb-3 leading-[1.1]">
          One link to
          <span className="underline underline-offset-4  decoration-github_merged/5 hover:decoration-github_merged/70 transition-all duration-700  ">
            {" "}
            highlight
          </span>{" "}
          your Open-Source Contributions.
        </h1>
        <h2 className="animate-in mb-3 text-slate-600 dark:text-slate-300">
          The 'link-in-bio' for your Open-Source PRs. Curate a selection of your
          proudest GitHub PRs, showcase your expertise, and set yourself apart
          in the crowd.
        </h2>
        {userName ? (
          <Button
            asChild
            className="animate-in hover:scale-105 hover:shadow-md transition-all duration-500"
          >
            <Link href={`/${userName}`} prefetch>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                className="h-6 w-6 mr-2 rounded-full "
                alt={userName}
              />
              Continue as {userName}-{">"}
            </Link>
          </Button>
        ) : (
          <LoginCTA />
        )}
        <p className="animate-in text-xs mt-1 text-slate-500 dark:text-slate-400">
          *GitLab support coming soon.
        </p>
      </div>
      <Link href="/kishanhitk" prefetch>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/hero-screenshot.webp"
          alt="MyPRs"
          height="645.078px"
          width="300px"
          className="animate-in rounded-3xl border-dashed border-2 hover:border-slate-300 border-slate-100 transition-all duration-500"
        />
      </Link>
    </div>
  );
}
