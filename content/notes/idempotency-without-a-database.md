---
title: "Idempotency Without a Database: The Redis Pattern That Survived 10× Traffic"
description: "Click 'pay' twice when the page hangs and you shouldn't get charged twice. Here's how to make that promise — with one Redis key, a TTL, and a small race-condition guard."
date: "2026-05-08"
tags: ["backend", "patterns", "redis", "idempotency", "production"]
---

If you've ever tapped *Pay Now* and the page hung, then tapped it again — and held your breath waiting to see whether the bill says ₹500 or ₹1,000 — you already understand idempotency.

You don't want the second tap to charge you twice.

![A user on a slow connection taps Pay, the response is lost, they tap again four seconds later — an idempotent server charges ₹500 once, a naïve one charges ₹1,000.](/notes/idempotency-pay-twice.svg "One logical operation, two network attempts. The server's job is to know the difference.")

That's the whole idea. **Idempotent** = pressing the button twice gives the same result as pressing it once. The system is allowed to remember you already pressed it.

In a normal app on a normal day, this is invisible. Networks work, retries don't happen, every "pay" maps to one charge. But once you have real users on real connections, retries are constant — flaky Wi-Fi, the user impatiently tapping again, the mobile app reconnecting after a tunnel — and the question stops being *"will we see this request twice?"* and becomes *"will the second time hurt?"*

I've watched teams without an idempotency answer build elaborate compensation flows to undo what the second request did. Refund services. Reconciliation jobs. Slack channels named `#duplicate-charges`. They never work as well as just not doing the work twice in the first place.

Here's the pattern I keep reaching for. It needs one Redis instance and about thirty lines of code.

## The naive version everyone tries first

The first instinct is usually: "I'll hash the request body. If I see the same hash, I'll skip it."

This sort of works for a minute. Then you remember:

- Two users genuinely paying the same amount to the same merchant produce the same hash. You'll skip a real charge.
- A retry with a slightly different timestamp in the payload produces a different hash. You'll process it twice.
- You have to remember the hash *and* the response, otherwise the retry just gets a generic 200 with no charge ID.

Hashing the body is doing the work twice and hoping the bodies match. It's not idempotency, it's coincidence.

![Two failure modes side by side: two different users with the same payment hash collide and one is silently skipped; a single retry with a different timestamp produces a different hash and gets processed twice.](/notes/idempotency-naive-hash.svg "Hashing the body produces collisions when you don't want them and misses matches when you do.")

## The right version: a client-supplied key

The cleanest pattern is the one Stripe popularized: the **client** generates a unique ID per logical operation, sends it in a header, and the server uses it as the dedup key.

```
POST /charges
Content-Type: application/json
Idempotency-Key: 7a3f1d8e-b91c-4c1a-9e0a-9f5e2b8a1c7e

{ "amount": 50000, "currency": "INR", "merchant_id": "m_42" }
```

The server's contract is now simple: *"if you've ever seen this key before, return the response you returned last time. Don't process the request again."*

![A sequence diagram showing the same Idempotency-Key returning a cached response on retry, with no second charge.](/notes/idempotency.svg "The second request hits the cache, not the side effect.")

The two things to nail are *where* you store that mapping, and *how* you handle the moment a retry shows up while the first request is still being processed.

## The storage: SET NX EX

Redis has the perfect primitive for this. `SET key value NX EX 86400` means: "set this key to this value, **only if it doesn't exist**, and expire it in 24 hours." It returns `OK` if it set the key, or `nil` if the key was already there.

That single command answers two questions atomically:

1. Have I seen this key before?
2. If not, claim it as mine.

![One command, two outcomes: SET NX EX returns 'OK' on the first call (claim is mine, do work, cache response), and 'nil' on a retry (read the cached response, skip the work).](/notes/idempotency-set-nx.svg "Redis answers 'is this new?' and 'mark it taken' in a single round trip. No race.")

Pseudocode:

```ts
async function handleCharge(req) {
  const key = `idempotency:${req.headers['idempotency-key']}`;
  const claimed = await redis.set(key, 'pending', { NX: true, EX: 86400 });

  if (claimed === null) {
    // Someone (maybe even us, on a retry) already claimed this key.
    return waitForOrReturnCachedResponse(key);
  }

  // We're the first to see this key. Do the work.
  const response = await chargeCard(req.body);
  await redis.set(key, JSON.stringify(response), { EX: 86400 });
  return response;
}
```

That's the cheap path. One round trip to Redis, one charge, one cache write. A retry comes in, Redis says `nil`, we look up the cached response and return it without touching the payment processor.

## The race condition nobody warns you about

Here's where most "idempotency" implementations break.

You have two retries arriving 50 ms apart. Both find no key, both claim the key with `SET NX`. Wait — that's impossible, right? `SET NX` is atomic.

It is. But the *application logic around it* isn't.

The race that actually happens is subtler:

1. Request A arrives. Sets the key to `"pending"`. Starts charging.
2. Request B (a retry of A) arrives 50 ms later. Sees the key. It's `"pending"`. **What does B do?**

If B reads `"pending"` and just returns it as the response, the client sees `pending` instead of a charge ID. If B busy-waits in a tight loop, you've burned a connection waiting on yourself. If B errors out, the client retries again, and you're in an infinite ping-pong.

The pattern I use:

![State diagram: a key is either CLAIMED (pending), DONE (cached response), or absent. A retry that hits CLAIMED polls with a small backoff up to a deadline.](/notes/idempotency-states.svg "A key has three states. The retry path needs to know what to do in each.")

The key has three states:

- **Absent** — claim it, do the work, write the response.
- **`pending`** — someone else is doing the work. Poll Redis with exponential backoff up to a small deadline (say, 5 seconds), then time out gracefully.
- **`{...response}`** — return it directly.

The poll deadline matters. If your charge call takes 3 seconds on a slow day, a 1-second poll deadline means retries time out on perfectly valid in-flight work. If your charge takes 200 ms, a 10-second deadline is theatre.

Match the deadline to the p99 of the operation. If you can't measure p99, you're not ready to ship this pattern.

## The TTL question

How long should the key live?

- **Too short** (1 minute), and a phone that drops off the network for 90 seconds and retries gets charged twice.
- **Too long** (forever), and a client that reuses an old key — accidentally — gets the wrong response.

The pragmatic answer for payment-class operations is **24 hours**. Long enough to cover any real retry window, short enough that a key collision a week later doesn't replay an ancient charge.

For lower-stakes operations (sending a notification, saving a draft), 1 hour is fine. The principle: the TTL should comfortably exceed the longest plausible retry window for that operation, and not much more.

## What about Redis itself failing?

Redis is now in your critical path. If Redis is down, what happens?

You have three choices:

1. **Fail closed** — refuse the request. Safest for money. Annoying for users.
2. **Fail open without dedup** — process the request anyway, accept the risk of duplicates. Pragmatic for non-financial flows.
3. **Fall back to a database lock** — slow, but consistent.

I default to (1) for money, (2) for everything else, and never (3) — if Redis is down, your database probably is too, and locks make it worse.

Either way, **monitor the Redis hit rate**. A sudden drop in idempotency-key hits while traffic looks normal usually means clients have stopped sending the header — typically because someone refactored the SDK and dropped a line. You want to know that before the duplicate charges start.

## The whole thing, once more

- Client generates a UUID per logical operation, sends it as `Idempotency-Key`.
- Server uses Redis `SET NX EX` to claim the key.
- Three states — *absent / pending / done* — and a poll-with-backoff path for `pending`.
- TTL matches the operation's retry window (24 h for payments is fine).
- Monitor the hit rate; a sudden drop is a regression in the wild.

That's it. One Redis instance, three states, one TTL, one race-condition guard. You don't need a fancy distributed lock. You don't need an idempotency framework. You don't need a saga.

You need a server that remembers what it did the last time the client asked, for long enough that the client's network has had time to make up its mind.

The compensation flows you don't have to write are the ones that pay for the work.
