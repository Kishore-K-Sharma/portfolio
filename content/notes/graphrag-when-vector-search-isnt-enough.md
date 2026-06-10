---
title: "GraphRAG: When Vector Search Quietly Gives Up"
description: "Plain vector RAG can't answer multi-hop or 'across everything' questions — the answer is spread across chunks that no single chunk contains. GraphRAG extracts a knowledge graph instead. Here's how it works, the honest cost, and how to start in Postgres without a graph database."
date: "2026-06-02"
tags: ["graphrag", "rag", "knowledge-graph", "pgvector", "postgres", "ai", "retrieval", "backend"]
---

I've written about [RAG for beginners](/notes/what-is-rag-beginners-guide) and [RAG as a backend data pipeline](/notes/rag-from-backend-engineer-pov). Both land on the same machine: chunk your documents, embed them, store the vectors, and at query time pull the top-K nearest chunks and hand them to the model. For "what's our refund policy?" that machine is hard to beat. It's cheap, it's fast, and most of it is an ETL problem you already know how to solve.

Then someone asks a different kind of question, and the machine just shrugs.

> *"Which engineers work on services that depend on the billing database?"*

Watch what vector search does with that. It embeds the question, finds the chunks that look most similar, and returns them: a chunk where someone mentions billing, a chunk listing a service's owner, a chunk about a nightly job. Each chunk is individually relevant. Put them together and you've got a pile of true facts that answer nothing, like being handed three jigsaw pieces from three different boxes. The answer is a *path*. Priya owns the invoices service, the invoices service depends on the billing DB. No single chunk in your corpus contains that whole path. Top-K can only return chunks that exist. It can't return a connection that lives *between* chunks, and between the chunks is exactly where this answer is hiding.

That's the gap GraphRAG fills. This post covers when you actually need it, how the pieces fit, what it costs (a lot), and how to start without buying a graph database.

## The two questions vector RAG can't answer

Two shapes of question quietly defeat nearest-neighbor retrieval, and they're worth naming. Once you can spot them, you start seeing them everywhere.

**Multi-hop questions.** The billing-database one above. The answer requires traversing relationships: A relates to B, B relates to C, so what's the link from A to C? Vector search has no notion of "relates to." It only knows "is textually similar to." You can sometimes brute-force a single hop by stuffing more chunks into the context and praying the model connects them. Two hops in, though, and the relevant chunks have already fallen outside your top-K. The signal is right there in your data. The retriever just can't follow it.

**Global / aggregation questions.** *"What are the top themes across all 4,000 support tickets this quarter?"* There's no nearest chunk here, because the question isn't *about* any chunk. It's about all of them at once. The honest answer means reading everything and summarizing. Vector top-K returns the 8 tickets most similar to the words "top themes," which is a meaningless slice. Picture the result: a perfectly confident bot announcing "the top themes" after skimming eight random tickets, the way a student summarizes a book from the back-cover blurb. The dangerous part isn't that it's wrong. It's that it's *fluent*. Wrong in complete sentences, with a tidy bulleted list.

![On the left, vector top-K returns four disconnected chunks each individually relevant but with no links between them, marked with danger crosses because no chunk contains the full answer. On the right, a small entity graph where traversing two edges — Priya owns the invoices service, which depends on the billing database — produces the answer as a path.](/writing/graphrag-vs-vector.svg "The answer to a multi-hop question is a path between chunks, not a chunk. Vector search can only return chunks.")

If your users only ever ask fact-lookup questions, you can stop reading. Vector RAG is the right tool and GraphRAG would be a waste of money. But most real knowledge bases attract both shapes. The moment a product manager asks "what's the relationship between X and Y" or "what are people complaining about," the wheels come off.

## The GraphRAG idea, in plain terms

Vector RAG turns documents into points in space and hopes the right ones land near each other. GraphRAG does something more deliberate. It turns documents into a graph, where nodes are entities (a person, a service, a database, a customer, a feature) and edges are the relationships between them (owns, depends_on, reported_by, mentions). Instead of asking "what text is similar to this query," you ask "what's connected to this entity, and how." It stops guessing at proximity and starts recording who's actually wired to whom.

The build pipeline looks like this:

1. **Extract.** Run each chunk through an LLM with a prompt that says: *find the entities and the relationships between them, and return them as structured data.* You get back triples like `(Priya, OWNS, invoices-service)` and `(invoices-service, DEPENDS_ON, billing-db)`. Same move RAG made with embeddings, except instead of a vector you're producing structure.
2. **Build the graph.** Dedupe entities. The model will call the same thing "billing DB," "the billing database," and just "billing," and you have to resolve all three into one node. Then store nodes and edges.
3. **Cluster into communities (optional, but this is the part that makes global questions work).** Run a community-detection algorithm over the graph (Leiden is the usual choice) to find densely connected clusters. Each cluster is roughly a "topic." Then summarize each community with the LLM *ahead of time*, so you have a pre-written paragraph describing what each cluster is about. Think of it as writing the chapter summaries before anyone's asked what the book is about. Annoying to do up front, blissful at query time.

At query time you choose your retrieval path based on the question shape.

![The offline build pipeline: documents flow into LLM entity and relationship extraction, which produces a graph of nodes and edges, which gets clustered into communities that are each pre-summarized by the LLM. Two stages are marked as expensive because they make many model calls. Below, three query-time paths: local graph traversal, global community summaries, and plain vector top-K still kept around for fact lookup.](/writing/graphrag-build-pipeline.svg "The graph and community summaries are built offline. The expensive part is the extraction and the per-community summarization.")

## Local vs global queries

This split is the whole mental model, so it's worth being precise.

**Local queries** are "tell me about entity X and its neighborhood." You find the node for X, traverse out one or two hops, collect the connected entities and their relationships, and hand that structured neighborhood to the model as context. The billing-database question is local. Start at the billing-db node, walk the `DEPENDS_ON` edges backward to find services, then walk `OWNS` edges to find their engineers. The model never has to *infer* the path. You traversed it and handed over the result.

**Global queries** are "what's true across the whole corpus." You don't traverse from a single node, because there isn't one. Instead you reach for the community summaries you built offline. For "top themes across 4,000 tickets," you take the relevant community summaries, ask the model to pull partial themes out of each, then combine those partials into a final answer. It's a map-reduce over summaries. The reason you pre-summarized at build time is so you don't have to read 4,000 tickets when the question lands. That work is already done, cached as the community summaries.

Same graph, two completely different retrieval strategies. Most production systems keep the plain vector index around too and route to it for ordinary fact lookup. So that's three retrieval paths, picked by question shape, and the routing between them is itself a design decision worth getting right.

## The honest cost — this is the takeaway

Here's the part the demos skip, because the demo ran on twelve documents and a generous budget. GraphRAG is not a free upgrade to your RAG system. It's dramatically more expensive to build and maintain, and the cost is structural. Not a tuning problem you can config your way out of.

With vector RAG, ingestion is one embedding call per chunk. Embeddings are cheap and fast. With GraphRAG, ingestion is one (or more) full *LLM generation* call per chunk to extract entities and relationships, which is orders of magnitude more expensive than an embedding, plus another round of LLM calls to summarize every community. For a corpus of any size, building the graph the first time is a real bill and a real wall-clock wait.

Then a document changes, because documents always change. With vectors, you re-embed the affected chunks and you're done. With a graph, you have to re-extract those chunks, figure out which entities and edges they contributed, and reconcile that against what's already there. Did an entity disappear? Did a relationship quietly flip? Is this "billing DB" the same one from last month? Then you potentially re-run community detection and re-summarize the affected communities. Incremental graph maintenance is genuinely hard. The naive answer, rebuild the whole graph nightly, gets expensive fast and stops being funny the moment the invoice arrives.

So the rule I'd give anyone:

> Use GraphRAG **only for the questions vector RAG can't answer.** If your users ask fact-lookup questions, vector RAG is cheaper and just as good. Reach for the graph when you actually have multi-hop or global questions, and even then, keep the vector index around for everything else.

The first time you build this, you'll be tempted to graph-ify your entire corpus because the demo was magic. Resist. That temptation is how a fact-lookup FAQ bot ends up with a five-figure ingestion bill and the exact same answers it had before. Graph the slice where multi-hop matters. Leave the rest on vectors.

## You don't need a graph database to start

A lot of people hear "GraphRAG" and immediately picture standing up Neo4j and learning Cypher this weekend. You can, and for a large, traversal-heavy graph that's the right tool, with proper graph indexes and a query language built for paths. But you almost certainly shouldn't start there. New database, new query language, new ops surface, all to validate a hypothesis you haven't tested yet. That's a lot of ceremony for a maybe.

You already have Postgres. You probably already have `pgvector` for your existing RAG. A graph is just two tables: entities, and an `edges(src, dst, relation)` table. That's the whole thing. You can do hybrid retrieval (graph neighbors ∪ vector top-K) in the database you already run, and only graduate to Neo4j if traversal performance actually becomes the bottleneck.

Here's the schema and a recursive CTE doing a 2-hop traversal. The billing-database question, answered in SQL:

```sql
-- Entities: one row per resolved real-world thing.
create table entity (
  id          bigserial primary key,
  name        text not null,
  type        text not null,                 -- 'person' | 'service' | 'database' ...
  embedding   vector(1536),                  -- pgvector: lets you fuzzy-match a query to a node
  unique (name, type)
);

-- Edges: the relationships extracted by the LLM.
create table edge (
  src         bigint not null references entity(id),
  dst         bigint not null references entity(id),
  relation    text   not null,               -- 'OWNS' | 'DEPENDS_ON' | 'REPORTED_BY' ...
  weight      real   not null default 1.0,   -- extraction confidence, for ranking
  primary key (src, dst, relation)
);

create index on edge (dst, relation);        -- traversing backward needs this

-- "Which engineers work on services that depend on the billing database?"
-- Start at the billing DB node, walk DEPENDS_ON backward to services,
-- then walk OWNS backward to people. Two hops, capped depth.
with recursive billing as (
  select id from entity where name = 'billing-db' and type = 'database'
),
traversal as (
  -- hop 0: the seed node
  select e.id, e.name, e.type, 0 as depth, e.name as path
  from entity e
  join billing b on b.id = e.id

  union all

  -- each step: follow an inbound edge to whatever points at the current node
  select src.id, src.name, src.type, t.depth + 1,
         t.path || ' <- ' || edge.relation || ' <- ' || src.name
  from traversal t
  join edge       on edge.dst = t.id
  join entity src on src.id   = edge.src
  where t.depth < 2                            -- cap the hops; graphs have cycles
    and edge.relation in ('DEPENDS_ON', 'OWNS')
)
select distinct name, path
from traversal
where type = 'person'                          -- only return the people
order by name;
```

Two things bite here. First, the `where t.depth < 2` cap is not optional. Real extracted graphs have cycles, and a recursive CTE with no depth bound will happily walk in circles until it exhausts memory (good luck debugging that one when the query just hangs). Second, that `create index on edge (dst, relation)` matters more than it looks. Backward traversal (`edge.dst = t.id`) is the common case for "what depends on X" questions, and without the index every hop is a sequential scan.

The `embedding` column on `entity` is the hybrid bridge. When a user's question doesn't name an entity exactly, you vector-search the entity table to find the most likely starting node. *"The billing database"* fuzzy-matches to the `billing-db` node, and you traverse from there. Vector search to *enter* the graph, graph traversal to *answer*. That union of graph neighbors and vector top-K is where hybrid retrieval earns its keep, and it all lives in one Postgres.

## Where I'd land

GraphRAG manages to be genuinely powerful and genuinely overhyped at the same time. It isn't a better RAG. It's a *different* RAG for a *different* class of question. Bolt it onto a fact-lookup bot and you'll spend a fortune on extraction calls to answer questions vectors already answered fine.

But the first time a stakeholder asks a multi-hop or "across everything" question and your vector bot face-plants (confidently, in full sentences, wrong), you'll understand why the graph exists. Build it for those questions, store it in the Postgres you already run, keep your vector index for everything else, and don't graph-ify a single document more than you have to. The expensive part was never the query. It's keeping the graph true.
