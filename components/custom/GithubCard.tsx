"use client";

import * as React from "react";
import { motion, Reorder, useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import posthog from "posthog-js";
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
  /** When set, the card renders as a draggable Reorder.Item. */
  reorderable?: boolean;
  onReorderCommit?: () => void;
  /** Curate mode: show the feature/unfeature pill, dim the meta. */
  curating?: boolean;
}

export function DemoGithub({
  item,
  isFeatured = false,
  isOwner = false,
  onToggle,
  error,
  reorderable = false,
  onReorderCommit,
  curating = false,
}: IGithubCardProps) {
  const reduceMotion = useReducedMotion();
  const [dragging, setDragging] = React.useState(false);
  // framer suppresses the post-drag tap on the item itself, but the native
  // click still reaches inner interactive elements — releasing a drag over
  // the pill would unfeature the card, over the title would open the PR.
  const suppressClick = React.useRef(false);

  const Root: React.ElementType = reorderable ? Reorder.Item : motion.li;
  const rootProps = reorderable
    ? {
        value: item,
        whileDrag: { scale: 1.01, zIndex: 10 },
        onDragStart: () => setDragging(true),
        onDragEnd: () => {
          setDragging(false);
          suppressClick.current = true;
          // the click dispatches in the same task as pointerup; clear after
          setTimeout(() => {
            suppressClick.current = false;
          }, 0);
          onReorderCommit?.();
        },
        onClickCapture: (e: React.MouseEvent) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
      }
    : {};

  return (
    <Root
      {...rootProps}
      layout={!reduceMotion}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
      className={`group relative pl-10 pb-4 ${
        reorderable ? "cursor-grab active:cursor-grabbing" : ""
      } ${dragging ? "drag-glass" : ""}`}
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
            // native link-drag swallows the pointer stream before framer's
            // pan session starts, so the item never moves while reordering
            draggable={reorderable ? false : undefined}
            onClick={() =>
              posthog.capture("pr_clicked", {
                repo: item.repo,
                featured: isFeatured,
              })
            }
            className="block min-w-0 flex-1 text-[15px] font-medium leading-snug text-zinc-900 decoration-zinc-400 underline-offset-4 hover:underline dark:text-zinc-200"
          >
            {item.title}
          </a>
          {isOwner && curating ? (
            <button
              type="button"
              aria-label={isFeatured ? "Unfeature this PR" : "Feature this PR"}
              onClick={onToggle}
              className={`font-mono shrink-0 self-start rounded-full border px-2.5 py-1 text-xs transition-[transform,color,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95 ${
                isFeatured
                  ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
              }`}
            >
              {isFeatured ? "★ featured" : "+ feature"}
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="appear font-mono mt-1 text-xs text-red-500">
            {error}
          </p>
        ) : null}

        <p
          className={`font-mono mt-1.5 text-xs text-zinc-500 transition-opacity duration-150 dark:text-zinc-400 ${
            curating ? "opacity-60" : ""
          }`}
        >
          {item.repo} · {fmtMonth(item.merged_at)}
          {item.reactions_count > 0 ? ` · ▲ ${item.reactions_count}` : ""}
          {item.comments > 0 ? (
            <>
              {" · "}
              <MessageCircle
                aria-hidden
                className="inline h-3 w-3 -translate-y-px"
              />{" "}
              <span className="sr-only">comments </span>
              {item.comments}
            </>
          ) : null}
        </p>
      </div>
    </Root>
  );
}
