"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import portfolioData from "@/data/portfolio.json";
import { SmoothAnchor } from "@/components/SmoothAnchor";

const wordVariants = {
  hidden: { y: "110%", opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.9,
      delay: 0.05 + i * 0.06,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export function Hero() {
  const { personal, summary, domains } = portfolioData;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const headline = ["End", "to", "end.", "No", "handoffs."];

  return (
    <section
      ref={ref}
      id="hero"
      className="relative min-h-[100svh] flex flex-col justify-end pt-32 pb-16 md:pb-24 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" aria-hidden />
      <div
        className="absolute -bottom-32 -right-32 w-[42rem] h-[42rem] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--accent) / 0.18), transparent 60%)",
        }}
        aria-hidden
      />

      <motion.div style={{ y, opacity }} className="container-editorial relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-12 md:mb-16 eyebrow"
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-edtech animate-pulse-soft" aria-hidden />
            Available for lead full-stack engineering roles
          </span>
          <span className="hidden md:inline text-subtle">·</span>
          <span>{personal.location}</span>
          <span className="hidden md:inline text-subtle">·</span>
          <span>{personal.experienceYears} yrs</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 font-mono text-[0.8rem] md:text-[0.9rem] text-foreground"
        >
          {personal.name}
          <span className="text-muted-foreground"> · {personal.title}</span>
        </motion.p>

        <h1 className="font-display text-display-xl text-foreground leading-[0.9] tracking-[-0.045em] text-balance">
          {headline.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden align-baseline pr-[0.18em]">
              <motion.span
                custom={i}
                variants={wordVariants}
                initial="hidden"
                animate="visible"
                className="inline-block"
              >
                {i === headline.length - 1 ? (
                  <span className="font-display-soft italic text-accent">{word}</span>
                ) : (
                  word
                )}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10"
        >
          <p className="md:col-span-6 lg:col-span-5 text-lead text-muted-foreground text-pretty">
            {summary}
          </p>
          <div className="md:col-span-6 md:col-start-8 lg:col-span-4 lg:col-start-9 flex flex-col gap-3">
            <span className="eyebrow">Operating across</span>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[0.85rem]">
              {domains.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-foreground">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `hsl(var(--${d.id}))` }}
                    aria-hidden
                  />
                  {d.name}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-3">
              <SmoothAnchor
                href="#work"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-[0.85rem] hover:opacity-90 transition-opacity"
              >
                See the work <span aria-hidden>→</span>
              </SmoothAnchor>
              <SmoothAnchor
                href="#contact"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-subtle text-foreground text-[0.85rem] hover:border-foreground/40 transition-colors"
              >
                Contact
              </SmoothAnchor>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="container-editorial relative mt-16 md:mt-24 flex items-end justify-between"
      >
        <div className="flex items-center gap-3 font-mono text-[0.72rem] text-muted-foreground">
          <span className="kbd">⌘K</span>
          <span>open console — try <span className="text-foreground">whoami</span></span>
        </div>
        <div className="flex items-end gap-3 font-mono text-[0.72rem] text-muted-foreground">
          <span>scroll</span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="block w-px h-8 bg-foreground/40"
            aria-hidden
          />
        </div>
      </motion.div>
    </section>
  );
}
