---
title: "From Code to Architecture: Lessons from Six Years of Shipping"
description: "Five patterns I keep reaching for when systems get real — circuit breakers, idempotency, retries, observability, and the discipline of measuring before you ship."
date: "2026-05-06"
tags: ["architecture", "microservices", "production", "patterns"]
---

The hardest thing about backend engineering isn't writing code. It's deciding what code *not* to write — and what discipline to add around the code you do.

I've spent six and a half years building production systems across telecom, fintech, govtech and edtech. The languages changed. The frameworks changed. The cloud providers changed. Five patterns kept showing up.

## 1. The boundary between services is a contract, not a suggestion

Every microservice migration I've seen go badly started with the same mistake: treating service boundaries as code-organization, not contract-organization.

The test is simple. If a downstream team can ship a breaking change without your service knowing about it, you don't have a contract. You have an internal call masquerading as a network call — the worst of both worlds. You pay the latency cost of HTTP and the coupling cost of a shared module.

![A shared internal module silently couples two services; a versioned contract decouples them.](/writing/contract.svg "Contracts are integration tests with a version number.")

What it looks like when it's right:
- Schemas live in a versioned, language-agnostic format (OpenAPI, protobuf)
- Breaking changes get a `/v2`, never a same-version mutation
- Consumers can pin a version; producers can't yank one out from under them
- A test suite proves you serialize what you say you serialize

This is boring. It's also the reason your platform doesn't catch fire on a Friday.

## 2. Idempotency is a feature, not a hope

Networks fail. Retries happen. The question isn't whether your service will see the same request twice. The question is whether the second time hurts.

The cheapest implementation is a request-id header that the caller generates and the server caches the result against. If the same id arrives twice, the server returns the cached response and skips the side effect. Costs you a Redis key and a hash check. Saves you a duplicate charge or a duplicate row.

![Sequence diagram: when a network blip drops the response, the retry hits a cache keyed on the request-id and returns the same payload with no side effect.](/writing/idempotency.svg "The second request hits the cache, not the side effect.")

I've watched teams without this build elaborate compensation flows to undo what the second request did. They never work as well as not doing the work twice in the first place.

## 3. Retries are a contract too

Retries between services without a budget are how cascading failures start. Service A retries B three times, B retries C three times — that's nine attempts on C from one logical call. C is already struggling; now it's seeing 9× load.

![Without a budget, per-hop retries multiply into 9× load on the deepest dependency. With an end-to-end deadline, each hop checks remaining time before retrying.](/writing/retry-budget.svg "Per-hop retries multiply. End-to-end deadlines bound the blast radius.")

Two rules I won't break:
- **Bound the retry budget end-to-end**, not per-hop. Pass a deadline header. Each hop checks it before retrying.
- **Circuit-break aggressively**. After N failures in a window, stop calling. Surface a 503 fast. The system recovers faster from a clean failure than from slow degradation.

Spring Cloud's circuit breaker (Resilience4j under the hood) does this in three lines of config. Most Node teams hand-roll something with a global counter and call it a day. Both work; the question is whether you're explicit about the budget or just hoping.

## 4. Observability before incidents, not during

The single biggest predictor of how a system survives an incident is whether the operator can see what's happening *right now*. Not yesterday's logs. Now.

![Three panels: structured logs threaded by request-id, latency p50/p95/p99 lines, and error rate bars per dependency.](/writing/observability.svg "Structured logs, latency percentiles, error rate per dependency. The minimum viable trio.")

The minimum viable trio:
- **Structured logs** with a request-id propagated through every service touched
- **One latency dashboard** with p50 / p95 / p99 per route, refreshed in seconds
- **Error rate per dependency**, not just per service — so you know which downstream is the problem before users do

Add this *before* you have the incident. The pattern I've seen kill teams: rolling out fancy distributed tracing two weeks after a P0, while the lessons are still in postmortem format.

## 5. If it doesn't move a metric, don't ship it

Every system I've owned shipped with a number attached — throughput lifts, manual-effort reductions, faster cycle times, integrations going live across enterprise systems.

Not because metrics make engineers feel important. Because the discipline of choosing a metric *before* you start coding forces you to know what "done" means. Every one of those numbers existed in a spec before the first line of code did. The code was the cheap part. The agreement on the metric was the expensive part.

![A three-stage flow: define the metric first, then write code, then measure against the same number.](/writing/metric-first.svg "The metric exists before the first line of code.")

The corollary: if you can't articulate the metric, you don't understand the work yet. Go back and ask.

---

Six years compresses to this: code is the easy part. The hard part is the discipline you build *around* the code — boundaries, idempotency, retries, observability, metrics — that lets the code keep working when the world gets noisy.

Everything else is a tool to serve that.
