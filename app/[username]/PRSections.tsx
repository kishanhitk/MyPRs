"use client";

import * as React from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import Link from "next/link";
import posthog from "posthog-js";
import { DemoGithub } from "~/components/custom/GithubCard";
import PRFilter from "~/components/custom/PRFilter";
import {
  reorderFeaturedAction,
  toggleFeaturedAction,
} from "~/utils/pr-actions";
import type { ProfilePR } from "~/types/shared";

const SWAP = { type: "spring" as const, bounce: 0, duration: 0.3 };
const INITIAL_WINDOW = 30;
const WINDOW_STEP = 90;

interface PRSectionsProps {
  featuredPRs: ProfilePR[];
  nonFeaturedPRs: ProfilePR[];
  isOwner: boolean;
  username: string;
  totalCount: number;
  since: number | null;
  excludedRepoNames: string[];
  /** Cursor to resume loading deeper history pages; null when complete. */
  endCursor: string | null;
  hasNext: boolean;
}

export default function PRSections({
  featuredPRs,
  nonFeaturedPRs,
  isOwner,
  username,
  totalCount,
  since,
  excludedRepoNames,
  endCursor,
  hasNext,
}: PRSectionsProps) {
  // The server sends page 1 (100 PRs); the window limits DOM size and the
  // sentinel pulls deeper data pages through /api/[username]/prs on scroll.
  const [visible, setVisible] = React.useState(INITIAL_WINDOW);
  const sentinelRef = React.useRef<HTMLLIElement>(null);
  const [deeperPRs, setDeeperPRs] = React.useState<ProfilePR[]>([]);
  const [paging, setPaging] = React.useState({ cursor: endCursor, hasNext });
  const loadingRef = React.useRef(false);
  // The observer callback can fire with a stale closure between a fetch
  // resolving and the re-render; never fetch the same cursor twice.
  const fetchedCursorsRef = React.useRef(new Set<string>());

  // Optimistic curation: the card moves the moment the star is pressed;
  // useOptimistic reverts to the server-derived lists if the action fails,
  // and the revalidated props make the move permanent when it succeeds.
  const [, startTransition] = React.useTransition();
  const [moves, addMove] = React.useOptimistic<
    Record<number, boolean>,
    { id: number; featured: boolean }
  >({}, (state, move) => ({ ...state, [move.id]: move.featured }));
  const [errors, setErrors] = React.useState<Record<number, string>>({});
  const [curating, setCurating] = React.useState(false);

  const toggleCurating = () => {
    setCurating((c) => {
      if (!c) posthog.capture("curate_opened", { profile: username });
      return !c;
    });
  };

  const toggle = (pr: ProfilePR, makeFeatured: boolean) => {
    posthog.capture(makeFeatured ? "pr_featured" : "pr_unfeatured", {
      repo: pr.repo,
      profile: username,
    });
    startTransition(async () => {
      addMove({ id: pr.id, featured: makeFeatured });
      const result = await toggleFeaturedAction({
        prUrl: pr.html_url,
        username,
      });
      setErrors((prev) => {
        const next = { ...prev };
        if (result?.error) next[pr.id] = result.error;
        else delete next[pr.id];
        return next;
      });
    });
  };

  const serverFeatured = [
    ...featuredPRs.filter((p) => moves[p.id] !== false),
    ...[...nonFeaturedPRs, ...deeperPRs].filter((p) => moves[p.id] === true),
  ];

  // Drag order lives locally until the action confirms; revalidated props
  // then match it. New stars append at the end, unknown ids drop out.
  const [orderOverride, setOrderOverride] = React.useState<number[] | null>(
    null
  );
  const orderRef = React.useRef<number[] | null>(null);
  const displayFeatured = React.useMemo(() => {
    if (!orderOverride) return serverFeatured;
    const byId = new Map(serverFeatured.map((p) => [p.id, p]));
    const ordered = orderOverride
      .map((id) => byId.get(id))
      .filter(Boolean) as ProfilePR[];
    serverFeatured.forEach((p) => {
      if (!orderOverride.includes(p.id)) ordered.push(p);
    });
    return ordered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderOverride, featuredPRs, nonFeaturedPRs, moves]);

  const handleReorder = (next: ProfilePR[]) => {
    const ids = next.map((p) => p.id);
    orderRef.current = ids;
    setOrderOverride(ids);
  };

  const commitReorder = () => {
    const ids = orderRef.current;
    if (!ids) return;
    posthog.capture("featured_reordered", { profile: username });
    const byId = new Map(displayFeatured.map((p) => [p.id, p.html_url]));
    startTransition(async () => {
      const result = await reorderFeaturedAction({
        username,
        orderedUrls: ids
          .map((id) => byId.get(id))
          .filter((url): url is string => Boolean(url)),
      });
      if (result?.error) {
        setOrderOverride(null);
        orderRef.current = null;
      }
    });
  };

  const canReorder = isOwner && curating && displayFeatured.length > 1;
  const seenUrls = new Set(
    [...featuredPRs, ...nonFeaturedPRs].map((p) => p.html_url)
  );
  const freshDeeper = deeperPRs.filter(
    (p) => !seenUrls.has(p.html_url) && !excludedRepoNames.includes(p.repo)
  );
  const displayRest = [
    ...nonFeaturedPRs.filter((p) => moves[p.id] !== true),
    ...freshDeeper.filter((p) => moves[p.id] !== true),
    ...featuredPRs.filter((p) => moves[p.id] === false),
  ].sort(
    (a, b) => new Date(b.merged_at).getTime() - new Date(a.merged_at).getTime()
  );

  const hasMore = visible < displayRest.length || paging.hasNext;

  const loadDeeperPage = React.useCallback(async () => {
    if (!paging.hasNext || !paging.cursor || loadingRef.current) return;
    if (fetchedCursorsRef.current.has(paging.cursor)) return;
    loadingRef.current = true;
    fetchedCursorsRef.current.add(paging.cursor);
    try {
      const params = new URLSearchParams({ cursor: paging.cursor });
      const res = await fetch(`/api/${username}/prs?${params}`);
      if (!res.ok) {
        fetchedCursorsRef.current.delete(paging.cursor);
        return; // sentinel stays; the next intersection retries
      }
      const page: {
        items: ProfilePR[];
        endCursor: string | null;
        hasNext: boolean;
      } = await res.json();
      setPaging({ cursor: page.endCursor, hasNext: page.hasNext });
      setDeeperPRs((prev) => {
        const seen = new Set(prev.map((p) => p.html_url));
        return [...prev, ...page.items.filter((p) => !seen.has(p.html_url))];
      });
      posthog.capture("history_page_loaded", { profile: username });
    } catch {
      fetchedCursorsRef.current.delete(paging.cursor);
      // transient network failure — retry on the next intersection
    } finally {
      loadingRef.current = false;
    }
  }, [username, paging.cursor, paging.hasNext]);

  // One product event per profile view, with the numbers that matter.
  React.useEffect(() => {
    posthog.capture("profile_viewed", {
      profile: username,
      is_owner: isOwner,
      total_prs: totalCount,
      featured_count: featuredPRs.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setVisible((v) => {
          posthog.capture("list_extended", {
            profile: username,
            shown_after: v + WINDOW_STEP,
          });
          return v + WINDOW_STEP;
        });
        // Keep the data ahead of the window.
        if (visible + WINDOW_STEP >= displayRest.length) void loadDeeperPage();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, visible, displayRest.length, loadDeeperPage]);

  const shownRest = displayRest.slice(0, visible);
  const knownRepos = [
    ...new Set(
      [...featuredPRs, ...nonFeaturedPRs, ...freshDeeper].map((p) => p.repo)
    ),
  ];
  const allLoaded = [...featuredPRs, ...nonFeaturedPRs, ...freshDeeper];
  // Floors, not exact: search caps at 1000 results, and repo variety can
  // only grow while deeper pages remain unloaded.
  const capped = totalCount > 1000 || paging.hasNext;

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
          className="rise relative z-10 mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2"
          style={{ "--d": "120ms" } as React.CSSProperties}
        >
          <PRFilter
            repoNames={knownRepos}
            excludedRepoNames={excludedRepoNames}
            username={username}
          />
          <div className="flex shrink-0 items-baseline gap-2">
            <Link
              href={`/${username}?as=visitor`}
              onClick={() =>
                posthog.capture("view_as_visitor", { profile: username })
              }
              className="font-mono text-xs text-zinc-500 underline-offset-4 transition-colors duration-150 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              view as visitor
            </Link>
            <span aria-hidden className="font-mono text-xs text-zinc-300 dark:text-zinc-700">
              ·
            </span>
            <button
            type="button"
            onClick={toggleCurating}
            className={`font-mono shrink-0 text-xs underline-offset-4 transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95 ${
              curating
                ? "text-zinc-900 underline dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {curating ? "done" : "curate featured"}
            </button>
          </div>
        </div>
      ) : null}
      <div className="relative mt-10">
        {/* the trunk */}
        <span
          aria-hidden
          className="rail-line absolute bottom-2 left-3 top-0 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800"
        />

        <AnimatePresence mode="popLayout" initial={false}>
          {displayFeatured.length ? (
            <motion.h2
              key="featured-heading"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SWAP}
              className="font-mono relative pl-10 pb-3 text-[11px] uppercase tracking-[0.18em] text-zinc-900 dark:text-zinc-100"
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
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-900 dark:text-zinc-100">
                Featured
              </h2>
              {/* .rise with a late delay: on first paint the rail draws, then
                  the instruction lands — teach in sequence. */}
              <p
                className="rise font-mono mt-2 text-xs text-zinc-500 dark:text-zinc-400"
                style={{ "--d": "300ms" } as React.CSSProperties}
              >
                {curating
                  ? "Nothing featured — press + feature on a PR below to pin it here."
                  : "Nothing featured yet — press “curate featured” to pin your proudest work here."}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {displayFeatured.length ? (
          canReorder ? (
            <Reorder.Group
              as="ul"
              axis="y"
              values={displayFeatured}
              onReorder={handleReorder}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {displayFeatured.map((item) => (
                  <DemoGithub
                    key={item.id}
                    item={item}
                    isFeatured
                    isOwner={isOwner}
                    onToggle={() => toggle(item, false)}
                    error={errors[item.id]}
                    reorderable
                    onReorderCommit={commitReorder}
                    curating={curating}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            <ul>
              <AnimatePresence mode="popLayout" initial={false}>
                {displayFeatured.map((item) => (
                  <DemoGithub
                    key={item.id}
                    item={item}
                    isFeatured
                    isOwner={isOwner}
                    onToggle={() => toggle(item, false)}
                    error={errors[item.id]}
                    curating={curating}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )
        ) : null}

        {shownRest.length ? (
          <>
            <h2 className="font-mono relative pl-10 pb-3 pt-6 text-[11px] tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
              All PRs
            </h2>
            <ul>
              <AnimatePresence mode="popLayout" initial={false}>
                {shownRest.map((item) => (
                  <DemoGithub
                    key={item.id}
                    item={item}
                    isOwner={isOwner}
                    onToggle={() => toggle(item, true)}
                    error={errors[item.id]}
                    curating={curating}
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
