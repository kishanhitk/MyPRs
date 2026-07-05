import type { Metadata } from "next";
import { headers } from "next/headers";
import { Share2, TwitterIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
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
  const login = data.userData?.login;
  const userAvatar = data.userData?.avatar_url;
  const featuredPRsCount = data.featuredPRs.length;

  return {
    title: `PRs by ${login} | MyPRs`,
    description: `Best of the Pull Requests created by ${login} | MyPRs`,
    openGraph: {
      title: `PRs by ${login}`,
      description:
        "Highlight your coolest GitHub PRs and make your developer profile sparkle with MyPRs!",
      url: "https://myprs.xyz/",
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
    hasGhData,
    userData,
    items,
    featuredPRs,
    nonFeaturedPRs,
    excludedGitHubRepos,
    featuredGithubPRIds,
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

  if (!hasGhData || !userData) {
    return (
      <div className="mx-5 flex flex-col">
        <p className="self-center mt-10">The username is not valid</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-5 flex flex-col">
        <p>
          Looks like {username} has not created any public PR for quite a while.
          {isOwner ? <>Go make some PRs!🚀</> : null}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-5 flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={userData.avatar_url}
        alt={userData.login}
        className="h-52 w-52 mt-5 rounded-full self-center"
      />
      <p className="self-center text-3xl mt-1">{userData.name}</p>
      <p className="self-center text-slate-700 flex text-lg dark:text-slate-300">
        {userData.login}{" "}
      </p>
      <div className="flex items-center self-center mb-3 text-slate-500 ">
        {userData.twitter_username ? (
          <a href={`https://x.com/${userData.twitter_username}`}>
            <TwitterIcon className="h-5 w-5" />
          </a>
        ) : null}
      </div>
      {isOwner ? (
        <Button className="self-center mb-3" asChild>
          <a
            href={`https://twitter.com/intent/tweet?text=Check%20out%20some%20of%20my%20proudest%20Open-Source%20pull%20requests%20on%20MyPRs.%0Amyprs.xyz/${username}%0AIt's%20like%20a%20'link-in-bio'%20for%20my%20Open-Source%20contributions.%0A%23OpenSource`}
          >
            Share
            <Share2 className="h-5 w-5 ml-2" />
          </a>
        </Button>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://ghchart.rshah.org/${userData.login}`}
        alt={`${userData.login}'s Github chart`}
        className="my-2 dark:brightness-75"
      />
      {isOwner ? (
        <PRFilter
          repoNames={uniqueRepoNames}
          excludedRepoNames={excludedGitHubRepos}
          username={username}
        />
      ) : null}
      <PRSections
        featuredPRs={featuredPRs}
        nonFeaturedPRs={nonFeaturedPRs}
        isOwner={isOwner}
        featuredGithubPRs={featuredGithubPRIds}
        username={username}
      />
    </div>
  );
}
