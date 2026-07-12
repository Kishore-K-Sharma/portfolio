"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

const NODES = [
  { x: 60, label: "Gateway", tone: "telecom", meta: "TLS · rate-limit" },
  { x: 220, label: "Auth", tone: "fintech", meta: "JWT · 8ms" },
  { x: 380, label: "Order Svc", tone: "edtech", meta: "idempotent" },
  { x: 540, label: "Inventory", tone: "telecom", meta: "reserve · SAGA" },
  { x: 700, label: "Datastore", tone: "govtech", meta: "Postgres · WAL" },
] as const;

const HOPS = [
  { from: 0, to: 1, ms: "12ms" },
  { from: 1, to: 2, ms: "8ms" },
  { from: 2, to: 3, ms: "21ms" },
  { from: 3, to: 4, ms: "14ms" },
];

// System facts, not invented figures — the lead engagement is confidential, so
// these describe the architecture honestly rather than fabricating metrics.
const FACTS = [
  { k: "Services", v: "5" },
  { k: "p95 latency", v: "55ms" },
  { k: "Retries", v: "Idempotent" },
  { k: "Deploys", v: "Zero-downtime" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function RequestTrace() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  // A packet's journey: cx sweeps through every node x in sequence, so one dot
  // visibly hops the whole pipeline, then loops — a live request, not a one-shot.
  const packetXs = NODES.map((n) => n.x);
  const packetTransition = {
    duration: 3,
    ease: "linear" as const,
    repeat: Infinity,
    repeatDelay: 0.6,
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-subtle/60 bg-surface/40 p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-edtech animate-pulse-soft" aria-hidden />
          <span className="font-mono text-[0.75rem] tracking-wider text-muted-foreground">
            GET /v1/orders/checkout · {hovered !== null ? NODES[hovered].label.toLowerCase() : "trace"}
          </span>
        </div>
        <span className="font-mono text-[0.75rem] text-muted-foreground num">
          {hovered !== null ? NODES[hovered].meta : "p95 · 55ms"}
        </span>
      </div>

      <svg
        ref={ref}
        viewBox="0 0 760 200"
        className="w-full h-auto"
        role="img"
        aria-label="Animated request trace: five services connected by timed hops, with a live request packet flowing through the pipeline"
      >
        {/* Connector lines */}
        {HOPS.map((hop, i) => {
          const x1 = NODES[hop.from].x + 18;
          const x2 = NODES[hop.to].x - 18;
          const midX = (x1 + x2) / 2;
          return (
            <g key={i}>
              <line x1={x1} y1={100} x2={x2} y2={100} stroke="hsl(var(--subtle))" strokeWidth={1} strokeDasharray="3 4" />
              <motion.line
                x1={x1}
                y1={100}
                x2={x2}
                y2={100}
                stroke="hsl(var(--accent))"
                strokeWidth={1.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.25, ease: EASE }}
              />
              <motion.text
                x={midX}
                y={86}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.4 + i * 0.25, duration: 0.4 }}
              >
                {hop.ms}
              </motion.text>
            </g>
          );
        })}

        {/* Live packet(s) — the signature motion. Suppressed under reduced motion. */}
        {inView && !reduce && (
          <>
            <motion.circle
              r={5}
              fill="hsl(var(--accent))"
              cy={100}
              initial={{ cx: NODES[0].x, opacity: 0 }}
              animate={{ cx: packetXs, opacity: [0, 1, 1, 1, 1] }}
              transition={packetTransition}
              style={{ filter: "drop-shadow(0 0 6px hsl(var(--accent) / 0.7))" }}
            />
            <motion.circle
              r={3}
              fill="hsl(var(--accent) / 0.5)"
              cy={100}
              initial={{ cx: NODES[0].x }}
              animate={{ cx: packetXs }}
              transition={{ ...packetTransition, delay: 1.5 }}
            />
          </>
        )}

        {/* Nodes */}
        {NODES.map((node, i) => {
          const active = hovered === i;
          return (
            <g
              key={node.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              style={{ cursor: "pointer" }}
            >
              <title>{`${node.label} — ${node.meta}`}</title>
              {/* Hit area */}
              <rect x={node.x - 26} y={70} width={52} height={80} fill="transparent" />
              <motion.circle
                cx={node.x}
                cy={100}
                r={active ? 18 : 14}
                fill="hsl(var(--background))"
                stroke={`hsl(var(--${node.tone}))`}
                strokeWidth={active ? 2 : 1.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.1 + i * 0.18, duration: 0.4, ease: EASE }}
                style={{ transformOrigin: `${node.x}px 100px`, transition: "r 0.2s ease, stroke-width 0.2s ease" }}
              />
              <motion.circle
                cx={node.x}
                cy={100}
                r={3}
                fill={`hsl(var(--${node.tone}))`}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: [0, 1, 0.4, 1] } : {}}
                transition={{ delay: 0.2 + i * 0.18, duration: 1.2 }}
              />
              <motion.text
                x={node.x}
                y={140}
                textAnchor="middle"
                className={active ? "fill-foreground" : "fill-muted-foreground"}
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
                initial={{ opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.18, duration: 0.4 }}
              >
                {node.label}
              </motion.text>
            </g>
          );
        })}
      </svg>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-subtle/60">
        {FACTS.map((m) => (
          <div key={m.k}>
            <div className="font-mono text-[0.7rem] text-muted-foreground">{m.k}</div>
            <div className="font-display text-heading-sm text-foreground num mt-1">{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
