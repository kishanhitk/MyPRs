"use client";

import * as React from "react";
import type { ContributionCalendar } from "~/lib/github";

// First-party contribution calendar, rendered as an SVG in the zinc scale.
// Hover shows the day's count in a single reused tooltip chip — instant,
// no animation (cells are scrubbed rapidly).

const CELL = 10;
const GAP = 3;

const LEVEL_CLASSES = [
  "fill-zinc-100 dark:fill-zinc-800/60",
  "fill-zinc-300 dark:fill-zinc-700",
  "fill-zinc-400 dark:fill-zinc-500",
  "fill-zinc-600 dark:fill-zinc-300",
  "fill-zinc-900 dark:fill-zinc-50",
];

function fmtDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface Tooltip {
  leftPct: number;
  topPct: number;
  text: string;
}

export default function ContributionGraph({
  calendar,
  username,
}: {
  calendar: ContributionCalendar;
  username: string;
}) {
  const [tooltip, setTooltip] = React.useState<Tooltip | null>(null);
  const weeks = calendar.weeks;
  const width = weeks.length * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${calendar.total} GitHub contributions in the last year by ${username}`}
        onMouseLeave={() => setTooltip(null)}
      >
        {weeks.map((week, w) =>
          week.map(([level, count, date], d) => (
            <rect
              key={date}
              x={w * (CELL + GAP)}
              y={d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              className={LEVEL_CLASSES[level] ?? LEVEL_CLASSES[0]}
              onMouseEnter={() =>
                setTooltip({
                  leftPct: ((w * (CELL + GAP) + CELL / 2) / width) * 100,
                  topPct: ((d * (CELL + GAP)) / height) * 100,
                  text: `${count} contribution${count === 1 ? "" : "s"} · ${fmtDay(date)}`,
                })
              }
            />
          ))
        )}
      </svg>

      {tooltip ? (
        <div
          className="font-mono pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
          style={{ left: `${tooltip.leftPct}%`, top: `${tooltip.topPct}%` }}
        >
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}
