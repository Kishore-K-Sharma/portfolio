---
title: "Strangler in Practice: Migrating a 12-Year-Old Loan CRM Without Freezing the Business"
description: "You can't shut the kitchen down for six weeks while you remodel — there are still customers eating. Here's how I replaced a legacy CRM piece-by-piece, kept the lights on, and slept at night."
date: "2026-05-08"
tags: ["architecture", "fintech", "migration", "war-stories", "production"]
---

Imagine remodeling a house while the family who lives in it is still cooking dinner every night.

You can't gut the whole place and start over — they need a kitchen tomorrow. But you also can't leave the 1985 wiring in the walls forever. So you do it room by room: build a new kitchen on the side of the house, route the family's dinners through it, then quietly demolish the old one when nobody's eating in it anymore.

That's the **strangler pattern**. You replace a legacy system *piece by piece*, routing traffic through a thin layer that decides — for each request — whether the new code or the old code handles it. New code grows around the old one until the old one has nothing left to do, and you delete it.

![Four panels showing the same house at month 0, 2, 4, and 6: rooms swap from old to new one at a time, the family stays in the house the whole time.](/notes/strangler-house-remodel.svg "Same house, different room each month. The family never stops eating dinner.")

It sounds neat in a blog post. In production, it's a mess of coordination, political conversations, and one piece of wiring that turns out to be load-bearing in a way the original team forgot to document.

Here's how I did it on a 12-year-old loan-origination CRM with no tests, no staging environment, and exactly one person left at the company who knew what the old code did.

## The setup

The system: a Java monolith built in 2014, modified by maybe 40 different engineers across three vendors, currently handling roughly 8,000 loan applications a day. The frontend was a JSP application. The backend was an entanglement of EJB sessions, raw JDBC, and stored procedures. Nobody had run the test suite in three years because it didn't pass.

The mandate: **do not break the loan funnel.** Every minute of downtime was a real number with a rupee sign in front of it.

The reason for the migration wasn't engineering ego. The platform's compliance posture had aged badly — auth, logging, and PII handling all needed to meet a new regulatory bar by a hard date, and the existing code couldn't get there without rewriting the parts that touched data. Once you're rewriting half the code, you're rewriting the system. The question is just how.

## The principle: the new system reaches the user through a facade

The whole pattern depends on a single piece of plumbing: a request-routing layer that sits between users and the application. Every request — every URL, every API call, every mobile app endpoint — passes through it. The facade decides where the request goes.

![Two-stage diagram. Top: all requests flow into a legacy monolith. Bottom: requests pass through a routing facade that sends some paths to the new service and the rest to the legacy system. Over time, more arrows point at the new service.](/notes/strangler-pattern.svg "The facade is the only place that knows about the migration. Everything else stays the same.")

In our case the facade was an Nginx layer with a Lua plugin reading routing rules from a config service. Could have been an API gateway, an Envoy proxy, a tiny custom Node service — the technology doesn't matter. What matters is:

- **Every request flows through it.** No backdoors, no direct calls to the legacy system from anywhere else.
- **Routing rules are config, not code.** Adding or removing a path from the new service is a config push, not a deploy.
- **Rollback is a single config flip.** If `loan/v2/applications` is exploding in errors, flip one switch and it goes back to the legacy handler.

That last point is what makes the whole pattern survivable. Every migration step is reversible in seconds.

## The order: read paths first, write paths last

Here's the rule I follow, in order of risk, lowest to highest:

1. **Read-only endpoints with no side effects.** Listing applications, fetching a profile, getting a status. If you fail, the worst outcome is the user refreshes.
2. **Idempotent writes.** Updating a profile, saving a draft. A duplicate write is annoying but not financially material.
3. **Non-idempotent writes.** Submitting a loan, disbursing funds, sending notifications. The riskiest. These come last because the cost of a bug is real money, not a refresh.

We migrated read endpoints for a full month before we touched a single write. That month felt unproductive — the old system was still doing all the actual work. But it bought us time to find every edge case in the routing layer, the auth handoff, the session management, and a logging gap that turned out to mean the new service couldn't see what the old one was doing.

Skip the read-only phase and you're learning the routing layer's bugs at the same time you're rewriting the loan-disbursement logic. Two unknowns in the same change. Don't.

## The trick: shadow traffic

Before you let the new service own a request, run it in **shadow mode**: the facade sends the request to *both* the legacy system and the new service, returns the legacy response to the user, and compares the two responses asynchronously.

Differences go to a log. You read the log. You fix the new service. You re-run.

For our loan-status endpoint, the first week of shadow traffic surfaced:

- A timezone bug that made application timestamps off by 5h30m for half the records.
- A field that the legacy system returned as a comma-separated string and the new one returned as an array (consumer was a JS frontend that just stringified whatever it got — both technically worked, but the comparison flagged it).
- One legacy endpoint that returned a 500 about 0.4% of the time. **The new service was correct.** The legacy system had a bug everyone had quietly papered over for six years.

You don't find these in unit tests. You find them by replaying real production traffic against both systems and watching what diverges. Shadow mode is the QA strategy that pays for itself.

![A request enters the facade, gets sent to both the legacy and the new service; legacy's response goes back to the user, new service's goes into a diff log. Below: three real diffs found this way — a timezone bug, a CSV-vs-array shape, and a 0.4% legacy bug nobody knew about.](/notes/strangler-shadow-traffic.svg "Real production traffic finds the bugs your tests cannot.")

## The cutover: feature flag with seconds-to-rollback

Once shadow comparison is clean for a week and your error budget allows, you flip the routing rule for a small percentage of traffic — say, 5%. The other 95% still goes to legacy.

You watch the dashboards. Latency, error rate, business metric. If anything looks wrong, you flip back. **The whole point of this stage is that flipping back has to be cheap.**

If your dashboards are clean, you ramp: 25%, 50%, 100%. Spread it across days, not minutes. The bugs that show up at 100% are usually load-related, and you want to find them while you can still ramp down.

The longest migration I ran took four months from "first read endpoint shadowed" to "100% of writes on the new service for that one feature." Not because the engineering was hard — most of the engineering was done in week three. The other thirteen weeks were *waiting* — for shadow comparisons to be clean, for ramps to soak, for the next feature to be ready, for the right window in the business calendar to risk a cutover.

Migration is a patience problem dressed up as a code problem.

![A bar growing from 5% on day 1, to 25% on day 3, to 50% on day 7, to 100% on day 14, with a dashed rollback arrow indicating any metric can return the routing to the previous step.](/notes/strangler-cutover-ramp.svg "Ramp over days, watch the metric, hold a rollback in reserve at every step.")

## The political part nobody puts in the blog post

The legacy system has owners. They wrote it; they maintain it; they have opinions about it. Some of those opinions will be: *"this works. Why are you replacing it? You don't understand the business rules."*

Sometimes they're right. The legacy code has six years of bug fixes, edge case handling, and policy decisions encoded in conditionals. The new code, if it doesn't preserve them, is going to break something the new team has never heard of.

The strangler pattern is, partially, a way to handle this politically.

- The legacy system is the **source of truth** until it isn't. The new code has to prove itself with shadow comparisons before it gets to handle real users.
- The legacy team isn't being replaced — they're being **paired with**. Their knowledge of why the code does what it does becomes the input to the migration spec.
- Nothing gets deleted until **the metric stays green for N days**. Pick the N. Hold the line. Don't let "we migrated it last sprint" mean "delete the old code today" — let it mean "the old code goes into deletion review in 30 days if the new one is still healthy."

In our case, the legacy team became the migration's QA. They knew which corner cases to throw at the new service. They wrote the comparison rules. By the time we cut over, they were as invested in the new code working as the migration team was.

## The metric that actually matters

Throughout the whole migration, we tracked one number: **end-to-end loan submission success rate**. Not test coverage. Not lines of code migrated. Not number of endpoints on the new service. Just: did the user who started filling out an application get to a "submitted" state?

That number went *up* during the migration — from about 96.4% to 98.1%. Not because the new code was better; mostly because the routing layer surfaced existing legacy errors that nobody had been measuring. Three of the bugs we fixed in the legacy system during the migration had been losing applications for years.

If your migration doesn't move a user-facing metric, you're rewriting code for the satisfaction of having rewritten code. The strangler pattern works when there's a number that's allowed to embarrass you.

## TL;DR

- Build a facade that every request passes through. Routing is config, not code.
- Migrate **read** paths first, **idempotent writes** next, **non-idempotent writes** last.
- Run **shadow traffic** before cutting over. Real production traffic finds bugs your tests can't.
- Cutover ramps over **days**, not minutes. Rollback is a single flip.
- Don't delete the legacy code on the day you cut over. Wait for the metric to stay green.
- Migration is a patience problem. Plan in weeks, not sprints.

You don't replace a legacy system. You grow a new one around it until the old one has nothing to do. Then you let it starve.
