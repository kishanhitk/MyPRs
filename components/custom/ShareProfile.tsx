"use client";

import * as React from "react";
import posthog from "posthog-js";

const tweetUrl = (username: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Check out some of my proudest Open-Source pull requests on MyPRs.\nmyprs.dev/${username}\nIt's like a 'link-in-bio' for my Open-Source contributions.\n#OpenSource`
  )}`;

const emptySubscribe = () => () => {};

export default function ShareProfile({ username }: { username: string }) {
  const [copied, setCopied] = React.useState(false);
  const canNativeShare = React.useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator.share === "function",
    () => false
  );
  const profileUrl = `https://myprs.dev/${username}`;

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

  const action =
    "text-zinc-600 underline-offset-4 transition-colors duration-150 hover:text-zinc-950 hover:underline dark:text-zinc-300 dark:hover:text-zinc-50";
  const dot = (
    <span aria-hidden className="text-zinc-300 dark:text-zinc-700">
      ·
    </span>
  );

  return (
    <section
      aria-label="Share your profile"
      className="rise font-mono mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800"
      style={{ "--d": "60ms" } as React.CSSProperties}
    >
      <span className="text-zinc-900 dark:text-zinc-100">share</span>
      <span className="mr-auto text-zinc-500 dark:text-zinc-400">
        myprs.dev/{username}
      </span>
      <button type="button" onClick={copyLink} className={action}>
        {copied ? "copied ✓" : "copy link"}
      </button>
      {dot}
      <a
        href={tweetUrl(username)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("tweet")}
        className={action}
      >
        post on X ↗
      </a>
      {dot}
      <a
        href={`/api/${username}/og`}
        download={`${username}-myprs.png`}
        onClick={() => track("download_image")}
        className={action}
      >
        download card ↓
      </a>
      {canNativeShare ? (
        <>
          {dot}
          <button type="button" onClick={nativeShare} className={action}>
            more ↗
          </button>
        </>
      ) : null}
    </section>
  );
}
