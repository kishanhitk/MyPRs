"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import posthog from "posthog-js";

const tweetUrl = (username: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Check out some of my proudest Open-Source pull requests on MyPRs.\nmyprs.dev/${username}\nIt's like a 'link-in-bio' for my Open-Source contributions.\n#OpenSource`
  )}`;

const emptySubscribe = () => () => {};

export default function ShareProfile({ username }: { username: string }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  // true after hydration, false during SSR — lint-clean mount guard
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const canNativeShare =
    mounted && typeof navigator !== "undefined" && !!navigator.share;
  const reduceMotion = useReducedMotion();
  const profileUrl = `https://myprs.dev/${username}`;

  // Esc closes; the page never scrolls under an open modal.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const openModal = () => {
    posthog.capture("share_opened", { profile: username });
    setOpen(true);
  };

  const track = (method: string) =>
    posthog.capture("share_action", { profile: username, method });

  const copyLink = async () => {
    track("copy_link");
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const nativeShare = async () => {
    track("native");
    try {
      await navigator.share({ title: `PRs by ${username}`, url: profileUrl });
    } catch {}
  };

  const row =
    "font-mono flex w-full items-center justify-between border-b border-zinc-200 py-3 text-[13px] text-zinc-700 transition-colors duration-150 last:border-b-0 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-50";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="underline-offset-4 hover:underline"
      >
        share ↗
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            {/* scrim */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-zinc-950/25"
              onClick={() => setOpen(false)}
            />
            {/* panel — modals stay center-origin */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Share your profile"
              initial={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.96,
                y: reduceMotion ? 0 : 8,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.98,
                transition: { duration: 0.12 },
              }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="modal-glass relative w-full max-w-sm rounded-2xl p-5"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Share
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="font-mono -m-2 p-2 text-xs text-zinc-500 transition-colors duration-150 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  esc
                </button>
              </div>

              {/* the card people will see in feeds */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/${username}/og`}
                alt={`Share card for ${username}`}
                className="mt-4 w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
                style={{ aspectRatio: "1200 / 630" }}
              />

              <div className="mt-2">
                <button type="button" onClick={copyLink} className={row}>
                  <span>{copied ? "copied ✓" : "copy link"}</span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    myprs.dev/{username}
                  </span>
                </button>
                <a
                  href={tweetUrl(username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("tweet")}
                  className={row}
                >
                  <span>post on X</span>
                  <span aria-hidden>↗</span>
                </a>
                <a
                  href={`/api/${username}/og`}
                  download={`${username}-myprs.png`}
                  onClick={() => track("download_image")}
                  className={row}
                >
                  <span>download card image</span>
                  <span aria-hidden>↓</span>
                </a>
                {canNativeShare ? (
                  <button type="button" onClick={nativeShare} className={row}>
                    <span>more options</span>
                    <span aria-hidden>↗</span>
                  </button>
                ) : null}
              </div>
            </motion.div>
          </div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
