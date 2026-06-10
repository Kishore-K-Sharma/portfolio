---
title: "Distributed Tracing With OpenTelemetry: Stitching One Request Back Together"
description: "A slow request crosses five microservices and you have five log streams that don't talk to each other. This is how OpenTelemetry traces turn 'somewhere it's slow' into 'the inventory service's DB call took 1.74s on this exact request' — including context propagation, sampling, and the gotchas that split your trace in two."
date: "2026-05-27"
tags: ["opentelemetry", "distributed-tracing", "observability", "microservices", "spring-boot", "kafka", "grafana"]
---

A support ticket lands on a Tuesday. "Checkout is slow." No stack trace, no error, no 500. The request returned a perfectly cheerful `200 OK`. It just took six seconds, and the customer is now annoyed.

So you do what you've always done. You open the API gateway logs, find the request, copy the timestamp, and grep for something near it in the order service logs. Then payment. Then inventory. Then notifications. Five terminal tabs, five clocks that are slightly out of sync, and a growing certainty that the log line you actually need got sampled out an hour ago. You squint at the gaps between timestamps and try to build a story in your head about where the six seconds went.

That isn't debugging. That's archaeology with a worse success rate.

The problem isn't that you lack data. You have *too much* of it, sitting in five disconnected piles with nothing tying them together. What you're missing is the thread: the one identifier that says "all of these log lines, across all of these services, belong to the same request." That thread is what distributed tracing gives you. A trace turns the vague complaint "somewhere it's slow" into something you can act on, like *the inventory service's `SELECT ... FOR UPDATE` took 1.74 seconds on this exact request, blocked on a row lock.*

Good debugging has always come down to the same moves. Reproduce, read the error, divide and conquer. But "divide and conquer" quietly assumes you can find the halfway point, and when the system you're dividing is spread across a dozen containers, where exactly is the middle? That's the question distributed tracing answers. You don't bisect by hand. The trace already did it for you.

## The mental model: traces, spans, and the waterfall

Forget the jargon for a second. Picture a single request with a GPS tracker on it, and watch it move through your system. It enters at the gateway, hops to the order service, which calls payment, which calls inventory, which runs a database query, then publishes a Kafka event that wakes up the notification service. The full journey of that one request, every hop and every wait, is a trace.

Each individual stop on that journey is a span. A span is one unit of work: an HTTP handler running, a JDBC query executing, a Kafka publish, a call to Redis. It has a name, a start time, a duration, and a parent. Spans nest. The gateway's span is the root, the order service's span is its child, the DB query is a grandchild. Draw them on a timeline and you get a waterfall, bars stacked by parent and child, each bar's length showing exactly how long that piece took in wall-clock time.

![A trace rendered as a waterfall: a root api-gateway span containing nested child spans for order, payment, and inventory services, with the inventory database span highlighted in red as the slow one.](/writing/distributed-trace-waterfall.svg "One trace as a waterfall — the slow database call is the one red bar, not a mystery.")

The first time you see your own request rendered this way, the six seconds stops being a fog. You watch the payment span finish in 120ms, and then there's one fat bar (inventory, 1.78s) with a child DB span eating almost all of it. The bottleneck has coordinates now.

What makes the waterfall possible across service boundaries is the trace id. Every span in that journey carries the same one. The gateway generates it on the way in, and it gets handed off, service to service, all the way down. That handoff is the whole game, and it has a name: context propagation.

## Context propagation: the one header that does all the work

When the order service makes an HTTP call to the payment service, it sends more than the request body. It also sends a header called `traceparent`, defined by the [W3C Trace Context](https://www.w3.org/TR/trace-context/) standard. It looks like this:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

That's four fields packed together: a version, the trace id (the shared thread), the parent span id (so the child knows who its parent is), and trace flags that say whether it's sampled. The payment service reads that header, sees it's part of an existing trace, and creates its new span as a child instead of starting fresh. Same trace id, new span id. Repeat at every hop and the whole journey stays stitched into one waterfall.

![A diagram showing the traceparent header carried over HTTP from order-service to payment-service, then through a Kafka message header to inventory-service, with the same trace id preserved across all three.](/writing/trace-context-propagation.svg "The trace id rides along in a header — over HTTP and through Kafka message headers — so every span stays on one trace.")

HTTP is the easy case. The harder one is asynchronous hops. When the payment service publishes a Kafka event and the notification service consumes it later, there's no HTTP header to ride along on. So the trace context has to be injected into the Kafka message headers on the producer side and extracted on the consumer side. Kafka records carry arbitrary headers for exactly this kind of thing, and the OpenTelemetry Kafka instrumentation does the inject and extract for you. Get it right and your async consumer's spans land on the same trace as the request that triggered them. Get it wrong (we'll come back to this) and your trace silently splits in two.

## Why OpenTelemetry specifically

There are vendor agents that do tracing, and they work beautifully. They keep working right up until you've quietly welded your entire observability story to one company's pricing page, and then the renewal email arrives. The thing that was free to adopt turns out to be expensive to leave.

OpenTelemetry (OTel) is the vendor-neutral standard, and it exists to defuse exactly that trap. You instrument your code *once*, against the OTel API, then export the data wherever you want: Grafana Tempo, Jaeger, or a commercial backend if finance is feeling generous. Switching backends becomes a config change instead of a re-instrumentation project. If your stack already runs on Grafana for metrics and dashboards, pairing it with Tempo for traces means one UI and a link straight from a spiking latency panel to the exact request that caused it. The wire format (OTLP, the OpenTelemetry Protocol) is the same no matter where it lands. No lock-in, which is most of the reason to bother.

## How you actually get it on a Spring Boot service

The part that surprises people: on a Spring Boot app you get HTTP, JDBC, and Kafka spans with zero code changes. The OpenTelemetry Java auto-instrumentation agent attaches as a `-javaagent` and instruments the libraries it recognizes at class-load time.

```bash
java \
  -javaagent:/opt/otel/opentelemetry-javaagent.jar \
  -Dotel.service.name=inventory-service \
  -Dotel.traces.exporter=otlp \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
  -Dotel.traces.sampler=parentbased_always_on \
  -jar inventory-service.jar
```

That's it. Spin it up and your Spring MVC handlers, every JDBC statement, your `RestTemplate` and `WebClient` calls, and your Kafka producers and consumers all emit spans, with `traceparent` propagation already wired across them. The traces flow over OTLP to a collector, which fans them out to Tempo or Jaeger.

What the agent *doesn't* know is your business logic. It sees that a JDBC call took 1.74s. It has no idea that call was "reserve stock for order." So for the operations that matter to you as a human, you open a manual span. The cleanest way in Java is the `@WithSpan` annotation:

```java
import io.opentelemetry.instrumentation.annotations.SpanAttribute;
import io.opentelemetry.instrumentation.annotations.WithSpan;

@Service
public class StockReservationService {

    @WithSpan("reserveStock")
    public Reservation reserve(@SpanAttribute("order.id") String orderId,
                               @SpanAttribute("sku") String sku,
                               int quantity) {
        // ... business logic; the JDBC span below nests under this one ...
        return repository.lockAndDecrement(sku, quantity);
    }
}
```

Now your waterfall has a span literally named `reserveStock`, with the `FOR UPDATE` query nested beneath it, instead of a naked JDBC bar floating in the void. When you need finer control (adding events, recording exceptions, setting status), drop to the tracer API directly:

```java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;

Span span = tracer.spanBuilder("settleInvoice").startSpan();
try (var scope = span.makeCurrent()) {
    span.setAttribute("invoice.amount_cents", amountCents);
    span.setAttribute("payment.provider", "stripe");
    settle(invoice);
} catch (PaymentDeclinedException e) {
    span.recordException(e);
    span.setStatus(StatusCode.ERROR, "declined");
    throw e;
} finally {
    span.end();
}
```

`recordException` plus an error status is what makes this span show up red in Tempo, and it's also what tail sampling keys off later.

## And on the Node/Nest side

Picture a setup where the backend services are Spring but the gateway out front is Node, which is a perfectly normal mixed-language reality. There's no `-javaagent` to lean on here. Instead you initialize the OTel SDK before anything else loads. The pattern is a small bootstrap file you require *first*, and "first" is doing a lot of heavy lifting in that sentence. Load it late and half your instrumentation never attaches at all:

```typescript
// tracing.ts — must be imported before the app
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new NodeSDK({
  serviceName: "api-gateway",
  traceExporter: new OTLPTraceExporter({ url: "http://otel-collector:4317" }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Then `node -r ./tracing.js dist/main.js`. The auto-instrumentations cover HTTP, Express and Nest, your database, and your Kafka clients. The same `traceparent` header the gateway emits is the one your Spring services read. That's the whole point of a shared standard.

## The gotchas nobody warns you about

**The trace splits in two.** This is the most common heartbreak by a wide margin. Auto-instrumentation propagates context within a request's thread. The moment your code hops to a different thread, though (a `@Async` method, a custom thread pool, a `CompletableFuture` running on a pool the agent didn't wrap) the current context doesn't follow, and the span you create over there starts a brand-new trace. Same story with Kafka if the instrumentation isn't injecting headers on the producer side. You end up with two traces that are obviously the same request, orphaned from each other, and now you've got a problem. The fix is to propagate context explicitly across the boundary (OTel ships context-wrapping helpers for executors) and to verify your Kafka producer and consumer instrumentation is actually active. When a trace looks suspiciously short, ask whether it crossed an async boundary right where it ends.

**High-cardinality attributes blow up your bill.** A span attribute like `http.route = /orders/{id}` is fine, because it has a handful of distinct values. An attribute like `order.id = 8f3a...` has millions, one per order, and if your backend indexes it, your storage and query costs detonate in a way you'll get to explain in a meeting. Trace backends are not databases. Treat unbounded values as payload you read on a specific span, never as something to index across all of them.

**Naive sampling drops the exact trace you needed.** You can't keep every trace at scale. Too much data, too much money. So you sample. The naive approach is head sampling: at the very start of the request, flip a weighted coin and keep, say, 5% of traces. Cheap, simple, and the cruelest possible default, because the decision gets made *before anything has happened*. The rare request that errored or took six seconds had the same 5% chance of being kept as every boring success. You go looking for the trace behind an incident and find the coin came up tails. It works perfectly until it doesn't, which is always during an incident.

**Tail sampling** flips the order around. You buffer the full trace, wait until it's complete, and *then* decide based on what actually happened: keep 100% of traces with an error, 100% of anything over 1s, plus a small random sample of the healthy ones for a baseline. This lives in the OpenTelemetry Collector's tail-sampling processor. The trade-off is real, since the collector holds each trace in memory until it's done, which costs RAM and adds a buffering window. Pay it anyway. The whole reason you turned on tracing was to catch the rare slow broken request, and head sampling is optimized to throw exactly those away.

## What belongs on a span (and what absolutely doesn't)

Put on a span the things you'd want to filter or group by during an incident: `http.route`, `http.status_code`, `db.system`, `messaging.kafka.topic`, `order.status`, `tenant.id`, the count of items processed, whether you hit a cache. Bounded, low-cardinality, decision-shaped facts. Set an error status and record the exception on failure, which is what lights the span up red and what tail sampling hunts for.

Do not put PII on spans. No emails, no full names, no card numbers, no auth tokens. Traces fan out to a backend that more people can see than you think, often with looser retention controls than your primary database. A trace is an operational artifact, not an audit log, and that distinction comes back to haunt you the first time legal asks what's in there. Keep unbounded identifiers (raw ids, full URLs with query strings, request bodies) off the indexed attributes. Read them on the one span you're looking at instead of making them queryable across all of them.

## The takeaway

Logs tell you what happened inside one service. Metrics tell you that *something* is slow in aggregate. Neither one tells you the story of a single request as it crosses five services, and that story is exactly what you need when a customer says "checkout is slow" and hands you nothing else.

Set up OpenTelemetry before you need it, not during the incident. Attach the Java agent, initialize the Node SDK, export OTLP to a collector, point it at Tempo or Jaeger, and turn on tail sampling so you keep the traces that hurt. The next time a request goes sideways, you won't be grepping five log streams by timestamp and praying. You'll open one waterfall, find the one red bar, and read its name.
