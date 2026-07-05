"use client";

import { AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
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
  return (
    <AnimatePresence>
      {featuredPRs?.length ? (
        <div className="mt-5">
          <p className="font-medium">Featured PRs ✨</p>
          {featuredPRs.map((item) => (
            <DemoGithub
              key={item.id}
              item={item}
              isFeatured
              isOwner={isOwner}
              username={username}
            />
          ))}
        </div>
      ) : isOwner ? (
        <div className="mt-5">
          <p className="font-medium text-lg mb-2">Featured PRs ✨</p>
          <p className=" text-slate-600 text-md dark:text-slate-400">
            You don't have any featured PR yet. Add a PR to featured by clicking
            on the star
            <Star className="h-4 w-4 inline mx-1 mb-1" />
            icon.
          </p>
        </div>
      ) : null}
      {nonFeaturedPRs?.length ? (
        <div className="mt-5">
          <p className="font-medium text-lg"> All My PRs</p>
          {nonFeaturedPRs.map((item) => (
            <DemoGithub
              key={item.id}
              item={item}
              isOwner={isOwner}
              username={username}
            />
          ))}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
