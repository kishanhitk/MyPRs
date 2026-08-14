"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ContributionCalendar } from "~/lib/github";

// First-party contribution calendar, rendered as an SVG in the zinc scale.
// One glass tooltip chip: it animates in once, then glides between cells
// while scrubbing (same chip retargets) and fades out fast on leave.

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
  const reduceMotion = useReducedMotion();
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

      <AnimatePresence>
        {tooltip ? (
          // outer div owns position + centering; inner motion.div owns the
          // enter/exit transform so the two never fight over `transform`
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)]"
            style={{
              left: `${tooltip.leftPct}%`,
              top: `${tooltip.topPct}%`,
              transition: reduceMotion
                ? undefined
                : "left 120ms cubic-bezier(0.23,1,0.32,1), top 120ms cubic-bezier(0.23,1,0.32,1)",
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.96,
                y: reduceMotion ? 0 : 2,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              style={{ transformOrigin: "bottom center" }}
              className="tooltip-glass font-mono whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-zinc-900 dark:text-zinc-100"
            >
              {tooltip.text}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
