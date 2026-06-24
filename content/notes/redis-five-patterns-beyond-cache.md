---
title: "Redis: Five Patterns Beyond Caching That Earn Its Place in Every Service"
description: "Most teams use Redis for one thing and miss the four others. Rate limiting, distributed locks, idempotency, ephemeral session storage, and a serviceable job queue — each in a few commands, each replacing something heavier."
date: "2026-06-22"
category: "engineering"
tags: ["redis", "backend", "distributed-systems", "infrastructure", "patterns"]
---

If the only thing your Redis instance does is cache database reads, you are paying for a Lamborghini and using it as a shelf. The cache hit rate is the first and most visible use, but four more patterns live in the same daemon and replace components that would otherwise be a much bigger lift.

This post is the five patterns I install on a Redis instance the day it stands up. Each is a small amount of code, each is production-shaped, each removes something you'd otherwise need a separate piece of infrastructure for. The pattern matters more than the language; I'll show the commands and one reference shape in Java/TypeScript where useful, but the primitives are the same regardless.

## Why these five and not others

The patterns below survive a test most "you can do X in Redis" articles fail: *would I actually use this in production, or is this a clever trick that breaks at the first network partition?*

Five passed:

1. Rate limiting with a fixed-window counter
2. Distributed lock with a fencing token
3. Idempotency keys
4. Ephemeral session storage with TTL
5. A serviceable job queue with `BLMOVE` and a reliable-list pattern

The ones I left out — leaderboards, geo-radius queries, pub/sub for cross-service messaging — are real features, but they're niche enough that I'd evaluate them per-project. The five above earn the install in every service.

![A grid of five Redis use cases as labelled boxes. Center box, larger: CACHE (the obvious one, GET/SET with TTL). Four boxes radiating out: RATE LIMIT (INCR + EXPIRE in a fixed window); DISTRIBUTED LOCK (SET NX EX + fencing token + Lua release); IDEMPOTENCY (SET NX with payload hash, return cached result on replay); SESSION STORE (SET with TTL, GETEX to slide expiry); JOB QUEUE (LPUSH/BLMOVE to a processing list, ack with LREM). Footer caption: one daemon, five components you don't have to run.](/writing/redis-five-patterns-grid.svg "Five patterns on one Redis. Each replaces a component you'd otherwise have to deploy and operate.")

## Pattern 1: Rate limiting with a fixed-window counter

**The problem:** prevent a caller from making more than N requests per minute. A token-bucket library is overkill for most services; a fixed-window counter in Redis does the job in two commands.

**The shape:** for each `(client_id, current_minute)`, increment a counter, set a TTL the first time, reject if the count exceeds the limit.

```
KEY = ratelimit:user:42:2026-06-22T14:03
INCR KEY                   -> n
EXPIRE KEY 60 NX           -> sets TTL only on first call this minute
if n > LIMIT: reject
```

`EXPIRE` with the `NX` flag is the trick — it only sets the TTL if there isn't already one, so concurrent increments don't extend the window.

**Reference implementation:**

```java
public boolean allow(String clientId, int limit) {
    String key = "ratelimit:" + clientId + ":" + currentMinute();
    long count = redis.incr(key);
    if (count == 1) redis.expire(key, 60);
    return count <= limit;
}
```

**Caveat:** fixed-window admits a "burst at the boundary" — a user could send `limit` requests in the last second of one minute and `limit` more in the first second of the next, briefly seeing 2× the limit. For most use cases this is fine. If you need stricter, the sliding-window log pattern (a `ZADD` + `ZREMRANGEBYSCORE` on a sorted set with timestamps as scores) gets you there at slightly higher cost.

## Pattern 2: Distributed lock with a fencing token

**The problem:** ensure only one process at a time runs a critical section across N replicas of your service. Common case: don't let two workers process the same job.

**The shape:** `SET key token NX EX seconds`. If you got `OK`, you hold the lock. If you got `nil`, someone else does. To release, only delete the key if it still holds *your* token (otherwise you'd be releasing someone else's lock after your TTL expired).

```
acquire: SET lock:job-12345 <random-token> NX EX 30
release (Lua): if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end
```

The token is non-negotiable. Naïve `SET key 1 NX EX` + `DEL key` is the classic broken lock — your TTL fires, someone else acquires, you finish, you `DEL` *their* lock. The token + conditional `DEL` (which has to be a Lua script for atomicity) closes the race.

**The fencing piece:** the lock alone is not enough if the protected resource is on a different system. The canonical example: your worker holds the lock, GC pauses, lock expires, another worker acquires, original worker wakes up and writes to a database that knows nothing about Redis. The database happily accepts the late write.

The fix is the *fencing token* — an ever-increasing number you obtain alongside the lock (use `INCR fence:job-12345`), pass to the downstream system, and have the downstream system reject any write with a token lower than the highest one it's seen. The lock prevents *contention*; the fencing token prevents *correctness violations during expiry races*.

If your downstream can't accept a fencing token, the lock is a *coordination hint*, not a correctness guarantee. Know which kind you have.

![A timeline showing the broken lock pattern that fencing tokens fix. Time axis left to right. Worker A acquires lock with TTL 30s, token=42. At t=20s, worker A GC pause begins. At t=30s, lock TTL expires. Worker B acquires same lock, token=43. At t=35s, worker B writes to database with token 43, accepted. At t=40s, worker A wakes up, attempts write with token 42 — database REJECTS because 42 < 43. Without the fencing token, worker A's write would succeed and corrupt state. Footer caption: the lock alone doesn't protect across expiry races. The fencing token does.](/writing/redis-fencing-token-timeline.svg "The race the fencing token closes. The lock keeps contention low; the token keeps the downstream system correct when the lock expires under you.")

## Pattern 3: Idempotency keys

**The problem:** the same request lands twice — network retry, user double-click, upstream replay. You want the second call to return the result of the first, not re-execute the work.

**The shape:** the client sends an `Idempotency-Key` header. You hash the request body, store `(key, body-hash, response)`, with a TTL long enough that retries within the realistic window get the cached response.

```
on request:
  SET idem:<key> "PENDING:<body-hash>" NX EX 86400
  if OK: process, then SET idem:<key> "DONE:<body-hash>:<response>"
  if nil: GET idem:<key> -> if PENDING, return 409; if DONE, return cached response
```

Two refinements you'll want in production:

- **Verify the body hash matches.** A request that arrives with the same `Idempotency-Key` but a *different body* is an attack or a bug — return 422, do not return the cached response.
- **Pre-claim the key before doing the work.** Use the `PENDING` state to mark "request being processed" — a second request that arrives before the first finishes can return a 409 Conflict, not start a duplicate execution.

This pattern replaces an "idempotency table" in your database for 90% of cases. The 10% where you still want the database: when you need to retain the record for audit purposes longer than Redis' realistic memory ceiling allows. For those, write to both.

## Pattern 4: Ephemeral session storage with TTL

**The problem:** store per-session state without growing it forever. Sessions for web UI, magic-link tokens, password reset codes, email verification, anything with a "valid for 24 hours" window.

**The shape:** `SET session:<id> <serialised-data> EX <seconds>`. To extend on each request, use `GETEX session:<id> EX <seconds>` — atomic read-and-refresh. To revoke, `DEL`.

```
on login:        SET session:abc123 '<json>' EX 3600
on each request: GETEX session:abc123 EX 3600
on logout:       DEL session:abc123
```

**Why not a database table:** TTL is the killer feature. A session table requires a cleanup job, and most teams either skip it (table grows unbounded) or over-engineer it (cron + lock + monitoring). Redis evicts at TTL with no operational cost. The session data is *correctly* ephemeral.

**Don't do this for anything you need to keep.** Sessions in Redis are gone when the data store is gone. For session data that has audit requirements or post-expiry queryability, store the canonical record in your database and use Redis only for the *active* session lookup.

## Pattern 5: A serviceable job queue with reliable-list semantics

**The problem:** you need a job queue. You don't want to deploy and operate a separate queue service (RabbitMQ, Kafka, SQS) for a workload that's small-to-medium and doesn't need exotic features.

**The shape:** a producer `LPUSH`es jobs onto a `pending` list; workers `BLMOVE` jobs from `pending` to a per-worker `processing:<worker-id>` list (atomic remove-and-place); on success the worker `LREM`s the job from its processing list; on failure or worker death, a reaper moves jobs from stale processing lists back to `pending`.

```
producer: LPUSH pending '<job-payload>'

worker:
  job = BLMOVE pending processing:<wid> RIGHT LEFT timeout
  do work
  LREM processing:<wid> 1 '<job-payload>'    # ack

reaper (every N seconds):
  for each stale processing:<wid>:
    BLMOVE processing:<wid> pending LEFT RIGHT
```

`BLMOVE` is the right primitive — it atomically pops from one list and pushes onto another, and it blocks if `pending` is empty so workers don't have to busy-loop.

**What this gets you:** at-least-once delivery, parallel workers, crash-safe (jobs are recovered by the reaper if a worker dies mid-job), back-pressure (queue length is observable as `LLEN pending`).

**What this doesn't get you, that a real queue would:** fanout to multiple consumer groups, exactly-once semantics, multi-tenant queue isolation, audit logging, retry-with-backoff (you'd build it on top). For a single-tenant queue under ~10k jobs/second, this pattern is fine and saves you operating another piece of infrastructure. Past that, deploy a real queue.

**A note on Redis Streams:** Streams are the "real" Redis queue feature — consumer groups, ack semantics, pending entries list. If you're already past the simple-list pattern's limits, Streams are the next stop before adopting a separate queue service. The list pattern above is the *minimum viable queue* on Redis; Streams are the *good-enough queue* on Redis; a real queue service is the next tier.

![A horizontal flow diagram of the reliable-list job queue. Producer on the left LPUSHes onto a "pending" list. Three worker boxes in the middle, each running BLMOVE from "pending" into their own "processing:wid" list. Workers complete and LREM to ack. Below the workers, a "reaper" loop: scans stale processing lists every N seconds, BLMOVEs orphaned jobs back to pending. Right side annotation: "at-least-once, crash-safe, no separate queue daemon — good up to ~10k/s." Footer caption: when this stops being enough, the next stop is Redis Streams, then a real queue.](/writing/redis-job-queue-flow.svg "BLMOVE + per-worker processing list + a reaper. At-least-once delivery, crash-safe, no separate queue infrastructure.")

## The patterns share a property

Every pattern above is one or two commands, optional Lua for atomicity, no client-side state. That's not an accident. Redis is at its best when the operation can be expressed atomically on the server. The moment you find yourself reading-then-writing from the client without `WATCH`/`MULTI`/`EXEC` or a Lua script, you have a race condition.

The mental check before adopting any new Redis pattern: *can the entire critical section run on the server in one atomic operation?* If yes, you have a sound Redis pattern. If no, you either need Lua, or you're using Redis as a substitute for a real database and you'll regret it.

## What to monitor

Whatever patterns you use, the operational picture for a Redis you depend on:

- **Hit rate** (only for cache use): `info stats` → `keyspace_hits / (keyspace_hits + keyspace_misses)`. Under 80% means your cache is mis-sized or mis-TTL'd.
- **Memory usage and eviction count**: if `evicted_keys` is non-zero and growing, your `maxmemory-policy` is doing surgery without anaesthesia. Either grow memory or fix the keys that shouldn't be there.
- **Connection count**: connection storms (client without pooling) saturate Redis surprisingly fast. Cap on the client side.
- **Slow log**: `slowlog get 10` will show you any single command over 10ms — these are usually big `KEYS` calls, big `HGETALL` on a fat hash, or a Lua script someone wrote without thinking. Fix or remove.

If those four are clean, your Redis is healthy regardless of which patterns you've adopted on top.

## When to outgrow Redis

Honestly: when you need cross-region replication with strong consistency, when your dataset doesn't fit in memory and you can't accept the latency of paging, or when a single-master architecture stops cutting it. Redis Cluster handles horizontal scale but has caveats (cross-slot operations fail; some patterns above need the keys to hash to the same slot, which means tagging the keys with `{...}` braces).

For most services, the day you outgrow Redis is the day your service is interesting enough to warrant a proper sit-down with the platform team about what comes next. Until that day — and that day is much further out than people assume — five patterns on one daemon does more than people give it credit for.
