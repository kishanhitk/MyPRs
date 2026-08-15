"use client";

import * as React from "react";
import clsx from "clsx";
import { MoonIcon, SunIcon, LaptopIcon } from "lucide-react";
export type ThemeMode = "system" | "light" | "dark";

const THEME_COOKIE = "en_theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

function getCookieMode(): ThemeMode {
  const match = document.cookie.match(/(?:^|;\s*)en_theme=(light|dark)/);
  return (match?.[1] as ThemeMode) ?? "system";
}

function emptySubscribe() {
  return () => {};
}

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
  // Hydration-safe cookie read: the static shell renders "system" and the
  // client snapshot corrects it; clicks act through the local override.
  const cookieMode = React.useSyncExternalStore(
    emptySubscribe,
    getCookieMode,
    () => "system" as ThemeMode
  );
  const [override, setOverride] = React.useState<ThemeMode | null>(null);
  const mode = override ?? cookieMode;

  // In system mode, follow live OS theme changes.
  React.useEffect(() => {
    if (mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyTheme("system");
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [mode]);

  const nextMode: ThemeMode =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";

  const handleClick = () => {
    setOverride(nextMode);
    // Ease the brightness jump: cross-fade the whole page via the View
    // Transitions API where available; hard cut under reduced motion.
    const flip = () => applyTheme(nextMode);
    if (
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      (
        document as Document & {
          startViewTransition: (cb: () => void) => void;
        }
      ).startViewTransition(flip);
    } else {
      flip();
    }
    // Client-owned persistence: the pre-paint script in the layout reads
    // this cookie, so no server round-trip is involved anywhere.
    if (nextMode === "system") {
      document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0`;
    } else {
      document.cookie = `${THEME_COOKIE}=${nextMode}; Path=/; Max-Age=${ONE_YEAR}`;
    }
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
