import type { ContributionCalendar } from "~/lib/github";

// First-party contribution calendar, rendered as an SVG in the zinc scale.
// Server component — no client JS, true dark mode via Tailwind fill classes.

const CELL = 10;
const GAP = 3;

const LEVEL_CLASSES = [
  "fill-zinc-100 dark:fill-zinc-800/60",
  "fill-zinc-300 dark:fill-zinc-700",
  "fill-zinc-400 dark:fill-zinc-500",
  "fill-zinc-600 dark:fill-zinc-300",
  "fill-zinc-900 dark:fill-zinc-50",
];

export default function ContributionGraph({
  calendar,
  username,
}: {
  calendar: ContributionCalendar;
  username: string;
}) {
  const weeks = calendar.weeks;
  const width = weeks.length * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`${calendar.total} GitHub contributions in the last year by ${username}`}
    >
      {weeks.map((week, w) =>
        week.map((level, d) =>
          // skip only the trailing empty days of a partial final week
          w === weeks.length - 1 && level === 0 && week.length < 7 ? null : (
            <rect
              key={`${w}-${d}`}
              x={w * (CELL + GAP)}
              y={d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              className={LEVEL_CLASSES[level] ?? LEVEL_CLASSES[0]}
            />
          )
        )
      )}
    </svg>
  );
}
