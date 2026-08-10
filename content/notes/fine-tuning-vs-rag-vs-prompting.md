---
title: "Fine-Tuning vs RAG vs Prompting: Three Fixes People Constantly Confuse"
description: "When a model 'doesn't know X' or 'won't behave how I want,' there are three completely different fixes — and picking the wrong one wastes months. RAG changes what the model KNOWS, fine-tuning changes how it BEHAVES, prompting steers within what it already can do. Here's the decision framework, why they compose instead of competing, and where LoRA fits."
date: "2026-08-08"
tags: ["llm", "ai-engineering", "fine-tuning", "rag", "lora"]
category: "engineering"
---

Here is a claim that will save you a quarter of wasted engineering: the two sentences "the model doesn't know about our product" and "the model won't answer in our format" sound like the same complaint, and they are not. They have different fixes. Confuse them — and almost everyone does — and you will spend three weeks fine-tuning a model to memorize facts it will hallucinate anyway, or three weeks prompt-hacking a behavior that four hundred training examples would have nailed on the first pass.

There are exactly three ways to adapt a general-purpose LLM to your task: **prompting**, **RAG**, and **fine-tuning**. They are not competing religions and it is not a question of which one is "better." They solve *different problems*, they cost wildly different amounts, and — this is the part people miss — they *compose*. Serious systems use all three at once. The whole skill is knowing which lever moves which thing.

## The mental model that ends the confusion

Burn this into your head and most of the decision makes itself:

- **RAG changes what the model KNOWS.** It supplies knowledge at inference time.
- **Fine-tuning changes how the model BEHAVES.** It bakes in skills, style, and format.
- **Prompting steers within what the model can already do.** It rearranges existing ability; it teaches nothing new.

Every real question — "why is the output wrong, and what do I reach for?" — is really the question "is this a *knowledge* problem, a *behavior* problem, or a *steering* problem?" Answer that and you have picked your tool. Get it wrong and you are using a wrench to hammer a screw: it sort of works, badly, and you conclude the wrench is broken.

![Three parallel levers acting on one base model — prompting steers within existing ability, RAG injects knowledge from an external store at inference time, fine-tuning updates the weights to change behavior — with a note that they compose rather than compete.](/writing/llm-adaptation-three-levers.svg "One base model, three independent levers. Each changes a different thing, and they stack.")

## Prompting: cheapest, instant, and more powerful than you think

Prompting is everything you put in the context window to shape one call: the system prompt, the instructions, the tone you ask for, and in-context examples (few-shot). It requires no training, no dataset, no infrastructure. You change a string and the behavior changes on the very next request. That immediacy is the whole reason it should always be your first move.

Prompting reliably changes **behavior, format, and style**, and it can smuggle in a *little* knowledge through examples ("here are three of our past support replies; match this voice"). Show the model two or three worked examples and it will often generalize the pattern well enough that you never need anything heavier.

But prompting has two hard ceilings. First, the **context window**: everything you paste competes for finite space, and a giant instruction block crowds out the actual task. Second, and more important, **nothing you paste is learned**. Knowledge you drop into a prompt is not stored in the model — it is re-sent, in full, on every single request, and you pay for those tokens every time. Paste your entire product manual into the system prompt and you have not taught the model your product; you have rented it a copy for exactly one call, and you will re-rent it forever. That works until the manual is bigger than the window or the per-call bill gets absurd. Which is the exact seam where RAG takes over.

## RAG: knowledge, kept outside the weights

I have written a whole [backend engineer's tour of RAG](/notes/rag-from-backend-engineer-pov) elsewhere, so here I only want the one sentence that matters for *this* decision: RAG injects **relevant knowledge at inference time** by retrieving from an external store — vector search, keyword search, usually both — and pasting the top hits into the prompt before the model answers.

That makes RAG the correct and only good answer to the **knowledge** problem. Reach for it when the facts are **fresh** (today's prices, this week's tickets), **large** (a corpus that would never fit in a window), **private** (your internal docs), or need to be **cited**. Because the knowledge lives in a system you own rather than inside the weights, you can update it without retraining, attach per-document access control, and point at the exact source a claim came from — which is the single best lever against factual hallucination.

What RAG does *not* do is change how the model writes or behaves. It hands the model better facts; it does not give the model a new skill, a house style, or a reliable output format. If your complaint is "the answers are stale or made-up," RAG. If your complaint is "the answers are correct but the tone and shape are wrong," RAG will not save you — and that is the seam where fine-tuning takes over.

## Fine-tuning: behavior, baked into the weights

Fine-tuning continues training the model on your own examples, actually **updating the weights**. This is the tool for things that are *hard to specify but easy to demonstrate*: a consistent tone, a rigid output structure, a narrow specialized skill, a classification habit, a domain's idiom. When you can't write the rule but you can show five hundred examples of "input like this, output like that," fine-tuning learns the pattern and makes it the model's default. No more re-pasting a style guide on every call — the behavior is now intrinsic.

And here is the trap that burns teams: **fine-tuning is a terrible way to add factual knowledge.** It feels like it should work — you train on your docs, surely now it "knows" them — but facts baked into weights go stale the moment reality changes, can be silently forgotten under later training, and, worst of all, fine-tuning on facts actively teaches the model to sound *confident* about your domain. So when it doesn't actually recall a detail, it doesn't hedge — it hallucinates fluently, in your house style, which is the most dangerous failure mode there is. Facts want to live in RAG, where you can update and cite them. Weights are for behavior.

Fine-tuning is also the expensive lever operationally. You need a **curated dataset** (often hundreds to thousands of clean examples — and dataset quality dominates the result), a **training run**, an **eval** to prove it actually improved, and then you own a **new checkpoint** to version and host forever. That is real engineering cost, which is exactly why it should never be your first move and rarely your only one.

## The three classic wrong-tool failures

Almost every "AI adaptation" horror story is one of these three:

1. **Fine-tuning to build a knowledge base.** The model memorizes a snapshot, the snapshot ages, and now you have a confident liar. Should have been RAG.
2. **RAG to fix tone or format.** You keep stuffing "good examples" into retrieval hoping the style rubs off. It doesn't stick, because retrieval changes facts, not behavior. Should have been fine-tuning.
3. **Endless prompt-hacking a behavior.** You are on your fourteenth revision of a system prompt trying to force a rigid output shape that keeps drifting. Should have been a few hundred fine-tune examples, which would have nailed it and freed up your context window.

Notice the pattern: each failure is a mismatch between the *kind* of problem (knowledge / behavior / steering) and the *lever* pulled. The fix is always to name the problem first.

![A decision tree: start with prompting always; if output is wrong, ask whether it is missing facts or knowledge (yes goes to RAG) or wrong behavior, tone, or format; if behavior, ask whether prompting can fix it (yes stays with prompting, no goes to fine-tune with LoRA); serious systems combine all three.](/writing/llm-adaptation-decision.svg "Name the problem — knowledge, behavior, or steering — and the tool picks itself. Then combine.")

## LoRA: the trick that made fine-tuning affordable

For most of deep-learning history, "fine-tuning" meant *full* fine-tuning: nudge **all** of the model's billions of weights. That is brutal — you need serious GPUs, and every fine-tune produces a full-size checkpoint (tens of gigabytes) that you must store and serve separately. For most teams, prohibitive.

**LoRA (Low-Rank Adaptation)** changed the economics, and it is what most teams actually do now. The insight: you don't need to move every weight. LoRA **freezes the entire base model** and injects tiny trainable **low-rank adapter matrices** — a pair `A` and `B` of rank `r` — alongside the layers you're adapting (typically the attention and MLP projections). During training only those little matrices update. You end up tuning **well under 1% of the parameters**, and the artifact you produce is a **few-megabyte adapter**, not a multi-gigabyte model.

The two knobs you'll actually touch are the **rank `r`** (how much capacity the adapter has — higher `r` can learn more but risks overfitting and costs more) and **`alpha`** (a scaling factor on the adapter's contribution). At serving time the math is just `output = frozen W + adapter delta` — the frozen base does the heavy lifting, the adapter supplies your task's twist.

Two consequences make this genuinely great engineering. First, **hot-swappable adapters**: one base model in memory can serve many adapters, swapping the few-MB task-specific piece per request instead of loading a different giant model each time. Second, **QLoRA** trains LoRA adapters on top of a **4-bit quantized** base, shrinking memory so far that you can fine-tune a sizable model on a *single* consumer or prosumer GPU. Between them, LoRA and QLoRA are the reason fine-tuning went from "reserved for labs with clusters" to "a Tuesday afternoon for a small team."

![A frozen base weight matrix W, locked, with a small low-rank adapter A times B of rank r added alongside it; only the adapter trains, the output is frozen W plus adapter delta, the trainable share is under 1%, and multiple few-MB adapters hot-swap onto one base — with a note that QLoRA quantizes the base to 4-bit.](/writing/lora-fine-tuning.svg "Freeze the billions, train the few-MB adapter. QLoRA quantizes the base so it fits on one GPU.")

## The actual decision, and why you'll combine them

Here is the algorithm, in order:

1. **Always start with prompting.** It is free, instant, and startlingly capable with a couple of good examples. Exhaust it before you build anything.
2. **Need current, private, large, or citable facts? Add RAG.** Any time the problem is *knowledge*, the source of truth belongs in a store you can update and audit — never in the weights.
3. **Fighting the prompt for consistent tone, format, or a narrow repeated task? Fine-tune — LoRA first.** When you find yourself on prompt revision number ten for a *behavior*, stop; a few hundred good examples will win.

And the punchline the framing has been building toward: the best systems are not "RAG *vs* fine-tuning." They are **fine-tuned model + RAG + tight prompt**, each doing its own job. A LoRA adapter gives the model your behavior and format. RAG feeds it fresh, private, citable knowledge. A lean prompt wires the two together and steers the specific call. Knowledge, behavior, and steering — three levers, all pulled at once.

## The backend framing: where does the source of truth live?

Strip away the hype and this is an ordinary engineering-tradeoff decision — latency, cost, maintainability, and above all **where the source of truth lives**. The cost profiles are not comparable: prompting is **per-token cost only**; RAG adds **retrieval infrastructure and index memory**; fine-tuning adds a **training run, an eval, and the ongoing cost of hosting and versioning a checkpoint** (or, with LoRA, a small adapter — much cheaper, but still an artifact you own).

The deeper distinction is auditability. RAG keeps your knowledge in a system you can **inspect, update, access-control, and cite** — the source of truth stays out in the open where engineering discipline applies. Fine-tuning moves that knowledge *into opaque weights*, where you cannot diff it, cannot point at it, and cannot easily correct it. That is a fantastic trade for **behavior**, which you *want* baked in and don't need to audit line by line. It is a bad trade for **facts**, which you need to keep current and defensible.

So the one-line version: put **knowledge** where you can see it (RAG), bake in **behavior** where you can't easily specify it (fine-tune, LoRA first), and **steer** the rest with a prompt (always, first). Name whether your problem is knowledge, behavior, or steering — and the expensive mistakes mostly stop happening.
