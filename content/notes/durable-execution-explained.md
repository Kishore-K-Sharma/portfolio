---
title: "Durable Execution: Code That Survives Its Own Crash"
description: "A five-step order flow dies after step three: the card is charged, the stock is held, and the process that knew what came next is gone. Sagas, outboxes, and idempotency keys are how we've survived that crash for a decade — by hand-building a state machine every single time. Durable execution flips the model: write the flow as straight-line code, and let an engine replay it back to the exact line where it died."
date: "2026-07-07"
tags: ["durable-execution", "temporal", "distributed-systems", "workflows", "reliability", "backend"]
category: "engineering"
---

The oldest problem in backend engineering fits in one sentence: **your process can die between any two lines of code.**

Picture the flow every commerce system has. Charge the card. Reserve the inventory. Create the shipment. Send the confirmation email. Close the order. Five steps, maybe forty lines, and the process dies after step three. The card is charged — real money moved. The stock is held. The shipment exists. But no email went out, the order never closed, and the only thing in the universe that knew what came next — the call stack — evaporated with the pod.

Here's the surprising part: a huge fraction of what we call "distributed systems patterns" is just workarounds for this one fact. Retries, outboxes, sagas, idempotency keys, reconciliation jobs — different tools, same enemy. RAM is where progress goes to die, and we've spent decades inventing ways to write progress down somewhere sturdier before the lights go out.

## The state machine you keep hand-building

If you've read my post on [the saga pattern](/writing/saga-pattern-distributed-transactions), you've seen the mature version of the defense. Sagas give you an orderly way to undo completed steps. The transactional outbox makes sure events don't vanish between a commit and a publish. Idempotency keys make retries safe to fire twice. It all works. It's all battle-tested.

And every time, *you* build the machinery:

- A **status column** that grows a new value per step: `CHARGED`, `RESERVED`, `SHIPMENT_CREATED`, `EMAIL_SENT`, and eventually `SHIPMENT_CREATED_BUT_EMAIL_FAILED_RETRYING`.
- A **retry cron** that scans for rows stuck in an intermediate state for more than N minutes.
- A **"where was I?" query** that runs on startup, loads half-finished flows, and dispatches each one to the right resume handler.
- **Compensation logic** wired to every step, tested against every crash point, hopefully.

Your business logic — five calls in a row — got smeared into a state machine spread across a database table, a cron job, and a message broker. Nobody can read the flow top to bottom anymore, because it doesn't exist top to bottom anywhere. And the next multi-step feature? You build the whole apparatus again.

![A five-step order flow crashes after step three: the DIY recovery path needs status columns, a retry cron, and a where-was-I query, while a durable engine replays the journal and resumes at step four.](/writing/durable-crash-midway.svg "Same crash, two recoveries: DIY means you rebuild the state machine per flow; a durable engine replays the journal and resumes at step 4.")

## Durable execution flips the model

Durable execution starts from a different question: instead of making the *state* durable and letting the code stay fragile, what if the **code itself** was crash-proof?

You write the flow as an ordinary, boring, straight-line function. An engine — Temporal, Restate, DBOS, more on them below — guarantees that function runs to completion, even across crashes, restarts, deploys, and machine changes.

```typescript
export async function orderWorkflow(order: Order) {
  const payment  = await act.chargeCard(order);         // step 1
  const hold     = await act.reserveInventory(order);   // step 2
  const shipment = await act.createShipment(order);     // step 3
  // ---- the pod dies right here. it does not matter. ----
  await act.sendConfirmationEmail(order, shipment);     // step 4
  await act.closeOrder(order, payment);                 // step 5
}
```

No status column. No cron. No recovery query. The happy path *is* the whole program. Which sounds like a scam — the pod died mid-function, and dead processes famously do not finish functions. The engine isn't keeping the process alive. It's doing something stranger: it can **reconstruct the execution**.

## The journal, and the replay trick

Here's the teachable core, the mechanism that makes the whole category work.

Every time a step completes, the engine records its result in an append-only **event history** — a journal. `chargeCard` returned `pay_123`? Journaled. `reserveInventory` returned `hold_88`? Journaled. The journal lives in a database, not in the process, so it survives anything the process doesn't.

Now the crash. The pod dies after step three. The engine notices, picks a worker — possibly on a different machine — and does the counterintuitive thing: it runs your workflow function **again, from the top**. This is replay, and it's not a re-run. Every `await` whose result is already in the journal returns that recorded result *instantly* — no network call, no second charge, no re-reservation. The function fast-forwards deterministically through steps one, two, and three in microseconds, local variables rebuilding themselves along the way, and arrives at the first `await` with no journal entry: step four. That's where real execution resumes.

From the code's point of view, nothing happened. `payment`, `hold`, and `shipment` all hold the same values they held before the crash, because same code plus same recorded results equals same state. The function died mid-body and woke up mid-body, on a different machine, and it can't tell.

![Workflow code on the left, the append-only event history on the right: on replay, journaled steps return their recorded results instantly and execution resumes at the first un-journaled line, which is why workflow code must be deterministic.](/writing/durable-replay-mechanics.svg "Replay runs the function from the top; journaled steps return recorded results instantly, and real execution resumes at the first line the journal has never seen.")

## The contract: determinism in, side effects out

Replay only works if the function takes the *same path* every time it runs against the same journal. That gives durable execution its one hard rule: **workflow code must be deterministic.**

No `new Date()`. No `Math.random()`. No direct database reads, HTTP calls, or file IO inside the orchestration function. A stray wall-clock read is enough to hurt you: the original run saw 11:59 and took one branch, the replay sees 12:01 and takes the other, and now the replayed execution has diverged from the journal — the engine can only throw a nondeterminism error and page a human. The engines aren't asking you to live without time and randomness; they hand you their own versions — a workflow-safe clock, seeded random, a durable `sleep` — each one journaled like every other step, so replay sees the same values the original run saw.

The side effects live in **activities** — the `act.chargeCard` calls above. An activity is where the real, messy, non-deterministic world happens. The engine executes it, journals its result, and *never re-runs a completed activity during replay*. Failed activities get automatic retries with exponential backoff — a retry policy you configure, not a cron you write. One honest footnote: an activity can still run twice if the process crashes in the gap between the side effect and the journal write, so idempotency discipline still matters *inside* an activity. But it's scoped to a single step, not smeared across an entire flow.

## The party trick: `await sleep(30 days)`

This is the demo that sells durable execution to anyone who's ever built a "follow up in a month" feature.

```typescript
await act.sendConfirmationEmail(order, shipment);
await sleep('30 days');                    // costs nothing. really.
await act.sendReviewRequestEmail(order);
```

That sleep is not a process waiting. It's a **timer row in a database**. The worker journals the timer, unloads the workflow entirely, and moves on with its life. Thirty days later the timer fires, some worker — very possibly on a machine that didn't exist when the flow started — replays the journal, fast-forwards to the sleep, and continues mid-function as if a month were a millisecond. Trial expirations, onboarding drip sequences, payment dunning, "how was your order?" emails — flows that used to mean a scheduler table and a cron become one line of code that just *waits*.

## The engines

Three names worth knowing, in descending order of heavyweight:

- **[Temporal](https://temporal.io)** — the standard-bearer, descended from Uber's Cadence, which ran this pattern at absurd scale before most of us had a name for it. A server cluster plus workers in your language of choice. The most mature, and the most infrastructure.
- **[Restate](https://restate.dev)** — a leaner take: a single binary built around a replicated log, aiming at the same guarantees with less operational surface.
- **[DBOS](https://www.dbos.dev)** — the Postgres-native take: the journal is tables in the Postgres you already run, next to your data.

The pattern matters more than the vendor. Journal, replay, deterministic workflows, side effects in activities — once you understand that core, every engine in the category is a dialect of the same idea.

## The honest bill

Durable execution is not free lunch; it's lunch you pay for in specific, predictable ways.

- **You now operate an engine.** A Temporal cluster is real infrastructure with real failure modes, or a real monthly bill if you buy the cloud version. That cost has to be worth it.
- **The determinism constraint bites.** A stray `new Date()`, an innocent library that reads the clock internally, an iteration order you didn't think about — any of them can poison replay. The discipline is learnable, but it *is* a discipline, and your linter doesn't know about it yet.
- **Versioning long-running workflows is real work.** A workflow that sleeps for 30 days will still be mid-flight when you deploy new code. Replaying an old journal against changed code is exactly the divergence the engine fears, so every engine has versioning and patching APIs — and using them well is genuine engineering, not a checkbox.
- **Simple jobs don't need any of this.** One-step work — resize the image, send the email, sync the record — is still best served by a queue with retries and an idempotency key. Don't bring an event-sourced journal to a fire-and-forget fight.

![When to use which: a queue with retries and idempotency for one-step fire-and-forget jobs, durable execution for multi-step, long-lived, must-complete flows like payments, provisioning, and agent loops — at the cost of running an engine and keeping workflow code deterministic.](/writing/durable-when-to-use.svg "One-step work: keep the queue. Multi-step flows that must finish: that's what the engine is for.")

## When it shines

The sweet spot is flows that are **multi-step, long-lived, and must-complete**. Payments and refunds that cross several providers. Infrastructure provisioning, where step six of nine failing at 3am should mean "resume at step six," not "run the cleanup runbook." User onboarding that spans days by design. Subscription lifecycles that are, by nature, month-long state machines.

And one very current entry: **AI agent loops**. An agent running a multi-hour tool-calling session is precisely a long-lived, multi-step, must-complete flow — every tool call a natural activity, every result worth journaling. When the pod restarts forty minutes in, replay hands the agent its entire history back, and the loop continues from the exact tool call where it died instead of burning the whole session again. It's no accident that the durable execution crowd and the agent infrastructure crowd are rapidly becoming the same crowd.

Sagas taught us to choreograph failure — every step paired with its undo, the whole dance rehearsed in reverse. Durable execution asks a quieter question: why can't the dance just *resume from the last step*? Write the happy path. Let the engine remember where you were.
