"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ProfilePR } from "~/types/shared";
import { toggleFeaturedAction } from "~/utils/pr-actions";

function fmtMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

interface IGithubCardProps {
  item: ProfilePR;
  isFeatured?: boolean;
  isOwner?: boolean;
  username: string;
  delay?: number;
}

export function DemoGithub({
  item,
  isFeatured = false,
  isOwner = false,
  username,
  delay = 0,
}: IGithubCardProps) {
  const [isPending, startTransition] = React.useTransition();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const toggleFeatured = () => {
    startTransition(async () => {
      const result = await toggleFeaturedAction({
        prId: item.id.toString(),
        username,
      });
      setActionError(result?.error ?? null);
    });
  };

  const repo = item.repo;

  return (
    <motion.li
      layout={!reduceMotion}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay }}
      className="relative pl-10 pb-2"
    >
      {/* merge node */}
      <span
        aria-hidden
        className={`absolute left-[7px] top-[22px] h-[11px] w-[11px] rounded-full border-2 bg-[#fdfafa] dark:bg-[#191919] ${
          isFeatured
            ? "border-github_merged dark:border-[#A371F7]"
            : "border-zinc-400 dark:border-zinc-600"
        }`}
      />
      {/* branch connector */}
      <span
        aria-hidden
        className="absolute left-[12px] top-[27px] h-px w-5 bg-zinc-200 dark:bg-zinc-800"
      />

      <div className="group -mx-3 rounded-lg border border-transparent px-3 py-2 transition-colors duration-150 hover:border-zinc-200 hover:bg-white dark:hover:border-zinc-800 dark:hover:bg-zinc-900/60">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {repo}
          </span>
          {isOwner ? (
            <button
              type="button"
              disabled={isPending}
              aria-label={isFeatured ? "Unfeature this PR" : "Feature this PR"}
              onClick={toggleFeatured}
              className={`font-mono text-xs transition-opacity duration-150 active:scale-95 disabled:opacity-40 ${
                isFeatured
                  ? "text-github_merged dark:text-[#A371F7]"
                  : "text-zinc-500 opacity-60 hover:opacity-100 focus-visible:opacity-100 dark:text-zinc-400"
              }`}
            >
              {isFeatured ? "★ featured" : "☆ feature"}
            </button>
          ) : null}
        </div>

        {actionError ? (
          <p role="alert" className="appear font-mono mt-1 text-xs text-red-500">
            {actionError}
          </p>
        ) : null}

        <a
          href={item.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block text-[15px] font-medium leading-snug text-zinc-900 decoration-github_merged/40 underline-offset-4 hover:underline dark:text-zinc-200"
        >
          {item.title}
        </a>

        <p className="font-mono mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          merged {fmtMonth(item.merged_at)}
          {item.reactions_count > 0 ? ` · ▲ ${item.reactions_count}` : ""}
          {item.comments > 0 ? ` · ${item.comments} comments` : ""}
        </p>
      </div>
    </motion.li>
  );
}
