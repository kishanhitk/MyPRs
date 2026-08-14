"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DemoGithub } from "~/components/custom/GithubCard";
import PRFilter from "~/components/custom/PRFilter";
import { loadMorePRsAction } from "~/utils/pr-actions";
import type { GitHubIssue } from "~/types/shared";

const SWAP = { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

interface PRSectionsProps {
  featuredPRs: GitHubIssue[];
  nonFeaturedPRs: GitHubIssue[];
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
  const initialFetched = featuredPRs.length + nonFeaturedPRs.length;
  const [extra, setExtra] = React.useState<GitHubIssue[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(totalCount > initialFetched);
  const [loading, setLoading] = React.useState(false);
  const sentinelRef = React.useRef<HTMLLIElement>(null);
  const loadingRef = React.useRef(false);

  const loadMore = React.useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const next = page + 1;
    const res = await loadMorePRsAction({ username, page: next });
    if (!res.error) {
      setExtra((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(res.hasMore);
    } else {
      setHasMore(false);
    }
    setLoading(false);
    loadingRef.current = false;
  }, [page, username]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const seenIds = new Set(
    [...featuredPRs, ...nonFeaturedPRs].map((p) => p.id)
  );
  const allRest = [
    ...nonFeaturedPRs,
    ...extra.filter((p) => !seenIds.has(p.id)),
  ];

  // Repos discovered so far, growing as lazy loading pages in — so the
  // filter learns about repos that only appear deeper in the history.
  const knownRepos = [
    ...new Set(
      [...featuredPRs, ...nonFeaturedPRs, ...extra].map((p) =>
        p.repository_url.slice(29)
      )
    ),
  ];

  const allLoaded = [...featuredPRs, ...nonFeaturedPRs, ...extra];
  const since = allLoaded.length
    ? Math.min(
        ...allLoaded.map((p) =>
          new Date(p.pull_request.merged_at).getFullYear()
        )
      )
    : null;

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
        {hasMore ? "+" : ""}{" "}
        {knownRepos.length === 1 && !hasMore ? "repository" : "repositories"}
        {!hasMore && since ? ` · since ${since}` : ""}
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

      {allRest.length ? (
        <>
          <h2 className="font-mono relative pl-10 pb-3 pt-6 text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            All merged
          </h2>
          <ul>
            <AnimatePresence mode="popLayout" initial={false}>
              {allRest.map((item) => (
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
              <li
                ref={sentinelRef}
                className="font-mono relative py-3 pl-10 text-xs text-zinc-500 dark:text-zinc-400"
              >
                {loading ? "loading more…" : " "}
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
      </div>
    </>
  );
}
