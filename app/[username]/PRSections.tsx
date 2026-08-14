"use client";

import { AnimatePresence } from "framer-motion";
import { DemoGithub } from "~/components/custom/GithubCard";
import type { GitHubIssue } from "~/types/shared";

interface PRSectionsProps {
  featuredPRs: GitHubIssue[];
  nonFeaturedPRs: GitHubIssue[];
  isOwner: boolean;
  username: string;
}

export default function PRSections({
  featuredPRs,
  nonFeaturedPRs,
  isOwner,
  username,
}: PRSectionsProps) {
  let i = 0;
  const delay = () => Math.min(i++ * 0.04, 0.48);

  return (
    <div className="relative mt-10">
      {/* the trunk */}
      <span
        aria-hidden
        className="rail-line absolute bottom-2 left-3 top-0 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800"
      />

      {featuredPRs.length ? (
        <h2 className="font-mono relative pl-10 pb-3 text-[11px] uppercase tracking-[0.18em] text-github_merged dark:text-[#A371F7]">
          Featured
        </h2>
      ) : isOwner ? (
        <div className="relative pl-10 pb-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-github_merged dark:text-[#A371F7]">
            Featured
          </h2>
          <p className="font-mono mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Nothing featured yet — hover a PR and press ☆ to pin your proudest
            work here.
          </p>
        </div>
      ) : null}

      {featuredPRs.length ? (
        <ul>
          <AnimatePresence mode="popLayout" initial={false}>
            {featuredPRs.map((item) => (
              <DemoGithub
                key={item.id}
                item={item}
                isFeatured
                isOwner={isOwner}
                username={username}
                delay={delay()}
              />
            ))}
          </AnimatePresence>
        </ul>
      ) : null}

      {nonFeaturedPRs.length ? (
        <>
          <h2 className="font-mono relative pl-10 pb-3 pt-6 text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            All merged
          </h2>
          <ul>
            <AnimatePresence mode="popLayout" initial={false}>
              {nonFeaturedPRs.map((item) => (
                <DemoGithub
                  key={item.id}
                  item={item}
                  isOwner={isOwner}
                  username={username}
                  delay={delay()}
                />
              ))}
            </AnimatePresence>
          </ul>
        </>
      ) : null}
    </div>
  );
}
