import type { CSSProperties } from "react";
import { connection } from "next/server";
import {
  getContributionCalendar,
  getGitHubUserData,
} from "~/lib/github";
import { getCurationRow, getProfileData } from "~/lib/profile";
import { SITE_URL } from "~/lib/site";
import ContributionGraph from "~/components/custom/ContributionGraph";
import OwnerGate from "~/components/custom/OwnerGate";
import ShareProfile from "~/components/custom/ShareProfile";
import TrackEvent from "~/components/custom/TrackEvent";
import PRRetry from "./PRRetry";
import PRSections from "./PRSections";

type ParamsPromise = Promise<{ username: string }>;

/**
 * Identity header — the fast path (~300ms). Streams as soon as the GitHub
 * user record and the owner curation row resolve, independent of the slow
 * PR search. Owns the 404 and hard-error decisions so they land first.
 */
export async function IdentitySection({ params }: { params: ParamsPromise }) {
  const { username } = await params;
  const [userResponse, curationRow] = await Promise.all([
    getGitHubUserData(username),
    getCurationRow(username).catch(() => null),
  ]);
  const userData = userResponse.data;
  const notFound = userResponse.status === 404;
  const loadError = Boolean(userResponse.error) && userResponse.status !== 404;

  // A transient failure must never become the cached shell for an hour —
  // degrade dynamically; the first healthy render becomes the shell.
  if (loadError && !userData) {
    await connection();
    return (
      <>
        <TrackEvent
          name="profile_error"
          props={{
            profile: username,
            type: "load_error",
            reason: userResponse.reason ?? "error",
          }}
        />
        <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
          Couldn&apos;t load this profile right now (GitHub may be rate-limiting
          or unavailable). Try again in a moment.
        </p>
      </>
    );
  }

  // A streamed response can't 404 after the shell's 200 commits, and
  // notFound() strands no-JS agents on the skeleton — render the message
  // inline; generateMetadata already ships robots noindex for this case,
  // and connection() keeps the unbounded junk-URL space out of the cache.
  if (notFound || !userData) {
    await connection();
    return (
      <>
        <TrackEvent
          name="profile_error"
          props={{ profile: username, type: "not_found" }}
        />
        <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
          No GitHub user named &ldquo;{username}&rdquo;.
        </p>
        <p className="font-mono mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Yours is waiting at myprs.dev/&lt;your-github-username&gt;.
        </p>
      </>
    );
  }

  const ownerRowId = curationRow?.id as string | undefined;

  return (
    <header className="rise flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={userData.avatar_url}
        alt={userData.login}
        className="h-16 w-16 rounded-full border border-zinc-200 dark:border-zinc-800"
      />
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] text-zinc-900 dark:text-zinc-100">
          {userData.name ?? userData.login}
        </h1>
        <p className="font-mono text-[13px] text-zinc-500 dark:text-zinc-400">
          @{userData.login}
          {userData.twitter_username ? (
            <>
              {" · "}
              <a
                href={`https://x.com/${userData.twitter_username}`}
                className="underline-offset-4 hover:underline"
              >
                x/{userData.twitter_username}
              </a>
            </>
          ) : null}
          {userData.blog ? (
            <>
              {" · "}
              <a
                href={
                  userData.blog.startsWith("http")
                    ? userData.blog
                    : `https://${userData.blog}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {userData.blog.replace(/^https?:\/\//, "").replace(/\/$/, "")}{" "}
                ↗
              </a>
            </>
          ) : null}
          <OwnerGate ownerRowId={ownerRowId}>
            {" · "}
            <ShareProfile username={username} />
          </OwnerGate>
        </p>
      </div>
    </header>
  );
}

/**
 * Contribution graph — only needs the calendar (and the exact-case login for
 * the accessible label). Both are cached reads deduped with the other
 * sections; streams independently of the slow PR search.
 */
export async function GraphSection({ params }: { params: ParamsPromise }) {
  const { username } = await params;
  const [calendar, userResponse] = await Promise.all([
    getContributionCalendar(username),
    getGitHubUserData(username),
  ]);
  if (!calendar) return null;

  return (
    <div className="rise mt-6" style={{ "--d": "90ms" } as CSSProperties}>
      <ContributionGraph
        calendar={calendar}
        username={userResponse.data?.login ?? username}
      />
    </div>
  );
}

/**
 * Stats line + PR rail — the slow path: search page 1, the repo breakdown,
 * and the featured walk. Streams last, once the full profile fill resolves.
 */
export async function PRRailSection({ params }: { params: ParamsPromise }) {
  const { username } = await params;
  const {
    notFound,
    loadError,
    prsDegraded,
    errorReason,
    userData,
    items,
    totalCount,
    sinceYear,
    featuredPRs,
    nonFeaturedPRs,
    excludedGitHubRepos,
    endCursor,
    hasNext,
    repoNames,
    ownerRowId,
  } = await getProfileData(username);

  // A transient failure must never become the cached shell for an hour —
  // degrade dynamically; the first healthy render becomes the shell.
  if (loadError || prsDegraded) await connection();

  // Hard error and 404 are surfaced by the identity section; render nothing
  // here so a nonexistent user never gets a stray rail.
  if (notFound || !userData) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: userData.name ?? userData.login,
      alternateName: `@${userData.login}`,
      image: userData.avatar_url,
      url: `${SITE_URL}/${userData.login}`,
      sameAs: [
        `https://github.com/${userData.login}`,
        ...(userData.twitter_username
          ? [`https://x.com/${userData.twitter_username}`]
          : []),
        ...(userData.blog
          ? [
              userData.blog.startsWith("http")
                ? userData.blog
                : `https://${userData.blog}`,
            ]
          : []),
      ],
      description: `${totalCount} merged pull requests${sinceYear ? ` since ${sinceYear}` : ""} on GitHub.`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {prsDegraded ? (
        <PRRetry username={username} reason={errorReason ?? "error"} />
      ) : items.length || hasNext ? (
        <PRSections
          featuredPRs={featuredPRs}
          nonFeaturedPRs={nonFeaturedPRs}
          ownerRowId={ownerRowId}
          username={username}
          totalCount={totalCount}
          since={sinceYear}
          excludedRepoNames={excludedGitHubRepos}
          endCursor={endCursor}
          hasNext={hasNext}
          repoNames={repoNames}
        />
      ) : (
        <p className="font-mono mt-10 text-sm text-zinc-500 dark:text-zinc-400">
          No public merged PRs yet.
        </p>
      )}
    </>
  );
}

// Skeleton fallbacks mirror app/[username]/loading.tsx piece-for-piece so a
// section landing swaps in at the same dimensions — no layout shift.

export function IdentitySkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse items-center gap-4 motion-reduce:animate-none"
    >
      <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800/60" />
      <div>
        <div className="h-[22px] w-44 rounded bg-zinc-100 dark:bg-zinc-800/60" />
        <div className="mt-2 h-[13px] w-64 rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
    </div>
  );
}

export function GraphSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-6 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60 motion-reduce:animate-none"
      style={{ aspectRatio: "663 / 104" }}
    />
  );
}

export function RailSkeleton() {
  return (
    <div aria-hidden className="animate-pulse motion-reduce:animate-none">
      <div className="mt-5 h-[13px] w-80 rounded bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="relative mt-10">
        <span className="absolute bottom-2 left-3 top-0 w-[2px] rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <ul>
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="relative py-2 pl-10">
              <div className="h-[15px] w-3/4 rounded bg-zinc-100 dark:bg-zinc-800/60" />
              <div className="mt-2 h-[12px] w-48 rounded bg-zinc-100 dark:bg-zinc-800/60" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
