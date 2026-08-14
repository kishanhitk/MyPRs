"use client";

import * as React from "react";
import clsx from "clsx";
import { MoonIcon, SunIcon, LaptopIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRequestInfo } from "~/utils/request-info";
import { setThemeAction, type ThemeMode } from "~/utils/theme-actions";

const iconTransformOrigin = { transformOrigin: "50% 100px" };

export default function DarkModeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "labelled";
}) {
  const requestInfo = useRequestInfo();
  const router = useRouter();
  const serverMode: ThemeMode = requestInfo.userPrefs.theme ?? "system";
  // useOptimistic reverts to `serverMode` once the transition settles (or if the
  // action rejects), so the toggle can never permanently diverge from truth.
  const [mode, setOptimisticMode] = React.useOptimistic<ThemeMode, ThemeMode>(
    serverMode,
    (_current, next) => next
  );
  const [, startTransition] = React.useTransition();

  const nextMode: ThemeMode =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";

  const handleClick = () => {
    startTransition(async () => {
      setOptimisticMode(nextMode);
      try {
        await setThemeAction(nextMode);
        router.refresh();
      } catch (error) {
        console.error("Failed to set theme:", error);
      }
    });
  };

  const iconSpanClassName =
    "absolute inset-0 transform transition-transform duration-700 motion-reduce:duration-[0s]";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "mr-1 inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full p-0.5 text-zinc-500 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-100"
      )}
    >
      {/* note that the duration is longer then the one on body, controlling the bg-color */}
      <div className="relative h-4 w-4">
        <span
          className={clsx(
            iconSpanClassName,
            mode === "dark" ? "rotate-0" : "rotate-90"
          )}
          style={iconTransformOrigin}
        >
          <MoonIcon className="h-4 w-4" />
        </span>
        <span
          className={clsx(
            iconSpanClassName,
            mode === "light" ? "rotate-0" : "-rotate-90"
          )}
          style={iconTransformOrigin}
        >
          <SunIcon className="h-4 w-4" />
        </span>

        <span
          className={clsx(
            iconSpanClassName,
            mode === "system" ? "translate-y-0" : "translate-y-10"
          )}
          style={iconTransformOrigin}
        >
          <LaptopIcon className="h-4 w-4" />
        </span>
      </div>
      <span className={clsx("ml-4", { "sr-only": variant === "icon" })}>
        {`Switch to ${nextMode} mode`}
      </span>
    </button>
  );
}
