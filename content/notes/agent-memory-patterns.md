---
title: "How AI Agents Remember: Memory Patterns Beyond the Context Window"
description: "An agent with a 1M-token context still meets you as a total stranger tomorrow — the context window is RAM, wiped the moment the session ends. Real memory is an engineering system you build around the model: what to save, when to update it, and what to forget. This is the taxonomy, the storage trade-offs, and the write policy that separates a gimmick from a colleague."
date: "2026-07-07"
tags: ["ai-agents", "memory", "llm", "context-engineering", "rag", "ai"]
category: "engineering"
---

Here's a claim that should bother you more than it does: the "agent with a 1M-token context window" you shipped last quarter meets every user as a total stranger every single morning. It remembers nothing. Yesterday you spent forty minutes teaching it your codebase, your deploy schedule, the fact that you *always* want tests run before it claims a task is done. This morning it greets you with the enthusiasm of a golden retriever and none of the recollection. The window didn't shrink. The session ended, and the window went with it.

This trips people up because "big context" *sounds* like memory. It isn't. A giant context window is a bigger desk, not a better memory. And the fix is not a bigger model — it's an engineering system you build *around* the model. That system is what turns a clever demo into something that behaves like a colleague. Let's build the mental model for it.

## The context window is RAM, not memory

Start with the hardware analogy, because it's exact rather than cute. The context window is RAM: big, fast, holds everything the model is thinking about *right now* — and volatile. Cut the power (end the session) and it's gone. Every token in there was working memory for one conversation, and working memory is not the filing cabinet.

Real memory is disk. It's the stuff that survives the session boundary: written down somewhere durable, deliberately read back the next time. The model doesn't give you this for free. *You* build it. This is the whole game, and almost everyone underinvests in it because the RAM is so roomy they mistake it for permanence.

![Left: the context window as RAM — big, fast, session-scoped, wiped on exit, leaving the agent a stranger every morning. Right, in accent: the memory system as disk — files, vector stores, and knowledge graphs that persist across every session, built by you rather than the model.](/writing/agent-memory-ram-vs-disk.svg "The model forgets everything; the product remembers. The context window is RAM. Memory is the disk you build around it.")

So "does your agent have memory" is really two questions. What's in RAM for this turn — that's context engineering, and I've [written about managing the window like a cache](/writing/context-engineering-beyond-prompts) elsewhere. And what persists to disk across turns and sessions — that's memory, and it's the rest of this post.

## Short-term memory: the buffer that has to forget

Short-term memory (working memory) is the live conversation buffer — the turns sitting in the window right now. It feels like memory because it *is*, briefly. The catch is that it's finite and it fills, so the real engineering is deciding what falls off the edge of the desk.

Three moves, in increasing order of cleverness:

- **Truncation.** When the buffer overflows, drop the oldest turns. Crude, cheap, and it works until the model needs something from turn three of a forty-turn session.
- **Sliding window.** Always keep the last *N* turns. Same idea, slightly kinder, same amnesia about anything older than the window.
- **Compaction.** The good one. When the buffer gets long, summarize the oldest turns into a running summary and drop the raw text. "The user is refactoring the billing module, chose Stripe over Braintree, and hit a webhook signing bug." That one line replaces two thousand tokens of transcript and survives while the raw turns get evicted.

Compaction is lossy compression of cold conversation so the hot set stays small. It's what lets a long-running agent go for hours without either blowing the window or forgetting why it started. But notice: even compaction dies when the session dies. It's still RAM. To survive the night, something has to hit disk.

## Long-term memory: episodic, semantic, procedural

Long-term memory is the persistent layer, and borrowing the categories cognitive scientists use for human memory turns out to be genuinely useful — not just an analogy for the blog. It splits three ways.

![Short-term working memory on the left — the live conversation managed by sliding window, truncation, and compaction. On the right in accent, long-term memory split three ways: episodic (what happened — past sessions, decisions, outcomes), semantic (extracted facts like the user's stack and deploy schedule), and procedural (learned how-tos and preferences).](/writing/agent-memory-taxonomy.svg "Short-term is the buffer you manage by forgetting. Long-term splits into episodic, semantic, and procedural.")

**Episodic** — *what happened.* The log of past sessions, decisions, and their outcomes. "Last Tuesday we tried the connection-pool fix and it made the p99 worse." Episodic memory is narrative; it's how an agent can say "we've been here before" instead of cheerfully re-suggesting the thing that already failed.

**Semantic** — *the facts.* Durable statements distilled out of those episodes, stripped of the story. "The user's stack is Spring Boot." "Deploys happen on Fridays." "Prod is on GCP, staging on Fly." Facts don't need the transcript they came from; they need to be *true* and easy to look up.

**Procedural** — *the how-to.* Learned preferences and workflows. "Always run the tests before claiming done." "This user hates emoji in commit messages." "Use pnpm, never npm, in this repo." Procedural memory is what makes an agent feel trained rather than merely informed — it's the difference between a new hire who knows the facts and one who knows how you like things done.

Most production "agent memory" is really just semantic plus procedural facts pulled forward at the right moment. Episodic is rarer and harder, because narratives are big and deciding which episodes matter is genuinely tricky.

## Where you actually put it

Three storage backends show up, and the fashionable one is not the one that quietly wins.

**Vector store.** Embed every memory, retrieve by semantic similarity. Great when you don't know the exact key you're looking for — "find anything related to what the user just asked." The trade-off is retrieval noise: similarity is fuzzy, so you pull back six things that *rhyme* with the query and one that's actually relevant, and now your window has five distractions in it.

**Knowledge graph.** Store entities and the relations between them — `user → deploys_on → Friday`, `service:billing → depends_on → service:auth`. Precise, and unbeatable when the value is in the *connections* between facts and you need to traverse them. The cost is that you have to extract clean entities and relations in the first place, which is real work and its own source of errors.

**Plain files.** The unglamorous winner for a huge class of agents: markdown the agent reads at session start. A `CLAUDE.md`-style memory file. No embeddings, no graph database, no retrieval pipeline — just text on disk. It's cheap, it's inspectable (you can *read* your agent's memory in an editor), it's versionable (it's in git; you can diff what changed), and for a core of stable facts it beats the fancy options handily. Don't reach for a vector database when a file the agent reads on boot would do. Plenty of "memory systems" are one markdown file with good discipline.

## The hard part is the write path

Everyone obsesses over retrieval — how to *read* memory well. But the read path is the easy half. The hard, under-engineered half is the **write** path: deciding what's even worth saving, and keeping it correct over time.

![The memory loop as a cycle: a session produces raw material; EXTRACT decides what's salient; STORE writes it, updating or appending and invalidating anything now stale; RECALL pulls a curated core at the next session's start plus searches the rest on demand; INJECT places it into the next context; repeat. The store step is highlighted as the hard part.](/writing/agent-memory-loop.svg "The model forgets; the loop remembers. Extract what's salient, store it correctly, recall a curated core, inject, repeat.")

Three decisions make or break it:

**Salience — what's worth saving.** Not everything. The signal lives in corrections ("no, we deploy on Fridays, not Mondays"), stated preferences, and durable facts about the world. The noise is chit-chat, one-off details, and the model's own intermediate reasoning. Save the chit-chat and your memory becomes a landfill you have to dig through on every recall.

**Update vs. append — the one people skip.** A new fact often *contradicts* an old one. The user moves from Spring Boot to Quarkus. If you only ever append, you now hold both facts, and next session the agent confidently retrieves the wrong one — or both, and hedges. You have to *update or invalidate* on conflict, not just stack the new fact on top. Memory that only grows doesn't remember; it rots.

**Forgetting — a feature, not a bug.** A stale fact is worse than no fact. A memory that says "use Node 16" in 2026 doesn't leave the agent uninformed; it actively steers it wrong, with the full confidence of something it "remembers." Good memory systems age facts out, expire them, or re-confirm them. Forgetting the outdated thing is how the true things stay trustworthy.

## Reading back without poisoning the desk

The read side has its own trap, and it ties straight back to context engineering: **too much recall poisons the window.** If every session you dump all 400 remembered facts into the context "just in case," you've recreated the stuffed-desk problem the memory system was supposed to solve. Recall is not "load everything"; it's a search.

The pattern that works is two-tier. Inject a small, curated **core** at session start — the handful of always-relevant facts and preferences (the markdown file, essentially). Then **search the rest on demand**, pulling additional memories only when the current turn actually needs them. Core plus just-in-time retrieval. A lean window with the right five memories beats a bloated one with fifty every time.

## Failure modes worth naming

Name them and they stop being mysterious.

**Memory poisoning.** Bad or injected content gets *persisted*, and now it haunts every future session. This is context poisoning with a longer fuse: a hallucinated fact or a prompt-injected instruction that lands in the transcript and then gets written to long-term memory reads as established truth forever after. Validate what you commit to disk the way you'd validate an untrusted upstream — the write path is a trust boundary, not a firehose.

**Unbounded growth.** Append-only memory with no invalidation and no forgetting becomes a swamp. Recall slows, noise climbs, the useful facts drown. A memory store needs an eviction and update policy for exactly the reason a cache does.

**Privacy.** This one's not technical, it's a duty. Agent memory is a database of things real users said — preferences, plans, offhand personal details. That's PII. Treat it like PII: scope it, let users see and delete it, don't retain what you don't need. "The agent remembers everything about you forever" is a feature request and a liability in the same sentence.

Put it together and the shape is simple, even if the engineering isn't. The model forgets everything the instant the session ends; the *product* is what remembers. And the entire difference between a memory gimmick and something that feels like a colleague comes down to the least glamorous part of the stack — the write policy. Get what-to-save, when-to-update, and what-to-forget right, and the stranger who greeted you this morning finally starts to feel like someone you've worked with before.
