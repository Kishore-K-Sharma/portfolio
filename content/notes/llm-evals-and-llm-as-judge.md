---
title: "You Can't Grade an LLM With assertEqual: How to Actually Measure LLM Quality"
description: "LLM outputs are non-deterministic and open-ended, so 'does it pass the test' has no exact-match answer — which means every prompt tweak you ship on vibes is silently regressing cases you never look at. Evals are the fix: a repeatable, quantified measure of output quality, the way unit tests are for code. Here's the taxonomy, how LLM-as-judge works and where it lies to you, and how to wire it all into a regression gate."
date: "2026-08-05"
tags: ["llm", "ai-engineering", "evals", "llm-as-judge", "testing"]
category: "engineering"
---

Here is a claim that should sting a little if you ship anything with an LLM in it: most of the "improvements" you make to your prompts are regressions, and you have no idea, because you graded them by reading three outputs and going "yeah, better." You tweaked the system prompt to fix one annoying case. It fixed that case. It also quietly broke eleven others you didn't re-check, because you can't re-check by hand at scale and you never wrote anything down. Congratulations: you've been doing prompt engineering by feel, which is the AI equivalent of pushing to production and refreshing the page to see if it's still up.

The reason you got away with it in normal software is that code has `assertEqual`. `add(2, 2)` returns `4` or it doesn't; the test is a hard boundary and the boundary is exact. LLM output has no such boundary. Ask a model to summarize a support ticket and there are ten thousand acceptable summaries and no canonical one. Run the same prompt twice and you may get two different-but-fine answers. The question "did it pass the test" has no exact-match answer, and the moment you accept that, you realize you need a different tool than the one you've been using. That tool is **evals**: a repeatable, quantified measure of output quality that plays the role tests play for code.

## Why exact-match dies immediately

The naive instinct is to write `assert output == expected`. This survives contact with reality for about one test case. Models are non-deterministic (temperature, sampling, model updates under you) and the task is open-ended (many right answers). String equality tests the one phrasing you happened to write down, not the quality you actually care about. You'll spend your life updating "expected" strings and learn nothing about whether the system is good.

So you back off from exact match, and you land in a spectrum of eval types, each trading precision for coverage:

- **Reference-based / ground-truth.** You have a gold answer and measure distance to it: exact match for classification and extraction, F1 for span tasks, BLEU/ROUGE for translation and summarization. These are cheap and objective and they work *when the task is narrow enough to have a right answer*. They're brittle the second the output is open-ended — ROUGE will happily score a fluent, correct summary low because it used different words than your reference, and score a word-salad summary high because it overlapped.
- **Programmatic assertions.** The unit tests of the LLM world, and criminally underused. Is the output valid JSON? Does it match the schema? Does it contain the required field and *not* contain a PII pattern? Is it under the latency and cost budget? These are deterministic, near-free, and you should run them on every single output. They don't measure "good," but they catch "broken," and "broken" is a huge fraction of real failures.
- **Human eval.** The gold standard, full stop. A person reads the output and judges it. Everything else in this list is an attempt to *approximate* this without the cost. It's slow, expensive, hard to keep consistent across raters, and impossible to run on every commit — but it's the ground truth the cheaper methods get calibrated against.
- **LLM-as-judge.** A strong model reads the output and scores it against a rubric, approximating human judgment at a fraction of the cost and latency. This is the technique that makes open-ended evaluation actually tractable at scale, and it's also the one with the most footguns, so it gets its own section.

## LLM-as-judge, and its three modes

The pitch is simple: humans are the gold standard but don't scale, so hand a capable model a rubric and let it grade. Done well, judge-model scores correlate strongly with human ratings, which means you can run thousands of them in CI instead of scheduling a human labeling session for every change. There are three modes, and picking the right one matters more than people expect.

![Candidates and a rubric flow into a judge model that reasons before it scores; below, a danger band lists the bias failure modes — position, verbosity, self-preference, rubric sensitivity — and an accent band lists the mitigations: swap order and average, chain-of-thought before the score, and calibrate against human labels using Cohen's kappa.](/writing/llm-evals-as-judge.svg "LLM-as-judge approximates human judgment at scale — but it has real biases, and pairwise comparison plus calibration is how you keep it honest.")

**Pointwise** asks the judge to score one output in isolation: "rate this answer 1–5 on helpfulness." Intuitive, and the least reliable. Absolute scores drift — the model has no stable internal ruler, so a "4" today and a "4" next week may not mean the same thing, and small rubric rewordings move the numbers around.

**Pairwise** shows the judge two outputs, A and B, and asks which is better. This is markedly more stable, because relative judgments are easier and more consistent than absolute ones — the same reason code review is easier than assigning an absolute quality number to a file. Aggregate pairwise verdicts into a **win-rate** ("candidate beats baseline 63% of the time") and you have a metric that's both interpretable and robust. If you take one thing from this section: **pairwise plus win-rate is usually your most stable signal.**

**Reference-guided** hands the judge a gold answer alongside the candidate and asks it to grade against that. This anchors the judgment and helps a lot when you *have* a reference, which makes it a nice middle ground between rigid BLEU/ROUGE and free-floating pointwise scoring.

## Where the judge lies to you

Here's the part nobody wants on the box, and it's the most important part: **an LLM judge is a biased instrument, and if you trust it blind, it will confidently mislead you.** Know the failure modes cold.

- **Position / order bias.** Judges systematically favor the answer in a particular slot — often the first, sometimes the second — regardless of content. Mitigation: run each comparison both ways (A-then-B and B-then-A) and average, or only count a win when it survives both orderings.
- **Verbosity / length bias.** Judges tend to prefer longer, more elaborate answers even when the shorter one is better. If your "improvement" just made outputs wordier, a naive judge will cheer while your users groan.
- **Self-preference.** A model tends to rate its own outputs more highly than a neutral evaluator would. Using GPT to judge GPT's answers against a competitor is a conflict of interest with a p-value.
- **Rubric sensitivity, and gameability.** The score can swing on how you word the rubric, and a motivated optimizer (including you, tuning a prompt to the judge) can learn to please the judge without pleasing a human. Optimizing hard against a judge is Goodhart's law with an API bill.

The mitigations are not exotic. Use a **strong judge model** — a weak judge is a noisy judge. Write a **clear rubric with explicit, separable criteria** instead of a vague "is this good." Make the judge **reason before it scores** — chain-of-thought first, verdict last, so the number is a conclusion rather than a reflex. And the non-negotiable one: **calibrate the judge against a human-labeled set before you trust it.** Hand-label 50–100 examples, run your judge on the same set, and measure agreement (Cohen's kappa is the standard for this). If the judge agrees with your humans, you've earned the right to run it at scale. If it doesn't, you're automating a random number generator, and you'd be better off flipping coins because at least those are unbiased.

## Offline vs. online: two loops, one flywheel

Evals live in two places, and you need both.

**Offline eval** is a fixed, curated eval set — a golden dataset — run in CI *before* you ship a prompt or model change. It's the regression gate: freeze a representative set of cases, run the candidate against them, score, and decide ship-or-block. Because the set is fixed, results are comparable across changes, which is the entire point — you can finally say "this change moved win-rate from 0.58 to 0.64" instead of "feels better."

**Online eval** is production monitoring. You can't curate your way to every real-world input, so you sample live traffic, run judges and guardrails against it, track drift over time, and collect explicit signal — thumbs up/down, user corrections, escalations. The crucial move is what you do with the failures: **route bad production cases back into the eval set.** That's the data flywheel. Every real failure becomes a permanent regression test, so the same mistake can never ship twice, and your offline set gets more representative of reality with every incident instead of slowly rotting into a museum of last year's problems.

![Two loops. The offline loop runs a curated eval set against a candidate prompt or model, scores it, and gates ship-or-block in CI. The online loop samples production traffic, runs judges and guardrails, and catches failures. A flywheel arrow carries those production failures back into the eval set, so the two loops feed each other over time.](/writing/llm-evals-offline-vs-online.svg "Offline gates before you ship; online watches production. The flywheel — real failures becoming new eval cases — is what makes the whole system compound.")

## Building the regression gate

Here's how this becomes real engineering rather than a blog aspiration. **Version your eval set** — it's an asset, it lives in the repo, and it changes under review like any other code. **Treat a prompt or model change exactly like a code change:** it opens a PR, the eval suite runs in CI, and the merge is blocked if win-rate or pass-rate drops below a threshold against the baseline.

The one mental adjustment: this gate is **probabilistic, not binary.** A unit test is green or red. An eval gate is a threshold — "pass-rate must stay above 90%," "win-rate against the current prod prompt must not drop" — because some cases are inherently flaky and a perfect score is neither achievable nor a good sign (if you're at 100%, your eval set is too easy). You're setting a bar and blocking regressions under it, not demanding perfection.

![A prompt or model change in a PR triggers the eval suite, which runs the versioned case set and scores it against a baseline. If win-rate meets the threshold, the change merges, shown in accent; if it regresses below the bar, the merge is blocked, shown in danger. The gate is a threshold, not a boolean.](/writing/llm-evals-regression-gate.svg "A prompt change is a code change: run the suite, compare to baseline, block the merge on a threshold — probabilistic, not pass/fail.")

And the most important tactical advice: **start absurdly small.** Twenty to fifty hand-labeled cases that you actually run beat an elaborate eval framework you're always about to set up. The first cases can come straight from your own bug reports. The goal on day one is not coverage; it's *ending the vibes era* — replacing "looks better to me" with a number you can compare.

## The backend framing that makes it click

If you already do backend work, you've built all of this before under different names. **Evals are the CI/CD and observability of the LLM layer.** The offline suite is your test gate. The online monitoring is your APM. The flywheel is your incident-to-regression-test discipline. None of the *ideas* are new — you're applying test-and-observe rigor to a component whose outputs happen to be probabilistic English instead of typed return values.

This ties directly into tracing. If you already emit OpenTelemetry spans around your LLM calls, those traces are the raw material for the flywheel: a low-rated production interaction, with its full trace, is a ready-made eval case complete with inputs, context, and the exact output that failed. Log every prod interaction with a trace and building eval cases from real failures becomes copy-paste, not archaeology.

Tools exist and are worth reaching for once you know what you're doing: **OpenAI Evals**, **promptfoo**, **Braintrust**, and **LangSmith** for general eval harnesses; **Ragas** if you're evaluating RAG specifically; **DeepEval** for a pytest-flavored developer experience. But hear this clearly: the tool is the easy part and the least important part. A team with fifty hand-labeled cases, a calibrated pairwise judge, and a CI gate that blocks regressions — held together with a shell script — is doing real LLM evaluation. A team with the fanciest platform and no labeled data, no calibration, and no gate is doing theater with a nice dashboard. **The method matters more than the tool, every time.**

## The takeaway

LLM outputs don't have a right answer, so you can't grade them with `assertEqual` — but "no exact answer" is not "no measurement." Build a small, versioned eval set. Use programmatic assertions for everything that can be checked mechanically, and an LLM judge — pairwise, reasoning-first, and *calibrated against humans* — for the open-ended quality you can't. Gate your changes on it like tests, on a threshold rather than a boolean. Watch production, and feed every real failure back into the set so the whole thing compounds. Do that and you trade "I think this prompt is better" for "win-rate went up 6 points and nothing regressed" — which is the difference between engineering and vibes, and the only thing that lets you ship LLM features without holding your breath every time.
