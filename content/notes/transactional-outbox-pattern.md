---
title: "The Transactional Outbox: Publishing Events Without a Distributed Transaction"
description: "Your OrderService saves to Postgres and publishes to Kafka — two systems, no shared transaction. There is no safe order to do them in. The outbox pattern makes the write atomic and lets the broker catch up. Here's how, with the relay tradeoffs and the guarantees you actually get."
date: "2026-05-29"
tags: ["backend", "microservices", "patterns", "kafka", "postgresql", "spring-boot", "messaging", "production"]
---

There's a class of bug that looks completely fine in code review, sails through every demo, and then bills a customer for an order nobody ever ships. The maddening part isn't that it's hard to fix. It's that the obvious fix is wrong, and so is the second one you reach for right after the first one fails. They're wrong in opposite directions, which is its own kind of insult.

Picture an `OrderService` that does the obvious thing. A request comes in, it saves the order to Postgres, then it publishes an `OrderPlaced` event to Kafka so the fulfilment service can pick it up and ship the thing. Two lines, basically:

```java
orderRepository.save(order);          // Postgres
kafkaTemplate.send("orders", event);  // Kafka
```

Looks airtight. It isn't. Say the `save()` commits, and then the Kafka broker has a bad few seconds (a leader election, a network blip, take your pick) and the `send()` throws. Now there's a row sitting in the database, `status = CONFIRMED`, money taken, and fulfilment has no idea the order exists. The customer paid. Nothing ships. No alarm goes off, because from the database's point of view everything is perfectly fine. It works right up until it doesn't, which is always a Friday.

The two lines look like one operation. They're two, against two systems that have never heard of each other, with a gap in the middle where the universe is allowed to interfere. And the genuinely annoying part is that there's no way to order those two writes that closes the gap. Swap them and you trade one bug for its evil mirror image. We'll get to why. First, the name for this.

## Two systems, no shared transaction

This is the dual-write problem, and once you see it you can't unsee it. You're writing to two independent systems, Postgres and Kafka, that don't share a transaction. There is no `BEGIN` that wraps both. So you write one, then the other, and *something can always die in the gap between them.*

![OrderService writes to Postgres (commit succeeds) then to Kafka (publish fails), leaving an order row with no event and downstream never shipping it.](/writing/dual-write-problem.svg "The DB commit lands, the Kafka publish dies, and the order has no event. Flip the order and you get the opposite bug.")

The instinct is to reorder the two calls. It doesn't help. It just changes which way you bleed:

- **DB first, then Kafka** (the version above): DB commits, Kafka publish fails or the pod gets OOM-killed in between. Order with no event. Fulfilment never ships it.
- **Kafka first, then DB**: you publish `OrderPlaced`, then the DB transaction rolls back on a constraint violation, a deadlock, anything. Now there's an event for an order that *does not exist*, and downstream happily ships a phantom.

No ordering of these two writes is safe. Whichever you put second can fail after the first has already committed, and you can't un-ring that bell. Retrying the second write doesn't save you either, because the process can crash before the retry runs. The problem isn't the failure rate. It's that the two writes aren't atomic, and at scale "rare" happens every single day.

## "Just use a distributed transaction" — no

Someone always suggests two-phase commit. Wrap Postgres and Kafka in an XA transaction, get a coordinator to make them commit or roll back together. Problem solved on paper.

In practice, don't. Kafka's support for XA is poor-to-nonexistent depending on your setup, and 2PC is a throughput killer by design. Every participant has to hold locks through a prepare phase and wait on the coordinator, so your slowest, flakiest participant sets the pace for everyone. Worse, the coordinator itself becomes a thing that can fail mid-protocol and leave participants stuck "in doubt," holding locks, waiting for a decision that isn't coming. You've traded an occasional lost event for a brittle, slow system with a brand-new single point of failure. Most teams that go down this road quietly back out.

The good news: you don't need both writes to land atomically across two systems. You need them atomic across *one* system, and you already have one that's very good at atomicity. Your database.

## The outbox: write the event where you write the data

The move is this. Inside the same local database transaction that saves the order, you also `INSERT` a row into an `outbox` table describing the event you *want* to publish. One transaction, one system. Either both rows commit or neither does. That's just how Postgres works, no distributed anything required.

Now the order and its event are bound together atomically. If the transaction commits, the event is durably recorded. If it rolls back, the event is gone too. The "order with no event" bug is now structurally impossible, because the event lives in the same table that proves the order exists.

Then a separate process, call it the relay, reads the unpublished rows out of the outbox, publishes them to Kafka, and marks them sent. The database is the source of truth. The broker is eventually consistent with it: it might lag by a few hundred milliseconds, but it always catches up.

![One @Transactional method writes the order row and the outbox row in a single Postgres commit; a separate relay polls the outbox, publishes to Kafka, and marks rows sent.](/writing/transactional-outbox-flow.svg "Atomic write on the left. Asynchronous, retryable publish on the right. The DB is the source of truth.")

The write side, in Spring, is the satisfying part. One `@Transactional` method doing two saves:

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Order placeOrder(PlaceOrderCommand cmd) {
        Order order = Order.confirmed(cmd.customerId(), cmd.items());
        orderRepository.save(order);

        // Same transaction. Same connection. Same commit.
        OrderPlaced event = OrderPlaced.from(order);
        OutboxEvent row = OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId().toString())
            .eventType("OrderPlaced")
            .payload(writeJson(event))
            .createdAt(Instant.now())
            .build();
        outboxRepository.save(row);

        return order;
        // Spring commits both inserts here, or rolls both back. No Kafka in sight.
    }

    private String writeJson(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize event", e);
        }
    }
}
```

Notice what's *missing*: there's no `kafkaTemplate.send()` in the request path at all. The HTTP handler's only job is to make Postgres atomically true. Publishing is somebody else's problem now, and that's on purpose.

## Running the relay: poll, or tail the log

There are two well-trodden ways to get those outbox rows onto Kafka, and the choice is a real tradeoff, not a detail.

### Polling publisher

A background worker wakes up every so often, grabs a batch of unsent rows, publishes them, and marks them done. The trick is reading the rows safely when you have more than one instance of the relay running (you will, because you don't want a single point of failure on your event pipeline). `FOR UPDATE SKIP LOCKED` is what makes this clean:

```sql
CREATE TABLE outbox (
    id             BIGSERIAL PRIMARY KEY,
    aggregate_type TEXT        NOT NULL,
    aggregate_id   TEXT        NOT NULL,
    event_type     TEXT        NOT NULL,
    payload        JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);

-- Index the work queue, not the whole table.
CREATE INDEX outbox_unpublished_idx
    ON outbox (created_at)
    WHERE published_at IS NULL;

-- Each relay instance claims its own batch; others skip the locked rows.
SELECT id, aggregate_id, event_type, payload
FROM outbox
WHERE published_at IS NULL
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 100;
```

`SKIP LOCKED` is the hero here. Instead of two relay instances fighting over the same rows and blocking each other, each one locks a disjoint batch and the other steps over the locked rows and takes the next ones. You publish the batch, then `UPDATE outbox SET published_at = now() WHERE id = ANY(?)`, and commit. Horizontal scaling for free, no coordination service, nothing Zookeeper-shaped to stand up.

The cost is honest: it's polling. There's latency between the commit and the next poll, and you're running queries against your primary even when there's nothing to do. You can tune the interval and batch size, but you're trading a little freshness and a little DB load for a relay that runs anywhere with zero extra infrastructure. For most services that's the right default, and it's the one to reach for first.

### Change Data Capture (Debezium)

The other approach skips polling entirely. Debezium tails the Postgres write-ahead log, the same stream Postgres uses for replication, and emits a Kafka message the moment an outbox row is committed. No polling interval, no query load on your primary, no relay code in your application at all. Debezium even ships an outbox event router for exactly this shape, so it'll unwrap your outbox rows into properly-keyed topic messages.

It's genuinely lovely when you have the platform for it. The catch is the platform. You're now running Kafka Connect, configuring Debezium, and managing logical replication slots on Postgres (and keeping an eye out so that a slow or dead consumer doesn't let WAL quietly pile up until it fills your disk at three in the morning). For an org already invested in CDC, the per-service marginal cost is basically zero and it's the better answer. For a team shipping their third microservice, the polling publisher gets you the same correctness guarantee without a new piece of infrastructure to babysit. Pick based on what you already operate, not on what's fashionable.

## The guarantee you bought, and the one you still owe

Be clear-eyed about what the outbox gives you: at-least-once delivery. Not exactly-once. The window is small but real. The relay publishes a row to Kafka, the publish *succeeds*, and the relay crashes before it can mark the row `published_at`. On restart it sees an unsent row and publishes it again. The same `OrderPlaced` event goes out twice.

That's not a bug in the pattern. It's inherent to it, and it's the correct tradeoff. The alternative, mark sent first and then publish, gives you at-most-once, where a crash loses the event entirely. That's the exact disaster you started out trying to fix. So you keep at-least-once and push the duplicate problem downstream, where it belongs.

Which means your consumers have to be idempotent. Processing `OrderPlaced` twice has to produce the same result as processing it once. This is the publish-side companion to a consume-side discipline I've covered separately, in [making consumers idempotent without a database](/notes/idempotency-without-a-database), so I won't re-litigate it here. Just know that the outbox pattern *assumes* you've done that work. An outbox feeding non-idempotent consumers isn't a fix. It's a duplicate-charge generator with extra steps.

A few sharp edges worth naming before you ship:

- **Ordering.** A single `outbox` table read in `created_at` order is globally ordered, but the moment you publish in parallel batches or fan out across Kafka partitions, that ordering loosens. If consumers need per-order ordering (state machines usually do), key your Kafka messages by `aggregate_id` so all events for one order land on the same partition. Don't assume the broker preserves the order your table had. It won't, and that comes back to haunt you.
- **Cleanup.** That outbox table grows forever if you let it. Either hard-`DELETE` rows once they're confirmed published, or set `published_at` and run a retention job that sweeps anything older than a day or two. Leave it alone and your unpublished-rows index quietly rots as it scans past millions of tombstoned rows, and one morning your relay is mysteriously slow. Decide the retention policy on day one.
- **Poison events.** A row that fails to publish forever (bad payload, a topic that doesn't exist) gets retried forever and can wedge the head of your queue. Track an attempt count and route persistent failures to a dead-letter table, so one bad row doesn't stall every event behind it.

## The takeaway

The dual-write problem feels like it should have a clever fix. Some library, some flag, some way to make two systems commit together. It doesn't, and chasing 2PC to get one will cost you more than the bug did. The outbox pattern wins by refusing the premise: stop trying to write to two systems atomically. Write to one system you can trust, then let a relay reconcile the second one asynchronously.

It's a deeply unglamorous pattern. An extra table, a background worker, a retention job nobody will ever thank you for. But it turns "the service sometimes loses events and nobody knows until a customer complains" into "events are durably committed with the order, and the worst case is a duplicate the consumer already shrugs off." In a microservices system, that's one of the best trades you'll make. Write the event where you write the data.
