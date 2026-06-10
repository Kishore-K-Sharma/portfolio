---
title: "Sagas: How to Undo a Transaction That Never Had a ROLLBACK"
description: "Placing an order touches four services and four databases. There's no @Transactional block stretched across all of them. So what happens when payment succeeds but inventory is empty? Here's the saga pattern, its two flavors, and the hard truths nobody warns you about."
date: "2026-05-25"
tags: ["microservices", "distributed-systems", "saga", "spring", "patterns", "transactions", "backend"]
---

A customer clicks *Place Order*. Sounds like a single action. It isn't.

That one click touches four services. OrderService creates the order, PaymentService charges the card, InventoryService reserves the items, and ShippingService schedules the delivery. Four services, four databases, four separate commits that know nothing about each other.

In a classic monolith this was one method wrapped in `@Transactional`. If shipping blew up on the last line, the framework rolled the whole thing back: the charge, the reservation, the order row, gone. The database pretended none of it ever happened. Clean.

Split those four pieces into four services with four different Postgres instances and that safety net is gone. No shared transaction. No coordinator holding a lock across all four. No global `ROLLBACK` waiting for you to call it.

So payment succeeds, and then inventory tells you the item is out of stock. You've taken the customer's money for a thing you can't ship. Now what?

That gap is the whole reason the saga pattern exists.

## The textbook answer nobody actually uses

Crack open a distributed systems textbook and the first answer is two-phase commit (2PC). A coordinator asks every participant "can you commit?" That's the prepare phase. If they all say yes, it tells them all "commit now." If any says no, everyone aborts. On paper it gives you ACID across services: atomic, all-or-nothing, the dream.

In practice almost nobody runs 2PC for business workflows, and the reasons aren't subtle.

- Locks are held across the whole prepare-to-commit window. PaymentService has to sit on a lock on its row while it waits for InventoryService, ShippingService, and the coordinator to get their act together. Multiply that by your request rate and your throughput falls off a cliff.
- The coordinator is a single point of failure. If it dies after the prepare phase but before commit, every participant is stuck holding locked resources, waiting for an instruction that may never come. This is the dreaded "in-doubt transaction," and on-call engineers learn to fear it for good reason.
- Availability is coupled to the slowest participant. If one service is having a bad day, the whole transaction waits. You took four independent services and chained their uptime together, which is the exact opposite of why you split the monolith.

2PC trades availability for consistency in a way that's wrong for most order-placement-shaped problems. You don't need the charge and the shipment to agree to the millisecond. You need them to *eventually* agree, and you need a sane story for the moments when they don't.

That's what a saga gives you.

## The saga idea, in plain English

Stop thinking "one big transaction." Start thinking "a sequence of small ones."

Model the workflow as an ordered list of local transactions, one per service. Each commits on its own, in its own database, and publishes a result. OrderService commits a pending order. PaymentService commits a charge. InventoryService commits a reservation. Each step is fully done and durable before the next one starts.

The failure path is where it gets interesting. If step N fails, you can't roll back steps N-1 through 1, because they already committed. They're real. The money actually moved. So instead of rolling back, you run a compensating transaction for each completed step, in reverse order. A compensating transaction is a *new* transaction that semantically undoes the previous one.

You don't rewind. You do the opposite.

- Undo a charge? You don't un-commit it. You issue a refund.
- Undo an inventory hold? You release it.
- Undo a pending order? You mark it cancelled.

![A saga's happy path runs order, payment, inventory, shipping forward; when inventory fails, compensating transactions run in reverse to release the hold and refund the payment.](/writing/saga-compensation-flow.svg "The happy path goes forward. On failure, you compensate in reverse — each compensation is a brand-new transaction, because there's no global ROLLBACK to call.")

Back to our scenario, where payment succeeds but inventory is empty. The saga compensates backward. Inventory failed, so there's nothing to undo there. It refunds the payment. It cancels the order. The customer gets their money back and a "sorry, out of stock" notification, and no money vanishes into a state that no service agrees on.

That's the whole pattern. Everything past this point is about *who* drives the sequence and *how* you survive the messy reality of running it.

## Two ways to coordinate: choreography vs orchestration

There are two architectural answers to "who decides what runs next," and the one you pick shapes everything about how the system feels to operate.

![Two saga coordination styles side by side: choreography chains services through events with no central component, while orchestration routes every step through a central orchestrator state machine.](/writing/saga-orchestration-vs-choreography.svg "Choreography: services react to each other's events, no brain. Orchestration: a central state machine commands each step and drives compensation.")

### Choreography: services react to events

There's no central brain. Each service listens for events and reacts. OrderService publishes `OrderCreated`. PaymentService hears it, charges the card, publishes `PaymentCompleted`. InventoryService hears *that*, reserves stock, publishes `StockReserved`, and so on down the chain. Compensation works the same way in reverse: a failure event triggers the upstream services to undo their work.

It's beautifully decoupled. No service knows about the orchestrator because there isn't one. Want to add a step? Add a listener. Done.

The catch is that the workflow doesn't live anywhere. It's an emergent property of who-listens-to-what, smeared across four codebases. Six months later someone asks "what actually happens when an order is placed?" and the only honest answer is "let me grep four repos for event handlers." Observability is rough. Cyclic dependencies sneak in. Reasoning about a seven-step flow with a couple of branches goes from annoying to genuinely hard, and good luck onboarding the next engineer onto it.

### Orchestration: a central state machine

A dedicated orchestrator owns the workflow. It's a state machine. It tells PaymentService to charge, waits for the reply, then tells InventoryService to reserve, and on it goes. If a step fails, *it* decides which compensations to run and in what order.

The win is that the entire workflow lives in one place you can read, test, log, and stare at in a dashboard. When something goes wrong at 2am, you look at the saga's current state and you know exactly where it stalled. No grep safari required.

The cost is a new component you have to build, deploy, and keep available, plus the discipline to keep it a coordinator rather than a god object that quietly absorbs every piece of business logic in the company.

Rough rule of thumb: use choreography when the flow is two or three simple steps with no branching, where the decoupling is worth it and there's not enough complexity to get lost in. The moment the flow grows a fourth step, a conditional branch, or anyone says the words "retry policy," switch to orchestration. Being able to point at one place and say "the saga is *here*" pays for the orchestrator many times over.

## A real orchestrator, in Spring

Here's a compact orchestrator that captures the actual shape. An ordered list of steps, each with an action and a compensation. It advances on success, and on the first failure it walks backward, compensating everything it already did. This isn't pseudo-code. It's the honest skeleton of the real thing.

```java
public record SagaStep(
    String name,
    Consumer<OrderContext> action,        // the forward local transaction
    Consumer<OrderContext> compensation   // the semantic undo
) {}

@Component
public class PlaceOrderSaga {

    private final SagaStateRepository stateRepo;

    private List<SagaStep> steps(PaymentClient pay, InventoryClient inv, ShippingClient ship) {
        return List.of(
            new SagaStep("CHARGE_PAYMENT",
                ctx -> ctx.setPaymentId(pay.charge(ctx.getOrderId(), ctx.getAmount())),
                ctx -> pay.refund(ctx.getPaymentId())),            // undo = refund

            new SagaStep("RESERVE_INVENTORY",
                ctx -> ctx.setHoldId(inv.reserve(ctx.getItems())),
                ctx -> inv.release(ctx.getHoldId())),              // undo = release hold

            new SagaStep("SCHEDULE_SHIPPING",
                ctx -> ctx.setShipmentId(ship.schedule(ctx.getOrderId())),
                ctx -> ship.cancel(ctx.getShipmentId()))           // undo = cancel
        );
    }

    public void run(OrderContext ctx, PaymentClient pay,
                    InventoryClient inv, ShippingClient ship) {
        List<SagaStep> steps = steps(pay, inv, ship);
        List<SagaStep> completed = new ArrayList<>();

        for (SagaStep step : steps) {
            try {
                step.action().accept(ctx);
                completed.add(step);
                stateRepo.markCompleted(ctx.getSagaId(), step.name(), ctx);  // persist progress
            } catch (Exception e) {
                stateRepo.markFailed(ctx.getSagaId(), step.name(), e.getMessage());
                compensate(ctx, completed);                          // reverse order
                throw new SagaFailedException(step.name(), e);
            }
        }
        stateRepo.markSucceeded(ctx.getSagaId());
    }

    private void compensate(OrderContext ctx, List<SagaStep> completed) {
        for (int i = completed.size() - 1; i >= 0; i--) {            // walk backward
            SagaStep step = completed.get(i);
            try {
                step.compensation().accept(ctx);
                stateRepo.markCompensated(ctx.getSagaId(), step.name());
            } catch (Exception e) {
                // compensation MUST eventually succeed — escalate, retry, alert
                stateRepo.markCompensationStuck(ctx.getSagaId(), step.name());
            }
        }
    }
}
```

Two things to notice. First, `markCompleted` runs after every step. That persistence is not optional, and the reason shows up below. Second, the compensation loop swallows failures into a "stuck" state instead of throwing. A compensation that can't run is the single nastiest failure in this whole pattern, because now you're in an inconsistent state with no automatic way out. You want a human paged, not an exception quietly bubbling into the void where nobody will find it until the finance team does.

In production you'd reach for Spring Statemachine or a workflow engine like Temporal or Camunda rather than hand-rolling the loop. Under the hood they're all doing this, just with the durability and retries done properly so you don't have to.

## The hard truths nobody puts on the slide

Sagas look clean in a diagram. Here's what bites you when you actually build one.

Some things can't truly be undone. Releasing an inventory hold is clean. But if your ShippingService already emailed the customer "your order is confirmed," there's no compensation that un-sends it. The best you can do is send a second email: "actually, sorry, we couldn't fulfill that." Your compensation isn't a reversal. It's an apology. So design the step order to push irreversible actions (sending email, calling a third-party fulfillment API) as late as possible, ideally after the last step that can realistically fail. Once that email is out the door, it's somebody's inbox problem forever.

Every step must be idempotent and retryable. Messages get redelivered. The orchestrator crashes, resumes, and re-issues a command it already sent. If `pay.charge()` runs twice, you've double-charged a customer, and now you've got a support ticket and a chargeback. So every action and every compensation has to be idempotent. It's the same idempotency-key discipline you'd use anywhere, applied to each step. "Refund payment 123" must be safe to call five times and only ever move money once.

There is no isolation. This is the one people underestimate. ACID gave you the *I*: other transactions couldn't see your half-finished work. A saga has none of that. Between the charge and the reservation, another request can absolutely read an order that's been paid for but not yet stock-reserved. That's a real anomaly, not a theoretical one, and it works perfectly until it doesn't, which is always a Friday. The mitigations are semantic. Use a `PENDING` status so other reads can tell the order isn't final yet (a semantic lock), and identify the pivot transaction: the step after which the saga is guaranteed to complete and will never compensate. Before the pivot everything is tentative. After it, you're committed to going forward. Knowing where your pivot sits tells you exactly which states are safe to expose and which ones are lying to you.

You must persist saga state. If the orchestrator is a `for` loop in memory and the pod gets killed between step 2 and step 3, the saga just evaporates. Payment charged, inventory never reserved, no record of where it was. That's why every step writes its progress to a durable store before moving on. On restart the orchestrator reloads in-flight sagas and resumes from the last persisted step, or kicks off compensation. A saga without durable state isn't a saga. It's a hope.

## The takeaway

A saga is the honest admission that you can't have ACID across service boundaries, so you stop pretending you can. You trade atomic consistency for *eventual* consistency, and you pay for it in explicit compensation logic, idempotency, and persisted state. None of that is free.

So don't reach for it by default. If two operations genuinely belong together and never need to scale independently, keep them in one service and one real transaction. A `@Transactional` block is correctness you get for free; a saga is correctness you build and maintain by hand. Save it for the workflows that truly span services that have to stay independent.

And when you do build one, write the compensation for a step in the same commit as the step itself. The forward path is easy. You'll have it working in an afternoon and feel great about it. It's the undo (the refund, the release, the apology email) that comes back to haunt you at 2am if you leave it for later.
