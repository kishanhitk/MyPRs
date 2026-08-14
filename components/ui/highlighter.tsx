"use client";

import * as React from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

// Adapted from MagicUI's Highlighter (rough-notation under the hood).
// Draws once when scrolled into view; `delay` lets the page entrance
// settle before the annotation sweeps in.

interface HighlighterProps {
  children: React.ReactNode;
  action?:
    | "highlight"
    | "underline"
    | "box"
    | "circle"
    | "strike-through"
    | "crossed-off"
    | "bracket";
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  delay?: number;
}

export function Highlighter({
  children,
  action = "highlight",
  color = "var(--annotation)",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  delay = 0,
}: HighlighterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    let annotation: RoughAnnotation | null = null;
    const timer = setTimeout(() => {
      annotation = annotate(el, {
        type: action,
        color,
        strokeWidth,
        animationDuration,
        iterations,
        padding,
        multiline,
        animate: !reduceMotion,
      });
      annotation.show();
    }, delay);
    return () => {
      clearTimeout(timer);
      annotation?.remove();
    };
  }, [
    inView,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
    delay,
    reduceMotion,
  ]);

  return (
    <span ref={ref} className="relative inline-block bg-transparent">
      {children}
    </span>
  );
}
