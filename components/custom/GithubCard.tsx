"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ProfilePR } from "~/types/shared";

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
  onToggle?: () => void;
  error?: string;
}

export function DemoGithub({
  item,
  isFeatured = false,
  isOwner = false,
  onToggle,
  error,
}: IGithubCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      layout={!reduceMotion}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
      className="group relative pl-10 pb-4"
    >
      {/* branch connector — starts at the node's edge, never through it */}
      <span
        aria-hidden
        className="absolute left-[18px] top-[21px] h-px w-[14px] bg-zinc-200 transition-colors duration-150 group-hover:bg-zinc-300 dark:bg-zinc-800 dark:group-hover:bg-zinc-700"
      />
      {/* merge node */}
      <span
        aria-hidden
        className={`absolute left-[7px] top-[16px] h-[11px] w-[11px] rounded-full border-2 transition-colors duration-150 ${
          isFeatured
            ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
            : "border-zinc-400 bg-[#fdfafa] group-hover:border-zinc-500 dark:border-zinc-600 dark:bg-[#191919] dark:group-hover:border-zinc-500"
        }`}
      />

      <div className="py-2">
        <div className="flex items-baseline justify-between gap-3">
          <a
            href={item.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block min-w-0 flex-1 text-[15px] font-medium leading-snug text-zinc-900 decoration-zinc-400 underline-offset-4 hover:underline dark:text-zinc-200"
          >
            {item.title}
          </a>
          {isOwner ? (
            <button
              type="button"
              aria-label={isFeatured ? "Unfeature this PR" : "Feature this PR"}
              onClick={onToggle}
              className={`font-mono -m-2 shrink-0 p-2 text-xs transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95 ${
                isFeatured
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 opacity-60 hover:opacity-100 focus-visible:opacity-100 dark:text-zinc-400"
              }`}
            >
              {isFeatured ? "★" : "☆"}
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="appear font-mono mt-1 text-xs text-red-500">
            {error}
          </p>
        ) : null}

        <p className="font-mono mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {item.repo} · {fmtMonth(item.merged_at)}
          {item.reactions_count > 0 ? ` · ▲ ${item.reactions_count}` : ""}
          {item.comments > 0 ? ` · ${item.comments} comments` : ""}
        </p>
      </div>
    </motion.li>
  );
}
