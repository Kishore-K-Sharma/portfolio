---
title: "When Circuit Breakers Lie: The Failure Mode Nobody Warned Us About"
description: "A circuit breaker is supposed to mean the downstream is dead. Sometimes the downstream is fine — and the breaker is the problem. Three failure modes I learned the hard way, and what to do about each."
date: "2026-05-08"
tags: ["backend", "patterns", "resilience", "production", "war-stories"]
---

The fuse box in your house is a circuit breaker. When something dangerous happens — a short, an overload — it pops, and the lights go out in that room. You go check what's wrong, fix it, flip the breaker back on. Better than a fire.

In a backend system, a circuit breaker does the same job for a service call. Service A calls Service B. B starts failing. After enough failures in a window, A's breaker "trips" — A stops calling B for a while, returns errors fast, and gives B a chance to recover. Better than a cascade.

![Three-state diagram: closed (calls flow through), open (calls fail fast, downstream gets a break), half-open (one trial probes the downstream).](/writing/circuit-breaker-fuse-box.svg "Closed → open after N failures. Open → half-open after a cooldown. Half-open → closed if the trial passes.")

That's the pitch. It's mostly true. The patterns are well-documented, the libraries are mature (Resilience4j, Hystrix back when, Polly in .NET-land), and three lines of config gets you most of the way.

Here's what the libraries don't tell you: a tripped breaker is supposed to mean *the downstream is broken*. In production, I've seen breakers trip on services that were perfectly healthy — and bring down features that didn't have to die.

Three failure modes. Each one cost me a bad afternoon at least once.

![Three panels: a breaker tripping during a healthy cold start, a half-open stampede knocking the service back down, and per-instance breakers in a cluster diverging.](/writing/circuit-breakers-lie.svg "Three ways a circuit breaker trips on a service that isn't actually broken.")

## Mode 1: Tripping on cold-start latency

Most breaker configs trip on **failures**, where "failure" includes timeouts. A timeout is a reasonable proxy for failure — if a call takes 30 seconds, the user has already given up.

The trap: services don't only fail when they're broken. They also get slow during predictable, healthy events.

A fresh deploy of Service B brings up new pods. Each pod has a cold connection pool, a cold JIT, a cold database connection cache. The first 50 requests after rollout take 8 seconds where they used to take 200 ms. Service A's breaker, configured to trip after 10 timeouts in 30 seconds, trips immediately. Now A is returning 503s to users for the next 60 seconds while B is *finishing its rollout perfectly*.

The downstream isn't broken. It's warming up.

The fix is one of:

- **Distinguish slow from failed**. Track timeouts separately from 5xx errors. A short spike of slow responses during a deploy isn't the same signal as the database having fallen over.
- **Add a "ramp-up" exemption**. Most service meshes (Istio, Linkerd) let you suppress breaker activity for the first N seconds after a deploy event. Crude, but effective.
- **Use bulkheading instead of breaking**. Limit concurrent calls to B; if B is slow, A queues, but A's other functions stay alive. The breaker pattern is one tool; concurrency limits are another, often better one.

If your deploys consistently trip your breakers, your breakers don't know what "broken" means.

## Mode 2: The half-open stampede

When a breaker has been tripped for a while, libraries cycle it through a **half-open** state: let one trial request through, see if it succeeds, and decide whether to close the breaker (back to normal) or trip again.

The pattern is correct. The default implementations let too many requests through.

In a busy service, you can have hundreds of in-flight calls queued behind the tripped breaker. The moment the breaker goes half-open, all of them flood through at once. The downstream — which had a moment to breathe while the breaker was open — gets hit with the entire backlog and falls over again. The breaker trips again. The cycle repeats.

This is the breaker version of the **thundering herd**, and the fix is two parameters most engineers never tune:

- **Half-open trial count**: 1 (some libraries default to 10 or "all queued requests"). One trial. Seriously, just one.
- **Half-open trial spread**: a small amount of jitter so two services calling the same downstream don't probe at exactly the same moment.

Resilience4j calls these `permittedNumberOfCallsInHalfOpenState` and there's no jitter knob — you have to add it yourself, usually as a randomized cooldown before the breaker actually transitions to half-open. It's six lines of code. It will save you a 4 AM page.

![Top: many queued requests all probe at once on transition; downstream is overwhelmed and the breaker re-trips. Bottom: only one trial is permitted; downstream proves itself before the queue is released.](/writing/circuit-breaker-half-open-detail.svg "The default 'all queued requests' setting is the thundering herd written into your config.")

## Mode 3: Per-instance breakers in a cluster

This one is the most insidious because the breaker library is doing exactly what it's documented to do.

Most circuit breakers are **per-instance** — each pod of Service A has its own breaker state for its own view of Service B's health. That's by design; sharing breaker state across pods would require a coordinator (Redis, gossip, etc.) and most teams don't want the dependency.

It works fine when failures are uniform. If B is down, every pod of A sees B as down, every breaker trips, traffic stops.

It fails when **one pod of B is misbehaving**.

Picture a cluster: 10 pods of A, 10 pods of B, calls round-robin between them. One pod of B has a memory leak and starts timing out. Each pod of A sees a 10% failure rate on calls to B — not enough to trip. But the *user-facing* error rate is 10%, which is catastrophic.

Worse: under sticky sessions or hash-based routing, one pod of A might land disproportionately on the bad pod of B and trip its breaker. A's other pods don't trip. Now the same user-facing endpoint succeeds or fails depending on which pod of A handled the request. You'll spend an hour debugging "intermittent" errors that aren't intermittent at all — they're deterministic per-pod.

The fixes here are systemic, not configuration:

- **Health-check the pod, not just the service**. Kill bad pods aggressively; let the orchestrator replace them. A circuit breaker is a band-aid for a service you can't (or won't) restart.
- **Fail fast at the LB**. If B's pod can't pass a health check in 3 seconds, take it out of rotation. This is what readiness probes are for; most teams don't tune them.
- **Centralize breaker state for high-stakes calls**. For payment, auth, or anything where consistency across pods matters more than the dependency cost, share breaker state in Redis. Yes, it's another moving part. Yes, it's worth it.

## What "circuit breaker" should actually mean to you

I'm not anti-breaker. They're useful. They're better than nothing.

But the framing in most articles — "trip on failures, fail fast, recover" — is the marketing version. The production version is:

- **Breakers trip on signals, and signals can be wrong**. Validate the signal (slow vs failed, ramp-up vs steady-state) before you act on it.
- **Recovery is a stampede risk**. Rate-limit the half-open path.
- **Per-instance state diverges**. Either accept the inconsistency, fix the bad pod, or share the state.

The pattern doesn't fail you. The default config does. The libraries are written by people who shipped them once and moved on; the production tuning is on you.

The shortest version: a tripped breaker is a *hypothesis* that the downstream is broken. Treat it like one. Watch the actual downstream metric, not just your local view of it. When the breaker's view and the metric's view disagree, the breaker is wrong, and the user is paying for it.

![A two-branch decision tree from 'breaker tripped': if the downstream metric is green, fix the signal — slow vs failed, ramp-up exemption, per-pod variance. If the metric is red, the breaker's doing its job — let it recover and watch.](/writing/circuit-breaker-decision-tree.svg "Look at the downstream metric, not at the breaker. The metric is the ground truth.")
