---
title: "Breaking Into AI Engineering: What a Backend Engineer Actually Needs to Learn (and What to Skip)"
description: "Half the 'how to become an AI engineer' advice tells you to start with linear algebra. After years on backend, here's the honest, narrower path — what to learn, what to skip, and what the job actually looks like in 2026."
date: "2026-05-26"
category: "career"
tags: ["career", "ai", "backend", "learning", "engineering-leadership"]
---

The most common piece of advice I see for engineers trying to move into AI is some variant of *"start with Andrew Ng's course, then learn PyTorch, then read the Transformers paper."* That advice was right in 2018. In 2026 it's a detour — most of what it teaches you isn't what AI engineering jobs actually involve.

I made the transition over the last two years while staying full-time on a backend team. This is the path I'd give to my past self.

## "AI engineer" is three jobs — pick the right one

Three distinct roles get lumped under "AI engineer," and they need very different skill stacks. Be precise about which one you're aiming at.

![Three side-by-side cards. Card 1 "AI Researcher" (~5% of openings) — designs new models, publishes papers, needs PhD-level math; labeled "not your path." Card 2 "ML Engineer" (~25%) — trains and serves in-house models, owns pipelines, needs PyTorch/MLOps; "partial transfer." Card 3 "AI Engineer (applied)" (~70%) — ships LLM features, RAG, agents, evals; needs backend skills + LLM mental model; "your path."](/writing/ai-role-spectrum.svg "Most of the job market is the applied role. It's also the one your backend experience already prepares you for.")

The market for **applied AI engineers** — people who ship LLM-backed features against an existing product — is roughly 70% of openings I see, and it's the role where backend engineers have the shortest distance to travel. The "AI Researcher" role at a frontier lab is the unicorn job everyone talks about and almost nobody gets hired into. Don't confuse the two.

## What backend skills carry over

Most of what makes you effective as a backend engineer is exactly what makes someone effective at applied AI engineering. Production LLM systems are *backend systems with a probabilistic black box in the middle*. The black box is new; the rest of the system isn't.

![A three-column comparison. Left column "Carries over 1:1": system design, REST/gRPC, observability, caching/idempotency, queues, CI/CD. Middle column "New — learn deeply": LLM mental model, embeddings + vector stores, eval design, prompt patterns, RAG retrieval shape, tool-use/agent loops. Right column "Skip — not required": backprop math, training from scratch, GPU kernels, PhD theory, custom architectures, distributed training. Footer: reuse 80%, learn 20%, ship in a quarter.](/writing/backend-to-ai-skill-transfer.svg "Six things to learn deeply, six things you already know, six things you can safely skip.")

What that means in practice: the things you already do well — designing an API that's easy to use, handling retries and backoff, instrumenting a service so you can debug it at 2am, choosing the right cache TTL — are *more valuable* in AI systems, not less. LLMs are slower, more expensive, and less deterministic than a Postgres query. Every backend instinct you have about that kind of dependency applies double.

## What's actually new — and what to skip

The genuinely new things you have to learn are narrower than the curriculum-makers admit:

- **A working mental model of LLMs.** Tokens, context windows, latency vs. cost, why the same prompt gives different outputs. You do not need to derive attention from first principles. You need to know enough to predict where a system will break.
- **Embeddings and vector stores.** What a vector represents, why cosine similarity, why chunking matters, what pgvector vs. Chroma vs. Pinecone trade off. One afternoon to learn, one weekend to build something.
- **Eval design.** This is the actual hard skill of applied AI engineering and it's barely covered in courses. How do you measure whether a non-deterministic system is getting better? See [Evaluating LLM-Generated Code in CI](/writing/evaluating-llm-generated-code-in-ci) for one version of this discipline.
- **Prompt patterns.** Few-shot, chain-of-thought, structured output, when to split a prompt across multiple calls. Less "art" than the early literature claimed; more like learning the gotchas of a new API.
- **RAG retrieval shape.** When to use it, how to chunk, how to evaluate retrieval quality separately from generation quality. See [RAG From a Backend Engineer's POV](/writing/rag-from-backend-engineer-pov).
- **Tool-use / agent loops.** How an LLM is given tools, when to use MCP, how to design tools that an agent can actually call correctly.

Things you can skip without consequence for an applied role: backpropagation math, training models from scratch, GPU kernel optimisation, distributed training infrastructure, custom transformer architectures. If you ever need them, you'll know — and you'll have the context to learn them on demand.

## A 90-day plan that actually works

The trap with self-study is reading without building. The fix is build-first, then read the parts of the material that explain what you just hit.

![A vertical 90-day roadmap. Days 1–30 "LLM mental model": use Claude/ChatGPT/Cursor daily, read a token-streaming primer, build a 30-line summariser, structured-output extractor, chat-over-your-notes. Days 31–60 "RAG + evals" (highlighted): embeddings, vector DB, chunking; build a RAG bot over team docs, 20-case eval suite, CI check running evals. Days 61–90 "Agents + integration": tool-use loops, MCP servers, production deploy, write one post.](/writing/ai-90-day-roadmap.svg "One evening a day. Build something every block. Write one post by the end.")

The single highest-leverage habit is **writing evals before you tune the system**. Most people skip this because it feels slow. It's the opposite — it's the only way to know whether your changes are making things better or worse on a probabilistic system. Get good at this early and you'll outpace people who've been at it longer.

## The portfolio that gets interviews

What works in 2026, in order of impact:

1. **A shipped thing on the internet.** Not a notebook. A deployed app that someone could use, with the source on GitHub. A working RAG bot over a public dataset is enough.
2. **A post explaining a real choice you made.** "Why I used pgvector instead of Pinecone." "How I cut my eval suite runtime by 4x." Specificity beats credentials.
3. **Public evals.** A repo with the eval harness you used and the score deltas you measured. Almost nobody does this and it stands out immediately.
4. **Open-source contribution to an AI tooling project.** LangChain, LlamaIndex, Marvin, instructor — any of them. One real PR is worth more than five courses.

What I'd skip: paid certifications, generic Coursera "AI specializations," tutorials that don't end in a deployable artifact. Hiring managers can't distinguish them from one another and they don't differentiate you.

## How to interview without ML credentials

The pitch that lands: *"I'm a backend engineer who has spent the last quarter shipping LLM features. Here's the system I built, the evals I ran, and the things that went wrong."* Frame yourself as someone who understands production systems and has the new vocabulary, not as someone who's "learning AI." The first is the role; the second is the prerequisite.

Expect three kinds of questions:
- **System design with an LLM in the middle.** Same shape as classical system design, with new failure modes (cost, latency variance, hallucination, prompt injection). Have a default answer for each.
- **Practical eval questions.** "How would you measure whether a new prompt is better?" If you've built evals, this is easy. If you haven't, it's the question that exposes you.
- **Trade-off questions.** "When would you not use RAG?" "When would you self-host vs. use an API?" Opinions backed by reasons beat hedges.

What you generally don't get asked: derive softmax, explain backprop, train a model in a notebook. That's the ML-engineer interview, not the applied one.

## The honest catch

The pay is good but the field is moving fast enough that "I learned this last year" stops being a useful sentence quickly. The skill that compounds isn't the specific stack — it's the *habit of staying calibrated about what models can and can't do this month*. Build that habit and the rest follows.

## The shortest version

- Aim at the applied AI engineer role (70% of openings), not the researcher or ML-engineer role.
- 80% of backend skills carry over directly. Don't relearn them; reuse them.
- Six things are genuinely new: LLM mental model, embeddings, evals, prompt patterns, RAG shape, agent loops. Most are learnable in 90 days.
- Skip: backprop math, training from scratch, GPU kernels, PhD theory.
- Build-first, not course-first. Ship a deployed app, write evals, publish a post.
- The interview pitch is "backend engineer who ships LLM features," not "backend engineer learning AI."
- The compounding skill is calibration about what models do this month, not knowledge of any particular stack.

The gap isn't as wide as the field's marketing makes it sound. The job is mostly software engineering with a new and interestingly broken dependency. If you can build a reliable service against a flaky third-party API, you can build a reliable service against an LLM.
