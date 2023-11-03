import { useFetcher } from "@remix-run/react";
import clsx from "clsx";
import { MoonIcon, SunIcon, LaptopIcon } from "lucide-react";
import { THEME_FETCHER } from "~/utils/constants";
import { useRequestInfo } from "~/utils/request-info";
import { useOptimisticThemeMode } from "~/utils/theme";

const iconTransformOrigin = { transformOrigin: "50% 100px" };
export default function DarkModeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "labelled";
}) {
  const requestInfo = useRequestInfo();
  const fetcher = useFetcher({ key: THEME_FETCHER });

  const optimisticMode = useOptimisticThemeMode();
  const mode = optimisticMode ?? requestInfo.userPrefs.theme ?? "system";
  const nextMode =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";

  const iconSpanClassName =
    "absolute inset-0 transform transition-transform duration-700 motion-reduce:duration-[0s]";
  return (
    <fetcher.Form method="POST" action="/actions/toggle-theme">
      <input type="hidden" name="theme" value={nextMode} />

      <button
        type="submit"
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
          {`Switch to ${
            nextMode === "system"
              ? "system"
              : nextMode === "light"
              ? "light"
              : "dark"
          } mode`}
        </span>
      </button>
    </fetcher.Form>
  );
}
