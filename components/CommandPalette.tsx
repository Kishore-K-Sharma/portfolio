"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import portfolioData from "@/data/portfolio.json";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  group: "navigate" | "system" | "external";
  run: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const go = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      close();
    },
    [close]
  );

  const commands: Cmd[] = useMemo(
    () => [
      { id: "nav-work", label: "open work", hint: "/work · all case studies", group: "navigate", run: () => { window.location.href = "/work"; close(); } },
      { id: "nav-writing", label: "open writing", hint: "/writing · long-form", group: "navigate", run: () => { window.location.href = "/writing"; close(); } },
      { id: "nav-uses", label: "open uses", hint: "/uses · the toolkit", group: "navigate", run: () => { window.location.href = "/uses"; close(); } },
      { id: "nav-cap", label: "open capability", hint: "scroll · skills", group: "navigate", run: () => go("capability") },
      { id: "nav-proof", label: "open proof", hint: "scroll · testimonials + awards", group: "navigate", run: () => go("proof") },
      { id: "nav-contact", label: "open contact", hint: "scroll · get in touch", group: "navigate", run: () => go("contact") },
      { id: "sys-whoami", label: "whoami", hint: portfolioData.personal.title, group: "system", run: () => go("manifesto") },
      { id: "sys-cat", label: "cat about", hint: "read manifesto", group: "system", run: () => go("manifesto") },
      { id: "sys-ls", label: "ls projects", hint: "list case studies", group: "system", run: () => go("work") },
      { id: "sys-grep", label: "grep skills java", hint: "jump to capability", group: "system", run: () => go("capability") },
      { id: "ext-linkedin", label: "open linkedin", hint: "↗ external", group: "external", run: () => { window.open(portfolioData.personal.linkedin, "_blank", "noopener,noreferrer"); close(); } },
      { id: "open-contact", label: "open contact form", hint: "say hi via the form", group: "external", run: () => go("contact") },
    ],
    [go, close]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Keep cursor in bounds when filter changes
  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  // Global hotkeys + custom open event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "`" && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("console:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("console:open", onOpen);
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (typeof window === "undefined") return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-background/70 backdrop-blur-md"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ y: -10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-xl border border-subtle bg-surface shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle/70">
              <span className="font-mono text-[0.72rem] tracking-wider text-accent">~/kks</span>
              <span className="font-mono text-[0.85rem] text-muted-foreground">$</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") close();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, filtered.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    filtered[cursor]?.run();
                  }
                }}
                placeholder="Type a command — try whoami, ls projects, grep skills java"
                className="flex-1 bg-transparent outline-none font-mono text-[0.9rem] placeholder:text-muted-foreground/60"
              />
              <span className="kbd">esc</span>
            </div>

            <ul className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <li className="px-4 py-3 font-mono text-[0.85rem] text-muted-foreground">
                  command not found: <span className="text-foreground">{query}</span>
                </li>
              )}
              {filtered.map((cmd, i) => (
                <li key={cmd.id}>
                  <button
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => cmd.run()}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 font-mono text-[0.85rem] transition-colors ${
                      i === cursor ? "bg-accent/10 text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`text-[0.65rem] uppercase tracking-widest ${groupTone(cmd.group)}`}>
                        {cmd.group}
                      </span>
                      <span>{cmd.label}</span>
                    </span>
                    {cmd.hint && (
                      <span className="text-[0.78rem] text-muted-foreground/80 truncate">{cmd.hint}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between px-4 py-2 border-t border-subtle/70 text-[0.7rem] font-mono text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="kbd">↑</span><span className="kbd">↓</span> navigate
              </span>
              <span className="flex items-center gap-2">
                <span className="kbd">↵</span> run
              </span>
              <span className="flex items-center gap-2">
                <span className="kbd">⌘K</span> toggle
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function groupTone(g: Cmd["group"]) {
  if (g === "navigate") return "text-telecom";
  if (g === "system") return "text-edtech";
  return "text-fintech";
}
