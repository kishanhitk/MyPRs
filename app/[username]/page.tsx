import type { Metadata } from "next";
import { headers } from "next/headers";
import PRFilter from "~/components/custom/PRFilter";
import { createClient } from "~/lib/supabase/server";
import { getProfileData } from "~/lib/profile";
import PRSections from "./PRSections";

async function getDomain() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host");
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileData(username);
  const domain = await getDomain();
  const login = data.userData?.login ?? username;
  const userAvatar = data.userData?.avatar_url;
  const featuredPRsCount = data.featuredPRs.length;

  return {
    title: `PRs by ${login} | MyPRs`,
    description: `Best of the Pull Requests created by ${login} | MyPRs`,
    openGraph: {
      title: `PRs by ${login}`,
      description:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
      url: "https://myprs.dev/",
      images: [`${domain}/api/${username}/og?featuredPRsCount=${featuredPRsCount}`],
    },
    twitter: {
      card: "summary_large_image",
      title: "MyPRs - One link to highlight your Open-Source Contributions",
      description:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
      images: [
        `${domain}/api/${username}/og?avatar=${userAvatar}&featuredPRsCount=${featuredPRsCount}`,
      ],
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
    userData,
    items,
    totalCount,
    featuredPRs,
    nonFeaturedPRs,
    excludedGitHubRepos,
    ownerRowId,
  } = await getProfileData(username);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = Boolean(user && ownerRowId && user.id === ownerRowId);

  const uniqueRepoNames = [
    ...new Set(items.map((item) => item.repository_url.slice(29))),
  ];

  if (loadError && !userData) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
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
        <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
          No GitHub user named &ldquo;{username}&rdquo;.
        </p>
      </div>
    );
  }

  const since = items.length
    ? Math.min(
        ...items.map((i) => new Date(i.pull_request.merged_at).getFullYear())
      )
    : null;

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
          <h1 className="text-[26px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
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
            {isOwner ? (
              <>
                {" · "}
                <a
                  href={`https://twitter.com/intent/tweet?text=Check%20out%20some%20of%20my%20proudest%20Open-Source%20pull%20requests%20on%20MyPRs.%0Amyprs.dev/${username}%0AIt's%20like%20a%20'link-in-bio'%20for%20my%20Open-Source%20contributions.%0A%23OpenSource`}
                  className="underline-offset-4 hover:underline"
                >
                  share ↗
                </a>
              </>
            ) : null}
          </p>
        </div>
      </header>

      {items.length ? (
        <p
          className="rise font-mono mt-5 text-[13px] text-zinc-500 dark:text-zinc-400"
          style={{ "--d": "60ms" } as React.CSSProperties}
        >
          {totalCount || items.length} merged pull requests ·{" "}
          {uniqueRepoNames.length}
          {totalCount > items.length ? "+" : ""}{" "}
          {uniqueRepoNames.length === 1 && totalCount <= items.length
            ? "repository"
            : "repositories"}
          {totalCount <= items.length && since ? ` · since ${since}` : ""}
        </p>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://ghchart.rshah.org/${userData.login}`}
        alt={`${userData.login}'s GitHub contribution chart`}
        className="rise mt-6 w-full dark:brightness-75"
        style={{ "--d": "90ms" } as React.CSSProperties}
      />

      {isOwner ? (
        <div
          className="rise relative z-10 mt-4"
          style={{ "--d": "120ms" } as React.CSSProperties}
        >
          <PRFilter
            repoNames={uniqueRepoNames}
            excludedRepoNames={excludedGitHubRepos}
            username={username}
          />
        </div>
      ) : null}

      {items.length ? (
        <PRSections
          featuredPRs={featuredPRs}
          nonFeaturedPRs={nonFeaturedPRs}
          isOwner={isOwner}
          username={username}
          totalCount={totalCount}
        />
      ) : (
        <p className="font-mono mt-10 text-sm text-zinc-500 dark:text-zinc-400">
          No public merged PRs in the last three years.
          {isOwner ? " Go make some! 🚀" : ""}
        </p>
      )}
    </div>
  );
}
