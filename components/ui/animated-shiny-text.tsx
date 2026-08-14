"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

// Adapted from MagicUI's AnimatedShinyText: a periodic sheen sweeps across
// the label via a background gradient clipped to the glyphs. Monochrome —
// the sheen is ink in light mode, white in dark.

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 80,
}: {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}) {
  return (
    <span
      style={{ "--shiny-width": `${shimmerWidth}px` } as React.CSSProperties}
      className={cn(
        "text-zinc-600/80 dark:text-zinc-400/80",
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%]",
        "bg-gradient-to-r from-transparent via-zinc-900 via-50% to-transparent dark:via-white",
        "motion-reduce:animate-none",
        className
      )}
    >
      {children}
    </span>
  );
}
