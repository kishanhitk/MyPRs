import type { Metadata } from "next";
import { getProfileData } from "~/lib/profile";
import ContributionGraph from "~/components/custom/ContributionGraph";
import OwnerGate from "~/components/custom/OwnerGate";
import ShareProfile from "~/components/custom/ShareProfile";
import TrackEvent from "~/components/custom/TrackEvent";
import PRRetry from "./PRRetry";
import PRSections from "./PRSections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileData(username);
  const login = data.userData?.login ?? username;
  const userAvatar = data.userData?.avatar_url;

  return {
    title: `PRs by ${login} | MyPRs`,
    description: `Best of the Pull Requests created by ${login} | MyPRs`,
    openGraph: {
      title: `PRs by ${login}`,
      description:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
      url: "https://myprs.dev/",
      images: [`/api/${username}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title: "MyPRs - One link to highlight your Open-Source Contributions",
      description:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
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

  if (notFound || !userData) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
        <TrackEvent
          name="profile_error"
          props={{ profile: username, type: "not_found" }}
        />
        <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
          No GitHub user named &ldquo;{username}&rdquo;.
        </p>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
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
      ) : items.length ? (
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
