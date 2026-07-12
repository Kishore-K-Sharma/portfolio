import { listNotes, type NoteMeta } from "./notes";
import { listWork, type WorkMeta } from "./work";

/**
 * Cross-links between writing (notes) and work (case studies).
 *
 * Notes carry freeform kebab-case tags; work carries a `domain` plus a
 * TitleCase `stack`. We normalize both sides to a common token vocabulary,
 * then score by shared-token overlap. Generic tokens (backend, architecture)
 * are down-weighted so links surface on genuine topical overlap, not on the
 * fact that everything here is backend-flavored.
 */

// Collapse aliases / versions so "PostgreSQL", "postgres", "Postgres" all match.
const ALIASES: Record<string, string> = {
  "node.js": "node",
  nodejs: "node",
  "react.js": "react",
  "react native": "react",
  reactnative: "react",
  postgresql: "postgres",
  "socket.io": "socketio",
  websockets: "websocket",
  "distributed-systems": "distributed",
  "spring-boot": "spring",
};

// Tokens too generic to imply real topical relatedness — kept, but low weight.
const GENERIC = new Set([
  "backend",
  "architecture",
  "patterns",
  "platform",
  "infrastructure",
  "engineering",
]);

// Concepts each work domain is genuinely about — expands stack-only matching
// so a fintech case links to idempotency/transactions posts, etc.
const DOMAIN_CONCEPTS: Record<WorkMeta["domain"], string[]> = {
  fintech: ["idempotency", "transactions", "saga", "payments", "postgres", "migration"],
  edtech: ["realtime", "webrtc", "websocket", "socketio", "streaming", "scale"],
  govtech: ["workflow", "automation", "migration", "postgres"],
  telecom: ["streaming", "scale", "observability", "distributed"],
};

function normalize(token: string): string {
  const t = token.toLowerCase().trim();
  return ALIASES[t] ?? t;
}

function keywordsForWork(work: WorkMeta): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (raw: string, weight: number) => {
    const t = normalize(raw);
    weights.set(t, Math.max(weights.get(t) ?? 0, weight));
  };
  work.stack.forEach((s) => add(s, GENERIC.has(normalize(s)) ? 0.4 : 1));
  add(work.domain, 1);
  (DOMAIN_CONCEPTS[work.domain] ?? []).forEach((c) => add(c, 1.2));
  return weights;
}

function scoreNoteAgainst(note: NoteMeta, weights: Map<string, number>): number {
  let score = 0;
  for (const tag of note.tags) {
    const t = normalize(tag);
    const w = weights.get(t);
    if (w === undefined) continue;
    score += GENERIC.has(t) ? w * 0.5 : w;
  }
  return score;
}

/** Notes most topically related to a case study, best first. */
export function notesForWork(work: WorkMeta, limit = 3): NoteMeta[] {
  const weights = keywordsForWork(work);
  return listNotes()
    .map((note) => ({ note, score: scoreNoteAgainst(note, weights) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.note.date.localeCompare(a.note.date))
    .slice(0, limit)
    .map((r) => r.note);
}

/** Case studies most related to a note (usually 0 or 1), best first. */
export function workForNote(note: NoteMeta, limit = 1): WorkMeta[] {
  return listWork()
    .map((work) => ({ work, score: scoreNoteAgainst(note, keywordsForWork(work)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.work.startDate.localeCompare(a.work.startDate))
    .slice(0, limit)
    .map((r) => r.work);
}
