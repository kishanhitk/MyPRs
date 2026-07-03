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
  const [optimisticMode, setOptimisticMode] = React.useState<ThemeMode | null>(
    null
  );
  const [, startTransition] = React.useTransition();

  const mode: ThemeMode =
    optimisticMode ?? requestInfo.userPrefs.theme ?? "system";
  const nextMode: ThemeMode =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";

  const handleClick = () => {
    setOptimisticMode(nextMode);
    startTransition(async () => {
      await setThemeAction(nextMode);
      router.refresh();
    });
  };

  const iconSpanClassName =
    "absolute inset-0 transform transition-transform duration-700 motion-reduce:duration-[0s]";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "mr-2 border-secondary hover:border-primary focus:border-primary inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border p-1 transition focus:outline-none "
      )}
    >
      {/* note that the duration is longer then the one on body, controlling the bg-color */}
      <div className="relative h-6 w-6">
        <span
          className={clsx(
            iconSpanClassName,
            mode === "dark" ? "rotate-0" : "rotate-90"
          )}
          style={iconTransformOrigin}
        >
          <MoonIcon />
        </span>
        <span
          className={clsx(
            iconSpanClassName,
            mode === "light" ? "rotate-0" : "-rotate-90"
          )}
          style={iconTransformOrigin}
        >
          <SunIcon />
        </span>

        <span
          className={clsx(
            iconSpanClassName,
            mode === "system" ? "translate-y-0" : "translate-y-10"
          )}
          style={iconTransformOrigin}
        >
          <LaptopIcon />
        </span>
      </div>
      <span className={clsx("ml-4", { "sr-only": variant === "icon" })}>
        {`Switch to ${nextMode} mode`}
      </span>
    </button>
  );
}
