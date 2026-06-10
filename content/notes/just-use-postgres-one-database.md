---
title: "Just Use Postgres: One Database Until It Actually Hurts"
description: "A modest app somehow grew Postgres, Redis, RabbitMQ, Elasticsearch and a vector DB — five things to back up, secure and pay for. Most of that is now one Postgres. Here's the queue, vector, search and pub/sub SQL, and the honest signals for when to graduate."
date: "2026-05-31"
tags: ["postgres", "backend", "infrastructure", "sql", "architecture", "redis", "vector-search"]
---

Picture an app that, on paper, does almost nothing. It takes some form submissions, runs a few background jobs, does a keyword search over maybe forty thousand records, and has a "similar items" feature someone bolted on a Friday afternoon.

To do that, it runs five datastores.

Postgres for the actual data. Redis for caching and a little pub/sub. RabbitMQ for the job queue. Elasticsearch for the keyword search. And a dedicated vector database, spun up specifically for the similar-items thing, holding all of forty thousand embeddings.

Five systems. Five sets of credentials. Five things to back up, five things that page someone at 3am, five client libraries with their own quirks, five line items on the cloud bill, and five version-upgrade treadmills running at five different speeds. The actual workload would have fit inside one Postgres instance for years. You've probably met this app. You might be running it.

So here's a boring default worth adopting: just use Postgres. Not forever, and not as a matter of principle. Just until it actually hurts, and you can point at the metric that proves it hurts.

![Left: a cluttered before-state with five separate boxes — Redis, Kafka, Elasticsearch, a vector DB and Postgres — each carrying its own ops burden of backups, auth, monitoring and a bill. Right: a single Postgres box wearing five hats labelled queue, vectors, search, pub-sub and jsonb.](/writing/postgres-vs-infra-sprawl.svg "Five boxes, five failure modes — or one box you already run, until a measured limit forces a split.")

## The thesis, stated plainly

Every extra system in your architecture is a liability you've taken on in exchange for some capability. Sometimes that trade is obviously worth it. Often it isn't, and the only reason the box is there is that a blog post once told you "Postgres isn't a queue," or "you can't do search in a relational database."

That advice was true. In 2012. Since then Postgres has quietly grown almost all of those capabilities into the core product or a first-class extension, and the version you're running right now ships them. So the default flips. Reach for Postgres first. Graduate to the specialized system when you hit a real, measured limit, and not one second before.

Below are the four boxes people add most often, and the Postgres mechanism that usually makes each one unnecessary at the start.

## You don't need a queue server yet: `SKIP LOCKED`

This is the one that surprises people, so it gets to be the centerpiece.

The fear is concurrency. You store jobs as rows in a table, you have five workers all polling that table, and surely two of them grab the same job and the customer gets the same email twice. With a naive `SELECT ... WHERE status = 'pending' LIMIT 1`, yes. That's a textbook race, and it's why people reach for RabbitMQ or SQS.

Postgres solves it with two words bolted onto a `SELECT`: `FOR UPDATE SKIP LOCKED`.

Here's the worker dequeue. The whole thing, not a sketch of it:

```sql
-- Each worker runs this in its own transaction.
UPDATE jobs
SET status = 'running', locked_at = now()
WHERE id = (
    SELECT id
    FROM jobs
    WHERE status = 'pending'
      AND run_after <= now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED   -- the magic
    LIMIT 1
)
RETURNING id, payload;
```

It's worth walking through what those two words actually do, because that's where the whole thing lives.

`FOR UPDATE` says: I'm about to modify this row, so lock it for the duration of my transaction. Normally, if worker B tries to `FOR UPDATE` a row that worker A already holds, B blocks. It sits there and waits for A to commit. Correct, but useless for a queue: all your workers would pile up behind the same hot row and you'd effectively have one worker wearing five name tags.

`SKIP LOCKED` changes the rule. Don't wait. If a row is already locked by someone else, pretend it isn't there and move on to the next candidate. So worker A locks job #1, worker B runs the identical query, steps right over #1, and locks #2. Five workers, five different jobs, no coordination, no message broker. The database hands out distinct rows like a deli counter handing out numbers.

![One jobs table with rows 101 to 106. Three workers each run the same SELECT FOR UPDATE SKIP LOCKED query and each comes away holding a different row — worker A takes 101, B takes 102, C takes 103 — with skipped locked rows shown greyed out. No two workers grab the same row.](/writing/skip-locked-queue.svg "Three workers, one table, the same query — and never a collision, because SKIP LOCKED steps over rows someone else already holds.")

The `RETURNING` clause means the lock-and-claim happens in a single round trip. You get the payload back, you do the work, and on success you `UPDATE jobs SET status = 'done'`. On failure you bump a retry count and reset `status` to `pending` with a future `run_after`. Retries, delayed jobs, a dead-letter concept (jobs whose retries blew past a threshold): all of it is just ordinary columns you can query with plain SQL.

Which matters more than it sounds. Picture trying to work out *why* a particular job is stuck inside RabbitMQ at 3am, clicking through a management UI, hoping the message is still there to look at. Now picture `SELECT * FROM jobs WHERE status = 'running' AND locked_at < now() - interval '5 minutes'`. One of those debugging sessions ends in time for you to go back to sleep.

This is what every modern Postgres-backed queue does under the hood, whether it's pgmq, River, Solid Queue, or good old `pg-boss`. Adopt one of those, or write the twelve lines yourself. The twelve lines are right up there.

## You don't need a vector database yet: `pgvector`

The similar-items feature, the RAG retrieval step, the "find related tickets" button: these all need vector similarity search. For years that meant standing up a dedicated vector DB and a sync pipeline to feed it.

The `pgvector` extension turns Postgres into one. You get a real `vector` column type, the distance operators, and approximate-nearest-neighbour indexes (HNSW is the one you want).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE documents ADD COLUMN embedding vector(1536);

CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops);

-- the entire similarity query, top 5 nearest neighbours
SELECT id, title, embedding <=> $1 AS distance
FROM documents
ORDER BY embedding <=> $1
LIMIT 5;
```

The `<=>` operator is cosine distance. There are L2 and inner-product variants if you need them. What makes this genuinely better than a separate vector DB at small-to-moderate scale is that the embedding lives next to your data. You can tack on `WHERE tenant_id = $2 AND status = 'published'` in the same query: pre-filtered, transactional, consistent, and respecting whatever access rules you already enforce. A separate vector store means two round trips and two systems quietly disagreeing about what exists.

That disagreement has a classic shape. You delete a document. Postgres forgets it instantly. The vector DB, unbothered, keeps serving it up as a top match for weeks, because nobody thought to tell it. Then it surfaces in someone's RAG answer and you get to explain how a deleted record gave the chatbot its talking points. None of that happens when there's one source of truth.

## You don't need Elasticsearch yet: full-text search built in

Keyword search is the other "obviously you need a separate engine" assumption. For moderate scale, call it low millions of rows, Postgres full-text search is genuinely good. Stemming, ranking, multiple languages, phrase queries: it's all in there.

```sql
ALTER TABLE articles ADD COLUMN search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

CREATE INDEX articles_search_idx ON articles USING gin (search);

SELECT id, title,
       ts_rank(search, query) AS rank
FROM articles, to_tsquery('english', 'postgres & queue') AS query
WHERE search @@ query
ORDER BY rank DESC
LIMIT 20;
```

`tsvector` is the parsed, stemmed, indexable form of your text. `to_tsquery` parses the search terms. The `@@` operator means "matches," the GIN index makes it fast, and `ts_rank` gives you relevance ordering. A working search feature in one migration and one query. No cluster to babysit, and no document-sync pipeline grinding away to keep Elasticsearch in step with your database. (That sync pipeline, by the way, is where most ES pain actually lives. The search part is the easy part. Keeping the index honest with the source of truth is the part that wakes you up.)

## You don't need Redis pub/sub yet: `LISTEN` / `NOTIFY`

Want to tell every app server "this config changed, drop your cache"? Push an event out to connected clients? Postgres has a publish/subscribe channel built in.

A connection runs `LISTEN cache_invalidation;` and from then on it receives anything sent by `NOTIFY cache_invalidation, 'user:42';`. You can fire that `NOTIFY` from inside a trigger, so a plain `UPDATE users` quietly broadcasts that user 42 changed without the application code knowing or caring. And it's transactional. If the surrounding transaction rolls back, the notification never goes out. Redis pub/sub can't give you that, and it kills off the whole genre of "we invalidated the cache for a write that then failed, and now the cache is right about something that never happened" bugs.

It is not a durable message bus. If nobody's listening when the `NOTIFY` fires, the message is gone, same as Redis pub/sub. But for cache invalidation and lightweight fan-out, it's already sitting in the box you're paying for.

## You don't need MongoDB yet: `jsonb`

Schemaless documents were the original reason a lot of teams reached for Mongo in the first place. They're a native Postgres column type. `jsonb` stores binary JSON, you index it with GIN, and you query inside it with operators and path expressions:

```sql
CREATE INDEX events_data_idx ON events USING gin (data);

SELECT id FROM events
WHERE data @> '{"type": "signup", "plan": "pro"}';
```

The `@>` containment operator asks "does this document contain that shape?" and the GIN index makes it fast. So you get flexible documents, plus the option to join them against your relational tables in the same query, plus proper transactions across both. Pick a separate document store and you usually get to keep the first one and wave goodbye to the other two.

## Now the honest part: where Postgres stops being the answer

If I only gave you the good half, you'd be right to stop trusting me. Postgres-for-everything is a default, not a dogma, and it does eventually hit a wall. Here are the real ones, and the signal that tells you you've actually arrived rather than just gotten nervous.

**Very high-throughput event streaming, Kafka (or a real log).** Postgres `LISTEN`/`NOTIFY` and a jobs table are fine into the low thousands of events per second. Once you need a durable, replayable, partitioned log doing hundreds of thousands of events per second, with multiple independent consumers each tracking their own offset, you've described Kafka. That's not a workaround, that's its actual job. *You'll know it's time when* your jobs table is millions of rows of churn, autovacuum is losing the race against the dead tuples, and consumers need to replay history you've already deleted.

**Millions of low-latency cache reads per second, Redis.** Postgres can cache. But a hot key served straight from RAM at sub-millisecond latency, millions of times a second, with nobody caring if it's durable, is the exact thing Redis was built for. *You'll know it's time when* your read replicas are pinned serving the same handful of trivial lookups, and a profiler shows cache-shaped reads eating your database CPU alive.

**Search at large scale with serious relevance tuning, Elasticsearch or OpenSearch.** Past a few million documents, or once you need custom analyzers, faceting, fuzzy matching, synonym graphs, and per-field boosting that you're re-tuning every week, `tsvector` runs out of road. *You'll know it's time when* product keeps filing relevance tickets you simply can't express in `ts_rank`, and your GIN index rebuilds start taking the table down with them.

**Huge vector corpora that need sharding, a dedicated vector store.** `pgvector` with HNSW is great into the millions of vectors. At hundreds of millions, where you have to shard the index across machines and trade recall against latency on purpose, a purpose-built system earns its keep. *You'll know it's time when* the HNSW index no longer fits in RAM, recall starts sliding, or index builds are measured in hours instead of minutes.

There's a pattern hiding in all four signals: every one is a measurement, not a mood. A pinned replica. A million dead tuples. A relevance ticket you can't satisfy. You add the specialized system because the evidence forced you to, and when it shows up on the bill that way, it's earning its operational cost instead of just padding it.

## The takeaway

Every datastore you run is something a human has to back up, secure, monitor, upgrade, and reason about at 3am when it's the one that's down. The most reliable systems usually aren't the ones with the cleverest infrastructure. They're the ones that stayed boring the longest.

So start with one Postgres. Make it carry the queue, the vectors, the search, the pub/sub, and the documents. When a real measured limit finally forces your hand, peel off that one capability and leave everything else exactly where it is. The goal was never "Postgres for everything forever." It's "one less thing to operate, for as long as that stays honestly true." Which, for most apps, is a lot longer than the blog posts led you to believe.
