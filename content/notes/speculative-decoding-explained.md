---
title: "Speculative Decoding: How to Make an LLM 3x Faster by Letting a Smaller Model Guess Its Homework"
description: "Autoregressive decoding is slow because it's sequential and memory-bandwidth bound — the GPU spends its time hauling multi-gigabyte weight matrices out of HBM, not doing math. Speculative decoding exploits that: a small draft model guesses the next few tokens, the big model verifies them all in a single pass, and a clever accept/reject rule makes the output byte-for-byte identical to the big model alone. Here's the whole trick."
date: "2026-08-06"
tags: ["llm", "ai-engineering", "inference", "performance", "speculative-decoding"]
category: "engineering"
---

Here is a claim that sounds like it has to be a lie: you can take a large language model, bolt a second, dumber model onto it, have that dumber model *guess* what the big one is about to say, and end up running two to three times faster — while producing the *exact same output*, token for token, that the big model would have produced on its own. Not "similar quality." Not "close enough." Identical. Same distribution, same samples, same text.

That is speculative decoding, and it is one of the prettier systems tricks to come out of LLM inference. It is now standard: vLLM ships it, TensorRT-LLM ships it, and a big chunk of why hosted APIs quietly got faster and cheaper over the last couple of years — without swapping the model underneath you — is this and a few tricks like it. Let me walk through why it works, because the *why* is the whole point, and it's more interesting than the mechanism.

## The bottleneck isn't what you think

Start with the thing everyone gets wrong. When you imagine an LLM being slow, you probably picture the GPU straining under a mountain of matrix multiplications. Too much math, not enough compute. That intuition is exactly backwards for the case that matters.

Decoding is **autoregressive**: the model generates one token, appends it to the sequence, and feeds the whole thing back in to generate the next. Token N+1 cannot begin until token N exists, because token N is *part of the input* for N+1. This is a hard sequential dependency. No amount of parallel hardware breaks it — you can't compute the fifth word of a sentence before you've decided on the fourth.

So every single token costs one full forward pass through every weight in the model. And here's the part that matters: at batch size 1 — one user, one sequence, the interactive case — that forward pass is **memory-bandwidth bound, not compute bound**. To produce one token, the GPU has to read the model's entire weight set out of high-bandwidth memory: for a 70B model in 16-bit, that's ~140 GB of matrices streaming from HBM into the compute units, *per token*. The actual arithmetic for a single token — multiplying those weights by one skinny activation vector — is a rounding error next to the cost of moving the weights. The compute units sit mostly idle, twiddling their thumbs, waiting on memory.

Sit with that, because it's the crux. **The expensive thing is loading the weights, and you pay it once per token no matter how little math you do.** The GPU is a firehose pointed at a teaspoon. You're paying to move 140 GB and using almost none of the arithmetic capacity that move unlocked.

## The insight: verification is nearly free

If loading the weights is the cost, and the math is nearly free, then a natural question falls out: what if we did *more math* per weight-load? The weights are already streaming through. Could we score more than one token with them while they're here?

Yes. A forward pass can score *many* candidate tokens in parallel for almost the same cost as scoring one. Feeding the model a sequence of, say, four proposed tokens and asking "what probability do you assign at each of these four positions?" reads the weights exactly once and does four positions' worth of the cheap math. Four times the arithmetic on a firehose that was 99% idle is still basically free. The wall-clock cost is dominated by the weight-load, which you paid either way.

So we have a lopsided deal available to us: *generating* the next token is expensive (one weight-load per token), but *checking* a batch of proposed tokens is cheap (one weight-load for the whole batch). All we need is a source of proposals worth checking.

## Draft, then verify

That's where the second model comes in.

Use a small, cheap **draft model** to quickly propose the next `k` tokens. This can be a little sibling from the same family — a 1B model drafting for a 70B, say — or any cheap method that predicts plausible continuations. The draft model runs autoregressively too, but it's tiny, so its sequential passes are fast and its weight-loads are small. It rattles off `k` guesses.

Then the big **target model** does *one* forward pass over all `k` proposed tokens at once. Because a single pass scores every position in parallel, the target now knows, for each of the `k` slots, what token *it* would have chosen there. One expensive weight-load, `k` positions checked.

![A small draft model runs k quick, cheap forward passes to propose the next few tokens; the large target model then verifies all of them in a single expensive forward pass, because loading its weights costs the same whether it scores one token or four.](/writing/speculative-decoding-draft-verify.svg "Draft cheaply, verify all at once. The target's one expensive weight-load scores every proposed position in parallel.")

Now we compare. Walk the proposed tokens left to right and **accept the longest prefix where the draft agreed with the target.** The moment they disagree, stop: reject that token, keep the *target's* correct token at the break point, throw away everything the draft guessed after it, and resume drafting from there.

If the draft nailed all four, you just emitted four correct tokens for the price of one expensive target pass plus some cheap draft work. If it got the first two right and blew the third, you emitted three correct tokens (the two agreed-on, plus the target's own token at the mismatch) and start the next round from there. Either way you never emit a token the target wouldn't have.

## The part that makes it beautiful: it's lossless

Here's where speculative decoding stops being a mere cache trick and becomes something you can trust in production. With the proper acceptance rule, **the output distribution is provably identical to sampling from the target model alone.** It is lossless. Not an approximation, not a quality/speed knob you're nervously tuning — mathematically the same tokens the big model would have produced, arriving faster.

The rule is a form of rejection sampling, and the intuition is cleaner than the algebra. For a given position, the draft model proposed some token with probability `p_draft`, and the target assigns that same token probability `p_target`. Accept the draft's token with probability `min(1, p_target / p_draft)`.

Read that in two cases. If the target likes the token *at least as much* as the draft did (`p_target ≥ p_draft`), the ratio is ≥ 1, so you accept outright — no reason to argue with a guess the big model also liked. If the target likes it *less* than the draft did, you accept only in proportion to how much less, `p_target / p_draft`. The draft was over-eager here, so you keep its guess only a fair fraction of the time.

And when you reject? You don't just grab the target's top token — that would bias the result. You sample from the **adjusted residual distribution**: the target's distribution with the already-accounted-for probability mass subtracted out and renormalized, roughly `max(0, p_target − p_draft)`. That correction is exactly what cancels the bias the draft introduced. Work through the probabilities and every token comes out with precisely its true target probability. The draft model can be as dumb as you like — a worse draft just gets rejected more often and saves you less time. It can never corrupt the output, only fail to accelerate it. That separation of concerns — one model for speed, one for correctness, and correctness structurally protected from the speed hack — is the elegant bit.

![Two aligned rows of tokens: the draft model's guesses on top, the target model's choices below. The first three tokens agree and are accepted in the accent color; the fourth disagrees and is rejected in red, with the target's correct token substituted before drafting resumes.](/writing/speculative-decoding-accept-reject.svg "Accept the longest agreeing prefix, reject at the first mismatch, keep the target's token there, resume drafting. Output stays identical to the target.")

## Why it wins, and by how much

The speedup has a wonderfully simple form: it's roughly the **average number of tokens accepted per target pass.** Every target forward pass costs about the same as it did before (one weight-load dominates), but now each one can retire multiple tokens instead of one. Accept three on average, get roughly a 3x wall-clock speedup. This is the whole lever — push accepted-tokens-per-pass up and latency drops in proportion.

![Baseline decoding retires one token per expensive target pass, so three passes yield three tokens; speculative decoding retires several accepted tokens per pass, so one pass yields three tokens — a roughly 3x speedup, with a note that it is lossless.](/writing/speculative-decoding-speedup.svg "Speedup tracks tokens accepted per expensive target pass. Same passes, more tokens each — and the output distribution is unchanged.")

Acceptance is high exactly when the draft and target *agree often*, which is exactly on easy, predictable text — boilerplate, common phrasing, code with obvious continuations, the closing of a sentence whose ending is basically determined. On that kind of content a 1B draft agrees with a 70B target most of the time, and you cruise. On genuinely hard, surprising, high-entropy text, the draft whiffs more, acceptance drops, and you fall back toward the baseline. The worst case — a draft that's always wrong — degrades to roughly one token per pass *plus* the wasted draft overhead: a small net loss, not a catastrophe. In practice, 2–3x wall-clock speedups with zero quality change are typical, which is why this is now table stakes.

## Variants, because you don't always want a second model

The "separate small draft model" is the canonical setup, but the same principle spawns a family:

- **Self-speculation / Medusa.** Bolt a few extra decoding heads onto the target model itself; each head predicts one future token. No separate model to host or keep in sync — the model drafts for itself, then verifies in the usual pass.
- **N-gram / prompt-lookup decoding.** Skip the model entirely and draft by *copying from the prompt.* When the output is likely to repeat the input — summarization, RAG, editing, "fix this code" — you can guess the next few tokens by finding a matching span earlier in the context and proposing what followed it. Absurdly cheap, and shockingly effective on repetitive workloads.
- **EAGLE** and its descendants push draft quality up by predicting at the feature level rather than the token level, squeezing acceptance rates higher.

All of them ride the same insight: cheap proposals plus one cheap parallel verification.

## The caveats worth knowing

It isn't free lunch all the way down. The draft model costs extra memory, sitting resident alongside the target. Acceptance rate is workload-dependent, so your speedup is a distribution, not a guarantee — benchmark on *your* traffic. Draft and target generally need to share a tokenizer (or you need an alignment step), so you can't pair arbitrary models. And critically, the win is biggest at **low batch sizes**, the latency-sensitive interactive case where the target GPU was memory-bound and idle. Crank the batch size way up and the target is already compute-saturated — you've filled the firehose with real work — so the spare capacity speculative decoding was exploiting shrinks, and so does the payoff.

That last point is the tell for what this really is. Speculative decoding is a **systems trick**, the same species as batching or prefetching: it does *redundant-looking* work — running a whole second model, proposing tokens you'll sometimes throw away — specifically to convert an idle, memory-bandwidth-bound bottleneck into useful throughput. It looks wasteful and is a massive win, because the resource it "wastes" (arithmetic on the target's spare compute) was going to be wasted anyway. That's the same shape of insight as every good performance hack: find the thing you're already paying for and get more out of it. Here, you were already hauling 140 GB of weights across the bus for every token. Speculative decoding just makes that trip count for more than one.
