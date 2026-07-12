"use client";

import { createElement, type ReactNode } from "react";
import { useRevealRef } from "./Reveal";

type Tag = "h1" | "h2" | "h3";

/**
 * Editorial mask reveal for section headlines: the heading rises into view from
 * behind a clipped edge (block-level mask), the site's signature craft move.
 * Shares the one IntersectionObserver in Reveal.tsx. Reduced-motion → visible,
 * no transform (handled by `.reveal-mask` in globals.css).
 */
export function RevealHeading({
  children,
  className,
  delay = 0,
  as = "h2",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: Tag;
}) {
  const ref = useRevealRef<HTMLDivElement>();
  return (
    <div ref={ref} className="reveal-mask">
      {createElement(
        as,
        {
          className,
          style: delay ? { transitionDelay: `${delay}s` } : undefined,
        },
        children,
      )}
    </div>
  );
}
