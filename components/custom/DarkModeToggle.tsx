"use client";

import * as React from "react";
import clsx from "clsx";
import { MoonIcon, SunIcon, LaptopIcon } from "lucide-react";
import { useRequestInfo } from "~/utils/request-info";
import { setThemeAction, type ThemeMode } from "~/utils/theme-actions";

const iconTransformOrigin = { transformOrigin: "50% 100px" };

// Theme flips on the DOM immediately; the cookie persists in the background
// so the next server render agrees. No router.refresh — that round-trip was
// why switching felt slow.
function applyTheme(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
}

export default function DarkModeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "labelled";
}) {
  const requestInfo = useRequestInfo();
  const serverMode: ThemeMode = requestInfo.userPrefs.theme ?? "system";
  const [mode, setMode] = React.useState<ThemeMode>(serverMode);
  const [, startTransition] = React.useTransition();

  const nextMode: ThemeMode =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";

  const handleClick = () => {
    setMode(nextMode);
    applyTheme(nextMode);
    startTransition(async () => {
      try {
        await setThemeAction(nextMode);
      } catch (error) {
        console.error("Failed to persist theme:", error);
      }
    });
  };

  const iconSpanClassName =
    "absolute inset-0 transform transition-transform duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:duration-[0s]";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "mr-1 inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full p-0.5 text-zinc-500 transition-colors duration-150 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-100"
      )}
    >
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
