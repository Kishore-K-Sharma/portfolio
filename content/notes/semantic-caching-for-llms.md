---
title: "Semantic Caching for LLMs: Cache on Meaning, Not on Strings"
description: "A normal cache keyed on the exact request string is almost useless for LLM calls, because every paraphrase is a miss. Semantic caching keys on meaning instead — embed the query, search for a near-identical past question, and return its answer with no model call. Here's the architecture, the threshold problem that makes or breaks it, and real pgvector code."
date: "2026-06-04"
tags: ["llm", "caching", "pgvector", "redis", "embeddings", "cost-optimization", "typescript", "backend"]
---

An exact-match cache in front of an LLM has a hilariously bad hit rate. Single digits. Call it 3%. Which means you're paying for a model call on 97 out of every 100 questions, and most of those questions are the same question wearing a different coat.

Look at the logs and it's obvious why.

- "how do I reset my password"
- "I forgot my password, help"
- "cant log in, need to reset pw"
- "Password reset?? where"

Four strings. Four cache misses. Four paid model calls. One actual question.

A normal cache is keyed on the exact request string, so it treats those as four unrelated requests. That works beautifully for `GET /user/42`. The key is stable, and the same input always means the same thing. Human language doesn't work like that. People never ask the same thing the same way twice, so a string-keyed cache for LLM traffic has a hit rate that rounds to zero. You built a cache and it caches nothing.

The fix is to stop caching on the string and start caching on the meaning. That's semantic caching, and on the right traffic it's one of the best things you can put in front of an LLM.

## The core idea, in one paragraph

A request comes in, you embed the query into a vector. Then you run a similarity search over the vectors of every question you've already answered. If the closest previous question is close enough (above some similarity threshold) you return its stored answer and skip the model. If nothing's close enough, it's a miss. You call the model, then write the new (query-vector, answer) pair into the cache so the next person who asks it some other way gets a hit.

That's it. Same shape as any cache, lookup and hit and miss and write-back, except the lookup is an approximate nearest-neighbor search instead of a hash table get.

![Semantic cache lookup flow: a request is embedded into a vector, an approximate nearest-neighbor search finds the closest cached question, and a threshold gate decides between a hit that returns the cached answer with no model call and a miss that calls the model and writes the result back to the cache store.](/writing/semantic-cache-flow.svg "The whole point is the highlighted box: on a hit, the model call never happens.")

## Architecture with a normal backend stack

You don't need anything exotic. You almost certainly already run the storage layer. Which store you pick mostly comes down to what's already in the cluster.

- **Redis** with its vector search module, when you want the cache to behave like a cache: in-memory, TTL-native, very fast lookups, and you're fine with it being volatile. Good default for a high-traffic FAQ assistant.
- **Postgres + pgvector**, when you want the cache durable, queryable, and sitting next to data you're already storing transactionally. Slower than Redis, but you get SQL, joins to tenant tables, and `WHERE` clauses for free. That last one matters more than it sounds, as you'll see when we get to the parts that bite.

The flow is identical either way.

1. Embed the incoming query. One small embedding call, cheap and fast, roughly two orders of magnitude cheaper than the generation call you're trying to avoid.
2. ANN search for the nearest stored query vector.
3. Threshold check. Is the nearest neighbor's similarity above your bar?
4. Hit, return the cached answer, no generation. Miss, call the model, then write `(query_vector, answer)` back.

The economics are simple. You spend one cheap embedding call to maybe avoid one expensive generation call. As long as your hit rate clears a few percent, the embedding cost is rounding error and the cache pays for itself many times over.

## The threshold is the whole game

Everything above is the easy part. Any backend engineer can wire up an embedding call and a vector search in an afternoon. The part that keeps you up at night is one number: the similarity threshold, the `τ` in the gate.

It's a precision/recall tradeoff, and a nasty one, because both ways of being wrong are expensive in different currencies.

Set the threshold too loose and you get false hits. Watch what happens.

- "how do I cancel my subscription" → cached answer: how to cancel.
- "how do I cancel my **subscription renewal** but keep the account" → similarity 0.91 → **HIT** → you serve the same cancel-everything answer.

Those questions are close in vector space and meaningfully different in the real world. The loose threshold just confidently handed a customer the wrong instructions. And it did it silently. No error, no log line screaming, just a quietly wrong answer that looks exactly like a right one. False hits are the scariest failure mode in this design, because they're invisible until a human complains. Which, of course, they do on a Friday.

Set the threshold too tight and your hit rate collapses back toward that miserable 3%. Now you're paying for the embedding call and the generation call on nearly every request. You've added cost and latency to buy almost nothing.

![A similarity-threshold dial shown as an axis: a loose threshold around 0.80 produces false hits where the cache serves a confidently wrong answer to a subtly different question, a tight threshold near 0.99 is safe but causes the hit rate to collapse so almost every paraphrase misses and pays, and a sweet spot around 0.92 sits between them.](/writing/semantic-cache-threshold-tradeoff.svg "One dial, two ways to lose. Start near the tight end and walk toward the middle with data in hand.")

Practical guidance, learned the way everyone learns it, which is by getting burned at least once.

- Start strict. Pick a high threshold (cosine around 0.95+ to begin) and accept a low hit rate. A cache that's too conservative just costs you money. A cache that's too aggressive costs you trust, which is far more expensive to win back.
- Measure before you loosen. Log every hit with its similarity score and the original query. Sample the borderline hits periodically (say the 0.88–0.94 band) and have a human, or a strong model, judge one thing: was this cached answer actually correct for this question? That false-hit rate is your real metric. Raw hit rate will lie to you.
- Loosen one notch at a time, watching the false-hit rate. The moment it ticks past your tolerance, back off.
- Add a cheap verifier for the borderline band. For hits in the uncertain zone, don't return blindly. Make one small, cheap LLM call: "Here's a question and a candidate cached answer. Does the answer actually address this specific question? Yes/no." A tiny fast model answers that in a few hundred milliseconds for a fraction of a cent, and it catches the subtle false hits that pure vector distance can't. You're still way ahead. A cheap verify-call beats a full generation, and confident hits above the band skip the verifier entirely.

## The code

A real pgvector lookup in TypeScript: embed, search, gate, write back. This is close to what actually ships, including the part everyone forgets (tenant scoping, which gets its own section below, because it earned one).

```typescript
import { Pool } from "pg";
import OpenAI from "openai"; // any embeddings provider works the same way

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ai = new OpenAI();

// cosine distance in pgvector is `<=>`; similarity = 1 - distance.
const SIM_THRESHOLD = 0.95;      // start strict
const VERIFY_BAND = 0.9;         // [0.90, 0.95) → cheap verifier, don't trust blindly

async function embed(text: string): Promise<number[]> {
  const res = await ai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

export async function answer(tenantId: string, query: string): Promise<string> {
  const qVec = await embed(query);
  const vecLiteral = `[${qVec.join(",")}]`;

  // ANN search, scoped to THIS tenant. The tenant filter is not optional.
  const { rows } = await pool.query(
    `SELECT answer, 1 - (query_vec <=> $1) AS similarity
       FROM semantic_cache
      WHERE tenant_id = $2
      ORDER BY query_vec <=> $1
      LIMIT 1`,
    [vecLiteral, tenantId],
  );

  const top = rows[0];
  if (top && top.similarity >= SIM_THRESHOLD) {
    return top.answer; // confident hit — no model call, no verifier
  }

  if (top && top.similarity >= VERIFY_BAND) {
    // borderline: spend a cheap call to avoid an expensive mistake
    if (await isRelevant(query, top.answer)) {
      return top.answer;
    }
  }

  // miss: pay for the real generation, then write it back
  const fresh = await callTheModel(tenantId, query);
  await pool.query(
    `INSERT INTO semantic_cache (tenant_id, query_text, query_vec, answer, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [tenantId, query, vecLiteral, fresh],
  );
  return fresh;
}

// the cheap guardrail for the borderline band
async function isRelevant(query: string, candidate: string): Promise<boolean> {
  const res = await ai.chat.completions.create({
    model: "a-small-fast-model",
    temperature: 0,
    messages: [
      {
        role: "user",
        content:
          `Question: ${query}\n\nCandidate answer: ${candidate}\n\n` +
          `Does the candidate answer correctly and specifically address ` +
          `the question? Reply with exactly "yes" or "no".`,
      },
    ],
  });
  return res.choices[0].message.content?.trim().toLowerCase().startsWith("yes") ?? false;
}
```

The index that makes the search fast is a one-liner. Build it once and pgvector handles the approximate nearest-neighbor work under the hood.

```sql
CREATE INDEX ON semantic_cache
  USING hnsw (query_vec vector_cosine_ops);
```

With Redis it's the same logic, just `FT.SEARCH` and a `KNN` clause instead of `<=>`, plus a TTL on each key so staleness handles itself. The shape of the code doesn't change. Only the store does.

## The two concerns that will bite you in production

Cost and latency are why you build this. The next two are why it doesn't blow up in your face six weeks later.

### Invalidation and staleness

A cache is a promise that the answer hasn't changed. LLM answers do change, not because the model changed, but because the world the answer describes did. Cache "what's your return window?", then marketing extends it from 14 to 30 days, and your cache will keep cheerfully serving "14 days" until something clears it. Nobody clears it. That's the whole problem.

So decide, per question type, how long an answer is allowed to live.

- Volatile facts (prices, inventory, "is X in stock", anything off live data): don't semantic-cache these at all, or give them a TTL measured in seconds. The cache is for stable answers.
- Policy and docs that change occasionally: TTL them, hours to days, and better still, wire a cache-bust into your publish pipeline. When the help-center doc updates, purge the cache rows tagged to it. Store a `source_doc_id` alongside each cached answer and this becomes a one-line `DELETE`.
- Timeless explanations ("what is two-factor auth?"): long TTL, relax, enjoy the hit rate.

The mistake to avoid is a single global TTL. "Cache everything for an hour" serves stale prices and needlessly expires timeless answers, so you get the worst of both. Match the TTL to how fast the content actually moves.

### Multi-tenant isolation

This one is non-negotiable, and it's why `tenant_id` shows up in every query in the code above. If you run a multi-tenant product, tenant A's cached answer must never surface for tenant B. Vector similarity doesn't know or care about tenancy. Two different companies will ask near-identical questions ("how do I export my data?"), and a naive global cache will happily serve Company A's specific, possibly confidential answer to Company B.

That's not a stale-answer bug. That's a data-leak incident, and now you've got a problem that involves lawyers.

Partition the cache by tenant: a `WHERE tenant_id = $x` in Postgres, a per-tenant key namespace in Redis. Make it structurally impossible for the search to cross the boundary, not a thing you remember to add. Treat the un-scoped query as un-shippable. It should fail code review on sight (yes, you've written this exact bug, or you will).

## What you actually get for this

On FAQ-heavy, support-style traffic, the kind where the same handful of intents show up over and over in a thousand phrasings, a well-tuned semantic cache routinely takes 30–60% of calls off the model. That's a direct cut to the generation bill. It's also a latency win: a cache hit is a single vector lookup and a string return, often single-digit milliseconds against seconds for a generation. Your p50 drops, your p99 stops being held hostage by the slowest model responses, and the bill goes down at the same time.

The numbers fall apart on traffic where every request is genuinely novel: open-ended creative work, long unique documents, code that's never the same twice. There's nothing to cache when nothing repeats. So know which kind of traffic you have before you build this. (Support and FAQ traffic repeats enormously. That's where the money is.)

## The takeaway

Semantic caching is one of the rare optimizations that makes a system cheaper and faster at once, with no model downgrade. The engineering is easy: embed, search, gate, write back, on the Redis or Postgres you already run.

It lives or dies on the threshold, and the threshold is not a constant you copy from a blog post. It's a number you earn by measuring false hits on your own traffic. Start strict, instrument every hit, put a cheap verifier on the borderline band, and scope every lookup to its tenant like your job depends on it. One day it will.

Do that, and you finally cache the thing you actually wanted to cache all along: the question, not the string.
