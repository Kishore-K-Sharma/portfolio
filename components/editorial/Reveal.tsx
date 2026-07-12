"use client";

import { createElement, useEffect, useRef, type ReactNode } from "react";

type Tag = "div" | "span" | "p" | "h1" | "h2" | "h3" | "li";

// One shared IntersectionObserver for every reveal on the page. Previously each
// Reveal mounted its own framer-motion node + observer; on content-heavy pages
// that was hundreds of observers and motion runtimes. This collapses the reveal
// to a single observer that adds `.reveal-in` to whatever it's watching — the
// CSS (see globals.css) decides how each element transitions in.
let sharedObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            sharedObserver!.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
  }
  return sharedObserver;
}

/** Registers an element with the shared reveal observer. Returns a ref callback. */
export function useRevealRef<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getObserver();
    // No IntersectionObserver (SSR / very old browser): reveal immediately.
    if (!obs) {
      el.classList.add("reveal-in");
      return;
    }
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);
  return ref;
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: Tag;
}) {
  const ref = useRevealRef<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      className: className ? `reveal ${className}` : "reveal",
      style: delay ? { transitionDelay: `${delay}s` } : undefined,
    },
    children,
  );
}
