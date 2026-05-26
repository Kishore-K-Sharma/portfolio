---
title: "Staying Senior in the AI Era: What Career Growth Looks Like When the Junior Tasks Are Automated"
description: "If a junior can ship a feature in a day with Claude Code, what's the senior engineer actually for? The skills that get you promoted in 2026 — and the ones that quietly stopped counting."
date: "2026-05-25"
category: "career"
tags: ["career", "ai", "engineering-leadership", "agents"]
---

A staff engineer on a team I worked with said something quietly devastating last quarter: *"I'm not sure what I'm being paid for anymore. The juniors are shipping more lines of code than I am, with the agent's help. Their PRs aren't great, but the volume is real."*

He's a good engineer. He's also asking the right question. If the work that used to require a senior — the careful CRUD, the well-shaped service skeleton, the considered refactor — can now be drafted by a junior with an agent, then the senior role has to be *something else* to be a role at all.

This post is about what that something else is, and what to stop doing if you want to grow into it instead of getting overtaken by it.

## The displacement is real — but it's selective

The work that AI displaces well is the work that has a known shape. Translate a ticket to a service. Write the tests. Wire the form. None of it required a senior in the first place — it just took time, and seniors did it because juniors were slower at it. With agent assistance, juniors get fast at it. That layer of the work is no longer a senior signal.

What hasn't been displaced — and won't be soon — is the work where the shape is *not* known. What should we build? Is this the right boundary? Why is this design going to bite us in eighteen months? Those questions don't have a corpus to imitate. They require judgment built from years of watching systems fail in ways you didn't predict.

## Which skills got repriced

The market value of every individual skill in the senior toolkit moved in the last two years. Some up, some down. Be honest about which ones you've been leaning on.

![A two-column "skill repricing" board. Left "More valuable": problem framing, taste (knowing what good looks like), code review as the gating skill, system design (leverage compounds), eval design, mentorship for humans and agents. Right "Less valuable": hand-rolling boilerplate CRUD, memorising syntax/framework APIs, solo deep-focus coding marathons, "senior who only writes code," lines-of-code productivity, encyclopedic stack-specific knowledge. Footer: right side was your job. Left side is your job. The gap is the next two years.](/writing/senior-skills-up-down.svg "Six skills moved up, six moved down. The ones moving up are the ones AI doesn't substitute for.")

The painful one to internalise: *"I'm the person on the team who can write this from scratch faster than anyone else"* is no longer the moat it was. Speed at writing first drafts is a commodity now. Speed at deciding whether the first draft is the right thing, and where it'll break, is the new scarce resource.

## Where the hour actually goes

If you graphed where my hour went four years ago against where it goes now, the change is stark. The "writing code" slice halved. The "reviewing code" slice more than doubled. The "designing and framing" slice grew. The slice for *the parts of the job that justify the title* got bigger, not smaller.

![A horizontal bar chart split into "Before ~2022" (writing code 55%, reviewing/reviewing 15%, meetings 15%, design 10%, mentoring 5%) and "After 2026" (reviewing AI + human PRs 35%, writing code — smaller, harder — 20%, design + framing + mentoring + evals 45%).](/writing/senior-hour-before-after.svg "The writing slice halved. The reviewing slice doubled. The design/mentoring slice grew. If your hour still looks like the top bar, that's the gap.")

The code you do write is smaller and harder. The boilerplate is gone (an agent does it). What remains is the gnarly twenty lines that nobody on the team is sure how to write — the concurrency-sensitive bit, the security-sensitive edge case, the legacy interop. You write less and it matters more.

## What to stop doing

A few things that used to be senior-coded behaviour and now actively work against you:

- **Locking yourself in a focus block to "just bang it out."** What you would have shipped in three hours, a junior can ship in one with an agent. If you spend three hours doing what a junior can do in one, you weren't being senior; you were being slow. The senior version of that block is spent reviewing six PRs and unblocking three people.
- **Skipping code review because it's "below your level."** Code review is the highest-leverage senior activity in 2026. Every review is teaching, gating, and pattern-setting at once. The senior who ducks reviews is opting out of the part of the job that scales.
- **Hoarding context.** When you're the only one who knows how the billing system works, you become a bottleneck and a single point of failure — *and* an agent can't help anyone else work in that area because the context isn't written down. Write the doc. Record the loom. Make the system legible.
- **Measuring yourself in lines or PRs shipped.** Useful metric for juniors. Misleading for seniors and actively harmful for staff. The right denominator is "did the team's output go up because I was on it." That's leverage, not output.

## What to start doing

- **Treat evals as a senior skill.** Anyone can write code with an agent. Far fewer people can design the eval that proves the code actually works — for AI features and for everything else. Build the eval first; it forces clarity about what "correct" means and it catches the agent's tendency to write internally consistent but externally wrong code. See [Evaluating LLM-Generated Code in CI](/writing/evaluating-llm-generated-code-in-ci) for the longer version.
- **Lead with problem framing in PRs.** Before writing or reviewing code, write three lines: what problem are we solving, what's the smallest version of the solution, what are we deliberately not changing. This used to be optional. It's now the highest-value senior contribution because it's the part the agent can't do for you.
- **Mentor agents and humans on the same axis.** A good prompt is a good brief; a good brief is a good mentoring conversation. The same skill — articulating intent precisely, anticipating misreads, building in feedback loops — works on both. Treating these as the same skill compounds your practice.
- **Build platforms, not features.** A feature ships once. A platform ships every time a teammate uses it. With agents accelerating individual feature work, the leverage premium of platforms went up, not down.

## How promotion criteria actually shifted

The promotion case I see working in 2026 lives on three axes, and "shipped a lot" is on none of them.

![Three side-by-side cards. Card 1 "Leverage — did your work multiply others?" with examples: platforms used by other teams, evals that prevented regressions, tooling that cut PR cycle time. Card 2 "Judgment — did you kill the wrong work?" with examples: scoped down a feature that should have been smaller, said no to an AI refactor that wasn't worth it, spotted the design flaw at PR time. Card 3 "Multipliers — did you make others better?" with examples: code reviews that taught not just graded, docs that the team actually opens, someone got promoted because of your mentoring.](/writing/promotion-axes-2026.svg "Three axes. Output without leverage stopped scoring. Show the leverage explicitly when you write the case.")

The practical implication: keep a running log of *who used your work and what it unblocked*. Not "I built X" but "I built X, three teams now use it, here's the cycle-time delta." Promotion committees can't reward leverage they can't see, and most engineers don't tell that story explicitly because it feels self-promotional. Tell it anyway.

## The skills that compound across both eras

A small set of skills appreciate regardless of which way the AI weather blows:

- **Writing.** Clear writing is clear thinking is good architecture is good mentorship. It's also the lever for almost every other senior activity (PR descriptions, design docs, prompt briefs, postmortems). Practice it deliberately.
- **Architectural taste.** The ability to look at a design and feel where it'll be brittle in two years. Hard-won, hard to fake, doesn't get cheaper.
- **Persuasion.** Half of senior work is convincing other engineers (and PMs and execs) of something. The skill of changing minds without authority compounds harder every year of your career.

Notice none of those are technology-specific. That's the point. The half-life of "I'm great at Kubernetes" keeps getting shorter; the half-life of "I can write a one-pager that gets a room to align" stays infinite.

## The honest catch

This shift isn't comfortable. A lot of what made me feel competent five years ago — the satisfaction of writing a clean implementation in a focus block, the pride of being the person who knew the codebase end-to-end — is being repriced downward. The skills going up are quieter, harder to measure, and don't produce a dopamine hit at the end of the day. You have to learn to feel competent about *leverage* instead of *output*, and that's a real adjustment, not a slogan.

## The shortest version

- The displaced work was the work juniors couldn't do fast yet. Agents made them fast at it. That layer of the senior role is gone.
- Six skills moved up in value (problem framing, taste, code review, system design, eval design, mentorship). Six moved down (boilerplate, syntax memory, solo marathons, "senior who only codes," LOC metrics, stack trivia).
- The hour shifted. Writing code halved; reviewing and designing more than doubled. If your hour still looks like 2022, that's the gap.
- Stop: focus-block boilerplate, skipping reviews, hoarding context, measuring in PRs shipped.
- Start: evals as a habit, problem-framing in every PR, mentoring agents and humans on the same axis, building platforms instead of features.
- Promotion lives on three axes: leverage, judgment, multipliers. Track them explicitly because committees can't reward what they can't see.
- Compounding skills: writing, architectural taste, persuasion. None of them are technology-specific.

The work that justified the senior title in 2022 was always supposed to be the leverage work, the judgment work, the multiplier work. AI didn't take the senior job; it took the *substitute* work that seniors were also doing because juniors were slower at it. The actual senior job is more available now than it's ever been — but only if you let go of the substitute.
