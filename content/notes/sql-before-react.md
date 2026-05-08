---
title: "Why I Write the SQL Before the React: A Backend-First Delivery Loop"
description: "If you wouldn't pour the foundation after the roof, why do we keep building UIs before we know what data lives behind them? A case for designing the schema first — not because backend matters more, but because it's the part that can't be undone."
date: "2026-05-08"
tags: ["delivery", "architecture", "backend", "process"]
---

If a builder showed up to your construction site, looked at the blueprints, and started with the roof, you'd send him home.

![Two houses side by side: the right one has foundation → walls → roof labelled SQL → API → UI; the left one has the roof first floating in the air with dashed lines pretending to support it.](/writing/foundation-roof.svg "UI is the roof — the part you see — but not the part you build first.")

The roof is what people see. The roof is what gets photographed. The roof is, in some real sense, the *point* of the house. But you can't put a roof on air. You build the foundation, then the walls, then the roof — not because the foundation is more important, but because everything else depends on it being right.

In software, the equivalent of "build the roof first" is *"design the screens first, then figure out the backend."* It's the most common delivery pattern I see in product teams. It's also the one that costs the most to get wrong.

I'm not arguing the backend matters more than the UI. The user doesn't see the schema. They see the screen.

I'm arguing the backend is the part that can't be undone — and that this asymmetry should change the order you build things.

## The asymmetry

If a designer ships the wrong button color, you change the CSS. Half a day, no migration, no downtime, no email to legal.

If a backend ships the wrong table structure — say, a `user` table that conflates *people* and *accounts*, or an `order` table that doesn't have a status column because nobody asked — you live with it for years. You bolt on a `user_account` join table. You add a `status_v2` field next to `status` because changing `status` would break six downstream consumers. You write migrations on a Saturday. You explain to the new engineer why we have two ways to represent the same thing.

The cost of getting the data model wrong is paid in *every future change to that data*. The cost of getting the UI wrong is paid once.

This is why I write the SQL first.

![A three-row diagram showing data flowing from schema to API to UI; below, a contrast row where someone has tried to derive the schema from the UI and gotten a confused, redundant data model.](/writing/schema-first.svg "When the schema comes first, the UI is a view. When the UI comes first, the schema is a confession.")

## What "SQL first" actually looks like in practice

It does not mean opening pgAdmin before you've talked to a designer. It means: before you draw a single React component, you have answered four questions in writing.

1. **What entities exist?** Not "what screens exist" — what nouns. *Application*, *applicant*, *document*, *underwriter*. If you can't name them, you don't understand the work yet.
2. **What are the relationships?** One application has many documents. One applicant can be on many applications (or can they?). The cardinalities are where the design lives — and where the lazy answer ("we'll figure it out") becomes a $30,000 migration in eighteen months.
3. **What does each entity's lifecycle look like?** What state can it be in, what triggers transitions, who is allowed to make them? An *application* is `draft → submitted → approved → disbursed → closed` — but is it also `cancelled`? `expired`? `partially_disbursed`? The states you forget on day one are the states that bug you forever.
4. **What's the source of truth for each field?** If the loan amount can be set by the applicant and overridden by the underwriter, *which one wins*, and *how do you know which value the system is acting on at any moment*? "We'll add an audit log" is not the answer; an audit log is the wrong tool for "I need to know whose number I'm using right now."

Get those four answers, and you have a schema. The schema is *what the system actually is*. Everything else — UI, API, validations, reports — is a view on top of it.

![Four boxes: entities (what nouns), relationships (cardinalities), lifecycle (states + transitions), source of truth (whose value wins). Answer four = get a schema. Answer two = get a migration.](/writing/schema-four-questions.svg "These four questions are the schema, in plain English.")

You can write the SQL before you write the schema, but you'll regret it. The schema is the spec; the SQL is the implementation.

## The argument I get every time

> "But shouldn't *design* drive product? You're saying engineers should design the data model in a vacuum?"

No. I'm saying *the data model should be designed before the screens, by people who include both engineers and designers*.

The pattern that works:

1. **Designer sketches the user flow** on paper (or Figma, doesn't matter). Not pixel-perfect; just "what does the user do, in what order, what do they see."
2. **Engineer extracts the data shape** from the flow. "If the user can filter applications by status, *status* needs to be a queryable field. If the user can see who underwrote it, we need an underwriter relation, and we need to know whether that's one person or many."
3. **Designer and engineer jointly resolve ambiguities.** "Can an application be assigned to multiple underwriters?" "Yes, sometimes." → relationship is many-to-many, not one-to-many. This conversation is *cheap on paper*. It is *expensive in production*.
4. **Engineer writes the schema and the API contract.** Now there's a spec.
5. *Now* the designer makes the high-fidelity screens, and the frontend gets built against the contract.

Steps 1-4 take a week, maybe two. Step 5 takes a month. The week of schema work doesn't slow down the month of UI work — it makes the UI work *faster*, because the developer has a contract to build against instead of a moving target.

I've seen the inverse — schema designed after high-fidelity UI — extend a four-month project to nine. Every screen mockup becomes a negotiation about what's even possible to back. Every "small change" in the design is a migration.

## The real test: can the schema reject a bad question?

A good schema doesn't just *describe* the data. It *constrains* what the application can ask of it. A useful question to ask of any schema you've designed:

> What are the questions a user can ask of this system that I *can't* answer with this schema?

If the user can ask "show me all applications submitted in the last 30 days that are still pending underwriter review," your schema needs `submitted_at` (timestamp), `status` (enum), and a query path that doesn't require scanning the whole table. If the user is going to ask "how does an underwriter's approval rate compare to the team average," you need historical decision data, not just current state.

If you can't list the questions in advance, you'll discover them when a stakeholder asks for a report and you realize your schema can't answer it without a backfill job. The backfill jobs are the migration-on-Saturday I mentioned earlier.

The schema is a *language for asking questions about your system*. Bad schemas can't answer simple questions. Good schemas can answer questions you didn't think of when you wrote them.

## The cost of getting it wrong

A specific story, names blurred.

Early in a project, the team was modeling a content-management system. The UI showed a list of "items," each with a title, body, status, and author. The schema reflected the UI: one `item` table, one row per item.

Three months in, a stakeholder asked: *"can we have draft revisions of an item that the editor reviews before publishing?"*

The right schema would have separated `item` (the logical thing) from `item_version` (a specific version of it) from day one. With that separation, drafts are just versions in `pending` state, the published view shows the latest `published` version, and history is free.

The actual schema had `item.title`, `item.body`, `item.status`. To add drafts, the team:

- Added `item.has_pending_draft` (boolean).
- Added a parallel `item_draft` table that mirrored `item`.
- Wrote a publish flow that copied fields from `item_draft` to `item`.
- Wrote a sync job because the two could drift.
- Spent four months on what should have been a four-week feature.

The bug they're still fighting two years later: occasionally, an editor's draft *partially* publishes — some fields update, some don't — because the publish flow isn't atomic. The audit log can tell you what happened. It can't undo it.

Every line of that is the cost of designing the schema after the UI.

![Top: an item table retrofitted with has_pending_draft + an item_draft mirror table + a non-atomic publish flow + a sync cron — four months of work, partial-publish bugs years later. Bottom: an item table plus an item_version table with status field — drafts and history come for free, four weeks.](/writing/schema-drafts-retrofit.svg "Same requirement. Different build order. Roughly 4× difference in cost.")

## The shortest version

- **Design the schema before the screens.** Not "before the design"; before the *screens*.
- **Build it with the designer, not against the designer.** They're identifying the questions; you're encoding them in a way the system can answer.
- **The schema is a language.** Make sure it can ask the questions your users will eventually want to ask.
- **The UI is fast to change. The schema is slow.** Spend the design time on the slow part.

It's not "backend before frontend." It's "the parts that can't be undone get built first." The frontend is genuinely the part of the product the user sees and judges; that's why the frontend deserves a foundation that can hold its weight.

You wouldn't pour the slab after the roof. Don't ship the schema after the screens.
