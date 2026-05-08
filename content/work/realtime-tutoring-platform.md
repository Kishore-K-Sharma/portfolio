---
title: "Real-time Tutoring Platform · Live classrooms at scale"
company: "Skaplink Technologies"
role: "Full Stack Software Developer"
startDate: "2020-03"
endDate: "2021-09"
domain: "edtech"
summary: "Led development of a real-time online tutoring platform with live virtual classrooms, used by students and educators across multiple regions. Built on WebRTC + Socket.io with secure subscription billing."
outcomes:
  - { label: "Live concurrent classrooms", value: "Significant scale" }
  - { label: "Mobile + web parity", value: "End-to-end" }
  - { label: "Session start time", value: "Sub-second p50" }
stack:
  - "React.js"
  - "Angular"
  - "React Native"
  - "Node.js"
  - "Socket.io"
  - "WebRTC"
  - "MySQL"
  - "PHP"
---

## The mandate

Build a tutoring platform where students and teachers could meet in real-time virtual classrooms — voice, video, shared whiteboard, low latency, mobile-first. The business needed it to handle scale we hadn't operated at before, with a subscription billing model that had to be ironclad on day one.

The brief sounded simple. WebRTC at scale, billing without bugs, a UI that worked on a four-year-old Android phone over a 3G connection. Each of those alone is a project. Together they were the engagement.

## The architecture decision

WebRTC peer-to-peer is great for one-to-one. It falls over when the room has more than four participants — every peer talks to every other peer, and a tutor with twenty students would saturate the slowest one. We chose an SFU (selective forwarding unit) architecture: every participant sends one stream to the server, the server forwards relevant streams to listeners. That kept the bandwidth requirement linear instead of quadratic and let us run sessions on devices that wouldn't have survived raw mesh.

Socket.io was the spine for everything else: signaling, classroom state, presence, the live whiteboard sync. We kept the choice deliberate: Socket.io reconnection semantics are battle-tested, and for a learning platform where a momentary network blip shouldn't dump a student out of class, that mattered more than raw throughput.

Billing went through a payment gateway with explicit idempotency. Every charge carried a client-generated request-id; duplicate webhooks were a no-op. We logged every state transition with structured fields so disputes could be reconstructed end-to-end without guessing.

## What I shipped

- **Live virtual classrooms** with voice/video/whiteboard sync (Socket.io + WebRTC SFU)
- **Subscription billing** with idempotent payment webhook handling
- **Cross-platform mobile** — React Native app sharing ~70% of code with the web client
- **Government e-governance modules** — separate from the tutoring product, delivered for multiple state departments using the same shared backend pattern
- **Responsive web app** — built initially in React, with an Angular admin dashboard for the ops team

## What I learned

**WebRTC's hard problems are not in the code.** They're in the network. Most of the production incidents weren't about state machines or codecs — they were about NAT traversal, ICE candidate trickling, and corporate firewalls that blocked UDP. Owning the full stack meant owning the support call when a teacher in a school's wifi-walled-garden couldn't get audio. The lesson: ship a connectivity test page on day one. Let users self-diagnose. The hours saved across the team in support escalations paid the cost of that page back in a week.

**Socket.io is not a replacement for an event bus.** I love it for what it is — a transport for real-time UI sync, with reconnection. But I've seen teams reach for it as a general-purpose message system; that's where things get painful. Keep it on the seam between the browser and the server. Use a real broker for anything async that crosses service boundaries.

**Subscription state is harder than it looks.** A user can be active, lapsed, in-grace-period, on a free trial, refunded, churned-and-returned. Modeling that as a finite state machine *before* writing handlers — with explicit transitions and forbidden states — saved an entire class of "why is this user being charged twice" tickets.

## What's next

This was an early-career engagement that taught me what scale actually means in practice: not "more requests per second," but "more failure modes that compose in unexpected ways." The patterns I'd carry forward — explicit state machines for billing, idempotent integrations, telemetry from day one — were forged here.
