"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "hero", num: "00", label: "intro" },
  { id: "manifesto", num: "01", label: "manifesto" },
  { id: "capability", num: "02", label: "capability" },
  { id: "work", num: "03", label: "work" },
  { id: "proof", num: "04", label: "proof" },
  { id: "education", num: "05", label: "foundations" },
  { id: "contact", num: "06", label: "contact" },
];

/**
 * Thin scroll-synced index rail — "engineered document" chrome. Desktop only;
 * hidden on narrow viewports where it would crowd content. Purely navigational,
 * so it carries no motion beyond the active-state change.
 */
export function SectionRail() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The section whose top is nearest the upper third of the viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Section navigation"
      className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-3"
    >
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={isActive ? "true" : undefined}
            className="group flex items-center gap-3"
          >
            <span
              className={`block h-px transition-all duration-300 ${
                isActive ? "w-8 bg-accent" : "w-4 bg-subtle group-hover:w-6 group-hover:bg-foreground/50"
              }`}
              aria-hidden
            />
            <span
              className={`font-mono text-[0.62rem] tabular-nums transition-colors duration-300 ${
                isActive ? "text-foreground" : "text-muted-foreground/50 group-hover:text-muted-foreground"
              }`}
            >
              {s.num}
            </span>
            <span
              className={`font-mono text-[0.62rem] uppercase tracking-[0.12em] transition-all duration-300 ${
                isActive
                  ? "opacity-100 translate-x-0 text-muted-foreground"
                  : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground/70"
              }`}
            >
              {s.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
