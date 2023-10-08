import clsx from "clsx";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme, Theme, Themed } from "~/utils/theme-provider";
const iconTransformOrigin = { transformOrigin: "50% 100px" };

export default function DarkModeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "labelled";
}) {
  const [, setTheme] = useTheme();
  return (
    <button
      onClick={() => {
        setTheme((previousTheme) =>
          previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK
        );
      }}
      className={clsx(
        "mr-2 border-secondary hover:border-primary focus:border-primary inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border p-1 transition focus:outline-none"
      )}
    >
      {/* note that the duration is longer then the one on body, controlling the bg-color */}
      <div className="relative h-3 w-3 ">
        <span
          className="absolute top-[-6px] left-[-6px]  inset-0 rotate-90 transform text-black transition duration-1000 dark:rotate-0 dark:text-white"
          style={iconTransformOrigin}
        >
          <MoonIcon />
        </span>
        <span
          className="absolute top-[-6px] left-[-6px] rotate-0 transform text-black transition duration-1000 dark:-rotate-90 dark:text-white"
          style={iconTransformOrigin}
        >
          <SunIcon />
        </span>
      </div>
      <span
        className={clsx("ml-4 text-black dark:text-white", {
          "sr-only": variant === "icon",
        })}
      >
        <Themed dark="switch to light mode" light="switch to dark mode" />
      </span>
    </button>
  );
}
