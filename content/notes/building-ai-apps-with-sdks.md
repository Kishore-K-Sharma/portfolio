---
title: "Building AI Apps With Modern SDKs: The 200 Lines You Stop Writing"
description: "An AI SDK doesn't make the model smarter — it deletes the streaming parser, the tool-calling loop, the JSON-validation prayer, and the per-provider glue you'd otherwise hand-roll against a raw HTTP endpoint. Here's exactly what you get over `fetch`, using the Vercel AI SDK, and where the abstraction leaks."
date: "2026-07-07"
tags: ["ai", "llm", "vercel-ai-sdk", "tool-calling", "streaming", "typescript"]
category: "engineering"
---

You can call any large language model with `fetch`. It's an HTTP endpoint. You POST some JSON with your messages, you get JSON back, done — a first-year could wire it up in an afternoon. So here's the uncomfortable question an AI SDK forces you to answer: if the raw API is that simple, what exactly is the SDK for?

The honest answer is that the *first* call is trivial and everything after it is a swamp. The moment you want the response to stream in token by token, or let the model call one of your functions, or hand you back a typed object you can actually trust, you stop writing "an HTTP call" and start writing a small, fiddly framework. An AI SDK is that small framework, already written, tested, and maintained by people who hit every edge case before you did. It's the layer between your app and the model that handles the plumbing you'd otherwise hand-roll — and once you see the shape of the plumbing, you stop wanting to own it.

Let me show you the four things that turn a one-line `fetch` into a swamp, and how the SDK drains each one. I'll use the [Vercel AI SDK](https://sdk.vercel.ai) as the concrete example because it's the one most people reach for in TypeScript land, but the ideas port to every serious AI SDK.

## The layer, and what sits under it

Start with the mental model, because "SDK" is doing a lot of work as a word. Your app talks to *one* SDK API. The SDK talks to *many* providers. In between, it absorbs everything annoying.

![Your app calls one AI SDK surface — streaming, tool calling, structured output, provider abstraction — and the SDK fans out to any provider (OpenAI, Anthropic, Google) behind a single normalized interface.](/writing/ai-sdk-layers.svg "One API on your side, many model backends on the other. The SDK is the normalizing layer in between.")

Underneath, there are really two layers. The Vercel AI SDK is the *unifying* layer — one `generateText`, one `streamText`, one message shape. Below it sit the provider-specific SDKs: OpenAI's official `openai` package, Anthropic's `@anthropic-ai/sdk`, Google's client. Those speak each vendor's exact dialect. You *can* use them directly, and sometimes you should. But most application code doesn't want to know whether it's talking to a GPT model or a Claude model — it wants a string back, or a stream, or a typed object. That's the job the top layer does.

Here's the entire "hello world," streaming included:

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-5'),
  prompt: 'Explain idempotency to a backend engineer in two sentences.',
});
```

Nothing dramatic yet — this is barely shorter than `fetch`. The payoff shows up when the requirements get real.

## Streaming without hand-parsing `data:` chunks

Every user-facing LLM feature streams, because a wall of text that lands after eight seconds of silence feels broken while the same text trickling out feels alive. So you turn on streaming. Now the provider stops sending you one JSON body and starts sending you Server-Sent Events: a long-lived HTTP response dribbling out `data: {...}\n\n` frames, one per token chunk, terminated by a `data: [DONE]`.

Parsing that by hand is a rite of passage nobody enjoys. TCP doesn't respect frame boundaries, so a single network read might hand you two and a half frames; you buffer the tail, split on the blank line, `JSON.parse` each piece, reach into the delta for the text, and pray no chunk arrives malformed under load. It's maybe forty lines and it breaks in ways that only reproduce in production.

The SDK turns all of that into an async iterator:

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const result = streamText({
  model: anthropic('claude-opus-4-8'),
  prompt: 'Write a haiku about race conditions.',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk); // already decoded, already just the text
}
```

The SSE parsing, the buffering, the delta-unwrapping, the done-sentinel — gone. You get a stream of plain strings. Same tokens, same latency, none of the parser.

## Tool calling: the agentic loop, automated

This is the one that actually earns the SDK its keep. Modern models can ask to call a function. You describe a tool — its name, what it does, and the shape of its arguments — and instead of answering directly, the model can respond with "please run `getWeather({ city: 'Lagos' })` and tell me what you get." You run it, feed the result back, and the model continues, maybe calling another tool, until it has enough to write a final answer.

That back-and-forth is the agentic loop, and hand-rolling it against the raw API is genuinely tedious. You send the request, inspect the response for a tool-call block, parse the arguments out of a JSON string the model generated (which may or may not be valid), dispatch to the right function, append the result as a specially-shaped message, and send the *whole conversation* back again. Then you loop — because the next response might be another tool call. You're writing a little state machine with a `while` loop and a switch statement, and getting the message roles exactly right or the model gets confused.

![The agentic loop: your prompt goes to the model; the model requests a tool; the SDK runs your function; the result is fed back; the model either requests another tool or produces the final answer. The SDK drives the loop for you.](/writing/ai-sdk-tool-loop.svg "Prompt in, tool call, run it, feed the result back, repeat until the model produces a final answer — the SDK runs the whole loop.")

The SDK collapses the loop into a data structure. You define tools with a schema and an `execute` function, set how many round-trips you'll allow, and the SDK runs the whole thing:

```typescript
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const { text } = await generateText({
  model: anthropic('claude-opus-4-8'),
  prompt: 'What should I wear in Lagos today?',
  stopWhen: stepCountIs(5), // cap the loop so it can't spin forever
  tools: {
    getWeather: tool({
      description: 'Get the current weather for a city',
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => {
        const w = await fetchWeather(city);
        return { tempC: w.temp, conditions: w.summary };
      },
    }),
  },
});
```

The model decides to call `getWeather`, the SDK validates the arguments against your Zod schema, runs `execute`, feeds the `{ tempC, conditions }` result back into the conversation, and lets the model produce the final sentence — all inside that one `await`. You wrote a function and a schema. The SDK wrote the state machine.

## Structured output: stop praying for valid JSON

Half the time you don't want prose at all — you want data. Classify this ticket, extract these fields, return this object. The old move was to beg in the prompt ("respond with ONLY valid JSON matching this shape, no markdown fences, I mean it") and then `JSON.parse` the reply inside a `try/catch`, because sometimes the model wraps it in a code fence, or adds a friendly "Sure! Here's your JSON:", or drops a trailing comma.

Structured output kills the prayer. You hand the SDK a schema and get back a validated, typed object — or a clean error, never a half-parsed guess:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-5'),
  schema: z.object({
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    priority: z.number().min(1).max(5),
    tags: z.array(z.string()),
  }),
  prompt: `Classify this support ticket: "${ticket}"`,
});

object.priority; // number, 1–5, typed and validated — no parse, no try/catch
```

`object` is fully typed from the Zod schema, and the SDK guarantees it matches or throws. No fences to strip, no parse to guard. Your TypeScript autocomplete knows `object.sentiment` is one of three strings before the model has even run.

## Provider abstraction: swap vendors on one line

Look back at the last three examples. One used `openai('gpt-5')`, another `anthropic('claude-opus-4-8')`. That's the *only* thing that changed. Same `generateText`, same `tool`, same `generateObject`. The SDK normalizes the messages, the roles, and the parameters, so switching providers — to dodge an outage, chase a price drop, or A/B two models on the same task — is a one-line edit, not a rewrite.

```typescript
import { google } from '@ai-sdk/google';

const model = google('gemini-2.5-pro'); // was anthropic('claude-opus-4-8')
// every generateText / streamText / tool call below is untouched
```

That's the feature that makes people fall in love, and also the one to be most suspicious of — which brings us to the honest part.

## Where the abstraction leaks

An SDK that hides five providers behind one interface can only expose what all five share, plus whatever escape hatches it bothers to add. So provider-specific features get flattened. When one vendor ships prompt caching, a novel reasoning-effort knob, or a bespoke content type, you're waiting on the SDK to surface it — and until it does, you either reach for a provider-specific option field (if there is one) or drop down to that vendor's own SDK. The unified interface is a lowest-common-denominator by construction, and the denominator is where the leaks live.

Two more costs worth naming plainly. You've taken on a dependency in a field that reinvents itself every few months, so the SDK churns and you're along for the ride — breaking changes, renamed exports, moving best practices. And the abstraction can let you ship without understanding the raw API underneath, which is fine right up until something breaks in a way the SDK doesn't explain, and now you're debugging a stream you never learned to read. Know the layer under you well enough to drop to it when the top one lets you down.

![Raw fetch versus the SDK for the same feature set: on the left, hand-parse the SSE stream, hand-roll the tool loop, write per-provider code, and hope the JSON is valid; on the right, an async iterator, tools as data, schema-validated output, and a one-line provider swap.](/writing/ai-sdk-raw-vs-sdk.svg "Same four features. Left: the glue you write by hand against raw fetch. Right: the glue the SDK already wrote.")

## What it actually buys you

Weigh it honestly and the trade is lopsided for most apps. On raw `fetch` you own an SSE parser, a tool-calling state machine, a JSON-validation gauntlet, and a separate code path per provider — call it 200 lines of glue that has nothing to do with your product and every opportunity to be subtly wrong. On the SDK you own a model string, a schema, and a function. The cost is a dependency and a slightly leaky ceiling.

So the framing that matters: the SDK doesn't make the model smarter. It can't — the intelligence lives in weights you don't control. What it does is delete the 200 lines of streaming, retry, and JSON-parsing glue between you and that intelligence, so the code you keep is the code that's actually yours. Reach for the SDK for the plumbing, keep the raw API in your head for the day the plumbing leaks, and spend the afternoon you saved on the part only you can build.
