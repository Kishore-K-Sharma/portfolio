---
title: "Edge Functions vs Serverless Functions"
description: "Both slogans read the same — your code runs on demand, no server to manage. But one runs a full Node.js box in a single far-away data center, and the other runs a stripped-down V8 isolate a few milliseconds from your user. The difference between them is where they run and what they're allowed to do, and that difference decides which one belongs on your request path."
date: "2026-07-07"
tags: ["edge-runtime", "serverless", "cloud", "web-performance", "v8-isolates", "backend"]
category: "engineering"
---

Two cloud products sell you the exact same sentence: *your code runs on demand, no server to manage, you pay per request.* Serverless functions say it. Edge functions say it. Same pitch, same billing model, same "just deploy a function" developer experience. So a reasonable person assumes edge is just serverless with a faster marketing team.

It isn't. Underneath that identical slogan are two genuinely different machines, and they differ on the two questions that matter most: **where** your code physically runs, and **what runtime** it runs on. Get those two straight and the whole "which should I use" question stops being a vibe and becomes a decision you can make in about ten seconds. Get them wrong and you'll ship an auth check that adds 300ms to every request, or an edge function that can't open a database connection and you can't figure out why.

## The same idea, two different machines

Start with what they share, because it's real. Both are functions-as-a-service: you write a handler, you deploy it, the platform runs it when a request comes in and shuts it down when the request is over. Neither one has a server you SSH into. Neither one runs when nobody's calling it. That's the "serverless" family, and edge is a member of it.

The split is everything after that.

A **serverless function** — think AWS Lambda, or a Node function on Vercel, or a Cloud Function — runs in **one region's data center** on a **full Node.js runtime**. The platform spins up a little container-ish sandbox with real Node inside: the entire npm ecosystem, native modules, a normal filesystem, generous memory, and execution times measured in seconds or minutes. It is, for all practical purposes, a Node server that happens to boot on demand and live in `us-east-1`.

An **edge function** runs at **CDN points-of-presence** — the same globally-scattered boxes that already cache your images and static assets — which means it runs **physically near your user**. And it runs on a **lightweight V8 isolate** instead of full Node: a runtime that gives you Web-standard APIs (`fetch`, `Request`/`Response`, `Web Crypto`, streams) but deliberately *not* the whole Node platform. It's the same JavaScript engine that's inside Chrome, running your function in a sandbox so cheap the platform can keep thousands of them alive on a single host.

![Edge replicates your code across many CDN points-of-presence, each one a short hop from a nearby user; serverless runs in a single region, so most users pay for a long round trip to reach it.](/writing/edge-vs-serverless-map.svg "Edge = short hops everywhere; serverless = one far data center.")

Notice what that map does to latency before your code even runs a single line. A user in Sydney hitting a serverless function in Virginia pays for a round trip across the Pacific and most of a continent — physics you cannot optimize away, because the speed of light is not on your sprint board. The same user hitting an edge function talks to a POP in Sydney. The request never crosses an ocean. That's not a faster function; it's a *closer* one.

## Isolates vs containers: why cold starts feel so different

The runtime difference isn't just about which APIs you can call. It's the reason edge cold starts are tiny and serverless cold starts aren't, and that comes down to isolates versus containers.

When a serverless function gets a request and no warm instance is waiting, the platform has to **build a sandbox**: allocate a container-like environment, boot a Node.js process, load your code and its dependencies, and only then run your handler. That's the "cold start" everyone complains about — anywhere from a hundred milliseconds to several seconds, depending on how fat your dependency tree is. It's heavy because you're starting a whole operating-system-flavored box every time.

A V8 isolate is a completely different unit. An isolate is a lightweight, memory-safe sandbox *inside an already-running V8 process* — the runtime is already up, and spinning a new isolate for your function is closer to creating an object than booting a machine. That's why edge cold starts are measured in **single-digit milliseconds**: nobody's starting a container, they're just handing your code a fresh isolated context in a process that was already warm.

![A V8 isolate exposes Web APIs only, boots in milliseconds, and packs thousands to a host; a Node container gives you full Node plus npm plus native modules and raw sockets, but has to spin a whole sandbox to start.](/writing/edge-isolate-vs-container.svg "Isolates share a running runtime; containers spin a whole sandbox — that's the cold-start gap.")

The catch is that all that lightness has a price, and the price is *constraint*. An isolate isn't Node with some parts missing by accident — it's intentionally not Node. So:

- **No arbitrary npm or native modules.** If a package reaches for `fs`, `net`, `child_process`, or a compiled `.node` binary, it won't run at the edge. Web-API-only packages are fine; the rest of the ecosystem isn't.
- **Tight CPU and execution-time limits.** Edge functions are meant to be short. You get a small CPU-time budget per request, not the multi-second compute window a serverless function enjoys.
- **Usually no raw TCP.** This is the one that ambushes people. An isolate typically can't open an arbitrary TCP socket, and a normal Postgres or MySQL driver *needs* one. So you can't just `new Client()` and connect to your database from the edge the way you would from Node.

That last point deserves a beat, because it's the single most common way an edge deploy blows up in someone's face.

## The database wall

Here's a hypothetical that plays out constantly. You move an API route to the edge because it's on the hot path and you want it fast. It's basically `SELECT * FROM users WHERE id = ?`. You deploy. It fails. The driver can't connect, the error is cryptic, and nothing about "edge is faster" prepared you for it.

The reason is the raw-TCP constraint above. Your Postgres client wants to open a persistent TCP socket to port 5432 and speak the Postgres wire protocol over it. The isolate won't give it that socket. This isn't a bug you can patch; it's the boundary of the runtime.

The fix isn't "give up on edge," it's "talk to the database over something the edge *can* do — HTTP." That's why the ecosystem grew a whole category of edge-friendly data access: HTTP-based database drivers and serverless database platforms (Neon, PlanetScale, Turso, Upstash, Supabase's HTTP layer, and the various "data proxy" connection layers) that let you run a query with a `fetch` instead of a raw socket. The edge function makes an HTTP call; something on the other side holds the real database connection. Once you route data access through HTTP, the wall disappears — but you have to *know* the wall is there, because "just add a database call" is exactly the instinct that hits it.

## When to reach for which

Now the payoff, and it's genuinely simple once you internalize the two axes. Ask: **is this short, latency-critical, and on the request path? Or is it heavy work that can afford to live in the back?**

![Reach for edge for short, latency-critical work on the request path — auth, redirects, geo and A/B, header rewriting, light glue, streaming. Reach for serverless for heavy compute, long jobs, native deps, and direct database sockets.](/writing/edge-when-to-use.svg "Edge = thin fast layer at the door; serverless = heavy machinery in the back.")

**Edge shines** for the thin, fast layer that sits between the user and everything else:

- **Auth and gatekeeping** — check a session token and allow, redirect, or block before a request goes any deeper. Doing this near the user means you reject the bad requests without a transcontinental round trip.
- **Redirects and rewrites** — vanity URLs, locale routing, header manipulation. Pure request-shaping, no heavy compute.
- **Geo and A/B personalization** — read the user's location or bucket and tweak the response. Runs where the user is, so it's free latency-wise.
- **Light API glue and streaming** — small orchestration, or streaming a response (including LLM token streams) where getting the first byte out fast is the whole game.

**Serverless wins** for the heavy machinery you deliberately keep off the critical path:

- **Heavy compute** — image/video processing, PDF generation, anything CPU-hungry that would blow the edge's tiny time budget.
- **Long-running jobs** — background work, webhooks that do real processing, anything measured in seconds.
- **Big or native dependencies** — a library that needs `sharp`, a native crypto binary, headless Chrome, the filesystem. Full Node, no constraints.
- **Direct database work** — when you want to open a real connection pool and talk the native wire protocol, a Node container is exactly the right place to do it.

The tell is almost always latency-sensitivity versus weight. If a human is waiting on it and the work is small, push it to the edge. If it's chunky work that a queue or a spinner can absorb, serverless is the comfortable, powerful home for it.

## The one-liner to remember

Edge and serverless aren't rivals fighting over the same job — they're two stations on the same request. **Edge is the fast, thin layer at the door**: it greets every request near the user, on a runtime that boots in milliseconds but is deliberately kept small. **Serverless is the heavy machinery in the back**: farther away and slower to wake, but with full Node, real power, and no constraints on what it can pull in.

Most serious apps end up using both, and the good architectures put each where it belongs — the edge function checks your auth and streams the shell in a few milliseconds, then hands the genuinely heavy work to a serverless function that has the room to do it. Once you stop asking "which one is better" and start asking "is this the door or the back room," the decision makes itself.
