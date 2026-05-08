"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { SmoothAnchor } from "@/components/SmoothAnchor";

const NAV = [
  { href: "/work", label: "Work" },
  { href: "/writing", label: "Writing" },
  { href: "/uses", label: "Uses" },
  { href: "/#contact", label: "Contact" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll + handle Escape while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const openConsole = () => {
    window.dispatchEvent(new CustomEvent("console:open"));
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-300",
          scrolled
            ? "bg-background/70 backdrop-blur-md border-b border-subtle/60 py-3"
            : "bg-transparent border-b border-transparent py-5"
        )}
      >
        <nav className="container-editorial flex items-center justify-between gap-6">
          <Link
            href="/"
            aria-label="Kishore Kumar Sharma — home"
            className="group flex items-center gap-2"
          >
            <span className="font-mono text-[0.78rem] tracking-[0.18em] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
              kks
            </span>
            <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" aria-hidden />
            <span className="font-display text-[0.95rem] tracking-tight text-foreground hidden sm:inline">
              Kishore Kumar Sharma
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[0.85rem] text-muted-foreground">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={openConsole}
              aria-label="Open console (Cmd+K)"
              className="group hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-subtle text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <span className="font-mono text-[0.7rem] tracking-wide">console</span>
              <span className="kbd">⌘K</span>
            </button>
            <ThemeToggle />
            <SmoothAnchor
              href="/#contact"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-[0.82rem] hover:opacity-90 transition-opacity"
            >
              Get in touch
              <span aria-hidden>→</span>
            </SmoothAnchor>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-subtle text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] md:hidden bg-background"
          >
            <div className="container-editorial flex items-center justify-between py-5">
              <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                /menu
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-subtle text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <motion.nav
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, delay: 0.05 }}
              className="container-editorial mt-8 flex flex-col"
            >
              <ul className="flex flex-col divide-y divide-subtle/60 border-y border-subtle/60">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-baseline justify-between py-5 group"
                    >
                      <span className="font-display text-[1.6rem] tracking-tight text-foreground group-hover:text-accent transition-colors">
                        {item.label}
                      </span>
                      <span className="font-mono text-[0.72rem] text-muted-foreground" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openConsole();
                  }}
                  className="inline-flex items-center justify-between gap-2 px-4 py-3 rounded-md border border-subtle text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <span className="font-mono text-[0.78rem] tracking-wide">open console</span>
                  <span className="kbd">⌘K</span>
                </button>
                <SmoothAnchor
                  href="/#contact"
                  className="inline-flex items-center justify-between gap-2 px-4 py-3 rounded-md bg-foreground text-background"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="text-[0.92rem]">Get in touch</span>
                  <span aria-hidden>→</span>
                </SmoothAnchor>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
