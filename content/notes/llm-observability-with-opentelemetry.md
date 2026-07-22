---
title: "Your Agent Did What? Tracing LLM Apps With OpenTelemetry"
description: "A microservice fails loudly — a 500, a stack trace, a pager going off. An LLM app fails politely: the answer just got worse, the cost quietly tripled, or the agent looped fourteen times before answering, and nothing errored. This is how you point OpenTelemetry at that problem, so 'the model felt off' turns into 'the third tool call took six seconds and triggered two extra model round-trips.'"
date: "2026-07-07"
tags: ["opentelemetry", "llm", "observability", "ai-agents", "tracing", "ai"]
category: "engineering"
---

Here's a failure mode that will never page you. Someone edits a system prompt, adds a helpful paragraph of context, ships it. Nothing breaks. Every request still returns `200 OK`. The model still answers. But that paragraph quietly doubled the input tokens on every single call, and three weeks later someone in finance asks why the inference bill grew by a third. No error. No stack trace. No red anything. Just a number that drifted while everyone was looking elsewhere.

That's the whole problem with observing LLM apps in one paragraph. A normal microservice fails *loudly* — it throws a 500, it emits a stack trace, it lights up red in your dashboard and something starts beeping. An LLM app fails *politely*. The answer gets a little worse. The cost triples. The agent loops fourteen times before it finally responds. And the entire time, nothing "errored," so none of your existing alerting has anything to grab onto.

I've argued before that the fix for "checkout is slow, no error, no clue" is [distributed tracing](/writing/opentelemetry-tracing-microservices) — one thread tying every hop of a request together into a waterfall you can actually read. LLM apps need exactly that same discipline. They just need it pointed at two extra questions.

## The three questions become five

Every service you've ever run gets judged by three questions. Is it up? Is it fast? Is it correct? Those still apply to your LLM app — but they were built for software whose failures are binary. The output is right or it 500s. A language model doesn't have that courtesy. Its output can be *worse* without being *wrong*, and "worse" doesn't trip a health check.

So the three questions grow two siblings that classic observability never had to ask:

- **What did it spend?** Every call has a token cost, and tokens are money. A change that keeps the app working but doubles the spend is invisible to uptime and latency checks.
- **What did it actually do?** An agent decides its own control flow at runtime. It picks tools, retries, loops. "It worked" tells you nothing about *how*, and the how is where the six-second stall and the fourteen-step loop are hiding.

Neither is exotic. They're just facts about the request that your current telemetry throws away because it was never taught to keep them. The good news: the answer is the same machinery you already run — spans, attributes, a waterfall, a backend. You don't need a new observability stack for GenAI. You need the old one to speak GenAI's vocabulary.

## A shared vocabulary: the OTel GenAI semantic conventions

The thing that makes traces *useful* rather than just present is agreement. If my payment service calls its latency `duration_ms` and yours calls it `elapsed`, no shared dashboard can chart both. Distributed tracing solved that for HTTP and databases with semantic conventions — a standard set of attribute names everyone emits. OpenTelemetry now has the same thing for GenAI.

The idea is that every model call becomes a **span**, and the span carries a standard set of attributes:

- `gen_ai.operation.name` — `chat`, `embeddings`, `execute_tool`
- `gen_ai.request.model` — `gpt-4o`, `claude-sonnet-4`, `llama-3.1-70b`
- `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`
- `gen_ai.response.finish_reason` — `stop`, `length`, `tool_calls`, `content_filter`

The point that matters is that this vocabulary is **vendor-neutral**. A span from an OpenAI call and a span from an Anthropic call and a span from a local model you're running on your own GPU all have the *same shape*. Same attribute names, same units. Which means they land in the same Grafana, the same Tempo, the same Jaeger you already run for the rest of your system — no bespoke per-vendor dashboard, no lock-in to one provider's console. Switch models and your telemetry keeps working, because it was never coupled to the vendor in the first place. That's the same reason to bother with OTel that it always was.

## The agent loop is just a waterfall

Once every model call, tool call, and retrieval is a span, an agent request renders exactly like a distributed trace: a root span with children nested underneath, drawn on a timeline.

![An agent request drawn as a trace waterfall: a root user-request span containing a first model call, a vector retrieval span, a slow red tool-execution bar, and a second model call, with tokens and duration on each row.](/writing/llm-trace-waterfall.svg "The agent loop as a waterfall — each model call, tool, and retrieval is a span, so 'it was slow' gets coordinates.")

The root span is the user's request. Its children are the actual work: each model call (with its tokens in and out), each **tool execution** span (name, arguments, duration, and whether it errored), each retrieval or vector-search span. Suddenly the world's least actionable bug report — "the agent was slow" — turns into something you can fix: *the third tool call took six seconds, and because it came back slow the agent made two extra model round-trips it wouldn't otherwise have made.* You're not guessing which part of the loop hurt. The waterfall already bisected it for you.

This is the same payoff tracing always had. The first time you see your own agent rendered this way, the fog lifts. One fat red bar, a name on it, a duration. Coordinates.

## Cost as a first-class, queryable signal

Here's where the LLM version earns its own post. You already have the token counts on every span — `input_tokens` and `output_tokens` are right there in the conventions. Multiply those by a price table for the model, and each span carries a **cost**. Roll cost up as a metric and you can slice it the way you'd slice latency: cost per request, cost per user, cost per feature.

![Anatomy of one gen_ai span: a block of standard vendor-neutral attributes — operation, model, input and output tokens, finish reason, temperature, and a derived cost — beside a separate red-outlined box for opt-in prompt and completion content.](/writing/genai-span-anatomy.svg "One gen_ai span opened up — bounded attributes are always safe to index; raw prompt and completion content is opt-in.")

That's what turns the invisible failure from the opening into a caught one. The prompt edit that doubled input tokens doesn't show up in uptime or latency — but `cost_per_request` on the affected route jumps the moment it ships, and if you're alerting on that metric, you find out in minutes instead of at the end of the billing cycle. Cost stops being a monthly surprise and becomes just another line on a dashboard, attributable down to the exact prompt version that moved it.

## The prompt-capture question

The most tempting attribute to record is also the most dangerous one: the full prompt and the full completion. For debugging, that content is gold — half the time "why did it answer that?" is unanswerable without seeing exactly what you fed the model. But that same text is a liability. It's user data, which means PII. It's often kilobytes per call, which means payload bloat and a storage bill of its own. And traces fan out to a backend that far more people can see than your primary database, usually with looser retention.

So the GenAI conventions treat content capture as strictly **opt-in**. The token *counts*, the finish reason, the model name — those are bounded, safe, always on. The raw `gen_ai.prompt` and `gen_ai.completion` are off by default, and when you do want them, you don't just flip them on globally. You sample them (capture 1% of traces, not all), you redact them (strip emails and secrets before they leave the process), or you record a hash and a length instead of the text — enough to tell "did this exact prompt change?" without storing the prompt itself. Same rule as always: bounded, decision-shaped facts get indexed; unbounded payload gets read on one span, deliberately, or not kept at all.

## Quality is a signal too — attach it to the span

The hardest of the five questions is "is it correct?", because for a language model correctness is a spectrum, not a boolean. But you can still get it onto the trace. When an offline eval scores a response, attach the score as a span attribute. When a user hits thumbs-down, record it as a span event on that request's trace. When you know which prompt version and which model version served the request — and you should, because those belong on the span too — quality stops being a vibe.

"Quality dropped after Tuesday" becomes a filter: show me the thumbs-down rate grouped by `model.version` and `prompt.version`, and watch it spike on exactly the one you rolled out Tuesday. That's not a language-model mystery anymore. That's a regression with a commit next to it.

## What to actually alert on

Uptime and a 500-rate won't catch any of the failures in this post, because none of them are 500s. So you alert on the five-question signals directly.

![Four boxes of LLM signals to alert on: cost with a per-request spend spike, latency comparing model span time against tool time, behavior with loop depth and tool error rate, and quality with eval scores and user feedback — each with one example alert.](/writing/llm-signals-to-alert-on.svg "The four signal families that never throw a 500 — alert on spend, on the slow span, on runaway loops, and on dropping quality.")

Four families, one example alert each:

- **Cost** — a per-request spend spike, or token usage drifting off its baseline. This is the doubled-prompt alarm.
- **Latency** — but split the LLM span time from everything else. If your tool p95 is beating your model p95, the model isn't your problem; a tool is.
- **Behavior** — loop depth and step count. An agent that normally answers in three steps and suddenly takes twelve is a runaway, and step count catches it long before the token bill does. Watch tool error rates here too.
- **Quality** — eval scores trending down, thumbs-down rate climbing, filterable by model and prompt version so the alert points at the change.

## The takeaway

You already did the hard part once. You instrumented your microservices so that a slow checkout stopped being a ghost story and became a red bar with a name on it. Your agent deserves exactly the same treatment — the failures are just quieter, so the instrumentation matters *more*, not less.

Make every model call a span. Emit the GenAI semantic conventions so the shape is standard and the vendor is swappable. Keep the token counts and finish reasons always; keep the raw prompts opt-in, sampled, and redacted. Roll cost up as a metric, hang eval scores and feedback on the trace, and alert on the four signals that never throw an error. Do that, and the next time someone says "the model felt off," you won't nod politely and go read logs. You'll open one waterfall, find the fat red bar, and read its name — because "the model felt off" is not a bug report, and now you don't need it to be.
