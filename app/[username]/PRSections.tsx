"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DemoGithub } from "~/components/custom/GithubCard";
import PRFilter from "~/components/custom/PRFilter";
import type { ProfilePR } from "~/types/shared";

const SWAP = { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };
const WINDOW = 100;

interface PRSectionsProps {
  featuredPRs: ProfilePR[];
  nonFeaturedPRs: ProfilePR[];
  isOwner: boolean;
  username: string;
  totalCount: number;
  excludedRepoNames: string[];
}

export default function PRSections({
  featuredPRs,
  nonFeaturedPRs,
  isOwner,
  username,
  totalCount,
  excludedRepoNames,
}: PRSectionsProps) {
  // The full history is already here; the window limits DOM size, not data.
  const [visible, setVisible] = React.useState(WINDOW);
  const sentinelRef = React.useRef<HTMLLIElement>(null);
  const hasMore = visible < nonFeaturedPRs.length;

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => v + WINDOW);
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  const shownRest = nonFeaturedPRs.slice(0, visible);
  const knownRepos = [
    ...new Set([...featuredPRs, ...nonFeaturedPRs].map((p) => p.repo)),
  ];
  const allLoaded = [...featuredPRs, ...nonFeaturedPRs];
  const since = allLoaded.length
    ? Math.min(...allLoaded.map((p) => new Date(p.merged_at).getFullYear()))
    : null;
  // The search API stops at 1000 results; beyond that the numbers are floors.
  const capped = totalCount > 1000;

  let i = 0;
  const delay = () => Math.min(i++ * 0.04, 0.48);

  return (
    <>
      <p
        className="rise font-mono mt-5 text-[13px] text-zinc-500 dark:text-zinc-400"
        style={{ "--d": "60ms" } as React.CSSProperties}
      >
        {totalCount || allLoaded.length} merged pull requests ·{" "}
        {knownRepos.length}
        {capped ? "+" : ""}{" "}
        {knownRepos.length === 1 && !capped ? "repository" : "repositories"}
        {since ? ` · since ${since}` : ""}
      </p>
      {isOwner ? (
        <div
          className="rise relative z-10 mt-4"
          style={{ "--d": "120ms" } as React.CSSProperties}
        >
          <PRFilter
            repoNames={knownRepos}
            excludedRepoNames={excludedRepoNames}
            username={username}
          />
        </div>
      ) : null}
      <div className="relative mt-10">
        {/* the trunk */}
        <span
          aria-hidden
          className="rail-line absolute bottom-2 left-3 top-0 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800"
        />

        <AnimatePresence mode="popLayout" initial={false}>
          {featuredPRs.length ? (
            <motion.h2
              key="featured-heading"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SWAP}
              className="font-mono relative pl-10 pb-3 text-[11px] uppercase tracking-[0.18em] text-github_merged dark:text-[#A371F7]"
            >
              Featured
            </motion.h2>
          ) : isOwner ? (
            <motion.div
              key="featured-empty"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SWAP}
              className="relative pl-10 pb-3"
            >
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-github_merged dark:text-[#A371F7]">
                Featured
              </h2>
              {/* .rise with a late delay: on first paint the rail draws, then
                  the instruction lands — teach in sequence. */}
              <p
                className="rise font-mono mt-2 text-xs text-zinc-500 dark:text-zinc-400"
                style={{ "--d": "300ms" } as React.CSSProperties}
              >
                Nothing featured yet — hover a PR and press ☆ to pin your
                proudest work here.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

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

        {shownRest.length ? (
          <>
            <h2 className="font-mono relative pl-10 pb-3 pt-6 text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              All merged
            </h2>
            <ul>
              <AnimatePresence mode="popLayout" initial={false}>
                {shownRest.map((item) => (
                  <DemoGithub
                    key={item.id}
                    item={item}
                    isOwner={isOwner}
                    username={username}
                    delay={delay()}
                  />
                ))}
              </AnimatePresence>
              {hasMore ? (
                <li ref={sentinelRef} aria-hidden className="relative py-2 pl-10" />
              ) : null}
            </ul>
          </>
        ) : null}
      </div>
    </>
  );
}
