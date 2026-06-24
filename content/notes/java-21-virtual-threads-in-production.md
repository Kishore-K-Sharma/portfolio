---
title: "Java 21 Virtual Threads in Production: When They Help, When They Hurt, and the Subtle Footguns Nobody Warns You About"
description: "Virtual threads make Java look like Go for concurrency — until you hit a synchronized block, a ThreadLocal hot path, or a pool you forgot to remove. A working engineer's guide to what actually changes and what to leave alone."
date: "2026-06-23"
category: "engineering"
tags: ["java", "spring-boot", "concurrency", "performance", "backend"]
---

Virtual threads have been generally available since Java 21 in late 2023, and by now most teams I work with are running them somewhere in production. The marketing arc is well-known: blocking I/O without blocking the kernel, millions of threads cheap, "Java has Go's concurrency story now." All true in the right shape of program.

What's underdiscussed is the failure shapes — the cases where adoption is a non-event, the cases where it's a regression, and the surprisingly small set of code patterns that have to be reworked or they will silently pin a virtual thread to its carrier and erase the benefit you migrated for.

This post is what I'd want a teammate to know before flipping a Spring Boot service to virtual threads. No hand-waving about "modern Java" — the actual mental model, the actual gotchas, the actual measurements that tell you it worked.

## The one-paragraph mental model

A virtual thread is a `Thread` instance the JVM schedules onto a small pool of OS threads called *carriers*. When a virtual thread blocks on I/O via the standard library, the runtime unmounts it from its carrier and parks it on the I/O event; another virtual thread mounts in its place; the OS thread never sleeps. The effect is *blocking code, non-blocking runtime*. You write `client.send()` and `repository.findById()` and `Thread.sleep()` the way you always have, but you can now have a million of them in flight without exhausting the kernel's thread budget.

The promise is that you delete your reactive code, your `CompletableFuture` chains, your callbacks — and you keep the throughput. The reality is that the promise holds *if your blocking calls go through the right APIs*, which is most code but not all of it.

![A two-row diagram. Top row: platform threads — 200 OS threads, each blocked on I/O, the kernel scheduler doing context switches between them. Caption: "200 in flight is the practical ceiling." Bottom row: virtual threads — 10 carrier OS threads servicing 100,000 mounted/unmounted virtual threads, runtime scheduler moving them on and off carriers when they block. Caption: "100,000 in flight, same 10 OS threads, no kernel scheduling cost." Footer caption: same blocking code, different runtime cost. The win is throughput, not latency per request.](/writing/virtual-thread-vs-platform-mental-model.svg "Platform threads block the kernel scheduler. Virtual threads unmount from their carrier and park on the event. Same code shape, different runtime cost.")

## What "use virtual threads" actually means in Spring Boot

In Spring Boot 3.2+, three config options flip the model:

```properties
spring.threads.virtual.enabled=true
```

That single property opts in the Tomcat/Jetty request executor *and* the `@Async` executor *and* the scheduled-task executor. For most services this is enough — Tomcat now serves each request on a virtual thread, your downstream JDBC and HTTP calls block but the virtual thread unmounts, and your max in-flight requests effectively becomes "as many as you can fit in heap."

The remaining levers, when you want finer control:

- `Executors.newVirtualThreadPerTaskExecutor()` — for any place you'd previously have used a bounded thread pool for I/O-bound work.
- `Thread.ofVirtual().start(runnable)` — for one-off spawns.
- The `StructuredTaskScope` API — for fan-out concurrency with cancellation semantics. (Still incubating in the form most teams want, but the basic shape is stable.)

The mistake here is leaving stale `ThreadPoolExecutor` configs in place after enabling virtual threads. A bounded pool of 200 platform threads sitting in front of work that *should* run on virtual threads silently caps your throughput at 200. Search the codebase for `Executors.new` and `ThreadPoolTaskExecutor` after the migration — every match needs a decision.

## The four pin points that kill the benefit

A virtual thread is "pinned" when it cannot unmount from its carrier. While pinned, the carrier OS thread is held; the runtime falls back to platform-thread economics for that work. A handful of pinned hot paths and your "we moved to virtual threads" benchmark looks like nothing changed.

The four sources of pinning, in descending order of how often I see them in real codebases:

### 1. `synchronized` blocks holding the monitor across I/O

```java
synchronized (cache) {
    Result r = httpClient.send(request, ofString()); // pins for the duration of the HTTP call
    cache.put(key, r);
}
```

The fix is to either narrow the synchronized region to *only* the mutation (do the I/O outside the lock) or replace `synchronized` with `ReentrantLock`, which does not pin. Most "I think this is a hot path" cases are #1 — investigate `synchronized` first. As of late 2024 OpenJDK fixed the synchronized-pinning case in JDK 24+; if you're on 21–23 you still need the discipline. Verify your runtime before assuming it's solved.

### 2. Native frames on the stack during the blocking call

JNI calls and a few legacy java.io paths still pin. The standard library `java.net.HttpClient`, `JDBC` (in modern drivers), Netty, and `java.nio` channels all unmount correctly. The cases that don't: `FileInputStream` / `FileOutputStream` on some platforms, legacy database drivers that haven't been updated, anything using `Object.wait()` on a native monitor.

The diagnostic: run with `-Djdk.tracePinnedThreads=full` for a few minutes in load. The JVM prints a stack trace at every pin event. Read the traces, fix the cases. Don't leave the flag on in steady state — it's overhead — but use it during validation.

### 3. ThreadLocal hot paths

`ThreadLocal` works with virtual threads — but every virtual thread has its own copy. If you have a `ThreadLocal<HeavyObject>` and now run a million virtual threads, you have a million heavy objects. The pattern that was harmless at 200 threads becomes a heap problem at 200,000.

The fix: audit `ThreadLocal` usages. Anything that's effectively a per-thread cache of an expensive object should be replaced with either a real cache (sized, evictable) or, where the JDK supports it, `ScopedValue` — which is per-task, not per-thread, and doesn't have the multiplication problem.

### 4. Pooled resources that you forgot scale by thread count

This isn't pinning, but it bites the same way. If your code does `connectionPool.borrowConnection()` on every request and you now have 100,000 concurrent requests, you need a 100,000-connection database or you need to gate concurrency *upstream* of the connection borrow.

The right shape: cap concurrency on the *I/O resource* (`Semaphore` around the DB call), not on the *thread* (which is now free). Virtual threads make the thread-pool concurrency cap obsolete; they don't make the database's connection limit obsolete.

![A 4-quadrant pinning checklist. Top-left: synchronized block holding a lock during I/O — fix by narrowing the lock or switching to ReentrantLock. Top-right: native frames (JNI, legacy java.io) on the stack during the call — fix by upgrading the library or replacing the call path with a java.nio equivalent. Bottom-left: ThreadLocal multiplied by 100,000 threads — fix by replacing with ScopedValue or a sized cache. Bottom-right: database connection pool sized for the old thread count — fix by capping concurrency at the resource with a Semaphore, not at the thread. Footer caption: most "virtual threads didn't help us" benchmarks are one of these four. Run with -Djdk.tracePinnedThreads=full to find them.](/writing/virtual-thread-pinning-quadrants.svg "Four sources of pin. Most slow-down stories trace back to one of them. Use -Djdk.tracePinnedThreads=full to localise.")

## When virtual threads don't help

Honest list — virtual threads are not a free win for everything.

- **CPU-bound work.** A virtual thread doing matrix math doesn't unmount; it holds its carrier. You still want a bounded executor (`ForkJoinPool`, `Executors.newWorkStealingPool`) sized to cores for CPU work. Mixing them is fine; using virtual threads for compute is not.
- **Programs with very low concurrency.** A service handling 50 requests in flight on platform threads doesn't get faster on virtual threads. The benefit is at *high* concurrency. If your max-in-flight is well under your thread pool size, the migration is a no-op (which is fine — also not a regression).
- **Reactive codebases you're not going to rewrite.** If you're on WebFlux/Reactor and the team understands it and the throughput is what you want, virtual threads aren't an automatic upgrade. The two models can coexist, but mixing reactive composition with virtual-thread-mounted blocking calls inside the same handler is a category error that produces hard-to-debug latency.
- **Tests that depend on `Thread.currentThread().getName()` or thread identity.** Virtual threads have generated names like `VirtualThread[#42]`. Tests pinning on thread-name patterns will need updating.

## What to measure

The mistake I see most often: teams turn on virtual threads, deploy, and don't measure anything beyond "the app didn't crash." That's not enough. The signals that tell you whether the migration paid off:

- **p99 latency at peak load.** Should be *equal or better*. If worse, you've introduced a pin or a downstream bottleneck.
- **Active in-flight requests at peak.** Should be higher than your old thread pool ceiling. If it's not, your concurrency is being capped somewhere upstream — Tomcat config, a `Semaphore`, a connection pool. Find it.
- **CPU utilisation per request.** Should be unchanged. Higher means pinning is causing extra runtime churn.
- **Pinned-thread events.** Should be zero in steady state. If `-Djdk.tracePinnedThreads=full` produces output, you have unfinished work.

Set those up *before* the migration. Compare *with the same load* before and after. A go-live without a comparison benchmark is a vibes-based migration and you won't know what you bought.

## The migration playbook I actually use

In order, slowly:

1. **Enable on a single low-stakes service first.** Not the payment path. Something I/O-heavy but tolerant. Flip `spring.threads.virtual.enabled=true`, run with `-Djdk.tracePinnedThreads=short`, measure for a week.
2. **Read the pin traces.** Fix the synchronized blocks first; they're usually the bulk of the volume.
3. **Audit and remove stale executor configs.** `grep -r "new ThreadPoolTaskExecutor\|newFixedThreadPool\|newCachedThreadPool"` and decide each one. Most should be gone or replaced with `newVirtualThreadPerTaskExecutor`.
4. **Audit `ThreadLocal` usage.** Anything heavy gets evaluated for replacement.
5. **Cap concurrency at the resource, not the thread.** `Semaphore` around DB calls if you're worried, sized to the connection pool.
6. **Run the load test.** Compare against the pre-migration baseline. If p99 didn't improve at high concurrency, find what's still capping you.
7. **Roll out to the next service.** Repeat the diagnostic.

Skipping #1 — going straight to "flip the flag in prod everywhere" — is how teams end up rolling back. The flag is cheap to flip and cheap to unflip; the prod incident from doing it without a baseline is not cheap to recover from.

## The single best diagnostic, again

If you read nothing else from this post, remember: `-Djdk.tracePinnedThreads=full`. It is the difference between *guessing why virtual threads didn't help* and *knowing exactly which `synchronized` block to rewrite*. Run it during validation on every service that flips the flag. The output is dense but the patterns are easy to spot — same stack trace repeating means same pin point, fix once, recheck.

Most teams who report "virtual threads were disappointing" did not run this flag. The ones who did fixed their pin points in an afternoon and got the throughput the marketing promised.

## What this changes about how you write Java

Less than people expected.

You stop writing `CompletableFuture` chains for things you'd rather express linearly. You stop sizing thread pools for I/O work. You start thinking about *resource* concurrency caps instead of *thread* caps. You learn `StructuredTaskScope` for the cases where you used to write tangled `CompletableFuture.allOf` patterns.

The reactive style still exists, still has its place — but for the majority of request-response services with a database and a few HTTP calls, the simpler synchronous code on virtual threads is now the production-default. That's the actual change. The code looks like a 2010 Spring controller again, runs at 2025 throughput, and the only people who needed to learn anything new are the ones still writing reactive code by reflex.

That is, finally, the upgrade the language pitched in the JEP. The footnotes — pinning, ThreadLocal multiplication, resource caps — are the price of admission, and a small one.
