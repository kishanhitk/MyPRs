import type { Metadata } from "next";
import { Suspense } from "react";
import { getProfileData } from "~/lib/profile";
import { SITE_URL } from "~/lib/site";
import {
  GraphSection,
  GraphSkeleton,
  IdentitySection,
  IdentitySkeleton,
  PRRailSection,
  RailSkeleton,
} from "./sections";

// The PR-rail section still performs the full GitHub fill (search, repo
// breakdown, featured walk) — comfortably done in seconds, but past Vercel's
// 10s default. A timeout mid-fill also discards the cache writes, which turns
// one slow request into a permanent timeout loop.
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

// The page body itself awaits nothing: each section resolves `params` and its
// own data inside its Suspense boundary, so the skeletons form the prerendered
// static shell and every section streams in as its data lands.
export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <Suspense fallback={<IdentitySkeleton />}>
        <IdentitySection params={params} />
      </Suspense>
      <Suspense fallback={<GraphSkeleton />}>
        <GraphSection params={params} />
      </Suspense>
      <Suspense fallback={<RailSkeleton />}>
        <PRRailSection params={params} />
      </Suspense>
    </div>
  );
}
