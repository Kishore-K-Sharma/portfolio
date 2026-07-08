---
title: "The HTTP QUERY Method: A GET That's Allowed to Have a Body"
description: "For thirty years the web has had exactly one safe way to ask a server a question — GET — and it can't carry a body. So every real search endpoint quietly cheats with POST and loses caching, idempotency, and honesty about what it's doing. QUERY is the proposed method that fixes the thirty-year-old workaround: safe and idempotent like GET, but with a request body like POST."
date: "2026-07-08"
tags: ["http", "rest", "api-design", "web-standards", "caching", "backend"]
category: "engineering"
---

Every search endpoint you've ever built is lying about what it does. Type a query into a search box, hit enter, and the browser fires a `POST /search`. `POST`. The verb that means *create a thing, change the world, do it once and be careful*. You didn't create anything. You asked a question. You could ask it a thousand times and the answer would be the same each time. But the request on the wire says `POST`, and every cache, proxy, and retry policy between you and the database now treats a harmless read as a dangerous write.

This isn't a bug in your code. It's a thirty-year-old gap in HTTP itself, and you've been papering over it your whole career without noticing. The method that *should* carry a search — `GET` — isn't allowed to have a request body. And the method that's allowed to have a body — `POST` — carries all the wrong semantics. So we pick `POST`, shrug, and give up caching and idempotency as the price of being able to send a real query.

QUERY is the proposed HTTP method that closes the gap. It's the one you'd have designed if you were building HTTP today: safe and idempotent like `GET`, but with a request body like `POST`. It is currently an [IETF Internet-Draft](https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/) adopted by the HTTP working group — not yet a finished RFC, but far enough along that it's worth understanding now, because it renames a problem you already have.

## Why GET can't do the job

The instinct is: "just put the query in the URL." And for simple cases, `GET /search?q=cats&sort=new` is perfect. That's exactly what `GET` is for. The trouble starts the moment your query stops being a couple of key-value pairs.

Real search is structured. A faceted product search, a GraphQL-style selection, an Elasticsearch bool query with nested filters, a geospatial polygon — these are JSON objects with arrays and nesting, sometimes kilobytes of them. You have three bad options for cramming that into a URL:

- **Query string.** URL-encode a whole JSON blob into `?filter=%7B%22...`. It works until it hits the wall — and there is a wall. Browsers, proxies, and servers all cap URL length somewhere around 2,000–8,000 characters, and none of them agree on where. Cross that invisible line and you get a `414 URI Too Long`, sometimes only from *one* proxy in the chain, sometimes only in production.
- **The URL leaks.** Everything in the URL gets logged. Access logs, proxy logs, browser history, the `Referer` header sent to the next site, analytics. Put a customer's search terms — or worse, an auth token someone stuffed in a query param — in the URL and you've quietly written it to a dozen places you don't control.
- **Encoding pain.** Deeply nested state doesn't map cleanly to flat `key=value` pairs. You end up inventing a bracket convention (`filter[price][gte]=10`) that every client and server has to agree on and parse by hand.

![Three ways to send a complex query: cramming JSON into the GET query string hits the URL length wall and leaks into logs; POST carries the body fine but is neither safe nor cacheable; QUERY carries the body and stays safe, idempotent, and cacheable.](/writing/http-query-three-options.svg "The GET query string leaks and has a length ceiling; POST loses caching and idempotency; QUERY keeps the body and the semantics.")

The obvious fix — "let GET have a body" — is a dead end, and not for a good reason, just an old one. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) technically permits a body on a `GET`, but immediately warns that doing so has no defined meaning and will break things: caches, proxies, and libraries throughout the ecosystem were built assuming `GET` bodies don't exist, and many silently drop them. So a `GET` body is a trap. Which is how everyone ends up at `POST`.

## What POST actually costs you

`POST` works. The body goes through. That's the whole appeal, and it's also where the honesty ends.

The word "safe" in HTTP is a technical term with teeth. A **safe** method is one the spec promises has no side effects the client is responsible for — a read, essentially. `GET`, `HEAD`, and `OPTIONS` are safe. A crawler will happily fire safe requests all day because it knows it isn't changing anything. **Idempotent** means making the same request twice has the same effect as making it once — so a client, proxy, or load balancer can safely *retry* it after a timeout without fear of doing the thing twice.

`POST` is neither. It's the method that specifically means "this might change something, and repeating it might change something *again*." So the entire infrastructure that speaks HTTP treats your `POST /search` accordingly:

- **Caches refuse it.** A `POST` response is essentially uncacheable by default. Your identical search from a thousand users can't be served from a shared cache, because the cache has no way to know the request was harmless.
- **Retries are dangerous.** A proxy or client library will retry a timed-out `GET` automatically. It won't retry a `POST`, because it can't tell your safe search from an unsafe "charge the card." So a blip becomes a user-facing error instead of a transparent retry.
- **The semantics lie.** Anyone reading your access logs, your API, or your traces sees `POST /search` and has to *know*, out of band, that it's actually a read. The protocol is no longer telling the truth about your system.

You didn't choose any of that. You chose it by elimination, because `POST` was the only method left standing that could carry the body.

## What QUERY changes

QUERY is deliberately boring, and that's the point. Take everything good about `GET` and add the one thing it lacks.

A QUERY request is **safe** and **idempotent** — the spec says so, the same way it says `GET` is. So every retry policy, every crawler, every cache that special-cases safe methods can treat QUERY exactly like a read, because it *is* one. And a QUERY request carries a **body**, with a `Content-Type` that describes it. Your query is `application/json`, or a GraphQL document, or an SQL-ish DSL — whatever you want — sent as content, not smuggled into a URL.

```http
QUERY /products HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept: application/json

{
  "filter": {
    "category": "keyboards",
    "price": { "gte": 40, "lte": 150 },
    "tags": { "any": ["mechanical", "wireless"] }
  },
  "sort": [{ "field": "price", "order": "asc" }],
  "limit": 50
}
```

No length ceiling. Nothing sensitive in the URL, so nothing sensitive in your access logs or browser history. No bracket-encoding convention to invent. And the method itself announces, to every piece of software on the path, that this is a safe, repeatable read.

![A side-by-side of the same faceted product search sent two ways: as POST it is unsafe, non-idempotent, and uncacheable; as QUERY it is safe, idempotent, and cacheable, with the body untouched.](/writing/http-query-vs-post.svg "Same request, same body — QUERY tells the infrastructure the truth that POST can't.")

## The clever part: caching a request that has a body

Here's the piece that makes QUERY more than "POST with better manners," and it's the detail worth remembering.

A normal cache keys on the method and the URL. That's *why* `GET` is cacheable and `POST` isn't — a `GET`'s full input lives in the URL, so the URL is a complete cache key. But a QUERY's input is in the *body*. Two QUERY requests to the same `/products` URL can ask completely different questions. So a cache that ignored the body would be catastrophically wrong: it'd serve one user's search results to another user's totally different search.

QUERY's answer is that the **request body becomes part of the cache key**. A cache stores the response against the combination of method, URI, *and* the query content. Fire the identical QUERY again — same URL, same body — and a shared cache can return the stored result without ever touching your database. Change one filter and it's a different key, so you get a fresh result. You get `GET`-style caching for requests whose input was far too big and complex to ever fit in a `GET`.

![How a cache stores a QUERY: the key is method plus URI plus the request body, so identical queries hit the cache and a changed body misses it and reaches the origin.](/writing/http-query-cache-key.svg "The request body joins the cache key, so a complex query caches like a GET while different queries stay separate.")

The draft also lets the server point at the results with a `Content-Location` response header — effectively saying "the answer to that query also lives at this stable URL" — so a follow-up plain `GET` can fetch the same result the normal, fully-cacheable way. It's the bridge back to classic HTTP caching for the results themselves.

## Will it replace POST? No — and that's the right question

QUERY replaces exactly one thing: the `POST` you use when you aren't posting. Search, filtered list endpoints, complex reporting reads, GraphQL-over-HTTP queries, any "give me data based on this complicated criteria" call. Everywhere your `POST` is a read wearing a write's coat, QUERY is the honest version.

It does **not** touch the `POST` that actually creates and mutates. Placing an order, sending a message, uploading a file — those have side effects, they're not idempotent, and `POST` is exactly right for them. Nothing about QUERY changes that. The line is simple: **is this request a read?** If yes, QUERY is what you were reaching for. If it changes state, it stays `POST`.

The honest caveat: it's a draft. Client libraries, server frameworks, proxies, and CDNs are only starting to grow first-class support, and until the whole path understands the method, an intermediary that doesn't recognize QUERY may reject or mishandle it. So this isn't "rewrite your search endpoints this sprint." It's "understand the shape of the fix, watch the draft, and know exactly which of your `POST`s are lying." Because once you see it, you can't unsee it: half the `POST`s in your codebase were always secretly a `GET` that just needed somewhere to put its body.
