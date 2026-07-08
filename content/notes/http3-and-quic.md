---
title: "Why HTTP/3 Is Faster: QUIC, in Plain Terms"
description: "HTTP/3 didn't invent new headers or smarter routing — it kept HTTP exactly the same and swapped the pipe underneath. Instead of TCP plus TLS, it runs on QUIC over UDP, and that one change fixes head-of-line blocking, cuts the handshake to a single round trip, and lets a connection survive you walking from Wi-Fi to cellular."
date: "2026-07-07"
tags: ["http3", "quic", "networking", "web-performance", "tcp", "backend"]
category: "engineering"
---

Here's a claim that sounds wrong until you sit with it: HTTP/3 is faster than HTTP/2 without changing a single thing about HTTP. Same methods, same headers, same status codes, same request/response shape you already know. Your `GET /api/users` looks identical on both. The speedup comes from somewhere HTTP never used to reach — the transport layer underneath it — and once you see what changed down there, "HTTP/3" stops being a mysterious version bump and turns into one very deliberate fix.

The short version: for its entire life, HTTP has ridden on **TCP**. TCP is a wonderful, reliable, forty-year-old protocol that was designed for a world of wired connections and file transfers, and it has two habits that quietly punish modern web traffic. HTTP/3 doesn't argue with TCP. It walks away from it entirely and runs on **QUIC** instead — a newer transport that rides on **UDP**, folds encryption in by default, and was built specifically for the way we actually load pages today. Everything good about HTTP/3 traces back to that swap.

## Same HTTP, different pipe

Start with the stack, because the whole story is a layering story. Under HTTP/2, a request travels down through four layers: HTTP/2 hands off to **TLS** for encryption, TLS hands off to **TCP** for reliable ordered delivery, and TCP hands off to **IP** to actually cross the network. Four separate layers, each negotiated separately, each unaware of the others' problems.

HTTP/3 collapses the middle of that tower. It runs on QUIC, and QUIC is doing the jobs of both TCP *and* TLS at once — reliability, ordering, congestion control, *and* encryption — as one integrated protocol sitting directly on UDP. TLS 1.3 isn't a layer stacked on top of QUIC; it lives *inside* it.

![The HTTP/2 stack — HTTP/2 over TLS over TCP over IP — beside the HTTP/3 stack, where QUIC (with TLS 1.3 built inside) sits directly on UDP over IP, collapsing two layers into one.](/writing/http3-stack.svg "HTTP/2 stacks TLS on top of TCP; HTTP/3 folds transport and TLS 1.3 into QUIC, riding UDP.")

Why UDP? Because UDP is basically the "raw packets, no promises" transport — it doesn't do ordering or reliability or connection state. That sounds like a downgrade, but it's the point: it's a blank canvas. TCP's behavior is frozen into operating system kernels and network hardware across the entire planet, so you cannot meaningfully change it. UDP gives QUIC a clean, unopinionated base to build a *better* reliable transport on top of, in userspace, where it can actually evolve. QUIC re-implements the good parts of TCP and fixes the parts that hurt. Three fixes matter most.

## Fix #1: one lost packet no longer stalls everything

This is the big one, and it has a wonderfully specific name: **head-of-line blocking**.

Rewind to HTTP/1.1. It could only handle one request at a time per connection, so browsers opened six connections per domain and still queued things up. HTTP/2's headline feature fixed that: **multiplexing**. Many requests and responses — call them *streams* — share a single TCP connection, interleaved as they fly. Load a page with a hundred assets and they all pour down one pipe at once. Brilliant. Except for one buried assumption.

TCP delivers bytes in **strict order**. That's its core promise: byte 5 is handed to the application only after bytes 1 through 4 have arrived. TCP has no idea that HTTP/2 packed a dozen independent streams into that byte sequence — to TCP it's one flat ordered stream of bytes, full stop. So when a single packet goes missing (and on real networks, packets go missing all the time), TCP holds back *everything* that arrived after it, waiting for the one gap to be retransmitted. Every stream stuck behind that gap freezes — even the ones whose data already arrived safely. One dropped packet carrying a slice of your CSS can stall an image, three API calls, and a font that were all sitting there ready to go.

QUIC fixes this by understanding streams natively. It knows there are separate streams multiplexed on the connection, and it orders each one **independently**. A lost packet on stream 3 only holds up stream 3. Streams 1, 2, and 4 keep flowing, because QUIC knows their bytes don't depend on the missing one. The multiplexing dream that HTTP/2 promised finally works the way you always assumed it did — the transport is finally in on the secret.

## Fix #2: the handshake goes from several round trips to one (or zero)

Every new HTTPS connection starts with a negotiation, and negotiations cost **round trips** — a full there-and-back to the server. Round trips are the tax you can't optimize away with more bandwidth, because they're bound by the speed of light and the distance to the server. Cut round trips and you cut latency directly.

Under HTTP/2, connecting is a two-stage affair. First TCP does its own handshake (the famous SYN, SYN-ACK, ACK) to establish a reliable channel — that's one round trip before a single byte of your actual request exists. *Then*, on top of that fresh TCP channel, TLS runs its own handshake to agree on encryption keys — historically one or two more round trips. So you're spending two or three full round trips just clearing your throat before you can say "hello, may I have the homepage."

QUIC merges the two. Because transport and encryption are one integrated protocol, QUIC negotiates the connection *and* the TLS 1.3 keys together in a **single round trip**. And it gets better: if you've talked to this server before, QUIC can resume with **0-RTT** — it sends your actual request data in the very first packet, using keys cached from last time, without waiting for any handshake to complete at all. Your request is already on the wire before a slower protocol would have finished introducing itself.

![Round-trip comparison: HTTP/2 spends a TCP handshake and then a separate TLS handshake before any data, while QUIC combines transport and TLS 1.3 into a single 1-RTT handshake, dropping to 0-RTT on a resumed connection.](/writing/http3-handshake.svg "TCP-then-TLS costs multiple round trips; QUIC combines them into one, and a resumed connection sends data in the first packet.")

(One honest asterisk: 0-RTT data has a known replay-attack caveat, so it's meant for safe, idempotent requests — not for "charge the card." But for the reads that make up most of your traffic, it's close to free.)

## Fix #3: your connection survives switching networks

Here's a failure you've felt without naming it. You're loading something on Wi-Fi, you walk out the door, your phone hops to cellular — and everything hangs for a beat before it recovers. That stall is a transport-layer death.

A TCP connection is identified by a **4-tuple**: source IP, source port, destination IP, destination port. That's its whole identity. The instant your phone leaves Wi-Fi for cellular, your IP address changes, the 4-tuple no longer matches, and TCP considers the connection dead. Everything in flight has to be torn down and re-established from scratch — new handshake, new TLS, the whole tax again — on the new network.

QUIC identifies a connection by a **connection ID** instead — an opaque label baked into the packets, completely independent of IP addresses and ports. So when your IP changes, QUIC just keeps going. The packets still carry the same connection ID, the server recognizes it, and the in-flight downloads and requests continue **without a reconnect**. This is called **connection migration**, and it's a genuinely huge deal for mobile, where switching networks isn't an edge case — it's Tuesday.

![Two failure modes side by side: under TCP, one lost packet freezes all multiplexed streams and a network switch kills the connection entirely; under QUIC, independent streams keep flowing past a loss and the connection ID survives a Wi-Fi-to-cellular handoff.](/writing/http3-hol-and-migration.svg "TCP stalls every stream on one loss and dies on a network switch; QUIC isolates the loss and migrates by connection ID.")

And quietly threaded through all of this: **encryption is not optional**. TLS 1.3 is mandatory and built into QUIC — not a separate layer you configure and could forget, but part of the transport itself. Even much of QUIC's own connection metadata is encrypted, which happens to make it far harder for middleboxes on the network to meddle with or "optimize" your traffic in the ways they've historically abused TCP.

## The honest trade-offs

QUIC is not free lunch, and pretending otherwise would be exactly the kind of thing this post is trying to cure.

- **It's UDP, and some networks distrust UDP.** Plenty of corporate firewalls, older middleboxes, and cautious networks throttle or outright block UDP traffic, since historically it was mostly DNS and the occasional attack. So HTTP/3 has to be able to **fall back to HTTP/2** cleanly when QUIC can't get through — which it does, but it means you're maintaining both paths, not replacing one with the other.
- **It can cost more CPU.** TCP runs in the highly optimized kernel; QUIC's congestion control and connection logic run in userspace, and every single packet gets its own encryption. On high-traffic servers that overhead is real, though it keeps improving as implementations mature and offload work to hardware.
- **Adoption is an infrastructure problem, not a code one.** You don't "turn on HTTP/3" in your application. Your CDN, your load balancer, and your reverse proxy all have to speak QUIC end to end, and UDP has to be allowed through. It's a config-and-infra rollout, which is why the big CDNs led the way and everyone else follows as their stack catches up.

None of these erase the wins. They just mean HTTP/3 is something you enable and verify across your edge, not a magic checkbox.

## The one-sentence version

Everything above collapses into a single idea. HTTP itself was never the bottleneck — the methods and headers and status codes were fine. The bottleneck was **TCP**, a transport built for a different era, quietly stalling on every lost packet, taxing every new connection with round trips, and dying every time you changed networks. HTTP/3 didn't make HTTP smarter. It fixed the pipe HTTP was crawling through.
