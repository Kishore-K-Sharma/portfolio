---
title: "Vibe Coding Has a Ceiling: Why Taste Matters More Than Ever"
description: "Anyone with Cursor and an afternoon can ship a prototype. The gap between that and a production system isn't speed — it's the judgment to know what's actually right. The case for taste as the 2026 differentiator."
date: "2026-05-24"
category: "career"
tags: ["career", "ai", "agents", "engineering-leadership", "craft"]
---

The cost of *getting from idea to running prototype* fell by an order of magnitude in three years and isn't coming back up. The cost of *getting from prototype to a system humans rely on* did not. The gap between those two numbers is the thing that pays your salary now.

That gap is mostly taste — the accumulated judgment about what's actually right, which lines to draw where, what to refuse to add. Taste was always valuable. In 2026, with the cheap-prototype half automated, taste is the *only* thing that compounds.

## Define "vibe coding" honestly

The term itself is loose. The useful definition: writing code where you describe what you want at a high level, let the agent draft it, accept what looks right, and move on. Minimal review of the generated code. Trust the vibes.

For some work, this is the correct mode. For other work, it's a way to ship a tire fire. The question isn't whether vibe coding is good or bad. It's *where* it works and where it hits a wall.

![A two-column matrix. Left "Works here": prototypes (no consequences if thrown away), internal scripts (blast radius = you), demos and weekend hacks (nobody deploys), learning a new framework (only your time). Right "Breaks here": prod systems (wakes you at 2am), security paths like auth/payments/PII (breach, fines, firing), team code others modify (compounding confusion), load-bearing infra (everyone inherits your debt). Footer: the tool isn't the problem; using it where the blast radius is wrong is.](/writing/vibe-coding-where-it-breaks.svg "Vibe coding is brilliant in the left column and dangerous in the right. The skill is knowing which column you're in.")

The pattern: vibe coding's failure mode is *delayed and externalised*. A working prototype on Saturday becomes a production incident in November when the agent's plausible-but-wrong concurrency handling meets your second customer. By then the original author is on a different project and "it worked when I shipped it" is technically true and operationally useless.

## Where the ceiling actually is

The ceiling isn't a wall the agent hits. The agent is happy to keep generating. The ceiling is the point at which *nobody on the team has the context to know whether what was generated is right.* That happens fast in production code, and it happens silently — there's no error, no failed test, just a system that's drifting.

The specific places it shows up:

- **Production reliability.** The agent writes code that handles the happy path beautifully and the four edge cases that appeared in its training data. It does not write code that handles the fifth edge case — the one specific to *your* system, your data shape, your concurrency model. That fifth edge case is the one that pages you.
- **Security.** The agent writes the SQL query. The query is parameterised — usually. The HTTP endpoint has an auth check — usually. "Usually" is not a security posture. Someone has to actually verify.
- **Maintainability.** Each agent draft is internally consistent and externally inconsistent with the previous twelve drafts. Three months in, the codebase looks like ten different engineers wrote it, because in effect ten different engineers did — the same agent, ten different vibes.
- **Team scale.** One engineer can vibe-code a working service. Three engineers vibe-coding the same service produce three different mental models of how it works. The first time a critical bug needs a coordinated fix, the team discovers nobody really owns the code.

None of these are agent failures. They're absence-of-taste failures, and they happen when the cheapness of generation tempts people to skip the part of the job that taste is for.

## What taste actually is

Taste is the wrong word in some ways — it sounds like an aesthetic preference, optional, learned in art school. In engineering it's more like *calibrated pattern recognition for what breaks in eighteen months*. It's mostly invisible until something goes wrong, at which point it's the difference between "we saw this coming" and "we didn't."

The decisions taste shows up in, ranked roughly by consequence:

![A pyramid stack of five layers labelled 05 to 01 from top to bottom. 05 Code style (names, formatting) — easy to fix, lowest consequence. 04 Error handling — fixable but painful, wake-up-at-3am class. 03 API + data model — expensive to reverse, years of tech debt if wrong (highlighted). 02 Dependency + boundary choices — rarely reversible, shapes every future decision (highlighted). 01 What to build / when to not add a feature — foundational, no refactor fixes the wrong product (highlighted).](/writing/taste-stack.svg "The lower in the stack, the more taste matters. The agent is most helpful at the top. The decisions that matter most for the next five years are at the bottom.")

The discomfort, if you're a strong coder who took pride in implementation craft: the lower layers — *what to build, what to depend on, what boundary to draw* — are where senior engineering value now concentrates. The top layer, where craft showed up most visibly, is where the agent is most capable. The unflattering reading is that we used to over-weight the visible top of the stack because the rest was invisible to most people.

## How to develop taste deliberately

Taste isn't innate and it isn't gained from watching tutorials. It's mostly accumulated from three habits:

1. **Read a lot of other people's code, especially the code you disagree with.** Find a codebase you initially think is wrong-shaped and try to reconstruct *why* the authors made the choices they did. Often you'll discover constraints you didn't know existed. Sometimes you'll confirm it was wrong-shaped. Both teach.
2. **Do real code review.** Not "looks good to me" review. Real review — write a comment on every PR you touch that takes a position. Be wrong sometimes. The act of forming a position and getting feedback on it is how calibration improves.
3. **Write postmortems and read everyone else's.** The cheapest way to learn what breaks in eighteen months is to read other people's accounts of what broke in eighteen months. Most companies sit on this gold; if yours does, start the practice. If they share publicly, read them weekly.

A common piece of advice I'd push back on: *"just build more projects."* You can build a hundred greenfield side projects and never develop taste in the layers that matter, because greenfield work never tests the long-arc consequences of your choices. The teacher is *time spent maintaining and modifying code other people wrote*, especially code that's been deployed for years and has the scar tissue to prove it.

## Why this is good news for careers

The cheerful version of this argument: *taste is the most career-durable skill you can develop right now.*

![A line chart with two curves over a career timeline (Year 1 → Year 15+). Red dashed curve "Coding speed" rises fast in the first three years then plateaus low — labeled "commoditised by AI." Solid purple curve "Taste" starts slow, accelerates around year 5, and continues rising sharply through staff/principal levels — labeled "compounds · durable · yours." Footer: coding speed is now a two-year asset; taste is a twenty-year one.](/writing/taste-compounding-curve.svg "Coding speed used to keep compounding. Now it plateaus. Taste still compounds — and is harder than ever to substitute for.")

Until a few years ago, raw coding speed compounded with experience: a senior with ten years' practice was meaningfully faster at writing code than a junior. That curve has flattened — a junior with a good agent now writes a competent first draft about as fast as a senior. The compounding skill is no longer "I write code faster"; it's "I know which code is worth writing." The agent doesn't reduce the value of that judgment. It increases the gap between people who have it and people who don't, because more code is now being produced without any of it applied.

The unhappy implication for anyone who has spent their career being "the fast coder": that lever is shorter than it used to be. The happy implication for anyone who has put in the years to develop judgment on what to build and how to draw boundaries: that lever just got considerably longer.

## The honest pushback

A few places this argument over-reaches and shouldn't be taken too literally:

- **Sometimes vibe coding is the right call in prod too.** A throwaway admin tool used by three internal users for two weeks doesn't deserve the taste budget of a payments service. Match the rigour to the blast radius; don't apply senior-engineer ceremony to junior-stakes work.
- **Taste without speed isn't valuable either.** The engineer who takes three weeks to design what someone else ships in three days has the wrong calibration about cost-of-time. Taste is *applied judgment under realistic constraint*, not paralysis dressed up as care.
- **The dichotomy is overdrawn.** In practice, good engineers vibe-code the easy 80% and slow down on the consequential 20% in the same PR. The skill is recognising which sentence you're writing as you write it.

## The shortest version

- Vibe coding works brilliantly for prototypes, scripts, demos, learning. It breaks in production, security paths, team code, and load-bearing infra. The tool isn't the problem; using it where the blast radius is wrong is.
- The ceiling isn't where the agent stops generating. It's where nobody has the context to know whether what was generated is right.
- Taste is calibrated pattern recognition for what breaks in eighteen months. It shows up most in the lower layers: what to build, what to depend on, what API to commit to.
- Develop it deliberately: read code you disagree with, do real code review with positions, read postmortems weekly. Greenfield side projects don't teach the layers that matter.
- Coding speed used to compound; it now plateaus. Taste still compounds and gets more valuable as agent-generated code volume grows.
- The argument doesn't say "AI is bad" — it says match the rigour to the blast radius and recognise which 20% of the PR deserves the senior treatment.

The career bet that pays off in 2026 isn't getting better at writing code faster. The agent already won that race. The bet that pays off is getting better at the half-second judgment about which line should be written at all — and being the person on the team that other engineers ask before they ship the consequential ones. That's a position the agent doesn't compete for.
