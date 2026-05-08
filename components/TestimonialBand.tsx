"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import portfolioData from "@/data/portfolio.json";
import { SmoothAnchor } from "@/components/SmoothAnchor";

const TESTIMONIALS = portfolioData.testimonials;
const ROTATE_MS = 8000;

export function TestimonialBand() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-rotate. Pauses on hover/focus and under prefers-reduced-motion.
  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
    }
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const t = TESTIMONIALS[idx];
  const goPrev = () => setIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const goNext = () => setIdx((i) => (i + 1) % TESTIMONIALS.length);

  return (
    <section
      aria-label="What others say"
      className="relative border-y border-subtle/50 bg-surface/30 py-14 md:py-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-narrow">
        <div className="flex items-center justify-between gap-4 mb-6">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            /what others say
          </p>
          <span className="font-mono text-[0.7rem] text-muted-foreground num">
            {String(idx + 1).padStart(2, "0")} / {String(TESTIMONIALS.length).padStart(2, "0")}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <blockquote className="text-foreground text-[1.05rem] md:text-[1.15rem] leading-[1.55] tracking-[-0.005em] text-pretty max-w-[60ch]">
              <span className="font-display-soft italic text-accent text-[1.4em] leading-none align-top mr-1">
                &ldquo;
              </span>
              {t.content}
            </blockquote>
            <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono">
              <span className="text-[0.85rem] text-foreground">{t.name}</span>
              <span className="text-[0.74rem] text-muted-foreground">·</span>
              <span className="text-[0.74rem] text-muted-foreground line-clamp-1 max-w-[36ch]">
                {t.title}
              </span>
              <span className="text-[0.7rem] text-muted-foreground/70 ml-auto">
                {t.relationship}
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              aria-label="Previous testimonial"
              data-cursor-label="prev"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-subtle/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goNext}
              aria-label="Next testimonial"
              data-cursor-label="next"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-subtle/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Pagination dots — all 9 selectable */}
          <div
            className="flex items-center gap-1.5 flex-wrap justify-end"
            role="tablist"
            aria-label="Select testimonial"
          >
            {TESTIMONIALS.map((tx, i) => (
              <button
                key={tx.name}
                role="tab"
                aria-selected={i === idx}
                aria-label={`Show testimonial from ${tx.name}`}
                onClick={() => setIdx(i)}
                className="group flex items-center justify-center py-2 px-1 -my-2"
              >
                <span
                  aria-hidden
                  className={`block h-1 rounded-full transition-all ${
                    i === idx ? "w-5 bg-foreground" : "w-2.5 bg-subtle group-hover:bg-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 font-mono text-[0.72rem] text-muted-foreground">
          {TESTIMONIALS.length} reviews from peers, managers, and direct reports.{" "}
          <SmoothAnchor href="#proof" className="text-foreground hover:text-accent transition-colors">
            see them all in detail →
          </SmoothAnchor>
        </p>
      </div>
    </section>
  );
}
