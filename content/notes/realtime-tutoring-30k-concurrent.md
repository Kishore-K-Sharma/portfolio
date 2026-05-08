---
title: "Real-Time Tutoring at 30,000 Concurrent Learners: The Queue We Should Have Built First"
description: "A classroom is fine until the teacher tries to hear 30 questions at once. Scaling a real-time edtech platform from a few hundred students to thirty thousand taught me which decisions to make on day one — and which mistakes I made on day fifty."
date: "2026-05-08"
tags: ["realtime", "websockets", "scaling", "edtech", "war-stories"]
---

A classroom of 30 students is fine. The teacher hears the question, answers it, moves on. The room has a natural rhythm.

Now imagine 30,000 students in one room, all asking questions at once, all waiting for one teacher to respond. The room doesn't fail dramatically — it just becomes useless. The teacher can't hear anyone. The students stop trying. The whole thing collapses into noise.

That's roughly what happens when you scale a real-time application without thinking about *backpressure* and *fan-out* — the two pieces of engineering that decide whether 30,000 concurrent users are a feature or a denial-of-service attack on your own backend.

I learned this on an edtech platform that started as a few hundred students per class and grew, over about a year, to peaks of ~30,000 concurrent learners across thousands of simultaneous classrooms. The architecture we shipped on day one didn't survive day fifty. Here's what we got wrong, what we got right, and what I'd do differently if I were starting over.

## The naive architecture (the one that fails)

Most real-time apps start with a single Node service running Socket.IO (or whatever the equivalent is in your stack), connected directly to a database. Clients connect, messages get broadcast, life is good.

It works perfectly until two things happen at once:

1. **Many clients connect at the same moment.** Class starts at 5:00 PM. Students click "join" between 4:59 and 5:01. Your server gets 8,000 new WebSocket handshakes in 90 seconds.
2. **The connection layer and the business logic share the same process.** Every incoming message goes through your event loop, hits the database, fans out to listeners — all in the same Node process. One slow query stalls every active connection.

The first problem looks like CPU spikes. The second problem looks like *everyone in the room going silent at the same time*, because one student's bad query blocked the room.

If you're seeing those symptoms, the architecture below is the move.

![A single Node process holds 8,000 socket connections, message handling, and DB queries in one event loop. A slow query stalls every active connection at once.](/notes/realtime-naive-collapse.svg "One process. One event loop. One slow query is enough to silence the whole room.")

## Separate the connection layer from the logic

The single most important decision is splitting the platform into two layers:

- **Gateway layer**: holds WebSocket connections. Stupid by design. It does authentication, message validation, and not much else. If it dies, connections drop, but no business logic is lost.
- **Worker layer**: processes messages. Stateless. Reads from a queue, writes to the database, fans messages back through the gateway. If a worker is slow, other workers keep going.

Between the two: **a queue**. Redis Streams is enough for most cases; Kafka if you genuinely need replay. The queue is the thing that lets you scale either layer independently.

![Two-layer diagram. Gateway pods hold WebSocket connections and push messages onto a Redis stream. Worker pods consume from the stream, do the work, and publish back into a fan-out channel that the gateway pods subscribe to.](/notes/realtime-fanout.svg "Connection layer holds the sockets. Worker layer does the work. The queue is the seam.")

Why this matters more than it sounds:

- A slow query in a worker doesn't stall the gateway. The gateway just keeps holding connections and queueing messages.
- You can scale gateways for *connection load* and workers for *message load* — they're different curves. We had peaks where we needed 20× workers but only 4× gateways, or vice versa.
- A worker can crash without dropping connections. The queue holds the message; another worker picks it up. To the user, nothing happened.

The day we shipped this split was the day the platform started feeling stable. We'd hit the limits of "one big Node service" at about 8,000 concurrent. The split got us comfortably to 30,000.

## Backpressure: the message you don't deliver is a feature

Real-time platforms have a tendency to treat *every* message as sacred. Send it now, send it reliably, send it in order. That promise doesn't scale.

A more honest set of guarantees:

- **Chat messages**: deliver in order, but it's fine if a recipient who's been disconnected for 30 seconds misses a few. They can fetch recent history when they reconnect.
- **Quiz answers and submissions**: must arrive, must arrive in order, must be persisted. Use the queue with at-least-once semantics; rely on idempotency at the worker.
- **Presence updates ("X is typing")**: best-effort. Drop them under load before you drop anything else. Nobody notices a missing typing indicator. Everyone notices a missing chat message.

The moment you accept that not all messages have the same SLA, your system has somewhere to give when things get hot. The pattern we used:

```ts
// Pseudocode for the gateway's outbound buffer per-connection
function send(connection, message) {
  if (connection.outboundQueue.length > MAX_BUFFER) {
    if (message.priority === 'best-effort') return; // drop typing indicators first
    if (message.priority === 'normal') connection.outboundQueue.shift(); // drop oldest chat
    // priority === 'critical' messages always go through
  }
  connection.outboundQueue.push(message);
}
```

Crude, effective. We tuned `MAX_BUFFER` per device class — mobile clients on flaky connections got smaller buffers, since they couldn't drain fast enough anyway.

Backpressure is the willingness to drop a message *gracefully* before your server drops *all of them ungracefully*. The first version is a feature. The second is an outage.

![Three priority lanes for the outbound buffer: critical (always delivered), normal (drop oldest under load), best-effort (drop first under load).](/notes/realtime-priority-buffer.svg "Drop best-effort first. Protect critical always. Normal can absorb the difference.")

## The reconnect storm nobody tells you about

Here's the failure mode that took down the platform on day fifty.

We deployed an update to the gateway. Rolling deploy, three pods at a time. Each pod, as it shut down, dropped about 1,000 connections. Those clients all tried to reconnect *immediately*. With aggressive retry logic.

The healthy pods saw 3,000 reconnects in 2 seconds. They couldn't accept that fast. Connections retried again. Again. The gateway pods spent so much CPU rejecting handshakes that the *normal* connections started timing out, dropping, and joining the storm.

Within 30 seconds, the platform was effectively offline.

The fixes are obvious in hindsight:

- **Jittered exponential backoff on the client.** Reconnect after 1s, then 2s, then 4s, with up to 50% random jitter. Most libraries default to 1s flat. Change the default.
- **Coordinated drains during deploys.** Before shutting down a gateway pod, send all its clients a "please reconnect to a different host" message with a randomized delay. Distributing the reconnects over 30 seconds instead of 1 second is the difference between a hiccup and an outage.
- **Connection rate limit at the load balancer.** Cap incoming handshakes at, say, 1,000/sec/pod. If a storm hits, clients see slow handshakes and back off; they don't compound the problem.

The right time to build this is *before* your first rolling deploy with significant traffic. The wrong time is the morning after.

![Top: a deploy drops 3,000 connections at second 0; flat-1-second retry produces compounding spikes at 1s, 2s, 3s, 4s. Bottom: jittered exponential backoff distributes the same 3,000 reconnects across 30 seconds in tiny ticks.](/notes/realtime-reconnect-storm.svg "Same 3,000 reconnects, spread over 30 seconds instead of compounding into one second. The difference between a hiccup and an outage.")

## Observability: the metrics that actually matter

For a connection-heavy real-time system, the standard "RPS / latency / error rate" trio is useful but misses what kills you. The metrics I always add:

- **Open connections per pod**, with a 5-second resolution. This is your health metric. A flat line is good; a cliff is the start of a story.
- **Message queue lag** — how long does a message wait in the queue before a worker picks it up? Anything over a second is a problem in real-time.
- **Reconnect rate per minute**. A baseline number you can alert on. A 10× spike is almost always either a deploy gone wrong or a network issue at a major ISP.
- **Room size distribution**. The p99 room size matters more than the average. A platform optimized for 200-person rooms behaves badly when one teacher creates a 5,000-person room and that's now the worst-case path.

A real-time platform without these is flying blind. We added them after the day-fifty incident, not before, which is the wrong order.

## What I'd do differently from day one

If I were starting this project over, the things I'd commit to in week one:

1. **Two-layer split (gateway + worker) from the very first deploy.** Even with one pod each. The seam matters more than the scale.
2. **Queue-based fanout.** Don't broadcast directly from one Node process. Even at 100 users, build the pattern.
3. **Three message priorities.** Critical, normal, best-effort. Decide which is which on day one — it gets harder to retrofit.
4. **Jittered reconnect from the very first client release.** Once you've shipped a flat-1s-retry client, removing it later is hard.
5. **Coordinated drains in the deploy script.** Build it before you need it.

Most of these aren't more code than the alternative. They're the same code, structured for the platform you'll have in a year, not the platform you have on day one.

The thing I keep telling teams who are about to scale a real-time platform: **the queue you don't build today is the outage you'll write a postmortem about next quarter.** Build the queue first. Everything else gets easier from there.
