import type { Metadata } from "next";
import { notFound as renderNotFound } from "next/navigation";
import { connection } from "next/server";
import { getProfileData } from "~/lib/profile";
import { SITE_URL } from "~/lib/site";
import ContributionGraph from "~/components/custom/ContributionGraph";
import OwnerGate from "~/components/custom/OwnerGate";
import ShareProfile from "~/components/custom/ShareProfile";
import TrackEvent from "~/components/custom/TrackEvent";
import PRRetry from "./PRRetry";
import PRSections from "./PRSections";

// Cold shell generation performs the full GitHub fill (search, calendar,
// repo breakdown, featured walk) — comfortably done in seconds, but past
// Vercel's 10s default. A timeout mid-fill also discards the cache writes,
// which turns one slow request into a permanent timeout loop.
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileData(username);
  // GitHub usernames are case-insensitive; canonicalize to the exact-case
  // login so /KishanHitk and /kishanhitk don't index as duplicates.
  const login = data.userData?.login ?? username;
  const userAvatar = data.userData?.avatar_url;
  const description =
    data.totalCount > 0
      ? `${login} on MyPRs — ${data.totalCount} merged pull request${
          data.totalCount === 1 ? "" : "s"
        }${data.sinceYear ? ` since ${data.sinceYear}` : ""}. One link for their open-source contributions.`
      : `Merged pull requests by ${login} — one link for their open-source contributions | MyPRs`;

  return {
    title: `PRs by ${login} | MyPRs`,
    description,
    alternates: { canonical: `/${login}` },
    // A transient failure page is thin content — keep it out of the index.
    robots: data.loadError || data.prsDegraded ? { index: false } : undefined,
    openGraph: {
      title: `PRs by ${login}`,
      description,
      url: `${SITE_URL}/${login}`,
      images: [`/api/${username}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title: `PRs by ${login} | MyPRs`,
      description,
      images: [`/api/${username}/og?avatar=${userAvatar}`],
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
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
    contributionCalendar,
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

  if (loadError && !userData) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
        <TrackEvent
          name="profile_error"
          props={{
            profile: username,
            type: "load_error",
            reason: errorReason ?? "error",
          }}
        />
        <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
          Couldn&apos;t load this profile right now (GitHub may be rate-limiting
          or unavailable). Try again in a moment.
        </p>
      </div>
    );
  }

  if (notFound || !userData) renderNotFound();


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
    <div className="mx-auto max-w-2xl px-6 py-14">
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

      {contributionCalendar ? (
        <div
          className="rise mt-6"
          style={{ "--d": "90ms" } as React.CSSProperties}
        >
          <ContributionGraph
            calendar={contributionCalendar}
            username={userData.login}
          />
        </div>
      ) : null}

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
    </div>
  );
}
