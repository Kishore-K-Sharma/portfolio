---
title: "Context Engineering: Managing the Window Like a Cache, Not a Prompt"
description: "Prompt engineering was about wording one message. Context engineering is about managing the entire context window as a scarce budget — what goes in, in what order, and what gets evicted. For a backend engineer, it's working-set management applied to an LLM."
date: "2026-06-08"
tags: ["context-engineering", "prompt-engineering", "llm", "rag", "agents", "caching", "ai-engineering", "typescript"]
---

You can make a large language model measurably dumber by giving it *more* information. Same model, same weights, same system prompt. Feed it a fatter context window and the answers get worse. It's the one machine in your stack that gets confused when you hand it the manual.

The model is a brilliant intern working at a cramped little desk, the kind where the surface barely fits a laptop and a coffee. Whatever the task is, the intern can only use what's physically on that desk right now. No filing cabinet, no second monitor, no "let me just look that up." Lay out the one reference page it needs and you get a sharp answer. Bury that page under forty pages of yesterday's notes, six manuals it'll never open, and a printout from a question everyone abandoned an hour ago, and it'll fumble. Even though, technically, the answer was sitting *right there on the desk*. The model isn't ignoring you. It's drowning in the junk you stacked next to the thing that mattered.

So the discipline isn't "write better instructions." It's deciding what earns a spot on the desk and clearing off the rest. That's the shift that happened, fairly quietly, over the last year. We stopped calling this *prompt engineering* and started calling it context engineering, and the rename wasn't marketing. Prompt engineering is about the words in one message. Context engineering is about managing the entire context window (every token the model sees on a given call) as a scarce budget. What goes in, in what order, and what gets thrown out.

If you've ever tuned a Redis cache or watched a JVM heap, you already have the instinct. You don't load the whole database into memory. You keep the hot set resident and evict the rest. The context window is that same problem wearing a different hat.

## The desk analogy

Worth making the desk precise, because the whole discipline falls out of it. The model can only use what's physically laid out on that surface right now. No filing cabinet it reaches into mid-thought, no second monitor. Just what's in front of it.

The quality of the work depends on two things: what you laid out, and where you put it. The right reference page next to the task gets you a sharp answer. The same page buried under a stack of stuff it doesn't need gets ignored, even though the page is technically *on the desk*. Position matters as much as presence, and that one comes back to bite us later.

That's the context window. It's finite, everything competes for the same surface, and the engineering job is deciding what earns a spot.

## What's competing for the budget

On any given model call, a handful of distinct things are all fighting for the same token budget:

- **System instructions.** Who the model is, the rules, the output format. Usually small, always present.
- **Tool definitions.** The JSON schemas for every tool you've made available. These are sneakily expensive. Ten tools with chatty descriptions can eat a couple thousand tokens before the user has said a word.
- **Retrieved knowledge (RAG).** The chunks you pulled from your vector store or DB for this specific question.
- **Tool results.** Whatever your tools returned. A single unfiltered API response can be enormous.
- **Conversation history.** Every previous turn, growing without bound unless you step in.
- **The working scratchpad.** The model's own notes, plans, intermediate reasoning, and any external memory you've read back in.

Add it up and the problem shows itself. The window has a hard ceiling and these six things don't politely share, they crowd each other out. The most dangerous one is conversation history, because it's the only one that grows forever while contributing the least per token.

![A stacked bar showing the context window as a finite token budget. System instructions, tool definitions, and retrieved knowledge sit at the bottom as the resident working set; conversation history is the largest and least valuable slice and is the first thing evicted when the current query needs room.](/writing/context-window-budget.svg "The window is finite. History is the first thing you evict.")

## The core techniques

Once you see it as a budget, the techniques mostly write themselves, and most of them have direct backend analogues.

**Retrieve just-in-time, not everything up front.** The lazy instinct is to stuff every doc that might be relevant into the prompt. Don't. Pull the few chunks you need *for this turn*, the way you'd query a DB for the rows you need instead of `SELECT *` into memory. Retrieval is your cache lookup, so keep it tight.

**Compact old turns.** Conversation history is the heap that never gets collected unless you do it yourself. After N turns, summarize the older ones into a few lines and drop the raw text. You lose some fidelity and reclaim a lot of budget, and for long-running agents this is the one change that buys you the most.

**Demand structured outputs.** Free-form prose is verbose and a pain to slice. JSON with a fixed schema is compact, parseable, and lets you keep only the fields you need downstream instead of the whole blob.

**Trim your tool schemas.** Those tool definitions are always-resident overhead. They're in the window on every call whether the tool fires or not. Cut the prose, drop optional params you never use, and don't expose forty tools when the agent realistically reaches for six.

**Offload to external memory.** Anything the model doesn't need *right now* shouldn't be on the desk. Write it to a file, a key-value store, a scratchpad table, then read it back only when a turn actually calls for it. The window is L1 cache. Your memory store is RAM. Don't confuse the two.

## The failure modes worth naming

There are a few classic ways the desk goes wrong, and naming them is half the battle. Once you can spot them, they stop being mysterious "the model got dumber" moments and turn into problems with obvious fixes.

**Context rot, a.k.a. lost-in-the-middle.** Answer quality is not flat across the window. Models reliably attend best to the beginning and the end, and the middle goes fuzzy. As you fill the window, two bad things happen at once. The signal-to-noise ratio drops, and your important content drifts into that neglected middle band. The model technically *has* the information and acts like it doesn't. A full window is not a smart window.

![A quality-versus-context-length curve. Answer quality stays high while the window is lightly loaded, then degrades as it fills. A shaded band in the middle marks the lost-in-the-middle zone where content is present but under-attended.](/writing/context-rot-curve.svg "More context is not more intelligence. Past a point it's the opposite.")

**Context poisoning.** A tool returns garbage. A hallucinated fact, a malformed payload, the wrong row. It lands in the window, and now it's part of the context for every turn after. The model reads its own bad output as established truth and builds on it. One poisoned tool result early in a long agent run compounds into completely confident nonsense by the end, and good luck debugging that after the fact. The fix is the unglamorous one: validate and filter what tools put back into context, the same way you'd never trust an upstream service's response without checking it.

**Blowing the budget on stale history.** The quiet killer. Forty turns deep, ninety percent of your window is conversation nobody will ever reference again, and your actual retrieved knowledge gets squeezed out to make room. You're paying full token price to keep junk resident. This is a cache with no eviction policy, and it ends the way an unbounded cache always ends. Badly, and usually in production.

## What this looks like in code

The heart of it is a function that assembles a context window against a token budget. System instructions are non-negotiable and go first. Retrieved chunks for the current question come next. Then we backfill conversation history from newest to oldest, and the moment we'd blow the budget we stop and drop the oldest turns. Same logic as an LRU cache, just measured in tokens instead of bytes.

```typescript
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tokens: number; // precomputed via your tokenizer
}

interface AssembleOptions {
  budget: number;          // total token budget for the call
  system: Message;         // always included, highest priority
  retrieved: Message[];    // RAG chunks for THIS query, pre-ranked
  history: Message[];      // full conversation, oldest -> newest
  query: Message;          // the current user turn, must be included
}

function assembleContext(opts: AssembleOptions): Message[] {
  const { budget, system, retrieved, history, query } = opts;

  // 1. Reserve room for the non-negotiables: system + current query.
  const reserved = system.tokens + query.tokens;
  let remaining = budget - reserved;
  if (remaining < 0) {
    throw new Error("System prompt + query alone exceed the budget.");
  }

  // 2. Retrieved knowledge is the reason we're here. Fit what we can,
  //    in rank order, and stop at the first chunk that won't fit.
  const chunks: Message[] = [];
  for (const chunk of retrieved) {
    if (chunk.tokens > remaining) break;
    chunks.push(chunk);
    remaining -= chunk.tokens;
  }

  // 3. Backfill history newest-first; oldest turns fall off the desk.
  const recent: Message[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.tokens > remaining) break; // out of budget: evict the rest
    recent.unshift(turn);
    remaining -= turn.tokens;
  }

  // 4. Assemble in the order the model reads best:
  //    instructions up top, knowledge + history in the middle,
  //    current question last so it lands in the high-attention zone.
  return [system, ...chunks, ...recent, query];
}
```

The first time you write this, you'll be tempted to fill the window to the brim. We paid for 200k tokens, the thinking goes, so let's use them. Resist. A leaner window with the right chunks beats a stuffed one every time, thanks to context rot. The budget you pass in should usually be a fraction of the model's true limit, not the whole thing. Leave headroom and let quality, not capacity, set the ceiling. (Yes, you've already filled a window to the brim and wondered why the model went stupid.)

The thing this snippet glosses over is the upgrade from raw history to *compacted* history. In a real agent, step 3 doesn't just drop old turns, it summarizes them first and keeps the summary. You'd slot in a `summarize()` call that rolls everything past the recent window into one compact message and prepends it. That's your write-back: a lossy compression of cold data so the hot set stays small.

## It's the same instinct you already have

None of this is new if you've done backend work. You already refuse to load a whole table into memory. You keep the hot keys in Redis and let the cold ones live in Postgres. You watch a JVM's working set and know that a heap full of objects nobody references is a problem waiting to happen.

Context engineering is that instinct pointed at an LLM. The context window is your working set, retrieval is your cache lookup, compaction is write-back, and eviction is, well, eviction. The model is fast and forgetful. Your job is to keep exactly the right things on its small desk at exactly the right moment, and clear off the rest.

So stop hunting for the perfect prompt. The wording matters far less than the working set. Treat the window like the scarce, expensive cache it actually is, and most of your "the model got dumber" problems turn out to be eviction problems you never wrote a policy for.
