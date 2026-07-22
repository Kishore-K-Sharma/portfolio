---
title: "MCP Connects Tools. A2A Connects Agents."
description: "Two protocol standards keep getting confused in architecture meetings, and they solve perpendicular problems. MCP standardizes how one agent talks down to its tools; A2A standardizes how agents talk sideways to each other. Here's the anatomy of both, the mental model that makes the difference stick, and an honest case for why most systems still shouldn't go multi-agent."
date: "2026-07-07"
tags: ["mcp", "a2a", "ai-agents", "multi-agent", "protocols", "ai"]
category: "engineering"
---

Somewhere right now, an architecture meeting is going sideways because someone said "we'll use MCP for the agents to talk to each other." Nobody objects, because the sentence sounds fine. It is not fine. It's like saying "we'll use USB for the microservices" — technically words, spiritually confused. MCP and A2A are the two protocol standards everyone lumps together under "agent stuff," and they solve problems that are exactly perpendicular.

Here's the whole distinction in two sentences. **MCP (Model Context Protocol)** standardizes how *one agent* talks *down* to its tools and context sources — databases, APIs, file systems, anything the agent uses to do its own job. **A2A (Agent-to-Agent protocol)** standardizes how agents talk *sideways* to each other — peer delegation between agents that may be built by different teams, on different frameworks, behind different vendors. One is about giving an agent hands. The other is about giving it colleagues.

If you keep the axes straight — vertical for MCP, horizontal for A2A — every architecture conversation about agents gets about seventy percent easier. So let's make them impossible to confuse.

![One agent in the middle. Below it, MCP servers exposing tools, databases, and APIs, connected vertically — labeled MCP: agent to tools. Beside it, peer agents connected horizontally via A2A — labeled A2A: agent to agent.](/writing/mcp-vs-a2a-layers.svg "Two axes, two protocols. MCP runs vertically between an agent and its capabilities; A2A runs horizontally between peers. A real agent typically speaks both.")

## MCP, the vertical axis

Quick recap, because the details matter for the contrast. MCP is a JSON-RPC protocol where a *server* exposes three kinds of things — **tools** (functions the agent can call), **resources** (context the agent can read), and **prompts** (reusable templates) — and a *client* (the agent host) discovers and invokes them. The agent is always in charge: it decides which tool to call, passes parameters, gets a result, keeps reasoning. The MCP server never has opinions of its own. It's a capability, not a colleague.

I've written a whole field guide on [what it takes to expose an MCP server well](/writing/mcp-for-backend-engineers) — tool descriptions as API quality, response envelopes, the auth tiers — so I won't rehash it here. The one property that matters for this post: **MCP calls are synchronous-ish, agent-driven, and stateless from the server's perspective.** The server executes a function and returns. It doesn't plan, doesn't remember, doesn't decide. That's the vertical relationship: the agent above, the capabilities below.

Which is exactly why MCP is the wrong shape for agent-to-agent communication. A peer agent isn't a function you call. It has its own model, its own context, its own tools, and its own opinion about how long the work will take. You don't *invoke* it. You *delegate* to it — and delegation needs a different contract.

## A2A, the horizontal axis

A2A is that contract. It's an open protocol (originated at Google, now under the Linux Foundation) for one agent handing work to another it doesn't control — possibly one built by a different team, on a different framework, hosted by a different company. The design assumption is mutual opacity: neither agent sees inside the other. They exchange work the way services exchange requests, not the way a model calls a tool.

Four pieces make up the anatomy, and they're worth knowing individually.

**The Agent Card.** Every A2A agent publishes a JSON manifest — conventionally at a well-known URL — that says what it can do, where to reach it, and how to authenticate. It's service discovery for agents: a client reads the card *before* deciding to delegate, the way you'd read an OpenAPI spec before integrating an API.

```json
{
  "name": "research-agent",
  "description": "Deep research over internal docs and the public web. Returns cited briefs.",
  "url": "https://agents.example.com/research",
  "capabilities": { "streaming": true, "pushNotifications": true },
  "skills": [
    {
      "id": "competitive-brief",
      "description": "Compile a cited competitive analysis for a named company."
    }
  ],
  "securitySchemes": { "oauth2": { "...": "..." } }
}
```

**Tasks.** The unit of delegated work. When a client agent sends a request, the remote agent creates a task with a lifecycle: `submitted` → `working` → and eventually `completed`, `failed`, or `canceled` — with an escape hatch, `input-required`, for when the remote agent needs clarification before it can continue. That last state is the tell that you're not looking at RPC anymore. Functions don't ask follow-up questions. Agents do.

**Messages and artifacts.** While a task runs, the two agents exchange *messages* — status updates, intermediate findings, clarifying questions — and when the work is done, the remote agent returns *artifacts*: the actual deliverables, which can be text, structured data, files, whatever the work produced. Progress and product are separate channels, which is exactly what you want when the work takes a while.

**Long-running by design.** And it will take a while. A research task might run for twenty minutes. A "migrate this dataset" task might run for six hours. A2A treats this as the normal case, not the exception: tasks are addressable by ID, clients can poll or subscribe to streaming updates (Server-Sent Events), and push notifications cover the "call me when it's done" case. Compare that to a tool call, where holding a connection open for six hours is a bug report waiting to happen.

![The A2A delegation lifecycle: a client agent fetches the remote agent's Agent Card, creates a task, the remote agent works through submitted, working, and input-required states while streaming status messages, and finally returns an artifact on completion.](/writing/a2a-anatomy.svg "Discovery via the Agent Card, delegation via a task, progress via messages, results via artifacts. The lifecycle exists because peers, unlike functions, take their time and ask questions.")

## The mental model that actually sticks

**MCP is a USB port. A2A is a network protocol.**

MCP lets you plug capabilities *into* an agent. Any MCP server works with any MCP client, the way any USB device works with any USB port — the whole value is that the plug is standard. The capability becomes part of the agent's own toolkit, invoked at the agent's discretion, inside the agent's loop.

A2A makes agents *addressable to each other*, the way HTTP makes services addressable. The remote agent isn't part of your agent's toolkit — it's a peer on the network with its own address, its own auth, and its own runtime. You send it work; it works; results come back.

And crucially — this is the part the confused architecture meeting misses — **a real agent typically speaks both.** Vertically, it uses MCP to reach its own tools: its database, its search index, its deploy pipeline. Horizontally, it uses A2A to delegate to specialist peers: "I do coding; the research agent does research; when I need a competitive brief, I delegate." Not MCP *or* A2A. MCP *down*, A2A *sideways*.

## The architecture this enables

Once agents can be peers, the architecture diagram starts looking suspiciously familiar.

The monolithic version is one model with a giant system prompt and forty tools bolted on. It works — until it doesn't. The prompt becomes a junk drawer of instructions for forty unrelated jobs, tool selection degrades because the model is choosing from a menu the length of a CVS receipt, and every team that wants a new capability edits the same prompt and risks someone else's behavior. It's the monolith story, retold with tokens.

The multi-agent version looks like microservices: an **orchestrator** agent that owns the conversation and the plan, delegating over A2A to **specialists** — a research agent, a coding agent, a data agent — each with its own focused prompt, its own small set of MCP tools, its own team owning it, its own deploy cadence. The research team can swap their agent's model, retrain its behavior, or rewrite it in another framework entirely, and nobody else notices, because the contract is the Agent Card and the task lifecycle — not the internals.

![Left: a single agent with a handful of good MCP tools — simple, cheap, one context, one deploy. Right: an orchestrator delegating over A2A to research, coding, and data specialists — separate ownership, scaling, and isolation, but coordination overhead on every hop. A decision line runs beneath both.](/writing/single-vs-multi-agent.svg "The same trade microservices taught us: the right side buys ownership and isolation, and pays for it in latency, cost, and compounding errors. Buy it only when you need what it sells.")

## The part where I talk you out of it

Here's the surprisingly unpopular truth: **most systems don't need multi-agent.** One agent with well-designed tools beats five agents with coordination overhead, and it's not close.

Every A2A hop adds real cost:

- **Latency.** Each delegation is a full round trip through another model's reasoning loop. Sub-agent chains turn a four-second answer into a forty-second one.
- **Money.** Every agent in the chain re-reads context and burns its own tokens. Five agents summarizing each other's summaries is an expensive game of telephone.
- **Error compounding.** If each agent is right 95% of the time, a four-hop chain is right about 81% of the time. Reliability multiplies, and it multiplies *down*.
- **Security surface.** Agent-to-agent trust is a genuinely hard problem: which peers do you accept tasks from, what credentials does a delegated task carry, and how do you audit "which agent, acting for which user, did this?" Delegated authority across trust boundaries is the part of A2A that will keep security teams employed for a decade.

None of that is a flaw in A2A. It's the same bill microservices hand you — network hops, distributed failure, auth sprawl — and it's worth paying *when you're getting something for it*.

## The decision guide

Go multi-agent when the capabilities genuinely need to be **separate**:

- **Separate ownership.** Different teams (or vendors) build and evolve the agents independently, and you need a contract between them instead of a shared prompt.
- **Separate scaling or runtime.** The data agent needs GPU inference near the warehouse; the orchestrator runs cheap and stateless at the edge.
- **Separate isolation.** One agent holds credentials or data the others must never see, and a process boundary is the honest way to enforce that.
- **Genuinely long-running work.** Tasks that run for hours want the task-lifecycle machinery — states, streaming, push notifications — that A2A ships and a tool call fakes badly.

If none of those apply, stay monolithic: one agent, a curated set of MCP tools, one context window, one thing to debug. "It would look cooler on the architecture diagram" is not on the list, and neither is "the demo had five agents."

Microservices taught us this lesson once already: distribution is a cost you pay, not a feature you add. The teams that thrived split the monolith when ownership and scaling demanded it; the teams that split on day one spent two years rebuilding a distributed system that did what one process always could. Agents are speedrunning the same curve. MCP gives your agent hands. A2A gives it colleagues. Just remember what every workplace teaches you: colleagues are wonderful, and coordination is the price of admission.
