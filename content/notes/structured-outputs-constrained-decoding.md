---
title: "Stop Parsing the Model's JSON. Make Invalid JSON Impossible."
description: "Asking an LLM to 'reply in JSON' and then JSON.parse-ing the result is the retry-and-pray pattern, and at scale a 1% parse-failure rate is a paging incident. There's a better move: constrained decoding masks the token distribution at every step so the model literally cannot emit a syntactically invalid character. Here's how it works, what it does and doesn't guarantee, and how to wire it in as a backend engineer."
date: "2026-08-03"
tags: ["llm", "ai-engineering", "structured-outputs", "json", "apis"]
category: "engineering"
---

Here is a claim that should feel a little too good to be true: you can make it *structurally impossible* for a language model to emit malformed JSON. Not "very likely to be valid." Not "valid 99% of the time if you prompt it nicely." Impossible — the same way it's impossible for a well-behaved SQL driver to let a bound parameter change your query plan. And yet most code that talks to an LLM does not do this. It asks the model to "please reply in JSON," runs `JSON.parse` on whatever comes back, wraps it in a `try/catch`, and prays. I want to convince you to stop doing that, and to show you the machinery that makes praying unnecessary.

## The retry-and-pray pattern

The pattern is everywhere because it *almost* works. You write a prompt: "Extract the customer's name, order ID, and sentiment. Reply in JSON." Ninety-nine times out of a hundred you get back exactly `{"name": "...", "order_id": "...", "sentiment": "..."}` and you feel clever. Then it goes to production, traffic goes up, and the long tail of failure modes starts paging you.

Here is the bestiary. The model wraps its answer in a markdown code fence, so you get ```` ```json ```` and a closing ```` ``` ```` that `JSON.parse` chokes on. It prefaces the object with prose — "Sure! Here's the JSON you requested:" — because that is a very natural thing for a chat model to say. It appends a helpful "Let me know if you'd like any changes!" after the closing brace. It emits a trailing comma before a `}` because it saw a million JavaScript files that tolerate them. It hallucinates a field you never asked for, or drops one you did. It returns `"order_id": 8841` as a number when your schema wants a string, or the reverse. And on a long response it simply runs out of output tokens mid-object and hands you a truncated, unclosable string.

Each of these is individually rare and individually fixable. You add a regex to strip fences. You add another to find the first `{` and last `}`. You add a JSON-repair library. You add a retry loop that sends the malformed output back with "that wasn't valid JSON, try again." Now you have a brittle post-processing pipeline, extra latency and token spend on retries, and a failure rate you've pushed down but never to zero. And zero is what matters, because at scale even a 1% parse-failure rate on a million calls a day is ten thousand incidents, some of which are silently corrupting data instead of throwing cleanly.

![Top path: a prompt asks the model to reply in JSON, the model emits free text, and JSON.parse fails on fences, prose, trailing commas, and truncation. Bottom path: a JSON Schema drives constrained decoding that is valid by construction.](/writing/structured-outputs-parse-vs-constrain.svg "Parsing free text is a losing game with a long tail of failure modes. Constraining the decode removes the tail entirely.")

The reason this pattern is fundamentally shaky is worth stating plainly: you are trying to *repair* a probabilistic output after the fact, when you could have made the bad output impossible in the first place.

## Why "reply in JSON" can't be trusted

To see the fix you have to remember how a language model actually produces text. It does not write a JSON object. It generates one token at a time, and at each step it produces a probability distribution over its *entire* vocabulary — tens of thousands of possible next tokens — then samples one according to that distribution (shaped by temperature, top-p, and friends). Then it appends that token and does it again.

"Reply in JSON" is just a nudge to that distribution. It raises the probability that the next token looks JSON-ish. It does not, and cannot, drop the probability of `S` (as in "Sure!") to zero. The model is always free, at every step, to sample a token that breaks your syntax, because nothing in the sampling loop knows what "valid JSON" means. You are hoping the training distribution keeps the model on the rails. Hope is not a boundary.

## Constrained decoding: masking the impossible away

Now the good part. If the failure lives in the sampling step, that is exactly where you fix it. **Constrained decoding** sits inside the generation loop and, at every single step, masks the probability distribution so that only tokens which keep the output *valid under a formal grammar* have nonzero probability. Every other token has its logit set to negative infinity before sampling. The model can want an illegal token as much as it likes — the mask deletes it from consideration, and the sampler picks from the survivors.

Concretely: you take a JSON Schema and compile it into a grammar — a context-free grammar (CFG) or, for regular-enough shapes, a finite-state machine. That grammar defines, for any partial output, the set of tokens that could legally come next. At each decoding step the engine looks at the current grammar state, computes the allowed token set, sets the logits of all disallowed tokens to `-inf`, and *then* samples. Because the illegal tokens have zero probability, the model literally cannot emit a syntactically invalid character.

![One decoding step: the grammar state after an open brace permits only a string key or a closing brace. The vocabulary's illegal tokens — including the one with the highest raw logit — are masked to negative infinity, and the sampler picks from the legal survivors.](/writing/structured-outputs-grammar-mask.svg "The grammar state dictates which tokens are legal next. Illegal ones are masked to negative infinity before sampling — even the one the model wanted most.")

The diagram shows the punchline. Say the model has just emitted `{`. The grammar knows that after an opening brace, the only legal things are a string key (starting with `"`) or a closing `}`. Suppose the raw distribution most wants to emit the bare word `foo` (highest logit — maybe the model is pattern-matching on some YAML it saw). Doesn't matter. `foo` is illegal here, so its logit becomes `-inf`, and the model samples from `"` and `}`. The token the model "wanted" is simply not on the menu. That is the whole trick, and it is a genuinely different kind of guarantee than prompting: it is enforced by the decoder, below the level the model's preferences can reach. It is the closest thing we have to a parameterized query for model output.

## JSON mode is not structured outputs

This is the distinction that trips people up, and it matters. Two different things get sold under similar names.

**JSON mode** guarantees the output is *syntactically valid JSON* — some well-formed object. It does not guarantee anything about the shape. You can ask for `{name, order_id, sentiment}` and get back valid JSON that has a `customer_name` key instead, or an extra `notes` field, or `sentiment` as a nested object. It parses cleanly and it's still wrong.

**Strict structured outputs** guarantees the output conforms to *your exact schema*: the required keys are present, the types are right, enums are drawn only from your allowed set, no extra properties sneak in. This is what you actually want, because the whole point was to get a predictable object into your code, not merely a parseable one. When OpenAI's Structured Outputs runs with `response_format: json_schema` and `strict: true`, it is compiling *your* schema into the grammar and guaranteeing conformance — not just validity. Reach for the strict, schema-bound mode every time; "valid JSON of some shape" solves half your problem and leaves the annoying half.

## The landscape

You do not have to build any of this. On the open side, [Outlines](https://github.com/dottxt-ai/outlines) constrains Hugging Face and vLLM models to regexes and JSON Schemas; `llama.cpp` ships GBNF grammars you can hand-write or generate; [XGrammar](https://github.com/mlc-ai/xgrammar) and Microsoft's [Guidance](https://github.com/guidance-ai/guidance) push on speed and expressiveness; LMQL bakes constraints into a query language; and serving stacks like vLLM and TGI expose "guided decoding" parameters directly. On the hosted side, OpenAI has Structured Outputs, Anthropic gives you guaranteed-shape output through tool use / JSON schemas, and Google's Gemini takes a `responseSchema`. Different ergonomics, same underlying idea: a grammar drives the mask.

## Does the mask slow things down?

A fair worry: computing an allowed-token set over a 100k-token vocabulary *at every step* sounds expensive, and a naive implementation is. But this is a solved engineering problem. Modern engines like XGrammar precompute and cache the grammar's automaton, so the per-step masking is close to free — a lookup and a bitmask rather than a fresh computation. The one real cost is compiling the schema into a grammar in the first place, and that is a one-time cost per schema that you cache and amortize across every request that uses it. In practice, structured decoding on a well-built engine is competitive with unconstrained decoding, and it can even be *faster* end to end because you stop paying for retries.

![The pipeline: a JSON Schema compiles once into a cached grammar or FSM, constrained decoding produces valid JSON whose structure is guaranteed, and a validation layer such as zod or pydantic guarantees the values before a typed object enters your app.](/writing/structured-outputs-pipeline.svg "Structure is guaranteed by the decoder; values are guaranteed by validation. The schema is the contract at the trust boundary.")

## What it does *not* give you

Now the honesty, because a guarantee you misunderstand is worse than no guarantee. Constrained decoding guarantees **structure, not meaning**. The output will match your schema. It will not necessarily be *correct*.

The model can still emit a value that is valid-but-wrong: the right type, the wrong fact. If your enum is `["refund", "replacement", "no_action"]`, the grammar guarantees the model picks one of those three — it does not guarantee it picks the *right* one for the ticket. A confidently hallucinated but enum-legal choice sails straight through the decoder. Structure is a syntax property; the decoder cannot see semantics.

There's a subtler cost too: **over-constraining can hurt quality.** If you force the model into a rigid shape from the very first token, you can block the "thinking out loud" that it uses to reach a good answer. Demanding a bare classification with no room to reason is often worse than letting the model reason first. The fix is to give it a place to breathe: put a free-text `reasoning` field *before* the structured payload in your schema, so the model can work through the problem and still hand you a clean object. You get chain-of-thought and a typed result.

## The backend framing that makes this click

Here is the mental model I'd leave you with. Treat the model exactly like an unreliable upstream service, and treat the schema as the **contract at the trust boundary**. Constrained decoding gives you a strong guarantee about the *shape* of what crosses that boundary — like a well-typed API response envelope. It does not vouch for the *contents*, so you still validate contents at the boundary the same way you'd validate any third-party payload: run the parsed object through zod or pydantic, check ranges and business rules, reject what doesn't make sense, and keep an eval suite watching value quality over time.

So the full recipe is two layers, and the pipeline diagram above lays them out: the decoder guarantees the structure, and your validation guarantees the values. Compile the schema once and cache the grammar. Constrain the decode so parse can never fail. Allow a reasoning field so you don't strangle quality. Validate the values at the boundary because the decoder can't. Do that, and the retry-and-pray loop — the fences, the "Sure! Here's the JSON," the 3 a.m. page over a trailing comma — is simply gone, replaced by a contract the model has no power to violate.
